const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

class DashboardService {
  /**
   * Get executive dashboard data
   */
  async getExecutiveDashboard() {
    const [
      modelStats,
      riskStats,
      validationStats,
      findingStats,
      complianceMetrics,
      trendData,
    ] = await Promise.all([
      this.getModelOverview(),
      this.getRiskOverview(),
      this.getValidationOverview(),
      this.getFindingOverview(),
      this.getComplianceMetrics(),
      this.getTrendData(),
    ]);

    return {
      summary: {
        totalModels: modelStats.total,
        modelsInProduction: modelStats.inProduction,
        criticalRiskModels: riskStats.criticalHighRisk,
        pendingApprovals: modelStats.pendingApproval,
        openFindings: findingStats.open,
        overdueValidations: validationStats.overdue,
      },
      modelStats,
      riskStats,
      validationStats,
      findingStats,
      complianceMetrics,
      trends: trendData,
    };
  }

  /**
   * Get model developer dashboard
   */
  async getModelDeveloperDashboard(userId) {
    const [myModels, myTasks, myFindings, pendingValidations, recentActivity] =
      await Promise.all([
        prisma.model.findMany({
          where: {
            OR: [{ ownerId: userId }, { developerId: userId }],
          },
          include: {
            _count: { select: { findings: true, validations: true } },
          },
          orderBy: { updatedAt: 'desc' },
          take: 10,
        }),
        prisma.task.findMany({
          where: {
            assigneeId: userId,
            status: { in: ['PENDING', 'IN_PROGRESS'] },
          },
          include: {
            model: { select: { id: true, modelId: true, name: true } },
          },
          orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
          take: 10,
        }),
        prisma.finding.findMany({
          where: {
            model: {
              OR: [{ ownerId: userId }, { developerId: userId }],
            },
            status: { in: ['OPEN', 'IN_PROGRESS'] },
          },
          include: {
            model: { select: { id: true, modelId: true, name: true } },
          },
          orderBy: { severity: 'asc' },
          take: 10,
        }),
        prisma.model.findMany({
          where: {
            OR: [{ ownerId: userId }, { developerId: userId }],
            status: 'PENDING_VALIDATION',
          },
          take: 5,
        }),
        this.getRecentActivityForUser(userId),
      ]);

    const stats = await this.getStatsForModels(
      myModels.map((m) => m.id)
    );

    return {
      summary: {
        totalModels: myModels.length,
        pendingTasks: myTasks.length,
        openFindings: myFindings.length,
        pendingValidations: pendingValidations.length,
      },
      models: myModels,
      tasks: myTasks,
      findings: myFindings,
      pendingValidations,
      stats,
      recentActivity,
    };
  }

  /**
   * Get model validator dashboard
   */
  async getModelValidatorDashboard(userId) {
    const [
      activeValidations,
      pendingValidations,
      myFindings,
      pendingApprovals,
      validationStats,
      upcomingDeadlines,
    ] = await Promise.all([
      prisma.modelValidation.findMany({
        where: {
          validatorId: userId,
          status: 'IN_PROGRESS',
        },
        include: {
          model: { select: { id: true, modelId: true, name: true, tier: true } },
          _count: { select: { findings: true, testResults: true } },
        },
        orderBy: { plannedEndDate: 'asc' },
      }),
      prisma.modelValidation.findMany({
        where: {
          validatorId: userId,
          status: 'NOT_STARTED',
        },
        include: {
          model: { select: { id: true, modelId: true, name: true, tier: true } },
        },
        orderBy: { plannedStartDate: 'asc' },
        take: 10,
      }),
      prisma.finding.findMany({
        where: {
          validation: { validatorId: userId },
          status: { in: ['OPEN', 'PENDING_VERIFICATION'] },
        },
        include: {
          model: { select: { id: true, modelId: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.workflow.findMany({
        where: {
          status: { in: ['PENDING', 'IN_PROGRESS'] },
          steps: {
            some: {
              approverRole: 'MODEL_VALIDATOR',
              isCompleted: false,
            },
          },
        },
        include: {
          model: { select: { id: true, modelId: true, name: true } },
        },
        take: 10,
      }),
      this.getValidatorStats(userId),
      this.getUpcomingDeadlines(userId, 'MODEL_VALIDATOR'),
    ]);

    return {
      summary: {
        activeValidations: activeValidations.length,
        pendingValidations: pendingValidations.length,
        findingsCreated: validationStats.findingsCreated,
        pendingApprovals: pendingApprovals.length,
      },
      activeValidations,
      pendingValidations,
      findings: myFindings,
      pendingApprovals,
      stats: validationStats,
      upcomingDeadlines,
    };
  }

  /**
   * Get risk manager dashboard
   */
  async getRiskManagerDashboard(userId) {
    const [
      riskOverview,
      criticalModels,
      recentAssessments,
      pendingApprovals,
      riskTrends,
      heatmap,
    ] = await Promise.all([
      this.getRiskOverview(),
      prisma.model.findMany({
        where: {
          riskAssessments: {
            some: { residualRisk: { in: ['CRITICAL', 'HIGH'] } },
          },
        },
        include: {
          riskAssessments: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: { select: { findings: true } },
        },
        take: 10,
      }),
      prisma.riskAssessment.findMany({
        include: {
          model: { select: { id: true, modelId: true, name: true } },
          assessedBy: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.workflow.findMany({
        where: {
          status: { in: ['PENDING', 'IN_PROGRESS'] },
          steps: {
            some: {
              approverRole: 'RISK_MANAGER',
              isCompleted: false,
            },
          },
        },
        include: {
          model: { select: { id: true, modelId: true, name: true } },
        },
        take: 10,
      }),
      this.getRiskTrends(),
      this.getRiskHeatmap(),
    ]);

    return {
      summary: {
        totalModels: riskOverview.total,
        criticalRiskModels: riskOverview.criticalHighRisk,
        totalExpectedLoss: riskOverview.totalExpectedLoss,
        pendingApprovals: pendingApprovals.length,
      },
      riskOverview,
      criticalModels,
      recentAssessments,
      pendingApprovals,
      riskTrends,
      heatmap,
    };
  }

  /**
   * Get admin dashboard
   */
  async getAdminDashboard() {
    const [
      userStats,
      systemStats,
      auditSummary,
      recentActivity,
      pendingApprovals,
    ] = await Promise.all([
      this.getUserStats(),
      this.getSystemStats(),
      this.getAuditSummary(),
      this.getRecentSystemActivity(),
      prisma.user.findMany({
        where: { status: 'PENDING_APPROVAL' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      userStats,
      systemStats,
      auditSummary,
      recentActivity,
      pendingApprovals,
    };
  }

  // Helper methods

  async getModelOverview() {
    const [total, byStatus, byTier, recentlyUpdated] = await Promise.all([
      prisma.model.count(),
      prisma.model.groupBy({ by: ['status'], _count: true }),
      prisma.model.groupBy({ by: ['tier'], _count: true }),
      prisma.model.count({
        where: {
          updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
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
      inProduction: byStatus.find((s) => s.status === 'IN_PRODUCTION')?._count || 0,
      pendingApproval: byStatus.find((s) => s.status === 'PENDING_APPROVAL')?._count || 0,
      recentlyUpdated,
    };
  }

  async getRiskOverview() {
    const [assessments, byRisk, exposure] = await Promise.all([
      prisma.riskAssessment.count(),
      prisma.riskAssessment.groupBy({ by: ['residualRisk'], _count: true }),
      prisma.riskAssessment.aggregate({
        _sum: { expectedLoss: true, potentialLoss: true },
      }),
    ]);

    const criticalHighRisk =
      (byRisk.find((r) => r.residualRisk === 'CRITICAL')?._count || 0) +
      (byRisk.find((r) => r.residualRisk === 'HIGH')?._count || 0);

    return {
      total: assessments,
      byRisk: byRisk.reduce((acc, item) => {
        acc[item.residualRisk] = item._count;
        return acc;
      }, {}),
      criticalHighRisk,
      totalExpectedLoss: exposure._sum.expectedLoss || 0,
      totalPotentialLoss: exposure._sum.potentialLoss || 0,
    };
  }

  async getValidationOverview() {
    const [total, byStatus, overdue, upcoming] = await Promise.all([
      prisma.modelValidation.count(),
      prisma.modelValidation.groupBy({ by: ['status'], _count: true }),
      prisma.model.count({
        where: {
          nextValidationDate: { lt: new Date() },
          status: { in: ['IN_PRODUCTION', 'APPROVED'] },
        },
      }),
      prisma.model.count({
        where: {
          nextValidationDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
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
      overdue,
      upcoming,
    };
  }

  async getFindingOverview() {
    const [total, bySeverity, byStatus, aging] = await Promise.all([
      prisma.finding.count(),
      prisma.finding.groupBy({
        by: ['severity'],
        _count: true,
        where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
      }),
      prisma.finding.groupBy({ by: ['status'], _count: true }),
      this.getFindingAging(),
    ]);

    return {
      total,
      open:
        (byStatus.find((s) => s.status === 'OPEN')?._count || 0) +
        (byStatus.find((s) => s.status === 'IN_PROGRESS')?._count || 0),
      bySeverity: bySeverity.reduce((acc, item) => {
        acc[item.severity] = item._count;
        return acc;
      }, {}),
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {}),
      aging,
    };
  }

  async getFindingAging() {
    const now = new Date();
    const [lessThan30, between30And60, moreThan60] = await Promise.all([
      prisma.finding.count({
        where: {
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.finding.count({
        where: {
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          createdAt: {
            gte: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
            lt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.finding.count({
        where: {
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          createdAt: { lt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return {
      '0-30 days': lessThan30,
      '31-60 days': between30And60,
      '60+ days': moreThan60,
    };
  }

  async getComplianceMetrics() {
    const [
      modelsWithDocumentation,
      modelsWithValidation,
      modelsWithRiskAssessment,
    ] = await Promise.all([
      prisma.model.count({
        where: {
          documents: { some: {} },
          status: { in: ['IN_PRODUCTION', 'APPROVED'] },
        },
      }),
      prisma.model.count({
        where: {
          lastValidationDate: { not: null },
          status: { in: ['IN_PRODUCTION', 'APPROVED'] },
        },
      }),
      prisma.model.count({
        where: {
          riskAssessments: { some: {} },
          status: { in: ['IN_PRODUCTION', 'APPROVED'] },
        },
      }),
    ]);

    const totalProduction = await prisma.model.count({
      where: { status: { in: ['IN_PRODUCTION', 'APPROVED'] } },
    });

    return {
      documentationCoverage: totalProduction
        ? ((modelsWithDocumentation / totalProduction) * 100).toFixed(1)
        : 0,
      validationCoverage: totalProduction
        ? ((modelsWithValidation / totalProduction) * 100).toFixed(1)
        : 0,
      riskAssessmentCoverage: totalProduction
        ? ((modelsWithRiskAssessment / totalProduction) * 100).toFixed(1)
        : 0,
    };
  }

  async getTrendData() {
    // Get monthly data for the last 6 months
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      months.push({
        month: date.toISOString().slice(0, 7),
        start: new Date(date.getFullYear(), date.getMonth(), 1),
        end: new Date(date.getFullYear(), date.getMonth() + 1, 0),
      });
    }

    const trends = await Promise.all(
      months.map(async ({ month, start, end }) => {
        const [newModels, validations, findings] = await Promise.all([
          prisma.model.count({
            where: { createdAt: { gte: start, lte: end } },
          }),
          prisma.modelValidation.count({
            where: { createdAt: { gte: start, lte: end } },
          }),
          prisma.finding.count({
            where: { createdAt: { gte: start, lte: end } },
          }),
        ]);

        return { month, newModels, validations, findings };
      })
    );

    return trends;
  }

  async getValidatorStats(userId) {
    const [completed, inProgress, findingsCreated, avgScore] = await Promise.all([
      prisma.modelValidation.count({
        where: {
          validatorId: userId,
          status: { in: ['APPROVED', 'CONDITIONALLY_APPROVED'] },
        },
      }),
      prisma.modelValidation.count({
        where: { validatorId: userId, status: 'IN_PROGRESS' },
      }),
      prisma.finding.count({
        where: { validation: { validatorId: userId } },
      }),
      prisma.modelValidation.aggregate({
        where: {
          validatorId: userId,
          overallScore: { not: null },
        },
        _avg: { overallScore: true },
      }),
    ]);

    return {
      completedValidations: completed,
      inProgressValidations: inProgress,
      findingsCreated,
      averageScore: avgScore._avg.overallScore || null,
    };
  }

  async getRiskTrends() {
    // Similar to getTrendData but for risk assessments
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      months.push({
        month: date.toISOString().slice(0, 7),
        start: new Date(date.getFullYear(), date.getMonth(), 1),
        end: new Date(date.getFullYear(), date.getMonth() + 1, 0),
      });
    }

    const trends = await Promise.all(
      months.map(async ({ month, start, end }) => {
        const byRisk = await prisma.riskAssessment.groupBy({
          by: ['residualRisk'],
          _count: true,
          where: { createdAt: { gte: start, lte: end } },
        });

        return {
          month,
          ...byRisk.reduce((acc, item) => {
            acc[item.residualRisk] = item._count;
            return acc;
          }, {}),
        };
      })
    );

    return trends;
  }

  async getRiskHeatmap() {
    const assessments = await prisma.riskAssessment.findMany({
      select: {
        inherentRisk: true,
        residualRisk: true,
      },
    });

    const riskLevels = ['MINIMAL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const heatmap = {};

    riskLevels.forEach((inherent) => {
      heatmap[inherent] = {};
      riskLevels.forEach((residual) => {
        heatmap[inherent][residual] = 0;
      });
    });

    assessments.forEach((a) => {
      heatmap[a.inherentRisk][a.residualRisk]++;
    });

    return heatmap;
  }

  async getUserStats() {
    const [total, byRole, byStatus, active] = await Promise.all([
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
      activeLastMonth: active,
    };
  }

  async getSystemStats() {
    const [models, validations, findings, documents, workflows] =
      await Promise.all([
        prisma.model.count(),
        prisma.modelValidation.count(),
        prisma.finding.count(),
        prisma.document.count(),
        prisma.workflow.count(),
      ]);

    return { models, validations, findings, documents, workflows };
  }

  async getAuditSummary() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [total, byAction, bySeverity] = await Promise.all([
      prisma.auditLog.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.auditLog.groupBy({
        by: ['action'],
        _count: true,
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      prisma.auditLog.groupBy({
        by: ['severity'],
        _count: true,
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
    ]);

    return {
      totalLast7Days: total,
      byAction: byAction
        .slice(0, 10)
        .reduce((acc, item) => {
          acc[item.action] = item._count;
          return acc;
        }, {}),
      bySeverity: bySeverity.reduce((acc, item) => {
        acc[item.severity] = item._count;
        return acc;
      }, {}),
    };
  }

  async getRecentSystemActivity() {
    return prisma.auditLog.findMany({
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async getRecentActivityForUser(userId) {
    return prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  }

  async getStatsForModels(modelIds) {
    if (modelIds.length === 0) return {};

    const [findings, validations] = await Promise.all([
      prisma.finding.count({
        where: {
          modelId: { in: modelIds },
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
      }),
      prisma.modelValidation.count({
        where: {
          modelId: { in: modelIds },
          status: 'IN_PROGRESS',
        },
      }),
    ]);

    return { openFindings: findings, activeValidations: validations };
  }

  async getUpcomingDeadlines(userId, role) {
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const [validationDeadlines, taskDeadlines, workflowDeadlines] =
      await Promise.all([
        prisma.modelValidation.findMany({
          where: {
            validatorId: userId,
            status: 'IN_PROGRESS',
            plannedEndDate: { lte: thirtyDaysFromNow },
          },
          select: {
            id: true,
            validationId: true,
            plannedEndDate: true,
            model: { select: { modelId: true, name: true } },
          },
          orderBy: { plannedEndDate: 'asc' },
          take: 5,
        }),
        prisma.task.findMany({
          where: {
            assigneeId: userId,
            status: { in: ['PENDING', 'IN_PROGRESS'] },
            dueDate: { lte: thirtyDaysFromNow },
          },
          select: { id: true, taskId: true, title: true, dueDate: true },
          orderBy: { dueDate: 'asc' },
          take: 5,
        }),
        prisma.workflow.findMany({
          where: {
            status: { in: ['PENDING', 'IN_PROGRESS'] },
            expiresAt: { lte: thirtyDaysFromNow },
            steps: {
              some: { approverRole: role, isCompleted: false },
            },
          },
          select: { id: true, workflowId: true, title: true, expiresAt: true },
          orderBy: { expiresAt: 'asc' },
          take: 5,
        }),
      ]);

    return {
      validations: validationDeadlines,
      tasks: taskDeadlines,
      workflows: workflowDeadlines,
    };
  }
}

module.exports = new DashboardService();
