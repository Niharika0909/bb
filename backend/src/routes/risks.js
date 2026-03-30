const express = require('express');
const router = express.Router();
const riskService = require('../services/riskService');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validate, rules } = require('../middleware/validate');
const response = require('../utils/response');
const { auditActions } = require('../middleware/audit');

/**
 * POST /api/risks
 * Create a new risk assessment
 */
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'RISK_MANAGER', 'MODEL_VALIDATOR'),
  rules.createRiskAssessment,
  validate,
  asyncHandler(async (req, res) => {
    const assessment = await riskService.create(req.body, req.user.id);

    await req.audit({
      action: auditActions.CREATE,
      entityType: 'RISK_ASSESSMENT',
      entityId: assessment.id,
      newValues: { assessmentId: assessment.assessmentId, residualRisk: assessment.residualRisk },
    });

    return response.created(res, assessment, 'Risk assessment created');
  })
);

/**
 * GET /api/risks
 * List risk assessments
 */
router.get(
  '/',
  authenticate,
  rules.pagination,
  validate,
  asyncHandler(async (req, res) => {
    const { page, limit, modelId, assessedById, residualRisk, sortBy, sortOrder } = req.query;

    const result = await riskService.list({
      page: page || 1,
      limit: limit || 20,
      modelId,
      assessedById,
      residualRisk,
      sortBy,
      sortOrder,
    });

    return response.paginated(res, result);
  })
);

/**
 * GET /api/risks/statistics
 * Get risk statistics
 */
router.get(
  '/statistics',
  authenticate,
  asyncHandler(async (req, res) => {
    const stats = await riskService.getStatistics();
    return response.success(res, stats);
  })
);

/**
 * GET /api/risks/heatmap
 * Get risk heatmap
 */
router.get(
  '/heatmap',
  authenticate,
  asyncHandler(async (req, res) => {
    const heatmap = await riskService.getRiskHeatmap();
    return response.success(res, heatmap);
  })
);

/**
 * GET /api/risks/model/:modelId
 * Get latest risk assessment for a model
 */
router.get(
  '/model/:modelId',
  authenticate,
  rules.uuidParam('modelId'),
  validate,
  asyncHandler(async (req, res) => {
    const assessment = await riskService.getLatestForModel(req.params.modelId);
    return response.success(res, assessment);
  })
);

/**
 * GET /api/risks/:id
 * Get risk assessment by ID
 */
router.get(
  '/:id',
  authenticate,
  rules.uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    const assessment = await riskService.getById(req.params.id);
    return response.success(res, assessment);
  })
);

/**
 * PUT /api/risks/:id
 * Update risk assessment
 */
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'RISK_MANAGER'),
  rules.uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    const assessment = await riskService.update(req.params.id, req.body, req.user.id);

    await req.audit({
      action: auditActions.UPDATE,
      entityType: 'RISK_ASSESSMENT',
      entityId: assessment.id,
      newValues: req.body,
    });

    return response.success(res, assessment, 'Risk assessment updated');
  })
);

/**
 * POST /api/risks/:id/factors
 * Add risk factor
 */
router.post(
  '/:id/factors',
  authenticate,
  authorize('ADMIN', 'RISK_MANAGER'),
  rules.uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    const factor = await riskService.addRiskFactor(req.params.id, req.body, req.user.id);
    return response.created(res, factor, 'Risk factor added');
  })
);

module.exports = router;
