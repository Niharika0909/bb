const { PrismaClient } = require('@prisma/client');
const { generateModelId } = require('../utils/idGenerator');
const { NotFoundError, ValidationError, AuthorizationError } = require('../utils/errors');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

class ModelService {
  /**
   * Create a new model
   */
  async create(data, userId) {
    const modelId = generateModelId();

    const model = await prisma.model.create({
      data: {
        modelId,
        name: data.name,
        description: data.description,
        type: data.type,
        tier: data.tier || 'TIER_3_MEDIUM',
        status: 'DRAFT',
        ownerId: userId,
        developerId: data.developerId || userId,
        businessUnit: data.businessUnit,
        algorithm: data.algorithm,
        programmingLanguage: data.programmingLanguage,
        framework: data.framework,
        inputVariables: data.inputVariables,
        outputVariables: data.outputVariables,
        dependencies: data.dependencies,
        businessPurpose: data.businessPurpose,
        intendedUse: data.intendedUse,
        limitations: data.limitations,
        assumptions: data.assumptions,
        materialityScore: data.materialityScore,
        annualRevenue: data.annualRevenue,
        portfolioExposure: data.portfolioExposure,
        developmentStartDate: data.developmentStartDate,
        tags: data.tags || [],
      },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        developer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    logger.info(`Model created: ${modelId} by user ${userId}`);
    return model;
  }

  /**
   * Get model by ID
   */
  async getById(id, includeRelations = true) {
    const include = includeRelations
      ? {
          owner: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          developer: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          validations: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
              validator: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
          riskAssessments: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          findings: {
            where: { status: { notIn: ['CLOSED', 'REMEDIATED'] } },
            orderBy: { severity: 'asc' },
          },
          documents: {
            where: { isLatest: true },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          _count: {
            select: {
              validations: true,
              findings: true,
              documents: true,
              tasks: true,
              comments: true,
            },
          },
        }
      : undefined;

    const model = await prisma.model.findUnique({
      where: { id },
      include,
    });

    if (!model) {
      throw new NotFoundError('Model');
    }

    return model;
  }

  /**
   * Get model by model ID (human-readable)
   */
  async getByModelId(modelId) {
    const model = await prisma.model.findUnique({
      where: { modelId },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        developer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!model) {
      throw new NotFoundError('Model');
    }

    return model;
  }

  /**
   * List models with filtering and pagination
   */
  async list({
    page = 1,
    limit = 20,
    status,
    tier,
    type,
    businessUnit,
    ownerId,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  }) {
    const where = {};

    if (status) where.status = status;
    if (tier) where.tier = tier;
    if (type) where.type = type;
    if (businessUnit) where.businessUnit = businessUnit;
    if (ownerId) where.ownerId = ownerId;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { modelId: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [models, total] = await Promise.all([
      prisma.model.findMany({
        where,
        include: {
          owner: {
            select: { id: true, firstName: true, lastName: true },
          },
          _count: {
            select: { validations: true, findings: true },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.model.count({ where }),
    ]);

    return { data: models, total, page, limit };
  }

  /**
   * Update model
   */
  async update(id, data, userId) {
    const model = await this.getById(id, false);

    // Track changes for audit log
    const oldValues = { ...model };

    const updated = await prisma.model.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        tier: data.tier,
        status: data.status,
        developerId: data.developerId,
        businessUnit: data.businessUnit,
        algorithm: data.algorithm,
        programmingLanguage: data.programmingLanguage,
        framework: data.framework,
        inputVariables: data.inputVariables,
        outputVariables: data.outputVariables,
        dependencies: data.dependencies,
        businessPurpose: data.businessPurpose,
        intendedUse: data.intendedUse,
        limitations: data.limitations,
        assumptions: data.assumptions,
        materialityScore: data.materialityScore,
        annualRevenue: data.annualRevenue,
        portfolioExposure: data.portfolioExposure,
        productionDate: data.productionDate,
        nextValidationDate: data.nextValidationDate,
        retirementDate: data.retirementDate,
        tags: data.tags,
      },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    // Create change log
    await this.createChangeLog(id, oldValues, updated, userId);

    logger.info(`Model updated: ${model.modelId} by user ${userId}`);
    return updated;
  }

  /**
   * Update model status
   */
  async updateStatus(id, status, userId, reason = null) {
    const model = await this.getById(id, false);
    const oldStatus = model.status;

    // Validate status transition
    this.validateStatusTransition(oldStatus, status);

    const updated = await prisma.model.update({
      where: { id },
      data: { status },
    });

    // Create change log
    await prisma.modelChangeLog.create({
      data: {
        modelId: id,
        changeType: 'STATUS_CHANGE',
        fieldName: 'status',
        oldValue: oldStatus,
        newValue: status,
        changedBy: userId,
        reason,
      },
    });

    logger.info(`Model status changed: ${model.modelId} ${oldStatus} -> ${status}`);
    return updated;
  }

  /**
   * Validate status transition
   */
  validateStatusTransition(currentStatus, newStatus) {
    const validTransitions = {
      DRAFT: ['UNDER_DEVELOPMENT', 'RETIRED'],
      UNDER_DEVELOPMENT: ['PENDING_VALIDATION', 'DRAFT', 'RETIRED'],
      PENDING_VALIDATION: ['IN_VALIDATION', 'UNDER_DEVELOPMENT', 'RETIRED'],
      IN_VALIDATION: ['VALIDATION_COMPLETE', 'PENDING_VALIDATION', 'RETIRED'],
      VALIDATION_COMPLETE: ['PENDING_APPROVAL', 'IN_VALIDATION', 'RETIRED'],
      PENDING_APPROVAL: ['APPROVED', 'REJECTED', 'VALIDATION_COMPLETE'],
      APPROVED: ['IN_PRODUCTION', 'PENDING_APPROVAL'],
      IN_PRODUCTION: ['DEPRECATED', 'PENDING_VALIDATION'],
      DEPRECATED: ['RETIRED', 'IN_PRODUCTION'],
      RETIRED: [],
      REJECTED: ['DRAFT', 'RETIRED'],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new ValidationError(
        `Invalid status transition from ${currentStatus} to ${newStatus}`
      );
    }
  }

  /**
   * Delete model (soft delete by retiring)
   */
  async delete(id, userId) {
    const model = await this.getById(id, false);

    await prisma.model.update({
      where: { id },
      data: { status: 'RETIRED', retirementDate: new Date() },
    });

    logger.info(`Model retired: ${model.modelId} by user ${userId}`);
  }

  /**
   * Create change log entry
   */
  async createChangeLog(modelId, oldValues, newValues, userId) {
    const changes = [];

    const trackedFields = [
      'name',
      'description',
      'type',
      'tier',
      'status',
      'businessUnit',
      'algorithm',
      'framework',
    ];

    for (const field of trackedFields) {
      if (oldValues[field] !== newValues[field]) {
        changes.push({
          modelId,
          changeType: 'UPDATE',
          fieldName: field,
          oldValue: String(oldValues[field] || ''),
          newValue: String(newValues[field] || ''),
          changedBy: userId,
        });
      }
    }

    if (changes.length > 0) {
      await prisma.modelChangeLog.createMany({ data: changes });
    }
  }

  /**
   * Get model statistics
   */
  async getStatistics(filters = {}) {
    const where = {};
    if (filters.businessUnit) where.businessUnit = filters.businessUnit;

    const [
      total,
      byStatus,
      byTier,
      byType,
      pendingValidation,
      overdueValidation,
    ] = await Promise.all([
      prisma.model.count({ where }),
      prisma.model.groupBy({
        by: ['status'],
        _count: true,
        where,
      }),
      prisma.model.groupBy({
        by: ['tier'],
        _count: true,
        where,
      }),
      prisma.model.groupBy({
        by: ['type'],
        _count: true,
        where,
      }),
      prisma.model.count({
        where: { ...where, status: 'PENDING_VALIDATION' },
      }),
      prisma.model.count({
        where: {
          ...where,
          nextValidationDate: { lt: new Date() },
          status: { in: ['IN_PRODUCTION', 'APPROVED'] },
        },
      }),
    ]);

    return {
      total,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {}),
      byTier: byTier.reduce((acc, item) => {
        acc[item.tier] = item._count;
        return acc;
      }, {}),
      byType: byType.reduce((acc, item) => {
        acc[item.type] = item._count;
        return acc;
      }, {}),
      pendingValidation,
      overdueValidation,
    };
  }

  /**
   * Get models requiring attention
   */
  async getModelsRequiringAttention(userId, role) {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const conditions = [];

    // Overdue validations
    conditions.push({
      nextValidationDate: { lt: now },
      status: { in: ['IN_PRODUCTION', 'APPROVED'] },
    });

    // Upcoming validations
    conditions.push({
      nextValidationDate: { gte: now, lte: thirtyDaysFromNow },
      status: { in: ['IN_PRODUCTION', 'APPROVED'] },
    });

    // Pending approvals
    conditions.push({
      status: 'PENDING_APPROVAL',
    });

    // Open critical findings
    if (role === 'MODEL_DEVELOPER' || role === 'MODEL_VALIDATOR') {
      conditions.push({
        findings: {
          some: {
            severity: { in: ['CRITICAL', 'HIGH'] },
            status: { in: ['OPEN', 'IN_PROGRESS'] },
          },
        },
      });
    }

    const models = await prisma.model.findMany({
      where: { OR: conditions },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true },
        },
        _count: {
          select: { findings: true },
        },
      },
      orderBy: { nextValidationDate: 'asc' },
      take: 20,
    });

    return models;
  }
}

module.exports = new ModelService();
