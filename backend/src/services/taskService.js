const { PrismaClient } = require('@prisma/client');
const { generateTaskId } = require('../utils/idGenerator');
const { NotFoundError, ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

class TaskService {
  /**
   * Create a new task
   */
  async create(data, createdById) {
    const taskId = generateTaskId();

    const task = await prisma.task.create({
      data: {
        taskId,
        title: data.title,
        description: data.description,
        status: 'PENDING',
        priority: data.priority || 'MEDIUM',
        assigneeId: data.assigneeId,
        createdById,
        modelId: data.modelId,
        dueDate: data.dueDate,
        category: data.category,
        estimatedHours: data.estimatedHours,
      },
      include: {
        assignee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        model: {
          select: { id: true, modelId: true, name: true },
        },
      },
    });

    // Create notification for assignee
    if (data.assigneeId) {
      await prisma.notification.create({
        data: {
          userId: data.assigneeId,
          type: 'TASK_ASSIGNED',
          title: 'New Task Assigned',
          message: `You have been assigned a new task: ${data.title}`,
          linkUrl: `/tasks/${task.id}`,
        },
      });
    }

    logger.info(`Task created: ${taskId}`);
    return task;
  }

  /**
   * Get task by ID
   */
  async getById(id) {
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        model: {
          select: { id: true, modelId: true, name: true, type: true },
        },
        comments: {
          include: {
            author: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!task) {
      throw new NotFoundError('Task');
    }

    return task;
  }

  /**
   * List tasks with filtering
   */
  async list({
    page = 1,
    limit = 20,
    assigneeId,
    createdById,
    modelId,
    status,
    priority,
    overdue,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  }) {
    const where = {};

    if (assigneeId) where.assigneeId = assigneeId;
    if (createdById) where.createdById = createdById;
    if (modelId) where.modelId = modelId;
    if (status) where.status = status;
    if (priority) where.priority = priority;

    if (overdue) {
      where.dueDate = { lt: new Date() };
      where.status = { in: ['PENDING', 'IN_PROGRESS'] };
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          assignee: {
            select: { id: true, firstName: true, lastName: true },
          },
          model: {
            select: { id: true, modelId: true, name: true },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.task.count({ where }),
    ]);

    return { data: tasks, total, page, limit };
  }

  /**
   * Update task
   */
  async update(id, data, userId) {
    const task = await this.getById(id);

    const updated = await prisma.task.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority,
        assigneeId: data.assigneeId,
        modelId: data.modelId,
        dueDate: data.dueDate,
        category: data.category,
        estimatedHours: data.estimatedHours,
        actualHours: data.actualHours,
      },
      include: {
        assignee: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    logger.info(`Task updated: ${task.taskId}`);
    return updated;
  }

  /**
   * Update task status
   */
  async updateStatus(id, status, userId) {
    const task = await this.getById(id);

    const updateData = { status };

    if (status === 'IN_PROGRESS' && !task.startedAt) {
      updateData.startedAt = new Date();
    }

    if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
    }

    if (status === 'PENDING') {
      updateData.startedAt = null;
      updateData.completedAt = null;
    }

    const updated = await prisma.task.update({
      where: { id },
      data: updateData,
    });

    logger.info(`Task status changed: ${task.taskId} -> ${status}`);
    return updated;
  }

  /**
   * Delete task
   */
  async delete(id, userId) {
    const task = await this.getById(id);

    await prisma.task.delete({
      where: { id },
    });

    logger.info(`Task deleted: ${task.taskId}`);
  }

  /**
   * Get tasks for user
   */
  async getMyTasks(userId, status = null) {
    const where = { assigneeId: userId };
    if (status) where.status = status;

    const tasks = await prisma.task.findMany({
      where,
      include: {
        model: {
          select: { id: true, modelId: true, name: true },
        },
      },
      orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
    });

    return tasks;
  }

  /**
   * Get overdue tasks
   */
  async getOverdueTasks(userId = null) {
    const where = {
      dueDate: { lt: new Date() },
      status: { in: ['PENDING', 'IN_PROGRESS'] },
    };

    if (userId) where.assigneeId = userId;

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        model: {
          select: { id: true, modelId: true, name: true },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    return tasks;
  }

  /**
   * Get task statistics
   */
  async getStatistics(userId = null) {
    const where = {};
    if (userId) where.assigneeId = userId;

    const [total, byStatus, byPriority, overdue, completedThisWeek] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.groupBy({
        by: ['status'],
        _count: true,
        where,
      }),
      prisma.task.groupBy({
        by: ['priority'],
        _count: true,
        where: { ...where, status: { in: ['PENDING', 'IN_PROGRESS'] } },
      }),
      prisma.task.count({
        where: {
          ...where,
          dueDate: { lt: new Date() },
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
      }),
      prisma.task.count({
        where: {
          ...where,
          status: 'COMPLETED',
          completedAt: {
            gte: new Date(new Date().setDate(new Date().getDate() - 7)),
          },
        },
      }),
    ]);

    return {
      total,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {}),
      byPriority: byPriority.reduce((acc, item) => {
        acc[item.priority] = item._count;
        return acc;
      }, {}),
      overdue,
      completedThisWeek,
    };
  }
}

module.exports = new TaskService();
