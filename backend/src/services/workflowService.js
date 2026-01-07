const { PrismaClient } = require('@prisma/client');
const { generateWorkflowId } = require('../utils/idGenerator');
const { NotFoundError, ValidationError, AuthorizationError } = require('../utils/errors');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

class WorkflowService {
  /**
   * Workflow step configurations by type
   */
  getWorkflowConfig(type) {
    const configs = {
      MODEL_APPROVAL: [
        { name: 'Model Owner Review', approverRole: 'MODEL_DEVELOPER', order: 1 },
        { name: 'Validation Review', approverRole: 'MODEL_VALIDATOR', order: 2 },
        { name: 'Risk Manager Approval', approverRole: 'RISK_MANAGER', order: 3 },
      ],
      VALIDATION_APPROVAL: [
        { name: 'Validator Sign-off', approverRole: 'MODEL_VALIDATOR', order: 1 },
        { name: 'Risk Manager Review', approverRole: 'RISK_MANAGER', order: 2 },
      ],
      CHANGE_APPROVAL: [
        { name: 'Developer Review', approverRole: 'MODEL_DEVELOPER', order: 1 },
        { name: 'Validator Assessment', approverRole: 'MODEL_VALIDATOR', order: 2 },
        { name: 'Risk Manager Approval', approverRole: 'RISK_MANAGER', order: 3 },
      ],
      EXCEPTION_APPROVAL: [
        { name: 'Risk Manager Review', approverRole: 'RISK_MANAGER', order: 1 },
        { name: 'Compliance Review', approverRole: 'COMPLIANCE_OFFICER', order: 2 },
        { name: 'Executive Approval', approverRole: 'EXECUTIVE', order: 3 },
      ],
      RETIREMENT_APPROVAL: [
        { name: 'Model Owner Confirmation', approverRole: 'MODEL_DEVELOPER', order: 1 },
        { name: 'Risk Manager Approval', approverRole: 'RISK_MANAGER', order: 2 },
      ],
      FINDING_REMEDIATION: [
        { name: 'Remediation Verification', approverRole: 'MODEL_VALIDATOR', order: 1 },
        { name: 'Risk Manager Sign-off', approverRole: 'RISK_MANAGER', order: 2 },
      ],
    };

    return configs[type] || [];
  }

  /**
   * Create a new workflow
   */
  async create(data, initiatedById) {
    const workflowId = generateWorkflowId();
    const config = this.getWorkflowConfig(data.type);

    if (config.length === 0) {
      throw new ValidationError('Invalid workflow type');
    }

    // Calculate expiry date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const workflow = await prisma.workflow.create({
      data: {
        workflowId,
        type: data.type,
        status: 'PENDING',
        modelId: data.modelId,
        title: data.title,
        description: data.description,
        priority: data.priority || 3,
        initiatedById,
        requiredApprovals: config.length,
        currentStep: 1,
        expiresAt,
        steps: {
          create: config.map((step) => ({
            stepOrder: step.order,
            name: step.name,
            approverRole: step.approverRole,
          })),
        },
      },
      include: {
        model: {
          select: { id: true, modelId: true, name: true },
        },
        steps: {
          orderBy: { stepOrder: 'asc' },
        },
      },
    });

    // Create notification for first approver group
    await this.notifyApprovers(workflow.id, 1);

    logger.info(`Workflow created: ${workflowId} - ${data.type}`);
    return workflow;
  }

  /**
   * Get workflow by ID
   */
  async getById(id) {
    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: {
        model: {
          select: { id: true, modelId: true, name: true, type: true },
        },
        steps: {
          orderBy: { stepOrder: 'asc' },
        },
        approvals: {
          include: {
            approver: {
              select: { id: true, firstName: true, lastName: true, role: true },
            },
          },
          orderBy: { stepOrder: 'asc' },
        },
      },
    });

    if (!workflow) {
      throw new NotFoundError('Workflow');
    }

    return workflow;
  }

  /**
   * List workflows
   */
  async list({
    page = 1,
    limit = 20,
    type,
    status,
    modelId,
    initiatedById,
    pendingApproverId,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  }) {
    const where = {};

    if (type) where.type = type;
    if (status) where.status = status;
    if (modelId) where.modelId = modelId;
    if (initiatedById) where.initiatedById = initiatedById;

    // Filter by pending approvals for a specific user
    if (pendingApproverId) {
      const user = await prisma.user.findUnique({
        where: { id: pendingApproverId },
        select: { role: true },
      });

      if (user) {
        where.status = 'PENDING';
        where.steps = {
          some: {
            approverRole: user.role,
            isCompleted: false,
          },
        };
      }
    }

    const [workflows, total] = await Promise.all([
      prisma.workflow.findMany({
        where,
        include: {
          model: {
            select: { id: true, modelId: true, name: true },
          },
          steps: {
            orderBy: { stepOrder: 'asc' },
          },
          _count: {
            select: { approvals: true },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.workflow.count({ where }),
    ]);

    return { data: workflows, total, page, limit };
  }

  /**
   * Submit approval decision
   */
  async submitApproval(workflowId, decision, userId, comments = null) {
    const workflow = await this.getById(workflowId);

    if (workflow.status !== 'PENDING' && workflow.status !== 'IN_PROGRESS') {
      throw new ValidationError('Workflow is not pending approval');
    }

    // Get user's role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    // Find current step
    const currentStep = workflow.steps.find(
      (s) => s.stepOrder === workflow.currentStep && !s.isCompleted
    );

    if (!currentStep) {
      throw new ValidationError('No pending step found');
    }

    // Verify user has permission to approve this step
    if (currentStep.approverRole !== user.role && user.role !== 'ADMIN') {
      throw new AuthorizationError(
        `This step requires ${currentStep.approverRole} approval`
      );
    }

    // Check if user already approved this step
    const existingApproval = await prisma.workflowApproval.findFirst({
      where: {
        workflowId,
        approverId: userId,
        stepOrder: workflow.currentStep,
      },
    });

    if (existingApproval) {
      throw new ValidationError('You have already submitted a decision for this step');
    }

    // Create approval record
    await prisma.workflowApproval.create({
      data: {
        workflowId,
        approverId: userId,
        stepOrder: workflow.currentStep,
        decision,
        comments,
        decidedAt: new Date(),
      },
    });

    // Handle decision
    if (decision === 'REJECTED') {
      // Reject the entire workflow
      await prisma.workflow.update({
        where: { id: workflowId },
        data: {
          status: 'REJECTED',
          completedAt: new Date(),
          outcome: `Rejected at step ${workflow.currentStep}: ${currentStep.name}`,
        },
      });

      logger.info(`Workflow rejected: ${workflow.workflowId} at step ${workflow.currentStep}`);
      return { status: 'REJECTED', message: 'Workflow has been rejected' };
    }

    if (decision === 'APPROVED') {
      // Mark current step as completed
      await prisma.workflowStep.update({
        where: { id: currentStep.id },
        data: { isCompleted: true, completedAt: new Date() },
      });

      // Check if this was the last step
      if (workflow.currentStep >= workflow.requiredApprovals) {
        // Complete the workflow
        await prisma.workflow.update({
          where: { id: workflowId },
          data: {
            status: 'APPROVED',
            completedAt: new Date(),
            outcome: 'All approvals received',
          },
        });

        // Handle post-approval actions based on workflow type
        await this.handleWorkflowCompletion(workflow);

        logger.info(`Workflow approved: ${workflow.workflowId}`);
        return { status: 'APPROVED', message: 'Workflow has been fully approved' };
      }

      // Move to next step
      const nextStep = workflow.currentStep + 1;
      await prisma.workflow.update({
        where: { id: workflowId },
        data: {
          status: 'IN_PROGRESS',
          currentStep: nextStep,
        },
      });

      // Notify next approvers
      await this.notifyApprovers(workflowId, nextStep);

      logger.info(`Workflow step completed: ${workflow.workflowId} - step ${workflow.currentStep}`);
      return { status: 'IN_PROGRESS', message: `Step ${workflow.currentStep} approved, awaiting step ${nextStep}` };
    }

    if (decision === 'DEFERRED') {
      logger.info(`Workflow deferred: ${workflow.workflowId} at step ${workflow.currentStep}`);
      return { status: 'PENDING', message: 'Decision deferred for further review' };
    }

    throw new ValidationError('Invalid decision');
  }

  /**
   * Handle workflow completion actions
   */
  async handleWorkflowCompletion(workflow) {
    switch (workflow.type) {
      case 'MODEL_APPROVAL':
        await prisma.model.update({
          where: { id: workflow.modelId },
          data: { status: 'APPROVED' },
        });
        break;
      case 'VALIDATION_APPROVAL':
        // Validation already handled in validation service
        break;
      case 'RETIREMENT_APPROVAL':
        await prisma.model.update({
          where: { id: workflow.modelId },
          data: { status: 'RETIRED', retirementDate: new Date() },
        });
        break;
      default:
        break;
    }
  }

  /**
   * Notify approvers for a step
   */
  async notifyApprovers(workflowId, stepOrder) {
    const workflow = await this.getById(workflowId);
    const step = workflow.steps.find((s) => s.stepOrder === stepOrder);

    if (!step) return;

    // Find users with the required role
    const approvers = await prisma.user.findMany({
      where: {
        role: step.approverRole,
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    // Create notifications
    const notifications = approvers.map((approver) => ({
      userId: approver.id,
      type: 'APPROVAL_REQUIRED',
      title: `Approval Required: ${workflow.title}`,
      message: `You have a pending approval for ${step.name}`,
      linkUrl: `/workflows/${workflowId}`,
    }));

    if (notifications.length > 0) {
      await prisma.notification.createMany({ data: notifications });
    }
  }

  /**
   * Cancel workflow
   */
  async cancel(id, userId, reason = null) {
    const workflow = await this.getById(id);

    if (workflow.status === 'APPROVED' || workflow.status === 'REJECTED') {
      throw new ValidationError('Cannot cancel a completed workflow');
    }

    await prisma.workflow.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
        outcome: reason || 'Cancelled by user',
      },
    });

    logger.info(`Workflow cancelled: ${workflow.workflowId}`);
  }

  /**
   * Get pending approvals for a user
   */
  async getPendingApprovalsForUser(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    const workflows = await prisma.workflow.findMany({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        steps: {
          some: {
            approverRole: user.role,
            isCompleted: false,
          },
        },
      },
      include: {
        model: {
          select: { id: true, modelId: true, name: true },
        },
        steps: {
          where: { approverRole: user.role, isCompleted: false },
        },
      },
      orderBy: { priority: 'asc' },
    });

    return workflows;
  }

  /**
   * Get workflow statistics
   */
  async getStatistics(filters = {}) {
    const where = {};

    const [total, byStatus, byType, averageCompletionTime] = await Promise.all([
      prisma.workflow.count({ where }),
      prisma.workflow.groupBy({
        by: ['status'],
        _count: true,
        where,
      }),
      prisma.workflow.groupBy({
        by: ['type'],
        _count: true,
        where,
      }),
      prisma.$queryRaw`
        SELECT AVG(EXTRACT(EPOCH FROM (completed_at - initiated_at)) / 3600) as avg_hours
        FROM workflows
        WHERE status = 'APPROVED' AND completed_at IS NOT NULL
      `,
    ]);

    return {
      total,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {}),
      byType: byType.reduce((acc, item) => {
        acc[item.type] = item._count;
        return acc;
      }, {}),
      averageCompletionTimeHours: averageCompletionTime[0]?.avg_hours || null,
    };
  }
}

module.exports = new WorkflowService();
