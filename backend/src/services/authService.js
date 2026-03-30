const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const { PrismaClient } = require('@prisma/client');
const config = require('../config');
const {
  AuthenticationError,
  ValidationError,
  NotFoundError,
} = require('../utils/errors');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

class AuthService {
  /**
   * Register a new user
   */
  async register({ email, password, firstName, lastName, role = 'VIEWER', department = null }) {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new ValidationError('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, config.security.bcryptRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        role,
        department,
        status: 'PENDING_APPROVAL',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    logger.info(`New user registered: ${user.email}`);
    return user;
  }

  /**
   * Login user
   */
  async login({ email, password, mfaCode = null }) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Check if account is locked
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const remainingMinutes = Math.ceil(
        (new Date(user.lockedUntil) - new Date()) / 60000
      );
      throw new AuthenticationError(
        `Account is locked. Try again in ${remainingMinutes} minutes`
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      // Increment failed attempts
      const failedAttempts = user.failedLoginAttempts + 1;
      const updates = { failedLoginAttempts: failedAttempts };

      // Lock account if max attempts reached
      if (failedAttempts >= config.security.maxLoginAttempts) {
        updates.lockedUntil = new Date(
          Date.now() + config.security.lockoutDuration * 60000
        );
        logger.warn(`Account locked due to failed attempts: ${user.email}`);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updates,
      });

      throw new AuthenticationError('Invalid credentials');
    }

    // Check account status
    if (user.status !== 'ACTIVE') {
      throw new AuthenticationError(
        `Account is ${user.status.toLowerCase().replace('_', ' ')}`
      );
    }

    // Check MFA if enabled
    if (user.mfaEnabled) {
      if (!mfaCode) {
        return { requiresMfa: true, userId: user.id };
      }

      const isValidMfa = authenticator.verify({
        token: mfaCode,
        secret: user.mfaSecret,
      });

      if (!isValidMfa) {
        throw new AuthenticationError('Invalid MFA code');
      }
    }

    // Reset failed attempts and update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Store session
    await prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    logger.info(`User logged in: ${user.email}`);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        department: user.department,
      },
    };
  }

  /**
   * Logout user
   */
  async logout(userId, token) {
    await prisma.session.deleteMany({
      where: {
        userId,
        token,
      },
    });

    logger.info(`User logged out: ${userId}`);
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.jwt.secret);
    } catch (err) {
      throw new AuthenticationError('Invalid refresh token');
    }

    // Check if session exists
    const session = await prisma.session.findFirst({
      where: {
        userId: decoded.userId,
        token: refreshToken,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!session) {
      throw new AuthenticationError('Session expired or invalid');
    }

    if (session.user.status !== 'ACTIVE') {
      throw new AuthenticationError('Account is not active');
    }

    // Generate new access token
    const accessToken = this.generateAccessToken(session.user);

    return { accessToken };
  }

  /**
   * Change password
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(
      newPassword,
      config.security.bcryptRounds
    );

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Invalidate all sessions
    await prisma.session.deleteMany({
      where: { userId },
    });

    logger.info(`Password changed for user: ${userId}`);
  }

  /**
   * Setup MFA
   */
  async setupMfa(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    if (user.mfaEnabled) {
      throw new ValidationError('MFA is already enabled');
    }

    // Generate secret
    const secret = authenticator.generateSecret();

    // Generate OTP auth URL
    const otpauthUrl = authenticator.keyuri(
      user.email,
      config.security.mfaIssuer,
      secret
    );

    // Generate QR code
    const qrCode = await QRCode.toDataURL(otpauthUrl);

    // Store secret temporarily (will be confirmed later)
    await prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret },
    });

    return { secret, qrCode, otpauthUrl };
  }

  /**
   * Verify and enable MFA
   */
  async enableMfa(userId, code) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.mfaSecret) {
      throw new ValidationError('MFA setup not initiated');
    }

    const isValid = authenticator.verify({
      token: code,
      secret: user.mfaSecret,
    });

    if (!isValid) {
      throw new ValidationError('Invalid verification code');
    }

    await prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true },
    });

    logger.info(`MFA enabled for user: ${userId}`);
    return { enabled: true };
  }

  /**
   * Disable MFA
   */
  async disableMfa(userId, password) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new AuthenticationError('Invalid password');
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
      },
    });

    logger.info(`MFA disabled for user: ${userId}`);
    return { disabled: true };
  }

  /**
   * Generate access token
   */
  generateAccessToken(user) {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        type: 'access',
      },
      config.jwt.secret,
      { expiresIn: config.jwt.accessTokenExpiry }
    );
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(user) {
    return jwt.sign(
      {
        userId: user.id,
        type: 'refresh',
      },
      config.jwt.secret,
      { expiresIn: config.jwt.refreshTokenExpiry }
    );
  }
}

module.exports = new AuthService();
