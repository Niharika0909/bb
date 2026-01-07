const express = require('express');
const router = express.Router();
const workflowService = require('../services/workflowService');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validate, rules } = require('../middleware/validate');
const response = require('../utils/response');
const { auditActions } = require('../middleware/audit');

/**
 * POST /api/workflows
 * Create a new workflow
 */
router.post(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const { type, modelId, title, description, priority } = req.body;

    if (!type || !title) {
      return response.error(res, 'Type and title are required', 400);
    }

    const workflow = await workflowService.create(
      { type, modelId, title, description, priority },
      req.user.id
    );

    await req.audit({
      action: auditActions.WORKFLOW_INITIATED,
      entityType: 'WORKFLOW',
      entityId: workflow.id,
      newValues: { workflowId: workflow.workflowId, type },
    });

    return response.created(res, workflow, 'Workflow initiated');
  })
);

/**
 * GET /api/workflows
 * List workflows
 */
router.get(
  '/',
  authenticate,
  rules.pagination,
  validate,
  asyncHandler(async (req, res) => {
    const { page, limit, type, status, modelId, initiatedById, pendingApproverId, sortBy, sortOrder } =
      req.query;

    const result = await workflowService.list({
      page: page || 1,
      limit: limit || 20,
      type,
      status,
      modelId,
      initiatedById,
      pendingApproverId,
      sortBy,
      sortOrder,
    });

    return response.paginated(res, result);
  })
);

/**
 * GET /api/workflows/pending
 * Get pending approvals for current user
 */
router.get(
  '/pending',
  authenticate,
  asyncHandler(async (req, res) => {
    const workflows = await workflowService.getPendingApprovalsForUser(req.user.id);
    return response.success(res, workflows);
  })
);

/**
 * GET /api/workflows/statistics
 * Get workflow statistics
 */
router.get(
  '/statistics',
  authenticate,
  asyncHandler(async (req, res) => {
    const stats = await workflowService.getStatistics();
    return response.success(res, stats);
  })
);

/**
 * GET /api/workflows/:id
 * Get workflow by ID
 */
router.get(
  '/:id',
  authenticate,
  rules.uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    const workflow = await workflowService.getById(req.params.id);
    return response.success(res, workflow);
  })
);

/**
 * POST /api/workflows/:id/approve
 * Submit approval decision
 */
router.post(
  '/:id/approve',
  authenticate,
  rules.uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    const { decision, comments } = req.body;

    if (!decision || !['APPROVED', 'REJECTED', 'DEFERRED'].includes(decision)) {
      return response.error(res, 'Valid decision required', 400);
    }

    const result = await workflowService.submitApproval(
      req.params.id,
      decision,
      req.user.id,
      comments
    );

    await req.audit({
      action: decision === 'APPROVED' ? auditActions.WORKFLOW_APPROVED : auditActions.WORKFLOW_REJECTED,
      entityType: 'WORKFLOW',
      entityId: req.params.id,
      newValues: { decision, comments },
    });

    return response.success(res, result, `Decision recorded: ${decision}`);
  })
);

/**
 * POST /api/workflows/:id/cancel
 * Cancel workflow
 */
router.post(
  '/:id/cancel',
  authenticate,
  rules.uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    const { reason } = req.body;

    await workflowService.cancel(req.params.id, req.user.id, reason);

    await req.audit({
      action: 'WORKFLOW_CANCELLED',
      entityType: 'WORKFLOW',
      entityId: req.params.id,
      newValues: { reason },
    });

    return response.success(res, null, 'Workflow cancelled');
  })
);

module.exports = router;
