const { PrismaClient } = require('@prisma/client');
const { generateFindingId } = require('../utils/idGenerator');
const { NotFoundError, ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

class FindingService {
  /**
   * Create a new finding
   */
  async create(data, createdById) {
    // Verify model exists
    const model = await prisma.model.findUnique({
      where: { id: data.modelId },
    });

    if (!model) {
      throw new NotFoundError('Model');
    }

    const findingId = generateFindingId();

    const finding = await prisma.finding.create({
      data: {
        findingId,
        modelId: data.modelId,
        validationId: data.validationId,
        title: data.title,
        description: data.description,
        severity: data.severity,
        status: 'OPEN',
        category: data.category,
        rootCause: data.rootCause,
        impact: data.impact,
        remediationPlan: data.remediationPlan,
        assignedToId: data.assignedToId,
        targetDate: data.targetDate,
      },
      include: {
        model: {
          select: { id: true, modelId: true, name: true },
        },
        validation: {
          select: { id: true, validationId: true },
        },
      },
    });

    logger.info(`Finding created: ${findingId} for model ${model.modelId}`);
    return finding;
  }

  /**
   * Get finding by ID
   */
  async getById(id) {
    const finding = await prisma.finding.findUnique({
      where: { id },
      include: {
        model: {
          select: { id: true, modelId: true, name: true, type: true },
        },
        validation: {
          select: { id: true, validationId: true, scope: true },
        },
        comments: {
          include: {
            author: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        documents: {
          where: { isLatest: true },
        },
      },
    });

    if (!finding) {
      throw new NotFoundError('Finding');
    }

    return finding;
  }

  /**
   * List findings with filtering
   */
  async list({
    page = 1,
    limit = 20,
    modelId,
    validationId,
    severity,
    status,
    category,
    assignedToId,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  }) {
    const where = {};

    if (modelId) where.modelId = modelId;
    if (validationId) where.validationId = validationId;
    if (severity) where.severity = severity;
    if (status) where.status = status;
    if (category) where.category = category;
    if (assignedToId) where.assignedToId = assignedToId;

    const [findings, total] = await Promise.all([
      prisma.finding.findMany({
        where,
        include: {
          model: {
            select: { id: true, modelId: true, name: true },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.finding.count({ where }),
    ]);

    return { data: findings, total, page, limit };
  }

  /**
   * Update finding
   */
  async update(id, data, userId) {
    const finding = await this.getById(id);

    const updated = await prisma.finding.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        severity: data.severity,
        category: data.category,
        rootCause: data.rootCause,
        impact: data.impact,
        remediationPlan: data.remediationPlan,
        assignedToId: data.assignedToId,
        targetDate: data.targetDate,
        managementResponse: data.managementResponse,
      },
    });

    logger.info(`Finding updated: ${finding.findingId}`);
    return updated;
  }

  /**
   * Update finding status
   */
  async updateStatus(id, status, userId, comments = null) {
    const finding = await this.getById(id);

    const updateData = { status };

    if (status === 'REMEDIATED' || status === 'CLOSED') {
      updateData.actualResolutionDate = new Date();
    }

    if (comments && status === 'ACCEPTED') {
      updateData.acceptanceRationale = comments;
    }

    const updated = await prisma.finding.update({
      where: { id },
      data: updateData,
    });

    // Add comment if provided
    if (comments) {
      await prisma.comment.create({
        data: {
          content: `Status changed to ${status}: ${comments}`,
          authorId: userId,
          findingId: id,
        },
      });
    }

    logger.info(`Finding status changed: ${finding.findingId} -> ${status}`);
    return updated;
  }

  /**
   * Get finding statistics
   */
  async getStatistics(filters = {}) {
    const where = {};
    if (filters.modelId) where.modelId = filters.modelId;

    const [total, bySeverity, byStatus, byCategory, overdue, aging] = await Promise.all([
      prisma.finding.count({ where }),
      prisma.finding.groupBy({
        by: ['severity'],
        _count: true,
        where,
      }),
      prisma.finding.groupBy({
        by: ['status'],
        _count: true,
        where,
      }),
      prisma.finding.groupBy({
        by: ['category'],
        _count: true,
        where,
      }),
      prisma.finding.count({
        where: {
          ...where,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          targetDate: { lt: new Date() },
        },
      }),
      this.getAgingAnalysis(where),
    ]);

    return {
      total,
      bySeverity: bySeverity.reduce((acc, item) => {
        acc[item.severity] = item._count;
        return acc;
      }, {}),
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {}),
      byCategory: byCategory.reduce((acc, item) => {
        acc[item.category] = item._count;
        return acc;
      }, {}),
      overdue,
      aging,
    };
  }

  /**
   * Get aging analysis for open findings
   */
  async getAgingAnalysis(baseWhere = {}) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const openFindings = {
      ...baseWhere,
      status: { in: ['OPEN', 'IN_PROGRESS'] },
    };

    const [lessThan30, between30And60, between60And90, moreThan90] = await Promise.all([
      prisma.finding.count({
        where: { ...openFindings, createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.finding.count({
        where: {
          ...openFindings,
          createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        },
      }),
      prisma.finding.count({
        where: {
          ...openFindings,
          createdAt: { gte: ninetyDaysAgo, lt: sixtyDaysAgo },
        },
      }),
      prisma.finding.count({
        where: { ...openFindings, createdAt: { lt: ninetyDaysAgo } },
      }),
    ]);

    return {
      '0-30 days': lessThan30,
      '31-60 days': between30And60,
      '61-90 days': between60And90,
      '90+ days': moreThan90,
    };
  }

  /**
   * Get critical and high severity open findings
   */
  async getCriticalFindings(limit = 10) {
    const findings = await prisma.finding.findMany({
      where: {
        severity: { in: ['CRITICAL', 'HIGH'] },
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
      include: {
        model: {
          select: { id: true, modelId: true, name: true },
        },
      },
      orderBy: [{ severity: 'asc' }, { createdAt: 'asc' }],
      take: limit,
    });

    return findings;
  }
}

module.exports = new FindingService();
