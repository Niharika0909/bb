const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const config = require('../config');
const { AuthenticationError, AuthorizationError } = require('../utils/errors');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * JWT Authentication Middleware
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No authentication token provided');
    }

    const token = authHeader.split(' ')[1];

    // Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new AuthenticationError('Token has expired');
      }
      throw new AuthenticationError('Invalid token');
    }

    // Check if user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        department: true,
        title: true,
        mfaEnabled: true,
      },
    });

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    if (user.status !== 'ACTIVE') {
      throw new AuthenticationError('Account is not active');
    }

    // Check if account is locked
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      throw new AuthenticationError('Account is temporarily locked');
    }

    // Attach user to request
    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          department: true,
        },
      });

      if (user && user.status === 'ACTIVE') {
        req.user = user;
        req.token = token;
      }
    } catch (err) {
      // Token invalid, but continue without user
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role-based access control middleware
 * @param {string[]} allowedRoles - Array of roles allowed to access the route
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`Access denied for user ${req.user.id} with role ${req.user.role}`);
      return next(new AuthorizationError('Insufficient permissions'));
    }

    next();
  };
};

/**
 * Check if user has any of the specified roles
 */
const hasRole = (user, ...roles) => {
  return roles.includes(user.role);
};

/**
 * Admin-only middleware
 */
const adminOnly = authorize('ADMIN');

/**
 * Roles that can manage models
 */
const modelManagers = authorize('ADMIN', 'MODEL_DEVELOPER', 'RISK_MANAGER');

/**
 * Roles that can validate models
 */
const validators = authorize('ADMIN', 'MODEL_VALIDATOR', 'RISK_MANAGER');

/**
 * Roles that can view all data
 */
const allStaff = authorize(
  'ADMIN',
  'MODEL_DEVELOPER',
  'MODEL_VALIDATOR',
  'RISK_MANAGER',
  'COMPLIANCE_OFFICER',
  'EXECUTIVE',
  'AUDITOR',
  'VIEWER'
);

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  hasRole,
  adminOnly,
  modelManagers,
  validators,
  allStaff,
};
