const express = require('express');
const router = express.Router();
const taskService = require('../services/taskService');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validate, rules } = require('../middleware/validate');
const response = require('../utils/response');
const { auditActions } = require('../middleware/audit');

/**
 * POST /api/tasks
 * Create a new task
 */
router.post(
  '/',
  authenticate,
  rules.createTask,
  validate,
  asyncHandler(async (req, res) => {
    const task = await taskService.create(req.body, req.user.id);

    await req.audit({
      action: auditActions.CREATE,
      entityType: 'TASK',
      entityId: task.id,
      newValues: { taskId: task.taskId, title: task.title },
    });

    return response.created(res, task, 'Task created');
  })
);

/**
 * GET /api/tasks
 * List tasks
 */
router.get(
  '/',
  authenticate,
  rules.pagination,
  validate,
  asyncHandler(async (req, res) => {
    const { page, limit, assigneeId, createdById, modelId, status, priority, overdue, sortBy, sortOrder } =
      req.query;

    const result = await taskService.list({
      page: page || 1,
      limit: limit || 20,
      assigneeId,
      createdById,
      modelId,
      status,
      priority,
      overdue: overdue === 'true',
      sortBy,
      sortOrder,
    });

    return response.paginated(res, result);
  })
);

/**
 * GET /api/tasks/my
 * Get current user's tasks
 */
router.get(
  '/my',
  authenticate,
  asyncHandler(async (req, res) => {
    const { status } = req.query;
    const tasks = await taskService.getMyTasks(req.user.id, status);
    return response.success(res, tasks);
  })
);

/**
 * GET /api/tasks/overdue
 * Get overdue tasks
 */
router.get(
  '/overdue',
  authenticate,
  asyncHandler(async (req, res) => {
    const { userId } = req.query;
    const tasks = await taskService.getOverdueTasks(userId);
    return response.success(res, tasks);
  })
);

/**
 * GET /api/tasks/statistics
 * Get task statistics
 */
router.get(
  '/statistics',
  authenticate,
  asyncHandler(async (req, res) => {
    const { userId } = req.query;
    const stats = await taskService.getStatistics(userId);
    return response.success(res, stats);
  })
);

/**
 * GET /api/tasks/:id
 * Get task by ID
 */
router.get(
  '/:id',
  authenticate,
  rules.uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    const task = await taskService.getById(req.params.id);
    return response.success(res, task);
  })
);

/**
 * PUT /api/tasks/:id
 * Update task
 */
router.put(
  '/:id',
  authenticate,
  rules.uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    const task = await taskService.update(req.params.id, req.body, req.user.id);

    await req.audit({
      action: auditActions.UPDATE,
      entityType: 'TASK',
      entityId: task.id,
      newValues: req.body,
    });

    return response.success(res, task, 'Task updated');
  })
);

/**
 * PATCH /api/tasks/:id/status
 * Update task status
 */
router.patch(
  '/:id/status',
  authenticate,
  rules.uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    const { status } = req.body;

    if (!status) {
      return response.error(res, 'Status is required', 400);
    }

    const task = await taskService.updateStatus(req.params.id, status, req.user.id);

    await req.audit({
      action: auditActions.UPDATE,
      entityType: 'TASK',
      entityId: task.id,
      newValues: { status },
    });

    return response.success(res, task, 'Task status updated');
  })
);

/**
 * DELETE /api/tasks/:id
 * Delete task
 */
router.delete(
  '/:id',
  authenticate,
  rules.uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    await taskService.delete(req.params.id, req.user.id);

    await req.audit({
      action: auditActions.DELETE,
      entityType: 'TASK',
      entityId: req.params.id,
    });

    return response.success(res, null, 'Task deleted');
  })
);

module.exports = router;
