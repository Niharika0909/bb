const { PrismaClient } = require('@prisma/client');
const { generateValidationId } = require('../utils/idGenerator');
const { NotFoundError, ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

class ValidationService {
  /**
   * Create a new validation
   */
  async create(data, validatorId) {
    // Verify model exists
    const model = await prisma.model.findUnique({
      where: { id: data.modelId },
    });

    if (!model) {
      throw new NotFoundError('Model');
    }

    const validationId = generateValidationId();

    const validation = await prisma.modelValidation.create({
      data: {
        validationId,
        modelId: data.modelId,
        validatorId,
        scope: data.scope,
        status: 'NOT_STARTED',
        plannedStartDate: data.plannedStartDate,
        plannedEndDate: data.plannedEndDate,
      },
      include: {
        model: {
          select: { id: true, modelId: true, name: true },
        },
        validator: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    // Update model status
    await prisma.model.update({
      where: { id: data.modelId },
      data: { status: 'PENDING_VALIDATION' },
    });

    logger.info(`Validation created: ${validationId} for model ${model.modelId}`);
    return validation;
  }

  /**
   * Get validation by ID
   */
  async getById(id) {
    const validation = await prisma.modelValidation.findUnique({
      where: { id },
      include: {
        model: {
          select: { id: true, modelId: true, name: true, type: true, tier: true },
        },
        validator: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        findings: {
          orderBy: { severity: 'asc' },
        },
        testResults: {
          orderBy: { createdAt: 'desc' },
        },
        documents: {
          where: { isLatest: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!validation) {
      throw new NotFoundError('Validation');
    }

    return validation;
  }

  /**
   * List validations with filtering
   */
  async list({
    page = 1,
    limit = 20,
    modelId,
    validatorId,
    status,
    scope,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  }) {
    const where = {};

    if (modelId) where.modelId = modelId;
    if (validatorId) where.validatorId = validatorId;
    if (status) where.status = status;
    if (scope) where.scope = scope;

    const [validations, total] = await Promise.all([
      prisma.modelValidation.findMany({
        where,
        include: {
          model: {
            select: { id: true, modelId: true, name: true },
          },
          validator: {
            select: { id: true, firstName: true, lastName: true },
          },
          _count: {
            select: { findings: true, testResults: true },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.modelValidation.count({ where }),
    ]);

    return { data: validations, total, page, limit };
  }

  /**
   * Start validation
   */
  async start(id, userId) {
    const validation = await this.getById(id);

    if (validation.status !== 'NOT_STARTED') {
      throw new ValidationError('Validation has already started');
    }

    const updated = await prisma.modelValidation.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        actualStartDate: new Date(),
      },
    });

    // Update model status
    await prisma.model.update({
      where: { id: validation.modelId },
      data: { status: 'IN_VALIDATION' },
    });

    logger.info(`Validation started: ${validation.validationId}`);
    return updated;
  }

  /**
   * Update validation details
   */
  async update(id, data, userId) {
    const validation = await this.getById(id);

    const updated = await prisma.modelValidation.update({
      where: { id },
      data: {
        conceptualSoundness: data.conceptualSoundness,
        dataQuality: data.dataQuality,
        performanceAnalysis: data.performanceAnalysis,
        implementationReview: data.implementationReview,
        outcomeAnalysis: data.outcomeAnalysis,
        overallScore: data.overallScore,
        conceptualScore: data.conceptualScore,
        dataScore: data.dataScore,
        performanceScore: data.performanceScore,
        implementationScore: data.implementationScore,
        conclusion: data.conclusion,
        recommendations: data.recommendations,
        conditions: data.conditions,
      },
      include: {
        model: {
          select: { id: true, modelId: true, name: true },
        },
        validator: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    logger.info(`Validation updated: ${validation.validationId}`);
    return updated;
  }

  /**
   * Complete validation
   */
  async complete(id, data, userId) {
    const validation = await this.getById(id);

    if (validation.status !== 'IN_PROGRESS') {
      throw new ValidationError('Validation must be in progress to complete');
    }

    const validUntil = new Date();
    validUntil.setFullYear(validUntil.getFullYear() + 1); // Valid for 1 year

    const updated = await prisma.modelValidation.update({
      where: { id },
      data: {
        status: data.status, // APPROVED, CONDITIONALLY_APPROVED, or REJECTED
        conclusion: data.conclusion,
        recommendations: data.recommendations,
        conditions: data.conditions,
        actualEndDate: new Date(),
        validUntil,
      },
    });

    // Update model status and validation dates
    await prisma.model.update({
      where: { id: validation.modelId },
      data: {
        status: 'VALIDATION_COMPLETE',
        lastValidationDate: new Date(),
        nextValidationDate: validUntil,
      },
    });

    logger.info(`Validation completed: ${validation.validationId} - ${data.status}`);
    return updated;
  }

  /**
   * Add test result
   */
  async addTestResult(validationId, data, userId) {
    const validation = await this.getById(validationId);

    const testResult = await prisma.testResult.create({
      data: {
        validationId,
        testName: data.testName,
        testCategory: data.testCategory,
        description: data.description,
        methodology: data.methodology,
        expectedResult: data.expectedResult,
        actualResult: data.actualResult,
        passed: data.passed,
        score: data.score,
        evidence: data.evidence,
        notes: data.notes,
        executedAt: new Date(),
      },
    });

    logger.info(`Test result added to validation: ${validation.validationId}`);
    return testResult;
  }

  /**
   * Get validation statistics
   */
  async getStatistics(filters = {}) {
    const where = {};
    if (filters.validatorId) where.validatorId = filters.validatorId;

    const [total, byStatus, byScope, averageScores] = await Promise.all([
      prisma.modelValidation.count({ where }),
      prisma.modelValidation.groupBy({
        by: ['status'],
        _count: true,
        where,
      }),
      prisma.modelValidation.groupBy({
        by: ['scope'],
        _count: true,
        where,
      }),
      prisma.modelValidation.aggregate({
        where: { ...where, status: { in: ['APPROVED', 'CONDITIONALLY_APPROVED'] } },
        _avg: {
          overallScore: true,
          conceptualScore: true,
          dataScore: true,
          performanceScore: true,
          implementationScore: true,
        },
      }),
    ]);

    return {
      total,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {}),
      byScope: byScope.reduce((acc, item) => {
        acc[item.scope] = item._count;
        return acc;
      }, {}),
      averageScores: averageScores._avg,
    };
  }

  /**
   * Get validations due soon
   */
  async getUpcomingValidations(days = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const models = await prisma.model.findMany({
      where: {
        nextValidationDate: {
          gte: new Date(),
          lte: futureDate,
        },
        status: { in: ['IN_PRODUCTION', 'APPROVED'] },
      },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        validations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { nextValidationDate: 'asc' },
    });

    return models;
  }

  /**
   * Get overdue validations
   */
  async getOverdueValidations() {
    const models = await prisma.model.findMany({
      where: {
        nextValidationDate: { lt: new Date() },
        status: { in: ['IN_PRODUCTION', 'APPROVED'] },
      },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { nextValidationDate: 'asc' },
    });

    return models;
  }
}

module.exports = new ValidationService();
