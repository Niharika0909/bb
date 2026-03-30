import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CubeIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { dashboardAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

const StatCard = ({ title, value, change, changeType, icon: Icon, link }) => (
  <Link to={link} className="stat-card hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="stat-label">{title}</p>
        <p className="stat-value">{value}</p>
        {change !== undefined && (
          <p className={`stat-change ${changeType === 'positive' ? 'stat-change-positive' : 'stat-change-negative'}`}>
            {changeType === 'positive' ? (
              <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
            ) : (
              <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
            )}
            {change}
          </p>
        )}
      </div>
      <div className="h-12 w-12 rounded-lg bg-primary-50 flex items-center justify-center">
        <Icon className="h-6 w-6 text-primary-600" />
      </div>
    </div>
  </Link>
);

const RiskBadge = ({ level }) => {
  const colors = {
    CRITICAL: 'bg-red-100 text-red-800',
    HIGH: 'bg-orange-100 text-orange-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    LOW: 'bg-green-100 text-green-800',
    MINIMAL: 'bg-blue-100 text-blue-800',
  };
  return (
    <span className={`badge ${colors[level] || 'badge-info'}`}>
      {level}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const colors = {
    IN_PRODUCTION: 'bg-green-100 text-green-800',
    APPROVED: 'bg-green-100 text-green-800',
    PENDING_VALIDATION: 'bg-yellow-100 text-yellow-800',
    PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
    IN_VALIDATION: 'bg-blue-100 text-blue-800',
    DRAFT: 'bg-gray-100 text-gray-800',
    OPEN: 'bg-red-100 text-red-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
  };
  return (
    <span className={`badge ${colors[status] || 'badge-info'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
};

const DashboardPage = () => {
  const { user } = useAuthStore();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await dashboardAPI.getMyDashboard();
      setDashboardData(response.data.data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  const renderExecutiveDashboard = () => (
    <>
      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Models"
          value={dashboardData?.summary?.totalModels || 0}
          icon={CubeIcon}
          link="/models"
        />
        <StatCard
          title="Models in Production"
          value={dashboardData?.summary?.modelsInProduction || 0}
          icon={CheckCircleIcon}
          link="/models?status=IN_PRODUCTION"
        />
        <StatCard
          title="Open Findings"
          value={dashboardData?.summary?.openFindings || 0}
          icon={ExclamationTriangleIcon}
          link="/findings?status=OPEN"
        />
        <StatCard
          title="Overdue Validations"
          value={dashboardData?.summary?.overdueValidations || 0}
          icon={ClockIcon}
          link="/validations/overdue"
        />
      </div>

      {/* Compliance Metrics */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Compliance Metrics</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="card p-6">
            <h3 className="text-sm font-medium text-gray-500">Documentation Coverage</h3>
            <div className="mt-2 flex items-baseline">
              <p className="text-2xl font-semibold text-gray-900">
                {dashboardData?.complianceMetrics?.documentationCoverage || 0}%
              </p>
            </div>
            <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full"
                style={{ width: `${dashboardData?.complianceMetrics?.documentationCoverage || 0}%` }}
              />
            </div>
          </div>
          <div className="card p-6">
            <h3 className="text-sm font-medium text-gray-500">Validation Coverage</h3>
            <div className="mt-2 flex items-baseline">
              <p className="text-2xl font-semibold text-gray-900">
                {dashboardData?.complianceMetrics?.validationCoverage || 0}%
              </p>
            </div>
            <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full"
                style={{ width: `${dashboardData?.complianceMetrics?.validationCoverage || 0}%` }}
              />
            </div>
          </div>
          <div className="card p-6">
            <h3 className="text-sm font-medium text-gray-500">Risk Assessment Coverage</h3>
            <div className="mt-2 flex items-baseline">
              <p className="text-2xl font-semibold text-gray-900">
                {dashboardData?.complianceMetrics?.riskAssessmentCoverage || 0}%
              </p>
            </div>
            <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-yellow-600 h-2 rounded-full"
                style={{ width: `${dashboardData?.complianceMetrics?.riskAssessmentCoverage || 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Risk Distribution */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Models by Status</h2>
          <div className="space-y-3">
            {dashboardData?.modelStats?.byStatus &&
              Object.entries(dashboardData.modelStats.byStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <StatusBadge status={status} />
                  <span className="text-sm font-medium text-gray-900">{count}</span>
                </div>
              ))}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Findings by Severity</h2>
          <div className="space-y-3">
            {dashboardData?.findingStats?.bySeverity &&
              Object.entries(dashboardData.findingStats.bySeverity).map(([severity, count]) => (
                <div key={severity} className="flex items-center justify-between">
                  <RiskBadge level={severity} />
                  <span className="text-sm font-medium text-gray-900">{count}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </>
  );

  const renderDeveloperDashboard = () => (
    <>
      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="My Models"
          value={dashboardData?.summary?.totalModels || 0}
          icon={CubeIcon}
          link="/models"
        />
        <StatCard
          title="Pending Tasks"
          value={dashboardData?.summary?.pendingTasks || 0}
          icon={ClipboardDocumentCheckIcon}
          link="/tasks"
        />
        <StatCard
          title="Open Findings"
          value={dashboardData?.summary?.openFindings || 0}
          icon={ExclamationTriangleIcon}
          link="/findings"
        />
        <StatCard
          title="Pending Validations"
          value={dashboardData?.summary?.pendingValidations || 0}
          icon={ClockIcon}
          link="/validations"
        />
      </div>

      {/* My Models */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">My Models</h2>
          <Link to="/models/new" className="btn btn-primary text-sm">
            New Model
          </Link>
        </div>
        <div className="card overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr>
                <th>Model ID</th>
                <th>Name</th>
                <th>Status</th>
                <th>Type</th>
                <th>Findings</th>
              </tr>
            </thead>
            <tbody>
              {dashboardData?.models?.slice(0, 5).map((model) => (
                <tr key={model.id}>
                  <td>
                    <Link to={`/models/${model.id}`} className="text-primary-600 font-medium">
                      {model.modelId}
                    </Link>
                  </td>
                  <td className="text-gray-900">{model.name}</td>
                  <td><StatusBadge status={model.status} /></td>
                  <td className="text-gray-500">{model.type?.replace(/_/g, ' ')}</td>
                  <td className="text-gray-500">{model._count?.findings || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* My Tasks */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">My Tasks</h2>
        <div className="card overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr>
                <th>Task</th>
                <th>Model</th>
                <th>Priority</th>
                <th>Due Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {dashboardData?.tasks?.slice(0, 5).map((task) => (
                <tr key={task.id}>
                  <td className="text-gray-900">{task.title}</td>
                  <td>
                    {task.model && (
                      <Link to={`/models/${task.model.id}`} className="text-primary-600">
                        {task.model.modelId}
                      </Link>
                    )}
                  </td>
                  <td><RiskBadge level={task.priority} /></td>
                  <td className="text-gray-500">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
                  </td>
                  <td><StatusBadge status={task.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  const renderValidatorDashboard = () => (
    <>
      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Validations"
          value={dashboardData?.summary?.activeValidations || 0}
          icon={ClipboardDocumentCheckIcon}
          link="/validations?status=IN_PROGRESS"
        />
        <StatCard
          title="Pending Validations"
          value={dashboardData?.summary?.pendingValidations || 0}
          icon={ClockIcon}
          link="/validations?status=NOT_STARTED"
        />
        <StatCard
          title="Findings Created"
          value={dashboardData?.stats?.findingsCreated || 0}
          icon={ExclamationTriangleIcon}
          link="/findings"
        />
        <StatCard
          title="Pending Approvals"
          value={dashboardData?.summary?.pendingApprovals || 0}
          icon={CheckCircleIcon}
          link="/workflows/pending"
        />
      </div>

      {/* Active Validations */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Active Validations</h2>
        <div className="card overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr>
                <th>Validation ID</th>
                <th>Model</th>
                <th>Scope</th>
                <th>Status</th>
                <th>Findings</th>
              </tr>
            </thead>
            <tbody>
              {dashboardData?.activeValidations?.map((validation) => (
                <tr key={validation.id}>
                  <td>
                    <Link to={`/validations/${validation.id}`} className="text-primary-600 font-medium">
                      {validation.validationId}
                    </Link>
                  </td>
                  <td>
                    <Link to={`/models/${validation.model.id}`} className="text-gray-900">
                      {validation.model.name}
                    </Link>
                  </td>
                  <td className="text-gray-500">{validation.scope?.replace(/_/g, ' ')}</td>
                  <td><StatusBadge status={validation.status} /></td>
                  <td className="text-gray-500">{validation._count?.findings || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  const renderAdminDashboard = () => (
    <>
      {/* System Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Users"
          value={dashboardData?.userStats?.total || 0}
          icon={CubeIcon}
          link="/users"
        />
        <StatCard
          title="Active Users (30d)"
          value={dashboardData?.userStats?.activeLastMonth || 0}
          icon={CheckCircleIcon}
          link="/users"
        />
        <StatCard
          title="Total Models"
          value={dashboardData?.systemStats?.models || 0}
          icon={CubeIcon}
          link="/models"
        />
        <StatCard
          title="Total Validations"
          value={dashboardData?.systemStats?.validations || 0}
          icon={ClipboardDocumentCheckIcon}
          link="/validations"
        />
        <StatCard
          title="Pending Approvals"
          value={dashboardData?.pendingApprovals?.length || 0}
          icon={ClockIcon}
          link="/users?status=PENDING_APPROVAL"
        />
      </div>

      {/* Users by Role */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Users by Role</h2>
          <div className="space-y-3">
            {dashboardData?.userStats?.byRole &&
              Object.entries(dashboardData.userStats.byRole).map(([role, count]) => (
                <div key={role} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{role.replace(/_/g, ' ')}</span>
                  <span className="text-sm font-medium text-gray-900">{count}</span>
                </div>
              ))}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Audit Activity</h2>
          <div className="space-y-3">
            {dashboardData?.auditSummary?.byAction &&
              Object.entries(dashboardData.auditSummary.byAction).slice(0, 5).map(([action, count]) => (
                <div key={action} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{action}</span>
                  <span className="text-sm font-medium text-gray-900">{count}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </>
  );

  const getDashboardByRole = () => {
    switch (user?.role) {
      case 'ADMIN':
        return renderAdminDashboard();
      case 'EXECUTIVE':
      case 'COMPLIANCE_OFFICER':
        return renderExecutiveDashboard();
      case 'MODEL_VALIDATOR':
        return renderValidatorDashboard();
      case 'MODEL_DEVELOPER':
      case 'RISK_MANAGER':
      default:
        return dashboardData?.role === 'RISK_MANAGER' ? renderExecutiveDashboard() : renderDeveloperDashboard();
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.firstName}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Here's what's happening with your model risk management activities.
        </p>
      </div>

      {getDashboardByRole()}
    </div>
  );
};

export default DashboardPage;
