const express = require('express');
const router = express.Router();
const dashboardService = require('../services/dashboardService');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const response = require('../utils/response');

/**
 * GET /api/dashboard/executive
 * Get executive dashboard
 */
router.get(
  '/executive',
  authenticate,
  authorize('ADMIN', 'EXECUTIVE', 'RISK_MANAGER', 'COMPLIANCE_OFFICER'),
  asyncHandler(async (req, res) => {
    const data = await dashboardService.getExecutiveDashboard();
    return response.success(res, data);
  })
);

/**
 * GET /api/dashboard/developer
 * Get model developer dashboard
 */
router.get(
  '/developer',
  authenticate,
  authorize('ADMIN', 'MODEL_DEVELOPER', 'RISK_MANAGER'),
  asyncHandler(async (req, res) => {
    const data = await dashboardService.getModelDeveloperDashboard(req.user.id);
    return response.success(res, data);
  })
);

/**
 * GET /api/dashboard/validator
 * Get model validator dashboard
 */
router.get(
  '/validator',
  authenticate,
  authorize('ADMIN', 'MODEL_VALIDATOR', 'RISK_MANAGER'),
  asyncHandler(async (req, res) => {
    const data = await dashboardService.getModelValidatorDashboard(req.user.id);
    return response.success(res, data);
  })
);

/**
 * GET /api/dashboard/risk-manager
 * Get risk manager dashboard
 */
router.get(
  '/risk-manager',
  authenticate,
  authorize('ADMIN', 'RISK_MANAGER', 'COMPLIANCE_OFFICER', 'EXECUTIVE'),
  asyncHandler(async (req, res) => {
    const data = await dashboardService.getRiskManagerDashboard(req.user.id);
    return response.success(res, data);
  })
);

/**
 * GET /api/dashboard/admin
 * Get admin dashboard
 */
router.get(
  '/admin',
  authenticate,
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    const data = await dashboardService.getAdminDashboard();
    return response.success(res, data);
  })
);

/**
 * GET /api/dashboard/my
 * Get dashboard based on user role
 */
router.get(
  '/my',
  authenticate,
  asyncHandler(async (req, res) => {
    let data;

    switch (req.user.role) {
      case 'ADMIN':
        data = await dashboardService.getAdminDashboard();
        break;
      case 'EXECUTIVE':
      case 'COMPLIANCE_OFFICER':
        data = await dashboardService.getExecutiveDashboard();
        break;
      case 'RISK_MANAGER':
        data = await dashboardService.getRiskManagerDashboard(req.user.id);
        break;
      case 'MODEL_VALIDATOR':
        data = await dashboardService.getModelValidatorDashboard(req.user.id);
        break;
      case 'MODEL_DEVELOPER':
      default:
        data = await dashboardService.getModelDeveloperDashboard(req.user.id);
        break;
    }

    return response.success(res, { role: req.user.role, ...data });
  })
);

module.exports = router;
