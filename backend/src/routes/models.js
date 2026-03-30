const express = require('express');
const router = express.Router();
const modelService = require('../services/modelService');
const { authenticate, authorize, modelManagers } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validate, rules } = require('../middleware/validate');
const response = require('../utils/response');
const { auditActions } = require('../middleware/audit');

/**
 * POST /api/models
 * Create a new model
 */
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'MODEL_DEVELOPER', 'RISK_MANAGER'),
  rules.createModel,
  validate,
  asyncHandler(async (req, res) => {
    const model = await modelService.create(req.body, req.user.id);

    await req.audit({
      action: auditActions.CREATE,
      entityType: 'MODEL',
      entityId: model.id,
      newValues: { modelId: model.modelId, name: model.name, type: model.type },
    });

    return response.created(res, model, 'Model created successfully');
  })
);

/**
 * GET /api/models
 * List models with filtering
 */
router.get(
  '/',
  authenticate,
  rules.pagination,
  validate,
  asyncHandler(async (req, res) => {
    const { page, limit, status, tier, type, businessUnit, ownerId, search, sortBy, sortOrder } =
      req.query;

    const result = await modelService.list({
      page: page || 1,
      limit: limit || 20,
      status,
      tier,
      type,
      businessUnit,
      ownerId,
      search,
      sortBy,
      sortOrder,
    });

    return response.paginated(res, result);
  })
);

/**
 * GET /api/models/statistics
 * Get model statistics
 */
router.get(
  '/statistics',
  authenticate,
  asyncHandler(async (req, res) => {
    const { businessUnit } = req.query;
    const stats = await modelService.getStatistics({ businessUnit });
    return response.success(res, stats);
  })
);

/**
 * GET /api/models/attention
 * Get models requiring attention
 */
router.get(
  '/attention',
  authenticate,
  asyncHandler(async (req, res) => {
    const models = await modelService.getModelsRequiringAttention(
      req.user.id,
      req.user.role
    );
    return response.success(res, models);
  })
);

/**
 * GET /api/models/:id
 * Get model by ID
 */
router.get(
  '/:id',
  authenticate,
  rules.uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    const model = await modelService.getById(req.params.id);
    return response.success(res, model);
  })
);

/**
 * PUT /api/models/:id
 * Update model
 */
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'MODEL_DEVELOPER', 'RISK_MANAGER'),
  rules.uuidParam('id'),
  rules.updateModel,
  validate,
  asyncHandler(async (req, res) => {
    const model = await modelService.update(req.params.id, req.body, req.user.id);

    await req.audit({
      action: auditActions.UPDATE,
      entityType: 'MODEL',
      entityId: model.id,
      newValues: req.body,
    });

    return response.success(res, model, 'Model updated successfully');
  })
);

/**
 * PATCH /api/models/:id/status
 * Update model status
 */
router.patch(
  '/:id/status',
  authenticate,
  authorize('ADMIN', 'MODEL_DEVELOPER', 'MODEL_VALIDATOR', 'RISK_MANAGER'),
  rules.uuidParam('id'),
  asyncHandler(async (req, res) => {
    const { status, reason } = req.body;

    if (!status) {
      return response.error(res, 'Status is required', 400);
    }

    const model = await modelService.updateStatus(
      req.params.id,
      status,
      req.user.id,
      reason
    );

    await req.audit({
      action: `MODEL_${status}`,
      entityType: 'MODEL',
      entityId: model.id,
      newValues: { status, reason },
    });

    return response.success(res, model, 'Model status updated');
  })
);

/**
 * DELETE /api/models/:id
 * Delete (retire) model
 */
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN', 'RISK_MANAGER'),
  rules.uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    await modelService.delete(req.params.id, req.user.id);

    await req.audit({
      action: auditActions.MODEL_RETIRED,
      entityType: 'MODEL',
      entityId: req.params.id,
    });

    return response.success(res, null, 'Model retired successfully');
  })
);

module.exports = router;
