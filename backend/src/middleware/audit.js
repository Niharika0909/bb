const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * Create audit log entry
 */
const createAuditLog = async ({
  userId,
  action,
  entityType,
  entityId = null,
  oldValues = null,
  newValues = null,
  ipAddress = null,
  userAgent = null,
  requestId = null,
  severity = 'INFO',
  description = null,
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        oldValues,
        newValues,
        ipAddress,
        userAgent,
        requestId,
        severity,
        description,
      },
    });
  } catch (error) {
    logger.error('Failed to create audit log:', error);
  }
};

/**
 * Audit middleware - attaches audit helper to request
 */
const auditMiddleware = (req, res, next) => {
  // Generate unique request ID
  req.requestId = uuidv4();

  // Attach audit helper to request
  req.audit = async ({
    action,
    entityType,
    entityId = null,
    oldValues = null,
    newValues = null,
    severity = 'INFO',
    description = null,
  }) => {
    await createAuditLog({
      userId: req.user?.id || null,
      action,
      entityType,
      entityId,
      oldValues,
      newValues,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      requestId: req.requestId,
      severity,
      description,
    });
  };

  // Add request ID to response headers
  res.setHeader('X-Request-ID', req.requestId);

  next();
};

/**
 * Log sensitive operations
 */
const auditActions = {
  // Authentication
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  LOGIN_FAILED: 'LOGIN_FAILED',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  MFA_ENABLED: 'MFA_ENABLED',
  MFA_DISABLED: 'MFA_DISABLED',

  // CRUD Operations
  CREATE: 'CREATE',
  READ: 'READ',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',

  // Model Operations
  MODEL_SUBMITTED: 'MODEL_SUBMITTED',
  MODEL_APPROVED: 'MODEL_APPROVED',
  MODEL_REJECTED: 'MODEL_REJECTED',
  MODEL_RETIRED: 'MODEL_RETIRED',

  // Validation Operations
  VALIDATION_STARTED: 'VALIDATION_STARTED',
  VALIDATION_COMPLETED: 'VALIDATION_COMPLETED',

  // Workflow Operations
  WORKFLOW_INITIATED: 'WORKFLOW_INITIATED',
  WORKFLOW_APPROVED: 'WORKFLOW_APPROVED',
  WORKFLOW_REJECTED: 'WORKFLOW_REJECTED',

  // Document Operations
  DOCUMENT_UPLOADED: 'DOCUMENT_UPLOADED',
  DOCUMENT_DOWNLOADED: 'DOCUMENT_DOWNLOADED',
  DOCUMENT_DELETED: 'DOCUMENT_DELETED',

  // Export Operations
  DATA_EXPORTED: 'DATA_EXPORTED',
  REPORT_GENERATED: 'REPORT_GENERATED',

  // Admin Operations
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_SUSPENDED: 'USER_SUSPENDED',
  ROLE_CHANGED: 'ROLE_CHANGED',
  SETTINGS_CHANGED: 'SETTINGS_CHANGED',
};

/**
 * Severity levels
 */
const severity = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL',
};

module.exports = {
  createAuditLog,
  auditMiddleware,
  auditActions,
  severity,
};
