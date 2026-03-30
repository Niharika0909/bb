import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon } from '@heroicons/react/24/outline';
import { validationAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

const StatusBadge = ({ status }) => {
  const colors = {
    NOT_STARTED: 'bg-gray-100 text-gray-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    PENDING_REVIEW: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    ON_HOLD: 'bg-orange-100 text-orange-800',
  };
  return (
    <span className={`badge ${colors[status] || 'badge-info'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
};

const ValidationsListPage = () => {
  const { canValidate } = useAuthStore();
  const [validations, setValidations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    search: '',
  });

  useEffect(() => {
    fetchValidations();
  }, [pagination.page, filters]);

  const fetchValidations = async () => {
    setLoading(true);
    try {
      const response = await validationAPI.list({
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      });
      setValidations(response.data.data);
      setPagination((prev) => ({
        ...prev,
        total: response.data.pagination.total,
      }));
    } catch (error) {
      console.error('Failed to fetch validations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysRemaining = (dueDate) => {
    const days = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (days < 0) return <span className="text-red-600 font-medium">Overdue by {Math.abs(days)} days</span>;
    if (days === 0) return <span className="text-orange-600 font-medium">Due today</span>;
    if (days <= 7) return <span className="text-yellow-600 font-medium">{days} days remaining</span>;
    return <span className="text-gray-500">{days} days remaining</span>;
  };

  return (
    <div>
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Model Validations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track and manage model validation activities
          </p>
        </div>
        {canValidate() && (
          <Link to="/validations/new" className="btn btn-primary mt-4 sm:mt-0">
            <PlusIcon className="h-5 w-5 mr-2" />
            New Validation
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div>
            <label className="label">Search</label>
            <input
              type="text"
              className="input"
              placeholder="Search validations..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All Statuses</option>
              <option value="NOT_STARTED">Not Started</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="ON_HOLD">On Hold</option>
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
              <option value="INITIAL">Initial</option>
              <option value="ANNUAL">Annual</option>
              <option value="MATERIAL_CHANGE">Material Change</option>
              <option value="PERIODIC">Periodic</option>
              <option value="TARGETED">Targeted</option>
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
                    <th>Validation ID</th>
                    <th>Model</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Validator</th>
                    <th>Due Date</th>
                    <th>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {validations.map((validation) => (
                    <tr key={validation.id}>
                      <td>
                        <Link
                          to={`/validations/${validation.id}`}
                          className="text-primary-600 font-medium hover:text-primary-800"
                        >
                          {validation.validationId}
                        </Link>
                      </td>
                      <td>
                        <Link
                          to={`/models/${validation.modelId}`}
                          className="text-gray-900 hover:text-primary-600"
                        >
                          {validation.model?.name}
                        </Link>
                        <div className="text-xs text-gray-500">{validation.model?.modelId}</div>
                      </td>
                      <td className="text-gray-500">{validation.type?.replace(/_/g, ' ')}</td>
                      <td>
                        <StatusBadge status={validation.status} />
                      </td>
                      <td className="text-gray-500">
                        {validation.validator?.firstName} {validation.validator?.lastName}
                      </td>
                      <td>
                        <div>{new Date(validation.dueDate).toLocaleDateString()}</div>
                        <div className="text-xs">{getDaysRemaining(validation.dueDate)}</div>
                      </td>
                      <td>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary-600 h-2 rounded-full"
                            style={{ width: `${validation.progress || 0}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500">{validation.progress || 0}%</span>
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

export default ValidationsListPage;
