const express = require('express');
const router = express.Router();
const userService = require('../services/userService');
const { authenticate, authorize, adminOnly } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validate, rules } = require('../middleware/validate');
const response = require('../utils/response');
const { auditActions } = require('../middleware/audit');

/**
 * POST /api/users
 * Create a new user (admin only)
 */
router.post(
  '/',
  authenticate,
  adminOnly,
  asyncHandler(async (req, res) => {
    const user = await userService.create(req.body, req.user.id);

    await req.audit({
      action: auditActions.USER_CREATED,
      entityType: 'USER',
      entityId: user.id,
      newValues: { email: user.email, role: user.role },
    });

    return response.created(res, user, 'User created');
  })
);

/**
 * GET /api/users
 * List users
 */
router.get(
  '/',
  authenticate,
  authorize('ADMIN', 'RISK_MANAGER', 'COMPLIANCE_OFFICER'),
  rules.pagination,
  validate,
  asyncHandler(async (req, res) => {
    const { page, limit, role, status, department, search, sortBy, sortOrder } = req.query;

    const result = await userService.list({
      page: page || 1,
      limit: limit || 20,
      role,
      status,
      department,
      search,
      sortBy,
      sortOrder,
    });

    return response.paginated(res, result);
  })
);

/**
 * GET /api/users/roles/:role
 * Get users by role
 */
router.get(
  '/roles/:role',
  authenticate,
  asyncHandler(async (req, res) => {
    const users = await userService.getByRole(req.params.role);
    return response.success(res, users);
  })
);

/**
 * GET /api/users/statistics
 * Get user statistics
 */
router.get(
  '/statistics',
  authenticate,
  adminOnly,
  asyncHandler(async (req, res) => {
    const stats = await userService.getStatistics();
    return response.success(res, stats);
  })
);

/**
 * GET /api/users/:id
 * Get user by ID
 */
router.get(
  '/:id',
  authenticate,
  rules.uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    const user = await userService.getById(req.params.id);
    return response.success(res, user);
  })
);

/**
 * PUT /api/users/:id
 * Update user
 */
router.put(
  '/:id',
  authenticate,
  rules.uuidParam('id'),
  rules.updateUser,
  validate,
  asyncHandler(async (req, res) => {
    // Regular users can only update their own profile
    if (req.user.role !== 'ADMIN' && req.user.id !== req.params.id) {
      return response.error(res, 'Access denied', 403);
    }

    const user = await userService.update(req.params.id, req.body, req.user.id);

    await req.audit({
      action: auditActions.USER_UPDATED,
      entityType: 'USER',
      entityId: user.id,
      newValues: req.body,
    });

    return response.success(res, user, 'User updated');
  })
);

/**
 * PATCH /api/users/:id/role
 * Update user role (admin only)
 */
router.patch(
  '/:id/role',
  authenticate,
  adminOnly,
  rules.uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    const { role } = req.body;

    if (!role) {
      return response.error(res, 'Role is required', 400);
    }

    const user = await userService.updateRole(req.params.id, role, req.user.id);

    await req.audit({
      action: auditActions.ROLE_CHANGED,
      entityType: 'USER',
      entityId: user.id,
      newValues: { role },
    });

    return response.success(res, user, 'Role updated');
  })
);

/**
 * PATCH /api/users/:id/status
 * Update user status (admin only)
 */
router.patch(
  '/:id/status',
  authenticate,
  adminOnly,
  rules.uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    const { status } = req.body;

    if (!status) {
      return response.error(res, 'Status is required', 400);
    }

    const user = await userService.updateStatus(req.params.id, status, req.user.id);

    await req.audit({
      action: status === 'SUSPENDED' ? auditActions.USER_SUSPENDED : auditActions.USER_UPDATED,
      entityType: 'USER',
      entityId: user.id,
      newValues: { status },
    });

    return response.success(res, user, 'Status updated');
  })
);

/**
 * POST /api/users/:id/reset-password
 * Reset user password (admin only)
 */
router.post(
  '/:id/reset-password',
  authenticate,
  adminOnly,
  rules.uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return response.error(res, 'Password must be at least 8 characters', 400);
    }

    await userService.resetPassword(req.params.id, newPassword, req.user.id);

    await req.audit({
      action: 'PASSWORD_RESET',
      entityType: 'USER',
      entityId: req.params.id,
      severity: 'WARNING',
    });

    return response.success(res, null, 'Password reset');
  })
);

/**
 * DELETE /api/users/:id
 * Delete user (admin only)
 */
router.delete(
  '/:id',
  authenticate,
  adminOnly,
  rules.uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    await userService.delete(req.params.id, req.user.id);

    await req.audit({
      action: auditActions.DELETE,
      entityType: 'USER',
      entityId: req.params.id,
    });

    return response.success(res, null, 'User deleted');
  })
);

/**
 * GET /api/users/:id/notifications
 * Get user notifications
 */
router.get(
  '/:id/notifications',
  authenticate,
  rules.uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    // Users can only see their own notifications
    if (req.user.id !== req.params.id && req.user.role !== 'ADMIN') {
      return response.error(res, 'Access denied', 403);
    }

    const { unreadOnly } = req.query;
    const notifications = await userService.getNotifications(
      req.params.id,
      unreadOnly === 'true'
    );
    return response.success(res, notifications);
  })
);

/**
 * POST /api/users/:id/notifications/read
 * Mark notifications as read
 */
router.post(
  '/:id/notifications/read',
  authenticate,
  rules.uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    if (req.user.id !== req.params.id && req.user.role !== 'ADMIN') {
      return response.error(res, 'Access denied', 403);
    }

    const { notificationIds } = req.body;
    await userService.markNotificationsRead(req.params.id, notificationIds);
    return response.success(res, null, 'Notifications marked as read');
  })
);

module.exports = router;
