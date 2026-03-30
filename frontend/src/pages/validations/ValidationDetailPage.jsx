import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  DocumentIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/react/24/outline';
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

const ValidationDetailPage = () => {
  const { id } = useParams();
  const { canValidate, canApprove } = useAuthStore();
  const [validation, setValidation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [comment, setComment] = useState('');

  useEffect(() => {
    fetchValidation();
  }, [id]);

  const fetchValidation = async () => {
    try {
      const response = await validationAPI.get(id);
      setValidation(response.data.data);
    } catch (error) {
      console.error('Failed to fetch validation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      await validationAPI.update(id, { status: newStatus });
      fetchValidation();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      await validationAPI.addComment(id, { content: comment });
      setComment('');
      fetchValidation();
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!validation) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Validation not found</h2>
        <Link to="/validations" className="text-primary-600 hover:text-primary-800 mt-4 inline-block">
          Back to Validations
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link to="/validations" className="inline-flex items-center text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Validations
        </Link>
        <div className="sm:flex sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{validation.validationId}</h1>
              <StatusBadge status={validation.status} />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {validation.type?.replace(/_/g, ' ')} Validation for{' '}
              <Link to={`/models/${validation.modelId}`} className="text-primary-600 hover:text-primary-800">
                {validation.model?.name}
              </Link>
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex gap-2">
            {canValidate() && validation.status === 'IN_PROGRESS' && (
              <button
                onClick={() => handleStatusUpdate('PENDING_REVIEW')}
                className="btn btn-primary"
              >
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Submit for Review
              </button>
            )}
            {canApprove() && validation.status === 'PENDING_REVIEW' && (
              <>
                <button
                  onClick={() => handleStatusUpdate('APPROVED')}
                  className="btn btn-primary"
                >
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Approve
                </button>
                <button
                  onClick={() => handleStatusUpdate('REJECTED')}
                  className="btn btn-secondary text-red-600"
                >
                  <XCircleIcon className="h-4 w-4 mr-2" />
                  Reject
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="card p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm text-gray-500">{validation.progress || 0}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-primary-600 h-3 rounded-full transition-all"
            style={{ width: `${validation.progress || 0}%` }}
          ></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-4">
          {['overview', 'checklist', 'findings', 'documents', 'comments'].map((tab) => (
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
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Validation Details</h3>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-gray-500">Type</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {validation.type?.replace(/_/g, ' ')}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Scope</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {validation.scope?.replace(/_/g, ' ') || 'Full'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Start Date</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {new Date(validation.startDate).toLocaleDateString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Due Date</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {new Date(validation.dueDate).toLocaleDateString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Validator</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {validation.validator?.firstName} {validation.validator?.lastName}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Reviewer</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {validation.reviewer?.firstName} {validation.reviewer?.lastName || 'Not assigned'}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Methodology</h3>
              <p className="text-gray-700 whitespace-pre-wrap">
                {validation.methodology || 'No methodology documented.'}
              </p>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Executive Summary</h3>
              <p className="text-gray-700 whitespace-pre-wrap">
                {validation.executiveSummary || 'No executive summary available yet.'}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Findings Created</span>
                  <span className="font-semibold text-gray-900">
                    {validation.findings?.length || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Documents</span>
                  <span className="font-semibold text-gray-900">
                    {validation.documents?.length || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Days Remaining</span>
                  <span className="font-semibold text-gray-900">
                    {Math.max(0, Math.ceil((new Date(validation.dueDate) - new Date()) / (1000 * 60 * 60 * 24)))}
                  </span>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Rating</h3>
              <div className="text-center">
                <span
                  className={`text-4xl font-bold ${
                    validation.overallRating === 'SATISFACTORY'
                      ? 'text-green-600'
                      : validation.overallRating === 'NEEDS_IMPROVEMENT'
                      ? 'text-yellow-600'
                      : validation.overallRating === 'UNSATISFACTORY'
                      ? 'text-red-600'
                      : 'text-gray-400'
                  }`}
                >
                  {validation.overallRating?.replace(/_/g, ' ') || 'Pending'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'checklist' && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Validation Checklist</h3>
          <div className="space-y-3">
            {[
              'Conceptual Soundness Review',
              'Data Quality Assessment',
              'Model Performance Testing',
              'Sensitivity Analysis',
              'Benchmark Comparison',
              'Implementation Verification',
              'Documentation Review',
              'Outcomes Analysis',
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <input type="checkbox" className="w-5 h-5 text-primary-600 rounded" />
                <span className="text-gray-900">{item}</span>
              </div>
            ))}
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
                </tr>
              </thead>
              <tbody>
                {validation.findings?.length > 0 ? (
                  validation.findings.map((finding) => (
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
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {finding.severity}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={finding.status} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center text-gray-500 py-8">
                      No findings recorded yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="card p-6">
          <div className="space-y-3">
            {validation.documents?.length > 0 ? (
              validation.documents.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <DocumentIcon className="h-5 w-5 text-gray-400" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{doc.name}</div>
                    <div className="text-sm text-gray-500">{doc.type?.replace(/_/g, ' ')}</div>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No documents uploaded yet</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'comments' && (
        <div className="card p-6">
          <form onSubmit={handleAddComment} className="mb-6">
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
            {validation.comments?.length > 0 ? (
              validation.comments.map((c) => (
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

export default ValidationDetailPage;
