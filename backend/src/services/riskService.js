const { PrismaClient } = require('@prisma/client');
const { generateRiskAssessmentId } = require('../utils/idGenerator');
const { NotFoundError, ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

class RiskService {
  /**
   * Create a new risk assessment
   */
  async create(data, assessedById) {
    // Verify model exists
    const model = await prisma.model.findUnique({
      where: { id: data.modelId },
    });

    if (!model) {
      throw new NotFoundError('Model');
    }

    const assessmentId = generateRiskAssessmentId();

    // Calculate expected loss if potential loss and probability provided
    let expectedLoss = null;
    if (data.potentialLoss && data.probabilityOfLoss) {
      expectedLoss = parseFloat(data.potentialLoss) * parseFloat(data.probabilityOfLoss);
    }

    const assessment = await prisma.riskAssessment.create({
      data: {
        assessmentId,
        modelId: data.modelId,
        assessedById,
        inherentRisk: data.inherentRisk,
        controlEffectiveness: data.controlEffectiveness,
        residualRisk: data.residualRisk,
        modelRisk: data.modelRisk,
        dataRisk: data.dataRisk,
        operationalRisk: data.operationalRisk,
        regulatoryRisk: data.regulatoryRisk,
        reputationalRisk: data.reputationalRisk,
        potentialLoss: data.potentialLoss,
        probabilityOfLoss: data.probabilityOfLoss,
        expectedLoss,
        controls: data.controls,
        mitigatingFactors: data.mitigatingFactors,
        methodology: data.methodology,
        assumptions: data.assumptions,
        limitations: data.limitations,
        conclusion: data.conclusion,
        recommendations: data.recommendations,
        assessmentDate: new Date(),
        nextAssessmentDate: data.nextAssessmentDate,
      },
      include: {
        model: {
          select: { id: true, modelId: true, name: true },
        },
        assessedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Create risk factors if provided
    if (data.riskFactors && data.riskFactors.length > 0) {
      await prisma.riskFactor.createMany({
        data: data.riskFactors.map((factor) => ({
          assessmentId: assessment.id,
          category: factor.category,
          factor: factor.factor,
          description: factor.description,
          likelihood: factor.likelihood,
          impact: factor.impact,
          overallRisk: factor.overallRisk,
          mitigatingControls: factor.mitigatingControls,
        })),
      });
    }

    logger.info(`Risk assessment created: ${assessmentId} for model ${model.modelId}`);
    return assessment;
  }

  /**
   * Get risk assessment by ID
   */
  async getById(id) {
    const assessment = await prisma.riskAssessment.findUnique({
      where: { id },
      include: {
        model: {
          select: { id: true, modelId: true, name: true, type: true, tier: true },
        },
        assessedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        riskFactors: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundError('Risk Assessment');
    }

    return assessment;
  }

  /**
   * List risk assessments
   */
  async list({
    page = 1,
    limit = 20,
    modelId,
    assessedById,
    residualRisk,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  }) {
    const where = {};

    if (modelId) where.modelId = modelId;
    if (assessedById) where.assessedById = assessedById;
    if (residualRisk) where.residualRisk = residualRisk;

    const [assessments, total] = await Promise.all([
      prisma.riskAssessment.findMany({
        where,
        include: {
          model: {
            select: { id: true, modelId: true, name: true },
          },
          assessedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.riskAssessment.count({ where }),
    ]);

    return { data: assessments, total, page, limit };
  }

  /**
   * Update risk assessment
   */
  async update(id, data, userId) {
    const assessment = await this.getById(id);

    let expectedLoss = assessment.expectedLoss;
    if (data.potentialLoss !== undefined || data.probabilityOfLoss !== undefined) {
      const potentialLoss = data.potentialLoss ?? assessment.potentialLoss;
      const probability = data.probabilityOfLoss ?? assessment.probabilityOfLoss;
      if (potentialLoss && probability) {
        expectedLoss = parseFloat(potentialLoss) * parseFloat(probability);
      }
    }

    const updated = await prisma.riskAssessment.update({
      where: { id },
      data: {
        inherentRisk: data.inherentRisk,
        controlEffectiveness: data.controlEffectiveness,
        residualRisk: data.residualRisk,
        modelRisk: data.modelRisk,
        dataRisk: data.dataRisk,
        operationalRisk: data.operationalRisk,
        regulatoryRisk: data.regulatoryRisk,
        reputationalRisk: data.reputationalRisk,
        potentialLoss: data.potentialLoss,
        probabilityOfLoss: data.probabilityOfLoss,
        expectedLoss,
        controls: data.controls,
        mitigatingFactors: data.mitigatingFactors,
        conclusion: data.conclusion,
        recommendations: data.recommendations,
        nextAssessmentDate: data.nextAssessmentDate,
      },
    });

    logger.info(`Risk assessment updated: ${assessment.assessmentId}`);
    return updated;
  }

  /**
   * Add risk factor
   */
  async addRiskFactor(assessmentId, data, userId) {
    const assessment = await this.getById(assessmentId);

    const riskFactor = await prisma.riskFactor.create({
      data: {
        assessmentId,
        category: data.category,
        factor: data.factor,
        description: data.description,
        likelihood: data.likelihood,
        impact: data.impact,
        overallRisk: data.overallRisk,
        mitigatingControls: data.mitigatingControls,
      },
    });

    return riskFactor;
  }

  /**
   * Get risk statistics
   */
  async getStatistics(filters = {}) {
    const where = {};

    const [total, byResidualRisk, byInherentRisk, totalExposure, highRiskModels] =
      await Promise.all([
        prisma.riskAssessment.count({ where }),
        prisma.riskAssessment.groupBy({
          by: ['residualRisk'],
          _count: true,
          where,
        }),
        prisma.riskAssessment.groupBy({
          by: ['inherentRisk'],
          _count: true,
          where,
        }),
        prisma.riskAssessment.aggregate({
          _sum: {
            expectedLoss: true,
            potentialLoss: true,
          },
          where,
        }),
        prisma.riskAssessment.count({
          where: {
            ...where,
            residualRisk: { in: ['CRITICAL', 'HIGH'] },
          },
        }),
      ]);

    return {
      total,
      byResidualRisk: byResidualRisk.reduce((acc, item) => {
        acc[item.residualRisk] = item._count;
        return acc;
      }, {}),
      byInherentRisk: byInherentRisk.reduce((acc, item) => {
        acc[item.inherentRisk] = item._count;
        return acc;
      }, {}),
      totalExpectedLoss: totalExposure._sum.expectedLoss || 0,
      totalPotentialLoss: totalExposure._sum.potentialLoss || 0,
      highRiskModels,
    };
  }

  /**
   * Get risk heatmap data
   */
  async getRiskHeatmap() {
    const assessments = await prisma.riskAssessment.findMany({
      select: {
        inherentRisk: true,
        residualRisk: true,
        model: {
          select: { id: true, modelId: true, name: true, tier: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Create heatmap matrix
    const riskLevels = ['MINIMAL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const heatmap = {};

    riskLevels.forEach((inherent) => {
      heatmap[inherent] = {};
      riskLevels.forEach((residual) => {
        heatmap[inherent][residual] = { count: 0, models: [] };
      });
    });

    assessments.forEach((assessment) => {
      const { inherentRisk, residualRisk, model } = assessment;
      heatmap[inherentRisk][residualRisk].count++;
      heatmap[inherentRisk][residualRisk].models.push(model);
    });

    return heatmap;
  }

  /**
   * Get latest risk assessment for a model
   */
  async getLatestForModel(modelId) {
    const assessment = await prisma.riskAssessment.findFirst({
      where: { modelId },
      include: {
        assessedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        riskFactors: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return assessment;
  }
}

module.exports = new RiskService();
