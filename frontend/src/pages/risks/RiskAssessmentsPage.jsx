import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { riskAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

const RiskScoreBadge = ({ score }) => {
  let color = 'bg-green-100 text-green-800';
  if (score >= 80) color = 'bg-red-100 text-red-800';
  else if (score >= 60) color = 'bg-orange-100 text-orange-800';
  else if (score >= 40) color = 'bg-yellow-100 text-yellow-800';

  return <span className={`badge ${color}`}>{score}</span>;
};

const StatusBadge = ({ status }) => {
  const colors = {
    DRAFT: 'bg-gray-100 text-gray-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    APPROVED: 'bg-green-100 text-green-800',
  };
  return (
    <span className={`badge ${colors[status] || 'badge-info'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
};

const RiskAssessmentsPage = () => {
  const { canManageRisks } = useAuthStore();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [filters, setFilters] = useState({
    status: '',
    type: '',
  });

  useEffect(() => {
    fetchAssessments();
  }, [pagination.page, filters]);

  const fetchAssessments = async () => {
    setLoading(true);
    try {
      const response = await riskAPI.list({
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      });
      setAssessments(response.data.data);
      setPagination((prev) => ({
        ...prev,
        total: response.data.pagination.total,
      }));
    } catch (error) {
      console.error('Failed to fetch risk assessments:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Risk Assessments</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage model risk assessments and scoring
          </p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <Link to="/risks/heatmap" className="btn btn-secondary">
            <ChartBarIcon className="h-5 w-5 mr-2" />
            Risk Heatmap
          </Link>
          {canManageRisks() && (
            <Link to="/risks/new" className="btn btn-primary">
              <PlusIcon className="h-5 w-5 mr-2" />
              New Assessment
            </Link>
          )}
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
              <option value="DRAFT">Draft</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="APPROVED">Approved</option>
            </select>
          </div>
          <div>
            <label className="label">Assessment Type</label>
            <select
              className="input"
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            >
              <option value="">All Types</option>
              <option value="INITIAL">Initial</option>
              <option value="PERIODIC">Periodic</option>
              <option value="MATERIAL_CHANGE">Material Change</option>
              <option value="INCIDENT_TRIGGERED">Incident Triggered</option>
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
                    <th>Assessment ID</th>
                    <th>Model</th>
                    <th>Type</th>
                    <th>Overall Score</th>
                    <th>Inherent Risk</th>
                    <th>Residual Risk</th>
                    <th>Status</th>
                    <th>Assessed By</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {assessments.map((assessment) => (
                    <tr key={assessment.id}>
                      <td>
                        <Link
                          to={`/risks/${assessment.id}`}
                          className="text-primary-600 font-medium hover:text-primary-800"
                        >
                          {assessment.assessmentId}
                        </Link>
                      </td>
                      <td>
                        <Link
                          to={`/models/${assessment.modelId}`}
                          className="text-gray-900 hover:text-primary-600"
                        >
                          {assessment.model?.name}
                        </Link>
                      </td>
                      <td className="text-gray-500">
                        {assessment.assessmentType?.replace(/_/g, ' ')}
                      </td>
                      <td>
                        <RiskScoreBadge score={assessment.overallRiskScore} />
                      </td>
                      <td>
                        <RiskScoreBadge score={assessment.inherentRiskScore} />
                      </td>
                      <td>
                        <RiskScoreBadge score={assessment.residualRiskScore} />
                      </td>
                      <td>
                        <StatusBadge status={assessment.status} />
                      </td>
                      <td className="text-gray-500">
                        {assessment.assessedBy?.firstName} {assessment.assessedBy?.lastName}
                      </td>
                      <td className="text-gray-500">
                        {new Date(assessment.assessmentDate).toLocaleDateString()}
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

export default RiskAssessmentsPage;
