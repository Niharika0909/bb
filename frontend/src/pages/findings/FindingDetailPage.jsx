import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/react/24/outline';
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
      <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
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

const FindingDetailPage = () => {
  const { id } = useParams();
  const { canManageModels, canValidate } = useAuthStore();
  const [finding, setFinding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [comment, setComment] = useState('');

  useEffect(() => {
    fetchFinding();
  }, [id]);

  const fetchFinding = async () => {
    try {
      const response = await findingAPI.get(id);
      setFinding(response.data.data);
    } catch (error) {
      console.error('Failed to fetch finding:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      await findingAPI.update(id, { status: newStatus });
      fetchFinding();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!finding) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Finding not found</h2>
        <Link to="/findings" className="text-primary-600 hover:text-primary-800 mt-4 inline-block">
          Back to Findings
        </Link>
      </div>
    );
  }

  const isOverdue = finding.dueDate && new Date(finding.dueDate) < new Date() && finding.status !== 'CLOSED';

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link to="/findings" className="inline-flex items-center text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Findings
        </Link>
        <div className="sm:flex sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{finding.findingId}</h1>
              <SeverityBadge severity={finding.severity} />
              <StatusBadge status={finding.status} />
            </div>
            <p className="mt-1 text-lg text-gray-700">{finding.title}</p>
          </div>
          <div className="mt-4 sm:mt-0 flex gap-2">
            {finding.status === 'OPEN' && (
              <button
                onClick={() => handleStatusUpdate('IN_PROGRESS')}
                className="btn btn-secondary"
              >
                <ClockIcon className="h-4 w-4 mr-2" />
                Start Work
              </button>
            )}
            {finding.status === 'IN_PROGRESS' && (
              <button
                onClick={() => handleStatusUpdate('REMEDIATED')}
                className="btn btn-primary"
              >
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Mark Remediated
              </button>
            )}
            {finding.status === 'REMEDIATED' && canValidate() && (
              <button
                onClick={() => handleStatusUpdate('CLOSED')}
                className="btn btn-primary"
              >
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Close Finding
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Alert for overdue */}
      {isOverdue && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
          <span className="text-red-700">
            This finding is overdue. Due date was {new Date(finding.dueDate).toLocaleDateString()}.
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-4">
          {['details', 'remediation', 'timeline', 'comments'].map((tab) => (
            <button
              key={tab}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Finding Details</h3>
              <dl className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <dt className="text-sm text-gray-500">Category</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {finding.category?.replace(/_/g, ' ') || 'General'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Model</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    <Link to={`/models/${finding.modelId}`} className="text-primary-600 hover:text-primary-800">
                      {finding.model?.name}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Validation</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {finding.validation ? (
                      <Link
                        to={`/validations/${finding.validationId}`}
                        className="text-primary-600 hover:text-primary-800"
                      >
                        {finding.validation.validationId}
                      </Link>
                    ) : (
                      'N/A'
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Identified Date</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {new Date(finding.identifiedDate).toLocaleDateString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Assigned To</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {finding.assignedTo?.firstName} {finding.assignedTo?.lastName || 'Unassigned'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Due Date</dt>
                  <dd className={`text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                    {finding.dueDate ? new Date(finding.dueDate).toLocaleDateString() : 'Not set'}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Description</h3>
              <p className="text-gray-700 whitespace-pre-wrap">
                {finding.description || 'No description provided.'}
              </p>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Impact Assessment</h3>
              <p className="text-gray-700 whitespace-pre-wrap">
                {finding.impact || 'No impact assessment documented.'}
              </p>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Root Cause</h3>
              <p className="text-gray-700 whitespace-pre-wrap">
                {finding.rootCause || 'Root cause not documented.'}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Rating</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Severity</span>
                  <SeverityBadge severity={finding.severity} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Likelihood</span>
                  <span className="font-medium text-gray-900">
                    {finding.likelihood || 'Not assessed'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Risk Score</span>
                  <span className="font-semibold text-gray-900">{finding.riskScore || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Created By</h3>
              <p className="text-sm text-gray-700">
                {finding.createdBy?.firstName} {finding.createdBy?.lastName}
              </p>
              <p className="text-sm text-gray-500">
                {new Date(finding.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'remediation' && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Remediation Plan</h3>
          <p className="text-gray-700 whitespace-pre-wrap mb-6">
            {finding.remediationPlan || 'No remediation plan documented yet.'}
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mb-4">Management Response</h3>
          <p className="text-gray-700 whitespace-pre-wrap">
            {finding.managementResponse || 'No management response recorded.'}
          </p>
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="card p-6">
          <div className="flow-root">
            <ul className="-mb-8">
              <li>
                <div className="relative pb-8">
                  <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" />
                  <div className="relative flex space-x-3">
                    <div>
                      <span className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                        <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                      <div>
                        <p className="text-sm text-gray-500">
                          Finding <span className="font-medium text-gray-900">created</span>
                        </p>
                      </div>
                      <div className="whitespace-nowrap text-right text-sm text-gray-500">
                        {new Date(finding.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
              {finding.status !== 'OPEN' && (
                <li>
                  <div className="relative pb-8">
                    <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" />
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <ClockIcon className="h-4 w-4 text-blue-600" />
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                        <div>
                          <p className="text-sm text-gray-500">
                            Status changed to <span className="font-medium text-gray-900">In Progress</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              )}
              {finding.status === 'CLOSED' && (
                <li>
                  <div className="relative">
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                          <CheckCircleIcon className="h-4 w-4 text-green-600" />
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                        <div>
                          <p className="text-sm text-gray-500">
                            Finding <span className="font-medium text-gray-900">closed</span>
                          </p>
                        </div>
                        <div className="whitespace-nowrap text-right text-sm text-gray-500">
                          {new Date(finding.updatedAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'comments' && (
        <div className="card p-6">
          <form className="mb-6">
            <textarea
              className="input mb-2"
              rows={3}
              placeholder="Add a comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <button type="submit" className="btn btn-primary text-sm">
              <ChatBubbleLeftIcon className="h-4 w-4 mr-2" />
              Add Comment
            </button>
          </form>

          <div className="space-y-4">
            {finding.comments?.length > 0 ? (
              finding.comments.map((c) => (
                <div key={c.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-gray-900">
                      {c.author?.firstName} {c.author?.lastName}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(c.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-gray-700">{c.content}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No comments yet</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FindingDetailPage;
