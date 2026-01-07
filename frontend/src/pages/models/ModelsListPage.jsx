import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { modelAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

const StatusBadge = ({ status }) => {
  const colors = {
    IN_PRODUCTION: 'bg-green-100 text-green-800',
    APPROVED: 'bg-green-100 text-green-800',
    PENDING_VALIDATION: 'bg-yellow-100 text-yellow-800',
    PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
    IN_VALIDATION: 'bg-blue-100 text-blue-800',
    UNDER_DEVELOPMENT: 'bg-purple-100 text-purple-800',
    DRAFT: 'bg-gray-100 text-gray-800',
    RETIRED: 'bg-gray-100 text-gray-800',
    DEPRECATED: 'bg-orange-100 text-orange-800',
  };
  return (
    <span className={`badge ${colors[status] || 'badge-info'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
};

const TierBadge = ({ tier }) => {
  const colors = {
    TIER_1_CRITICAL: 'bg-red-100 text-red-800',
    TIER_2_HIGH: 'bg-orange-100 text-orange-800',
    TIER_3_MEDIUM: 'bg-yellow-100 text-yellow-800',
    TIER_4_LOW: 'bg-green-100 text-green-800',
  };
  const labels = {
    TIER_1_CRITICAL: 'Tier 1',
    TIER_2_HIGH: 'Tier 2',
    TIER_3_MEDIUM: 'Tier 3',
    TIER_4_LOW: 'Tier 4',
  };
  return (
    <span className={`badge ${colors[tier] || 'badge-info'}`}>
      {labels[tier] || tier}
    </span>
  );
};

const ModelsListPage = () => {
  const { canManageModels } = useAuthStore();
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [filters, setFilters] = useState({
    status: '',
    tier: '',
    type: '',
    search: '',
  });

  useEffect(() => {
    fetchModels();
  }, [pagination.page, filters]);

  const fetchModels = async () => {
    setLoading(true);
    try {
      const response = await modelAPI.list({
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      });
      setModels(response.data.data);
      setPagination((prev) => ({
        ...prev,
        total: response.data.pagination.total,
      }));
    } catch (error) {
      console.error('Failed to fetch models:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Model Inventory</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and monitor all models in the organization
          </p>
        </div>
        {canManageModels() && (
          <Link to="/models/new" className="btn btn-primary mt-4 sm:mt-0">
            <PlusIcon className="h-5 w-5 mr-2" />
            New Model
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
              placeholder="Search models..."
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
              <option value="IN_PRODUCTION">In Production</option>
              <option value="APPROVED">Approved</option>
              <option value="PENDING_VALIDATION">Pending Validation</option>
              <option value="IN_VALIDATION">In Validation</option>
              <option value="UNDER_DEVELOPMENT">Under Development</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>
          <div>
            <label className="label">Tier</label>
            <select
              className="input"
              value={filters.tier}
              onChange={(e) => setFilters({ ...filters, tier: e.target.value })}
            >
              <option value="">All Tiers</option>
              <option value="TIER_1_CRITICAL">Tier 1 - Critical</option>
              <option value="TIER_2_HIGH">Tier 2 - High</option>
              <option value="TIER_3_MEDIUM">Tier 3 - Medium</option>
              <option value="TIER_4_LOW">Tier 4 - Low</option>
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
              <option value="CREDIT_RISK">Credit Risk</option>
              <option value="MARKET_RISK">Market Risk</option>
              <option value="OPERATIONAL_RISK">Operational Risk</option>
              <option value="FRAUD_DETECTION">Fraud Detection</option>
              <option value="AML_KYC">AML/KYC</option>
              <option value="PRICING">Pricing</option>
              <option value="VALUATION">Valuation</option>
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
                    <th>Model ID</th>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Tier</th>
                    <th>Type</th>
                    <th>Owner</th>
                    <th>Business Unit</th>
                    <th>Findings</th>
                  </tr>
                </thead>
                <tbody>
                  {models.map((model) => (
                    <tr key={model.id}>
                      <td>
                        <Link
                          to={`/models/${model.id}`}
                          className="text-primary-600 font-medium hover:text-primary-800"
                        >
                          {model.modelId}
                        </Link>
                      </td>
                      <td className="font-medium text-gray-900">{model.name}</td>
                      <td>
                        <StatusBadge status={model.status} />
                      </td>
                      <td>
                        <TierBadge tier={model.tier} />
                      </td>
                      <td className="text-gray-500">
                        {model.type?.replace(/_/g, ' ')}
                      </td>
                      <td className="text-gray-500">
                        {model.owner?.firstName} {model.owner?.lastName}
                      </td>
                      <td className="text-gray-500">{model.businessUnit}</td>
                      <td className="text-gray-500">{model._count?.findings || 0}</td>
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

export default ModelsListPage;
