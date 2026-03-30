import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircleIcon, ClockIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { workflowAPI } from '../../services/api';

const StatusBadge = ({ status }) => {
  const colors = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
  };
  const icons = {
    PENDING: ClockIcon,
    IN_PROGRESS: ClockIcon,
    APPROVED: CheckCircleIcon,
    REJECTED: XCircleIcon,
    CANCELLED: XCircleIcon,
  };
  const Icon = icons[status] || ClockIcon;

  return (
    <span className={`badge ${colors[status] || 'badge-info'} inline-flex items-center`}>
      <Icon className="h-3 w-3 mr-1" />
      {status?.replace(/_/g, ' ')}
    </span>
  );
};

const WorkflowsListPage = () => {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [filters, setFilters] = useState({
    status: '',
    type: '',
  });

  useEffect(() => {
    fetchWorkflows();
  }, [pagination.page, filters]);

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const response = await workflowAPI.list({
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      });
      setWorkflows(response.data.data);
      setPagination((prev) => ({
        ...prev,
        total: response.data.pagination.total,
      }));
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWorkflowProgress = (workflow) => {
    const completedSteps = workflow.steps?.filter(
      (s) => s.status === 'APPROVED' || s.status === 'COMPLETED'
    ).length || 0;
    const totalSteps = workflow.steps?.length || 1;
    return Math.round((completedSteps / totalSteps) * 100);
  };

  return (
    <div>
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Approval Workflows</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track and manage approval workflows for models and validations
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="text-2xl font-bold text-yellow-600">
            {workflows.filter((w) => w.status === 'PENDING').length}
          </div>
          <div className="text-sm text-gray-500">Pending</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-blue-600">
            {workflows.filter((w) => w.status === 'IN_PROGRESS').length}
          </div>
          <div className="text-sm text-gray-500">In Progress</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-green-600">
            {workflows.filter((w) => w.status === 'APPROVED').length}
          </div>
          <div className="text-sm text-gray-500">Approved</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-red-600">
            {workflows.filter((w) => w.status === 'REJECTED').length}
          </div>
          <div className="text-sm text-gray-500">Rejected</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="label">Type</label>
            <select
              className="input"
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            >
              <option value="">All Types</option>
              <option value="MODEL_APPROVAL">Model Approval</option>
              <option value="VALIDATION_APPROVAL">Validation Approval</option>
              <option value="FINDING_CLOSURE">Finding Closure</option>
              <option value="EXCEPTION_REQUEST">Exception Request</option>
              <option value="PRODUCTION_DEPLOYMENT">Production Deployment</option>
            </select>
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
                    <th>Workflow ID</th>
                    <th>Type</th>
                    <th>Entity</th>
                    <th>Status</th>
                    <th>Progress</th>
                    <th>Current Step</th>
                    <th>Initiated By</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {workflows.map((workflow) => (
                    <tr key={workflow.id}>
                      <td>
                        <Link
                          to={`/workflows/${workflow.id}`}
                          className="text-primary-600 font-medium hover:text-primary-800"
                        >
                          {workflow.workflowId}
                        </Link>
                      </td>
                      <td className="text-gray-500">
                        {workflow.type?.replace(/_/g, ' ')}
                      </td>
                      <td>
                        {workflow.model ? (
                          <Link
                            to={`/models/${workflow.modelId}`}
                            className="text-gray-900 hover:text-primary-600"
                          >
                            {workflow.model.name}
                          </Link>
                        ) : workflow.validation ? (
                          <Link
                            to={`/validations/${workflow.validationId}`}
                            className="text-gray-900 hover:text-primary-600"
                          >
                            {workflow.validation.validationId}
                          </Link>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>
                        <StatusBadge status={workflow.status} />
                      </td>
                      <td>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary-600 h-2 rounded-full"
                            style={{ width: `${getWorkflowProgress(workflow)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500">
                          {getWorkflowProgress(workflow)}%
                        </span>
                      </td>
                      <td className="text-gray-500">
                        {workflow.currentStep || '-'}
                      </td>
                      <td className="text-gray-500">
                        {workflow.initiatedBy?.firstName} {workflow.initiatedBy?.lastName}
                      </td>
                      <td className="text-gray-500">
                        {new Date(workflow.createdAt).toLocaleDateString()}
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

export default WorkflowsListPage;
