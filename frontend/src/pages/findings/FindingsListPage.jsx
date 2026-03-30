import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { findingAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

const SeverityBadge = ({ severity }) => {
  const colors = {
    CRITICAL: 'bg-red-100 text-red-800',
    HIGH: 'bg-orange-100 text-orange-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    LOW: 'bg-green-100 text-green-800',
  };
  return (
    <span className={`badge ${colors[severity] || 'badge-info'}`}>
      {severity}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const colors = {
    OPEN: 'bg-red-100 text-red-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    REMEDIATED: 'bg-green-100 text-green-800',
    CLOSED: 'bg-gray-100 text-gray-800',
    ACCEPTED: 'bg-purple-100 text-purple-800',
    DEFERRED: 'bg-orange-100 text-orange-800',
  };
  return (
    <span className={`badge ${colors[status] || 'badge-info'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
};

const FindingsListPage = () => {
  const { canValidate, canManageModels } = useAuthStore();
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [filters, setFilters] = useState({
    status: '',
    severity: '',
    search: '',
  });
  const [stats, setStats] = useState({ critical: 0, high: 0, medium: 0, low: 0 });

  useEffect(() => {
    fetchFindings();
  }, [pagination.page, filters]);

  const fetchFindings = async () => {
    setLoading(true);
    try {
      const response = await findingAPI.list({
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      });
      setFindings(response.data.data);
      setPagination((prev) => ({
        ...prev,
        total: response.data.pagination.total,
      }));
      // Calculate stats
      const all = response.data.data;
      setStats({
        critical: all.filter((f) => f.severity === 'CRITICAL' && f.status === 'OPEN').length,
        high: all.filter((f) => f.severity === 'HIGH' && f.status === 'OPEN').length,
        medium: all.filter((f) => f.severity === 'MEDIUM' && f.status === 'OPEN').length,
        low: all.filter((f) => f.severity === 'LOW' && f.status === 'OPEN').length,
      });
    } catch (error) {
      console.error('Failed to fetch findings:', error);
    } finally {
      setLoading(false);
    }
  };

  const isOverdue = (dueDate) => dueDate && new Date(dueDate) < new Date();

  return (
    <div>
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Findings & Issues</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track and remediate model validation findings
          </p>
        </div>
        {(canValidate() || canManageModels()) && (
          <Link to="/findings/new" className="btn btn-primary mt-4 sm:mt-0">
            <PlusIcon className="h-5 w-5 mr-2" />
            New Finding
          </Link>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-4 border-l-4 border-red-500">
          <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
          <div className="text-sm text-gray-500">Critical Open</div>
        </div>
        <div className="card p-4 border-l-4 border-orange-500">
          <div className="text-2xl font-bold text-orange-600">{stats.high}</div>
          <div className="text-sm text-gray-500">High Open</div>
        </div>
        <div className="card p-4 border-l-4 border-yellow-500">
          <div className="text-2xl font-bold text-yellow-600">{stats.medium}</div>
          <div className="text-sm text-gray-500">Medium Open</div>
        </div>
        <div className="card p-4 border-l-4 border-green-500">
          <div className="text-2xl font-bold text-green-600">{stats.low}</div>
          <div className="text-sm text-gray-500">Low Open</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div>
            <label className="label">Search</label>
            <input
              type="text"
              className="input"
              placeholder="Search findings..."
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
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="REMEDIATED">Remediated</option>
              <option value="CLOSED">Closed</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="DEFERRED">Deferred</option>
            </select>
          </div>
          <div>
            <label className="label">Severity</label>
            <select
              className="input"
              value={filters.severity}
              onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
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
                    <th>Finding ID</th>
                    <th>Title</th>
                    <th>Model</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Assigned To</th>
                    <th>Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {findings.map((finding) => (
                    <tr key={finding.id} className={isOverdue(finding.dueDate) && finding.status === 'OPEN' ? 'bg-red-50' : ''}>
                      <td>
                        <Link
                          to={`/findings/${finding.id}`}
                          className="text-primary-600 font-medium hover:text-primary-800"
                        >
                          {finding.findingId}
                        </Link>
                      </td>
                      <td>
                        <div className="flex items-center">
                          {isOverdue(finding.dueDate) && finding.status === 'OPEN' && (
                            <ExclamationTriangleIcon className="h-4 w-4 text-red-500 mr-2" />
                          )}
                          <span className="font-medium text-gray-900">{finding.title}</span>
                        </div>
                      </td>
                      <td>
                        <Link
                          to={`/models/${finding.modelId}`}
                          className="text-gray-500 hover:text-primary-600"
                        >
                          {finding.model?.name}
                        </Link>
                      </td>
                      <td>
                        <SeverityBadge severity={finding.severity} />
                      </td>
                      <td>
                        <StatusBadge status={finding.status} />
                      </td>
                      <td className="text-gray-500">
                        {finding.assignedTo?.firstName} {finding.assignedTo?.lastName}
                      </td>
                      <td>
                        {finding.dueDate ? (
                          <span className={isOverdue(finding.dueDate) && finding.status === 'OPEN' ? 'text-red-600 font-medium' : ''}>
                            {new Date(finding.dueDate).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-gray-400">Not set</span>
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

export default FindingsListPage;
