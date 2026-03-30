import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PencilIcon,
  DocumentIcon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
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
    TIER_1_CRITICAL: 'Tier 1 - Critical',
    TIER_2_HIGH: 'Tier 2 - High',
    TIER_3_MEDIUM: 'Tier 3 - Medium',
    TIER_4_LOW: 'Tier 4 - Low',
  };
  return (
    <span className={`badge ${colors[tier] || 'badge-info'}`}>
      {labels[tier] || tier}
    </span>
  );
};

const TabButton = ({ active, children, onClick }) => (
  <button
    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      active
        ? 'border-primary-600 text-primary-600'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`}
    onClick={onClick}
  >
    {children}
  </button>
);

const ModelDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canManageModels, canValidate } = useAuthStore();
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchModel();
  }, [id]);

  const fetchModel = async () => {
    try {
      const response = await modelAPI.get(id);
      setModel(response.data.data);
    } catch (error) {
      console.error('Failed to fetch model:', error);
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

  if (!model) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Model not found</h2>
        <Link to="/models" className="text-primary-600 hover:text-primary-800 mt-4 inline-block">
          Back to Models
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link to="/models" className="inline-flex items-center text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Models
        </Link>
        <div className="sm:flex sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{model.name}</h1>
              <StatusBadge status={model.status} />
              <TierBadge tier={model.tier} />
            </div>
            <p className="mt-1 text-sm text-gray-500">{model.modelId}</p>
          </div>
          <div className="mt-4 sm:mt-0 flex gap-2">
            {canManageModels() && (
              <Link to={`/models/${id}/edit`} className="btn btn-secondary">
                <PencilIcon className="h-4 w-4 mr-2" />
                Edit
              </Link>
            )}
            {canValidate() && model.status === 'PENDING_VALIDATION' && (
              <Link to={`/validations/new?modelId=${id}`} className="btn btn-primary">
                <ClipboardDocumentCheckIcon className="h-4 w-4 mr-2" />
                Start Validation
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-4">
          <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
            Overview
          </TabButton>
          <TabButton active={activeTab === 'validations'} onClick={() => setActiveTab('validations')}>
            Validations ({model.validations?.length || 0})
          </TabButton>
          <TabButton active={activeTab === 'findings'} onClick={() => setActiveTab('findings')}>
            Findings ({model.findings?.length || 0})
          </TabButton>
          <TabButton active={activeTab === 'risks'} onClick={() => setActiveTab('risks')}>
            Risk Assessments ({model.riskAssessments?.length || 0})
          </TabButton>
          <TabButton active={activeTab === 'documents'} onClick={() => setActiveTab('documents')}>
            Documents ({model.documents?.length || 0})
          </TabButton>
          <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')}>
            Change History
          </TabButton>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Model Information</h3>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-gray-500">Type</dt>
                  <dd className="text-sm font-medium text-gray-900">{model.type?.replace(/_/g, ' ')}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Business Unit</dt>
                  <dd className="text-sm font-medium text-gray-900">{model.businessUnit}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Owner</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {model.owner?.firstName} {model.owner?.lastName}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Version</dt>
                  <dd className="text-sm font-medium text-gray-900">{model.version}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Methodology</dt>
                  <dd className="text-sm font-medium text-gray-900">{model.methodology || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Data Sources</dt>
                  <dd className="text-sm font-medium text-gray-900">{model.dataSources || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Next Validation Due</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {model.nextValidationDate
                      ? new Date(model.nextValidationDate).toLocaleDateString()
                      : 'Not scheduled'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Last Validation</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {model.lastValidationDate
                      ? new Date(model.lastValidationDate).toLocaleDateString()
                      : 'Never'}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Description</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{model.description || 'No description provided.'}</p>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Purpose & Use Cases</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{model.purpose || 'No purpose statement provided.'}</p>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Assumptions & Limitations</h3>
              <p className="text-gray-700 whitespace-pre-wrap">
                {model.assumptions || 'No assumptions documented.'}
              </p>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Open Findings</span>
                  <span className="font-semibold text-gray-900">
                    {model.findings?.filter((f) => f.status === 'OPEN').length || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Active Validations</span>
                  <span className="font-semibold text-gray-900">
                    {model.validations?.filter((v) => v.status === 'IN_PROGRESS').length || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Risk Score</span>
                  <span className="font-semibold text-gray-900">
                    {model.riskAssessments?.[0]?.overallRiskScore || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Regulatory Mappings</h3>
              <div className="flex flex-wrap gap-2">
                {model.regulatoryMappings?.length > 0 ? (
                  model.regulatoryMappings.map((reg, i) => (
                    <span key={i} className="badge bg-blue-100 text-blue-800">
                      {reg}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500 text-sm">No regulatory mappings</span>
                )}
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Created</h3>
              <p className="text-sm text-gray-500">
                {new Date(model.createdAt).toLocaleDateString()} by {model.createdBy?.firstName}{' '}
                {model.createdBy?.lastName}
              </p>
              <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-4">Last Updated</h3>
              <p className="text-sm text-gray-500">{new Date(model.updatedAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'validations' && (
        <div className="card overflow-hidden">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Validation ID</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Validator</th>
                  <th>Started</th>
                  <th>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {model.validations?.length > 0 ? (
                  model.validations.map((validation) => (
                    <tr key={validation.id}>
                      <td>
                        <Link
                          to={`/validations/${validation.id}`}
                          className="text-primary-600 font-medium hover:text-primary-800"
                        >
                          {validation.validationId}
                        </Link>
                      </td>
                      <td>{validation.type?.replace(/_/g, ' ')}</td>
                      <td>
                        <StatusBadge status={validation.status} />
                      </td>
                      <td>
                        {validation.validator?.firstName} {validation.validator?.lastName}
                      </td>
                      <td>{new Date(validation.startDate).toLocaleDateString()}</td>
                      <td>{new Date(validation.dueDate).toLocaleDateString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center text-gray-500 py-8">
                      No validations found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'findings' && (
        <div className="card overflow-hidden">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Finding ID</th>
                  <th>Title</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {model.findings?.length > 0 ? (
                  model.findings.map((finding) => (
                    <tr key={finding.id}>
                      <td>
                        <Link
                          to={`/findings/${finding.id}`}
                          className="text-primary-600 font-medium hover:text-primary-800"
                        >
                          {finding.findingId}
                        </Link>
                      </td>
                      <td className="font-medium text-gray-900">{finding.title}</td>
                      <td>
                        <span
                          className={`badge ${
                            finding.severity === 'CRITICAL'
                              ? 'bg-red-100 text-red-800'
                              : finding.severity === 'HIGH'
                              ? 'bg-orange-100 text-orange-800'
                              : finding.severity === 'MEDIUM'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {finding.severity}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={finding.status} />
                      </td>
                      <td>
                        {finding.dueDate ? new Date(finding.dueDate).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center text-gray-500 py-8">
                      No findings found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'risks' && (
        <div className="card overflow-hidden">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Assessment ID</th>
                  <th>Type</th>
                  <th>Overall Score</th>
                  <th>Status</th>
                  <th>Assessment Date</th>
                </tr>
              </thead>
              <tbody>
                {model.riskAssessments?.length > 0 ? (
                  model.riskAssessments.map((risk) => (
                    <tr key={risk.id}>
                      <td>
                        <Link
                          to={`/risks/${risk.id}`}
                          className="text-primary-600 font-medium hover:text-primary-800"
                        >
                          {risk.assessmentId}
                        </Link>
                      </td>
                      <td>{risk.assessmentType?.replace(/_/g, ' ')}</td>
                      <td>
                        <span
                          className={`font-semibold ${
                            risk.overallRiskScore >= 80
                              ? 'text-red-600'
                              : risk.overallRiskScore >= 60
                              ? 'text-orange-600'
                              : risk.overallRiskScore >= 40
                              ? 'text-yellow-600'
                              : 'text-green-600'
                          }`}
                        >
                          {risk.overallRiskScore}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={risk.status} />
                      </td>
                      <td>{new Date(risk.assessmentDate).toLocaleDateString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center text-gray-500 py-8">
                      No risk assessments found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="card overflow-hidden">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Type</th>
                  <th>Version</th>
                  <th>Uploaded By</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {model.documents?.length > 0 ? (
                  model.documents.map((doc) => (
                    <tr key={doc.id}>
                      <td className="flex items-center">
                        <DocumentIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="font-medium text-gray-900">{doc.name}</span>
                      </td>
                      <td>{doc.type?.replace(/_/g, ' ')}</td>
                      <td>{doc.version}</td>
                      <td>
                        {doc.uploadedBy?.firstName} {doc.uploadedBy?.lastName}
                      </td>
                      <td>{new Date(doc.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center text-gray-500 py-8">
                      No documents found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="card p-6">
          <div className="flow-root">
            <ul className="-mb-8">
              {model.changeLog?.length > 0 ? (
                model.changeLog.slice(0, 20).map((change, idx) => (
                  <li key={idx}>
                    <div className="relative pb-8">
                      {idx !== model.changeLog.length - 1 && (
                        <span
                          className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                          aria-hidden="true"
                        />
                      )}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center ring-8 ring-white">
                            <ClockIcon className="h-4 w-4 text-gray-500" />
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                          <div>
                            <p className="text-sm text-gray-500">
                              <span className="font-medium text-gray-900">{change.field}</span> changed
                              from <code className="text-xs bg-gray-100 px-1 rounded">{change.oldValue}</code>{' '}
                              to <code className="text-xs bg-gray-100 px-1 rounded">{change.newValue}</code>
                            </p>
                          </div>
                          <div className="whitespace-nowrap text-right text-sm text-gray-500">
                            {new Date(change.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">No change history available</p>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelDetailPage;
