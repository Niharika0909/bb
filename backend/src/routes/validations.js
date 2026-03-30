const express = require('express');
const router = express.Router();
const validationService = require('../services/validationService');
const { authenticate, authorize, validators } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validate, rules } = require('../middleware/validate');
const response = require('../utils/response');
const { auditActions } = require('../middleware/audit');

/**
 * POST /api/validations
 * Create a new validation
 */
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'MODEL_VALIDATOR', 'RISK_MANAGER'),
  rules.createValidation,
  validate,
  asyncHandler(async (req, res) => {
    const validation = await validationService.create(req.body, req.user.id);

    await req.audit({
      action: auditActions.CREATE,
      entityType: 'VALIDATION',
      entityId: validation.id,
      newValues: { validationId: validation.validationId, scope: validation.scope },
    });

    return response.created(res, validation, 'Validation created successfully');
  })
);

/**
 * GET /api/validations
 * List validations with filtering
 */
router.get(
  '/',
  authenticate,
  rules.pagination,
  validate,
  asyncHandler(async (req, res) => {
    const { page, limit, modelId, validatorId, status, scope, sortBy, sortOrder } = req.query;

    const result = await validationService.list({
      page: page || 1,
      limit: limit || 20,
      modelId,
      validatorId,
      status,
      scope,
      sortBy,
      sortOrder,
    });

    return response.paginated(res, result);
  })
);

/**
 * GET /api/validations/statistics
 * Get validation statistics
 */
router.get(
  '/statistics',
  authenticate,
  asyncHandler(async (req, res) => {
    const { validatorId } = req.query;
    const stats = await validationService.getStatistics({ validatorId });
    return response.success(res, stats);
  })
);

/**
 * GET /api/validations/upcoming
 * Get upcoming validations
 */
router.get(
  '/upcoming',
  authenticate,
  asyncHandler(async (req, res) => {
    const { days } = req.query;
    const models = await validationService.getUpcomingValidations(days || 30);
    return response.success(res, models);
  })
);

/**
 * GET /api/validations/overdue
 * Get overdue validations
 */
router.get(
  '/overdue',
  authenticate,
  asyncHandler(async (req, res) => {
    const models = await validationService.getOverdueValidations();
    return response.success(res, models);
  })
);

/**
 * GET /api/validations/:id
 * Get validation by ID
 */
router.get(
  '/:id',
  authenticate,
  rules.uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    const validation = await validationService.getById(req.params.id);
    return response.success(res, validation);
  })
);

/**
 * PUT /api/validations/:id
 * Update validation
 */
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'MODEL_VALIDATOR'),
  rules.uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    const validation = await validationService.update(req.params.id, req.body, req.user.id);

    await req.audit({
      action: auditActions.UPDATE,
      entityType: 'VALIDATION',
      entityId: validation.id,
      newValues: req.body,
    });

    return response.success(res, validation, 'Validation updated');
  })
);

/**
 * POST /api/validations/:id/start
 * Start validation
 */
router.post(
  '/:id/start',
  authenticate,
  authorize('ADMIN', 'MODEL_VALIDATOR'),
  rules.uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    const validation = await validationService.start(req.params.id, req.user.id);

    await req.audit({
      action: auditActions.VALIDATION_STARTED,
      entityType: 'VALIDATION',
      entityId: validation.id,
    });

    return response.success(res, validation, 'Validation started');
  })
);

/**
 * POST /api/validations/:id/complete
 * Complete validation
 */
router.post(
  '/:id/complete',
  authenticate,
  authorize('ADMIN', 'MODEL_VALIDATOR'),
  rules.uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    const { status, conclusion, recommendations, conditions } = req.body;

    if (!status || !['APPROVED', 'CONDITIONALLY_APPROVED', 'REJECTED'].includes(status)) {
      return response.error(res, 'Valid status required', 400);
    }

    const validation = await validationService.complete(
      req.params.id,
      { status, conclusion, recommendations, conditions },
      req.user.id
    );

    await req.audit({
      action: auditActions.VALIDATION_COMPLETED,
      entityType: 'VALIDATION',
      entityId: validation.id,
      newValues: { status },
    });

    return response.success(res, validation, 'Validation completed');
  })
);

/**
 * POST /api/validations/:id/tests
 * Add test result
 */
router.post(
  '/:id/tests',
  authenticate,
  authorize('ADMIN', 'MODEL_VALIDATOR'),
  rules.uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    const testResult = await validationService.addTestResult(
      req.params.id,
      req.body,
      req.user.id
    );
    return response.created(res, testResult, 'Test result added');
  })
);

module.exports = router;
