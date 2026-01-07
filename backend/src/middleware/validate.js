const { validationResult, body, param, query } = require('express-validator');
const { ValidationError } = require('../utils/errors');
const xss = require('xss');

/**
 * Validation middleware - checks validation results
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
      value: err.value,
    }));

    throw new ValidationError('Validation failed', formattedErrors);
  }

  next();
};

/**
 * Sanitize string input to prevent XSS
 */
const sanitizeString = (value) => {
  if (typeof value !== 'string') return value;
  return xss(value.trim());
};

/**
 * Common validation rules
 */
const rules = {
  // Pagination
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt(),
  ],

  // UUID parameter
  uuidParam: (paramName = 'id') => [
    param(paramName).isUUID(4).withMessage(`${paramName} must be a valid UUID`),
  ],

  // Authentication
  login: [
    body('email')
      .isEmail()
      .withMessage('Valid email is required')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
  ],

  register: [
    body('email')
      .isEmail()
      .withMessage('Valid email is required')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage(
        'Password must contain uppercase, lowercase, number, and special character'
      ),
    body('firstName')
      .notEmpty()
      .withMessage('First name is required')
      .trim()
      .customSanitizer(sanitizeString),
    body('lastName')
      .notEmpty()
      .withMessage('Last name is required')
      .trim()
      .customSanitizer(sanitizeString),
  ],

  // Model
  createModel: [
    body('name')
      .notEmpty()
      .withMessage('Model name is required')
      .isLength({ max: 255 })
      .withMessage('Name must not exceed 255 characters')
      .customSanitizer(sanitizeString),
    body('type')
      .isIn([
        'CREDIT_RISK',
        'MARKET_RISK',
        'OPERATIONAL_RISK',
        'FRAUD_DETECTION',
        'AML_KYC',
        'PRICING',
        'VALUATION',
        'STRESS_TESTING',
        'CAPITAL_CALCULATION',
        'FORECASTING',
        'CLASSIFICATION',
        'REGRESSION',
        'NLP',
        'COMPUTER_VISION',
        'RECOMMENDATION',
        'OTHER',
      ])
      .withMessage('Invalid model type'),
    body('businessUnit')
      .notEmpty()
      .withMessage('Business unit is required')
      .customSanitizer(sanitizeString),
    body('tier')
      .optional()
      .isIn(['TIER_1_CRITICAL', 'TIER_2_HIGH', 'TIER_3_MEDIUM', 'TIER_4_LOW'])
      .withMessage('Invalid model tier'),
    body('description')
      .optional()
      .isLength({ max: 5000 })
      .withMessage('Description must not exceed 5000 characters')
      .customSanitizer(sanitizeString),
  ],

  updateModel: [
    body('name')
      .optional()
      .isLength({ max: 255 })
      .withMessage('Name must not exceed 255 characters')
      .customSanitizer(sanitizeString),
    body('status')
      .optional()
      .isIn([
        'DRAFT',
        'UNDER_DEVELOPMENT',
        'PENDING_VALIDATION',
        'IN_VALIDATION',
        'VALIDATION_COMPLETE',
        'PENDING_APPROVAL',
        'APPROVED',
        'IN_PRODUCTION',
        'DEPRECATED',
        'RETIRED',
        'REJECTED',
      ])
      .withMessage('Invalid status'),
  ],

  // Validation
  createValidation: [
    body('modelId').isUUID(4).withMessage('Valid model ID is required'),
    body('scope')
      .isIn([
        'FULL_VALIDATION',
        'TARGETED_VALIDATION',
        'ANNUAL_REVIEW',
        'CHANGE_VALIDATION',
        'ONGOING_MONITORING',
      ])
      .withMessage('Invalid validation scope'),
    body('plannedStartDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid date format'),
    body('plannedEndDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid date format'),
  ],

  // Finding
  createFinding: [
    body('modelId').isUUID(4).withMessage('Valid model ID is required'),
    body('title')
      .notEmpty()
      .withMessage('Title is required')
      .isLength({ max: 500 })
      .withMessage('Title must not exceed 500 characters')
      .customSanitizer(sanitizeString),
    body('description')
      .notEmpty()
      .withMessage('Description is required')
      .customSanitizer(sanitizeString),
    body('severity')
      .isIn(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'])
      .withMessage('Invalid severity'),
    body('category')
      .notEmpty()
      .withMessage('Category is required')
      .customSanitizer(sanitizeString),
  ],

  // Risk Assessment
  createRiskAssessment: [
    body('modelId').isUUID(4).withMessage('Valid model ID is required'),
    body('inherentRisk')
      .isIn(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'MINIMAL'])
      .withMessage('Invalid inherent risk level'),
    body('residualRisk')
      .isIn(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'MINIMAL'])
      .withMessage('Invalid residual risk level'),
    body('modelRisk')
      .isIn(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'MINIMAL'])
      .withMessage('Invalid model risk level'),
    body('dataRisk')
      .isIn(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'MINIMAL'])
      .withMessage('Invalid data risk level'),
    body('operationalRisk')
      .isIn(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'MINIMAL'])
      .withMessage('Invalid operational risk level'),
    body('regulatoryRisk')
      .isIn(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'MINIMAL'])
      .withMessage('Invalid regulatory risk level'),
    body('reputationalRisk')
      .isIn(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'MINIMAL'])
      .withMessage('Invalid reputational risk level'),
  ],

  // Task
  createTask: [
    body('title')
      .notEmpty()
      .withMessage('Title is required')
      .isLength({ max: 500 })
      .withMessage('Title must not exceed 500 characters')
      .customSanitizer(sanitizeString),
    body('priority')
      .optional()
      .isIn(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'])
      .withMessage('Invalid priority'),
    body('dueDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid date format'),
  ],

  // Comment
  createComment: [
    body('content')
      .notEmpty()
      .withMessage('Content is required')
      .isLength({ max: 10000 })
      .withMessage('Content must not exceed 10000 characters')
      .customSanitizer(sanitizeString),
  ],

  // User management
  updateUser: [
    body('firstName')
      .optional()
      .notEmpty()
      .withMessage('First name cannot be empty')
      .customSanitizer(sanitizeString),
    body('lastName')
      .optional()
      .notEmpty()
      .withMessage('Last name cannot be empty')
      .customSanitizer(sanitizeString),
    body('role')
      .optional()
      .isIn([
        'ADMIN',
        'MODEL_DEVELOPER',
        'MODEL_VALIDATOR',
        'RISK_MANAGER',
        'COMPLIANCE_OFFICER',
        'EXECUTIVE',
        'AUDITOR',
        'VIEWER',
      ])
      .withMessage('Invalid role'),
    body('status')
      .optional()
      .isIn(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_APPROVAL'])
      .withMessage('Invalid status'),
  ],
};

module.exports = {
  validate,
  rules,
  sanitizeString,
  body,
  param,
  query,
};
