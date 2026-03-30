import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  FlagIcon,
} from '@heroicons/react/24/outline';
import { taskAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

const PriorityBadge = ({ priority }) => {
  const colors = {
    CRITICAL: 'bg-red-100 text-red-800',
    HIGH: 'bg-orange-100 text-orange-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    LOW: 'bg-green-100 text-green-800',
  };
  return (
    <span className={`badge ${colors[priority] || 'badge-info'}`}>
      <FlagIcon className="h-3 w-3 mr-1" />
      {priority}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const colors = {
    PENDING: 'bg-gray-100 text-gray-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    BLOCKED: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
  };
  return (
    <span className={`badge ${colors[status] || 'badge-info'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
};

const TasksListPage = () => {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    assignedToMe: false,
  });
  const [stats, setStats] = useState({
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
  });

  useEffect(() => {
    fetchTasks();
  }, [pagination.page, filters]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await taskAPI.list({
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      });
      setTasks(response.data.data);
      setPagination((prev) => ({
        ...prev,
        total: response.data.pagination.total,
      }));

      // Calculate stats
      const all = response.data.data;
      setStats({
        pending: all.filter((t) => t.status === 'PENDING').length,
        inProgress: all.filter((t) => t.status === 'IN_PROGRESS').length,
        completed: all.filter((t) => t.status === 'COMPLETED').length,
        overdue: all.filter(
          (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED'
        ).length,
      });
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const isOverdue = (dueDate, status) =>
    dueDate && new Date(dueDate) < new Date() && status !== 'COMPLETED';

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await taskAPI.update(taskId, { status: newStatus });
      fetchTasks();
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your assigned tasks and track progress
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-4 flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <ClockIcon className="h-6 w-6 text-gray-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{stats.pending}</div>
            <div className="text-sm text-gray-500">Pending</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <ClockIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            <div className="text-sm text-gray-500">In Progress</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <CheckCircleIcon className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-gray-500">Completed</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <ExclamationCircleIcon className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <div className="text-sm text-gray-500">Overdue</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="BLOCKED">Blocked</option>
            </select>
          </div>
          <div>
            <label className="label">Priority</label>
            <select
              className="input"
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            >
              <option value="">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 text-primary-600"
                checked={filters.assignedToMe}
                onChange={(e) => setFilters({ ...filters, assignedToMe: e.target.checked })}
              />
              <span className="text-sm text-gray-700">Assigned to me</span>
            </label>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="spinner"></div>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Task ID</th>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Assigned To</th>
                    <th>Due Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr
                      key={task.id}
                      className={isOverdue(task.dueDate, task.status) ? 'bg-red-50' : ''}
                    >
                      <td>
                        <Link
                          to={`/tasks/${task.id}`}
                          className="text-primary-600 font-medium hover:text-primary-800"
                        >
                          {task.taskId}
                        </Link>
                      </td>
                      <td>
                        <div className="flex items-center">
                          {isOverdue(task.dueDate, task.status) && (
                            <ExclamationCircleIcon className="h-4 w-4 text-red-500 mr-2" />
                          )}
                          <span className="font-medium text-gray-900">{task.title}</span>
                        </div>
                      </td>
                      <td className="text-gray-500">{task.type?.replace(/_/g, ' ')}</td>
                      <td>
                        <PriorityBadge priority={task.priority} />
                      </td>
                      <td>
                        <StatusBadge status={task.status} />
                      </td>
                      <td className="text-gray-500">
                        {task.assignedTo?.firstName} {task.assignedTo?.lastName}
                      </td>
                      <td>
                        {task.dueDate ? (
                          <span
                            className={
                              isOverdue(task.dueDate, task.status) ? 'text-red-600 font-medium' : ''
                            }
                          >
                            {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-gray-400">Not set</span>
                        )}
                      </td>
                      <td>
                        {task.status !== 'COMPLETED' && (
                          <select
                            className="input text-sm py-1"
                            value={task.status}
                            onChange={(e) => handleStatusChange(task.id, e.target.value)}
                          >
                            <option value="PENDING">Pending</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="BLOCKED">Blocked</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3">
              <div className="text-sm text-gray-500">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} results
              </div>
              <div className="flex gap-2">
                <button
                  className="btn btn-secondary text-sm"
                  disabled={pagination.page === 1}
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                >
                  Previous
                </button>
                <button
                  className="btn btn-secondary text-sm"
                  disabled={pagination.page * pagination.limit >= pagination.total}
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TasksListPage;
