const express = require('express');
const router = express.Router();
const findingService = require('../services/findingService');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validate, rules } = require('../middleware/validate');
const response = require('../utils/response');
const { auditActions } = require('../middleware/audit');

/**
 * POST /api/findings
 * Create a new finding
 */
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'MODEL_VALIDATOR', 'RISK_MANAGER', 'AUDITOR'),
  rules.createFinding,
  validate,
  asyncHandler(async (req, res) => {
    const finding = await findingService.create(req.body, req.user.id);

    await req.audit({
      action: auditActions.FINDING_CREATED,
      entityType: 'FINDING',
      entityId: finding.id,
      newValues: { findingId: finding.findingId, severity: finding.severity },
    });

    return response.created(res, finding, 'Finding created successfully');
  })
);

/**
 * GET /api/findings
 * List findings with filtering
 */
router.get(
  '/',
  authenticate,
  rules.pagination,
  validate,
  asyncHandler(async (req, res) => {
    const {
      page,
      limit,
      modelId,
      validationId,
      severity,
      status,
      category,
      assignedToId,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await findingService.list({
      page: page || 1,
      limit: limit || 20,
      modelId,
      validationId,
      severity,
      status,
      category,
      assignedToId,
      sortBy,
      sortOrder,
    });

    return response.paginated(res, result);
  })
);

/**
 * GET /api/findings/statistics
 * Get finding statistics
 */
router.get(
  '/statistics',
  authenticate,
  asyncHandler(async (req, res) => {
    const { modelId } = req.query;
    const stats = await findingService.getStatistics({ modelId });
    return response.success(res, stats);
  })
);

/**
 * GET /api/findings/critical
 * Get critical findings
 */
router.get(
  '/critical',
  authenticate,
  asyncHandler(async (req, res) => {
    const { limit } = req.query;
    const findings = await findingService.getCriticalFindings(limit || 10);
    return response.success(res, findings);
  })
);

/**
 * GET /api/findings/:id
 * Get finding by ID
 */
router.get(
  '/:id',
  authenticate,
  rules.uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    const finding = await findingService.getById(req.params.id);
    return response.success(res, finding);
  })
);

/**
 * PUT /api/findings/:id
 * Update finding
 */
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'MODEL_VALIDATOR', 'RISK_MANAGER', 'MODEL_DEVELOPER'),
  rules.uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    const finding = await findingService.update(req.params.id, req.body, req.user.id);

    await req.audit({
      action: auditActions.UPDATE,
      entityType: 'FINDING',
      entityId: finding.id,
      newValues: req.body,
    });

    return response.success(res, finding, 'Finding updated');
  })
);

/**
 * PATCH /api/findings/:id/status
 * Update finding status
 */
router.patch(
  '/:id/status',
  authenticate,
  authorize('ADMIN', 'MODEL_VALIDATOR', 'RISK_MANAGER', 'MODEL_DEVELOPER'),
  rules.uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    const { status, comments } = req.body;

    if (!status) {
      return response.error(res, 'Status is required', 400);
    }

    const finding = await findingService.updateStatus(
      req.params.id,
      status,
      req.user.id,
      comments
    );

    await req.audit({
      action: auditActions.UPDATE,
      entityType: 'FINDING',
      entityId: finding.id,
      newValues: { status, comments },
    });

    return response.success(res, finding, 'Finding status updated');
  })
);

module.exports = router;
