const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const config = require('../config');
const { NotFoundError, ValidationError, ConflictError } = require('../utils/errors');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

class UserService {
  /**
   * Create a new user (admin only)
   */
  async create(data, createdById) {
    // Check if email exists
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictError('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, config.security.bcryptRounds);

    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role || 'VIEWER',
        status: data.status || 'ACTIVE',
        department: data.department,
        title: data.title,
        phone: data.phone,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        department: true,
        title: true,
        createdAt: true,
      },
    });

    logger.info(`User created: ${user.email} by ${createdById}`);
    return user;
  }

  /**
   * Get user by ID
   */
  async getById(id) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        department: true,
        title: true,
        phone: true,
        avatar: true,
        lastLoginAt: true,
        mfaEnabled: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            modelsOwned: true,
            modelsValidated: true,
            tasks: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    return user;
  }

  /**
   * List users with filtering
   */
  async list({
    page = 1,
    limit = 20,
    role,
    status,
    department,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  }) {
    const where = {};

    if (role) where.role = role;
    if (status) where.status = status;
    if (department) where.department = department;

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          department: true,
          title: true,
          lastLoginAt: true,
          createdAt: true,
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return { data: users, total, page, limit };
  }

  /**
   * Update user
   */
  async update(id, data, updatedById) {
    const user = await this.getById(id);

    // Check email uniqueness if changing
    if (data.email && data.email.toLowerCase() !== user.email) {
      const existing = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
      });

      if (existing) {
        throw new ConflictError('Email already in use');
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        email: data.email?.toLowerCase(),
        firstName: data.firstName,
        lastName: data.lastName,
        department: data.department,
        title: data.title,
        phone: data.phone,
        avatar: data.avatar,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        department: true,
        title: true,
        phone: true,
        avatar: true,
      },
    });

    logger.info(`User updated: ${updated.email} by ${updatedById}`);
    return updated;
  }

  /**
   * Update user role (admin only)
   */
  async updateRole(id, role, updatedById) {
    const user = await this.getById(id);

    if (id === updatedById) {
      throw new ValidationError('Cannot change your own role');
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, role: true },
    });

    logger.info(`User role changed: ${user.email} to ${role} by ${updatedById}`);
    return updated;
  }

  /**
   * Update user status (admin only)
   */
  async updateStatus(id, status, updatedById) {
    const user = await this.getById(id);

    if (id === updatedById && status !== 'ACTIVE') {
      throw new ValidationError('Cannot deactivate your own account');
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { status },
      select: { id: true, email: true, status: true },
    });

    // Invalidate sessions if suspending/deactivating
    if (status !== 'ACTIVE') {
      await prisma.session.deleteMany({ where: { userId: id } });
    }

    logger.info(`User status changed: ${user.email} to ${status} by ${updatedById}`);
    return updated;
  }

  /**
   * Reset user password (admin only)
   */
  async resetPassword(id, newPassword, resetById) {
    const user = await this.getById(id);

    const passwordHash = await bcrypt.hash(newPassword, config.security.bcryptRounds);

    await prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    // Invalidate all sessions
    await prisma.session.deleteMany({ where: { userId: id } });

    logger.info(`User password reset: ${user.email} by ${resetById}`);
  }

  /**
   * Delete user (soft delete by setting status to INACTIVE)
   */
  async delete(id, deletedById) {
    const user = await this.getById(id);

    if (id === deletedById) {
      throw new ValidationError('Cannot delete your own account');
    }

    await prisma.user.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    // Invalidate sessions
    await prisma.session.deleteMany({ where: { userId: id } });

    logger.info(`User deleted: ${user.email} by ${deletedById}`);
  }

  /**
   * Get users by role
   */
  async getByRole(role) {
    return prisma.user.findMany({
      where: { role, status: 'ACTIVE' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        department: true,
      },
      orderBy: { firstName: 'asc' },
    });
  }

  /**
   * Get user's notifications
   */
  async getNotifications(userId, unreadOnly = false) {
    const where = { userId };
    if (unreadOnly) where.isRead = false;

    return prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Mark notifications as read
   */
  async markNotificationsRead(userId, notificationIds = null) {
    const where = { userId };
    if (notificationIds) {
      where.id = { in: notificationIds };
    }

    await prisma.notification.updateMany({
      where,
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Get user statistics
   */
  async getStatistics() {
    const [total, byRole, byStatus, activeLastMonth] = await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({ by: ['role'], _count: true }),
      prisma.user.groupBy({ by: ['status'], _count: true }),
      prisma.user.count({
        where: {
          lastLoginAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return {
      total,
      byRole: byRole.reduce((acc, item) => {
        acc[item.role] = item._count;
        return acc;
      }, {}),
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {}),
      activeLastMonth,
    };
  }
}

module.exports = new UserService();
