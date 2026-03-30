const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validate, rules } = require('../middleware/validate');
const response = require('../utils/response');
const { auditActions } = require('../middleware/audit');

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post(
  '/register',
  rules.register,
  validate,
  asyncHandler(async (req, res) => {
    const user = await authService.register(req.body);

    await req.audit({
      action: auditActions.CREATE,
      entityType: 'USER',
      entityId: user.id,
      newValues: { email: user.email, role: user.role },
    });

    return response.created(res, user, 'Registration successful. Awaiting approval.');
  })
);

/**
 * POST /api/auth/login
 * Login user
 */
router.post(
  '/login',
  rules.login,
  validate,
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);

    if (result.requiresMfa) {
      return response.success(res, { requiresMfa: true }, 'MFA code required');
    }

    await req.audit({
      action: auditActions.LOGIN,
      entityType: 'USER',
      entityId: result.user.id,
    });

    return response.success(res, result, 'Login successful');
  })
);

/**
 * POST /api/auth/logout
 * Logout user
 */
router.post(
  '/logout',
  authenticate,
  asyncHandler(async (req, res) => {
    await authService.logout(req.user.id, req.token);

    await req.audit({
      action: auditActions.LOGOUT,
      entityType: 'USER',
      entityId: req.user.id,
    });

    return response.success(res, null, 'Logged out successfully');
  })
);

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return response.error(res, 'Refresh token required', 400);
    }

    const result = await authService.refreshToken(refreshToken);
    return response.success(res, result, 'Token refreshed');
  })
);

/**
 * POST /api/auth/change-password
 * Change password
 */
router.post(
  '/change-password',
  authenticate,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return response.error(res, 'Current and new password required', 400);
    }

    await authService.changePassword(req.user.id, currentPassword, newPassword);

    await req.audit({
      action: auditActions.PASSWORD_CHANGE,
      entityType: 'USER',
      entityId: req.user.id,
    });

    return response.success(res, null, 'Password changed successfully');
  })
);

/**
 * GET /api/auth/me
 * Get current user
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    return response.success(res, req.user);
  })
);

/**
 * POST /api/auth/mfa/setup
 * Setup MFA
 */
router.post(
  '/mfa/setup',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await authService.setupMfa(req.user.id);
    return response.success(res, result, 'Scan QR code with authenticator app');
  })
);

/**
 * POST /api/auth/mfa/enable
 * Enable MFA
 */
router.post(
  '/mfa/enable',
  authenticate,
  asyncHandler(async (req, res) => {
    const { code } = req.body;

    if (!code) {
      return response.error(res, 'Verification code required', 400);
    }

    const result = await authService.enableMfa(req.user.id, code);

    await req.audit({
      action: auditActions.MFA_ENABLED,
      entityType: 'USER',
      entityId: req.user.id,
    });

    return response.success(res, result, 'MFA enabled successfully');
  })
);

/**
 * POST /api/auth/mfa/disable
 * Disable MFA
 */
router.post(
  '/mfa/disable',
  authenticate,
  asyncHandler(async (req, res) => {
    const { password } = req.body;

    if (!password) {
      return response.error(res, 'Password required', 400);
    }

    const result = await authService.disableMfa(req.user.id, password);

    await req.audit({
      action: auditActions.MFA_DISABLED,
      entityType: 'USER',
      entityId: req.user.id,
    });

    return response.success(res, result, 'MFA disabled successfully');
  })
);

module.exports = router;
