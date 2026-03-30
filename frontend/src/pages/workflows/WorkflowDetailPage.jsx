import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { workflowAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

const StatusBadge = ({ status }) => {
  const colors = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
    COMPLETED: 'bg-green-100 text-green-800',
  };
  return (
    <span className={`badge ${colors[status] || 'badge-info'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
};

const WorkflowDetailPage = () => {
  const { id } = useParams();
  const { user, canApprove } = useAuthStore();
  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchWorkflow();
  }, [id]);

  const fetchWorkflow = async () => {
    try {
      const response = await workflowAPI.get(id);
      setWorkflow(response.data.data);
    } catch (error) {
      console.error('Failed to fetch workflow:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setProcessing(true);
    try {
      await workflowAPI.approve(id, { comment });
      setComment('');
      fetchWorkflow();
    } catch (error) {
      console.error('Failed to approve:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!comment.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    setProcessing(true);
    try {
      await workflowAPI.reject(id, { comment });
      setComment('');
      fetchWorkflow();
    } catch (error) {
      console.error('Failed to reject:', error);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Workflow not found</h2>
        <Link to="/workflows" className="text-primary-600 hover:text-primary-800 mt-4 inline-block">
          Back to Workflows
        </Link>
      </div>
    );
  }

  const currentStepIdx = workflow.steps?.findIndex((s) => s.status === 'PENDING') ?? -1;
  const isCurrentApprover = workflow.steps?.[currentStepIdx]?.approverId === user?.id;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link to="/workflows" className="inline-flex items-center text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Workflows
        </Link>
        <div className="sm:flex sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{workflow.workflowId}</h1>
              <StatusBadge status={workflow.status} />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {workflow.type?.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Workflow Steps */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Approval Steps</h3>
            <div className="relative">
              {workflow.steps?.map((step, idx) => (
                <div key={step.id || idx} className="relative pb-8 last:pb-0">
                  {idx < workflow.steps.length - 1 && (
                    <span
                      className={`absolute top-8 left-4 -ml-px h-full w-0.5 ${
                        step.status === 'APPROVED' || step.status === 'COMPLETED'
                          ? 'bg-green-300'
                          : 'bg-gray-200'
                      }`}
                    />
                  )}
                  <div className="relative flex items-start gap-4">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center ring-4 ring-white ${
                        step.status === 'APPROVED' || step.status === 'COMPLETED'
                          ? 'bg-green-500'
                          : step.status === 'REJECTED'
                          ? 'bg-red-500'
                          : step.status === 'PENDING' && idx === currentStepIdx
                          ? 'bg-blue-500'
                          : 'bg-gray-300'
                      }`}
                    >
                      {step.status === 'APPROVED' || step.status === 'COMPLETED' ? (
                        <CheckCircleIcon className="h-5 w-5 text-white" />
                      ) : step.status === 'REJECTED' ? (
                        <XCircleIcon className="h-5 w-5 text-white" />
                      ) : (
                        <span className="text-white text-sm font-medium">{idx + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{step.name || `Step ${idx + 1}`}</span>
                        <StatusBadge status={step.status} />
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <UserIcon className="h-4 w-4" />
                          {step.approver?.firstName} {step.approver?.lastName || 'Unassigned'}
                        </div>
                        <span>{step.role?.replace(/_/g, ' ')}</span>
                      </div>
                      {step.comment && (
                        <p className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          "{step.comment}"
                        </p>
                      )}
                      {step.completedAt && (
                        <p className="mt-1 text-xs text-gray-400">
                          {step.status === 'APPROVED' ? 'Approved' : 'Completed'} on{' '}
                          {new Date(step.completedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Section */}
          {workflow.status === 'IN_PROGRESS' && isCurrentApprover && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Action Required</h3>
              <div className="mb-4">
                <label className="label">Comment (required for rejection)</label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Add your comments..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleApprove}
                  disabled={processing}
                  className="btn btn-primary"
                >
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  {processing ? 'Processing...' : 'Approve'}
                </button>
                <button
                  onClick={handleReject}
                  disabled={processing}
                  className="btn btn-secondary text-red-600 border-red-300 hover:bg-red-50"
                >
                  <XCircleIcon className="h-4 w-4 mr-2" />
                  {processing ? 'Processing...' : 'Reject'}
                </button>
              </div>
            </div>
          )}

          {/* Entity Details */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Related Entity</h3>
            {workflow.model && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{workflow.model.name}</p>
                    <p className="text-sm text-gray-500">{workflow.model.modelId}</p>
                  </div>
                  <Link
                    to={`/models/${workflow.modelId}`}
                    className="btn btn-secondary text-sm"
                  >
                    View Model
                  </Link>
                </div>
              </div>
            )}
            {workflow.validation && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{workflow.validation.validationId}</p>
                    <p className="text-sm text-gray-500">
                      {workflow.validation.type?.replace(/_/g, ' ')} Validation
                    </p>
                  </div>
                  <Link
                    to={`/validations/${workflow.validationId}`}
                    className="btn btn-secondary text-sm"
                  >
                    View Validation
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Details</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500">Type</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {workflow.type?.replace(/_/g, ' ')}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Initiated By</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {workflow.initiatedBy?.firstName} {workflow.initiatedBy?.lastName}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Created</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {new Date(workflow.createdAt).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Current Step</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {workflow.currentStep || 'N/A'}
                </dd>
              </div>
              {workflow.completedAt && (
                <div>
                  <dt className="text-sm text-gray-500">Completed</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {new Date(workflow.completedAt).toLocaleString()}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress</h3>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-600">
                {workflow.steps?.filter((s) => s.status === 'APPROVED' || s.status === 'COMPLETED').length || 0}
                <span className="text-gray-400">/{workflow.steps?.length || 0}</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">Steps Completed</p>
            </div>
            <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full"
                style={{
                  width: `${
                    ((workflow.steps?.filter((s) => s.status === 'APPROVED' || s.status === 'COMPLETED').length || 0) /
                      (workflow.steps?.length || 1)) *
                    100
                  }%`,
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowDetailPage;
