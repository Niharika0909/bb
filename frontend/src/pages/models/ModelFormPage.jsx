import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { modelAPI, userAPI } from '../../services/api';

const ModelFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'CREDIT_RISK',
    tier: 'TIER_3_MEDIUM',
    status: 'DRAFT',
    businessUnit: '',
    ownerId: '',
    version: '1.0',
    methodology: '',
    dataSources: '',
    assumptions: '',
    limitations: '',
    purpose: '',
    regulatoryMappings: [],
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchUsers();
    if (isEditMode) {
      fetchModel();
    }
  }, [id]);

  const fetchUsers = async () => {
    try {
      const response = await userAPI.list({ limit: 100 });
      setUsers(response.data.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchModel = async () => {
    setLoading(true);
    try {
      const response = await modelAPI.get(id);
      const model = response.data.data;
      setFormData({
        name: model.name || '',
        description: model.description || '',
        type: model.type || 'CREDIT_RISK',
        tier: model.tier || 'TIER_3_MEDIUM',
        status: model.status || 'DRAFT',
        businessUnit: model.businessUnit || '',
        ownerId: model.ownerId || '',
        version: model.version || '1.0',
        methodology: model.methodology || '',
        dataSources: model.dataSources || '',
        assumptions: model.assumptions || '',
        limitations: model.limitations || '',
        purpose: model.purpose || '',
        regulatoryMappings: model.regulatoryMappings || [],
      });
    } catch (error) {
      console.error('Failed to fetch model:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleRegulatoryChange = (e) => {
    const values = e.target.value.split(',').map((v) => v.trim()).filter(Boolean);
    setFormData((prev) => ({ ...prev, regulatoryMappings: values }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.businessUnit.trim()) newErrors.businessUnit = 'Business unit is required';
    if (!formData.ownerId) newErrors.ownerId = 'Owner is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      if (isEditMode) {
        await modelAPI.update(id, formData);
      } else {
        await modelAPI.create(formData);
      }
      navigate('/models');
    } catch (error) {
      console.error('Failed to save model:', error);
      if (error.response?.data?.errors) {
        const apiErrors = {};
        error.response.data.errors.forEach((err) => {
          apiErrors[err.field] = err.message;
        });
        setErrors(apiErrors);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link to="/models" className="inline-flex items-center text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Models
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditMode ? 'Edit Model' : 'Register New Model'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {isEditMode
            ? 'Update the model information below'
            : 'Fill in the details to register a new model in the inventory'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Model Name *</label>
              <input
                type="text"
                name="name"
                className={`input ${errors.name ? 'border-red-500' : ''}`}
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter model name"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="label">Model Type *</label>
              <select name="type" className="input" value={formData.type} onChange={handleChange}>
                <option value="CREDIT_RISK">Credit Risk</option>
                <option value="MARKET_RISK">Market Risk</option>
                <option value="OPERATIONAL_RISK">Operational Risk</option>
                <option value="FRAUD_DETECTION">Fraud Detection</option>
                <option value="AML_KYC">AML/KYC</option>
                <option value="PRICING">Pricing</option>
                <option value="VALUATION">Valuation</option>
                <option value="STRESS_TESTING">Stress Testing</option>
                <option value="CAPITAL">Capital</option>
                <option value="LIQUIDITY">Liquidity</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="label">Tier *</label>
              <select name="tier" className="input" value={formData.tier} onChange={handleChange}>
                <option value="TIER_1_CRITICAL">Tier 1 - Critical</option>
                <option value="TIER_2_HIGH">Tier 2 - High</option>
                <option value="TIER_3_MEDIUM">Tier 3 - Medium</option>
                <option value="TIER_4_LOW">Tier 4 - Low</option>
              </select>
            </div>

            <div>
              <label className="label">Business Unit *</label>
              <input
                type="text"
                name="businessUnit"
                className={`input ${errors.businessUnit ? 'border-red-500' : ''}`}
                value={formData.businessUnit}
                onChange={handleChange}
                placeholder="e.g., Risk Management, Trading"
              />
              {errors.businessUnit && <p className="text-red-500 text-sm mt-1">{errors.businessUnit}</p>}
            </div>

            <div>
              <label className="label">Owner *</label>
              <select
                name="ownerId"
                className={`input ${errors.ownerId ? 'border-red-500' : ''}`}
                value={formData.ownerId}
                onChange={handleChange}
              >
                <option value="">Select owner</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} ({user.role})
                  </option>
                ))}
              </select>
              {errors.ownerId && <p className="text-red-500 text-sm mt-1">{errors.ownerId}</p>}
            </div>

            <div>
              <label className="label">Version</label>
              <input
                type="text"
                name="version"
                className="input"
                value={formData.version}
                onChange={handleChange}
                placeholder="e.g., 1.0, 2.1"
              />
            </div>

            {isEditMode && (
              <div>
                <label className="label">Status</label>
                <select name="status" className="input" value={formData.status} onChange={handleChange}>
                  <option value="DRAFT">Draft</option>
                  <option value="UNDER_DEVELOPMENT">Under Development</option>
                  <option value="PENDING_VALIDATION">Pending Validation</option>
                  <option value="IN_VALIDATION">In Validation</option>
                  <option value="PENDING_APPROVAL">Pending Approval</option>
                  <option value="APPROVED">Approved</option>
                  <option value="IN_PRODUCTION">In Production</option>
                  <option value="DEPRECATED">Deprecated</option>
                  <option value="RETIRED">Retired</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Description & Purpose */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Description & Purpose</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Description *</label>
              <textarea
                name="description"
                rows={4}
                className={`input ${errors.description ? 'border-red-500' : ''}`}
                value={formData.description}
                onChange={handleChange}
                placeholder="Provide a detailed description of the model"
              />
              {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
            </div>

            <div>
              <label className="label">Purpose & Use Cases</label>
              <textarea
                name="purpose"
                rows={3}
                className="input"
                value={formData.purpose}
                onChange={handleChange}
                placeholder="Describe the business purpose and intended use cases"
              />
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Technical Details</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Methodology</label>
              <textarea
                name="methodology"
                rows={3}
                className="input"
                value={formData.methodology}
                onChange={handleChange}
                placeholder="Describe the model methodology (e.g., logistic regression, neural network)"
              />
            </div>

            <div>
              <label className="label">Data Sources</label>
              <textarea
                name="dataSources"
                rows={2}
                className="input"
                value={formData.dataSources}
                onChange={handleChange}
                placeholder="List the data sources used by this model"
              />
            </div>

            <div>
              <label className="label">Assumptions</label>
              <textarea
                name="assumptions"
                rows={3}
                className="input"
                value={formData.assumptions}
                onChange={handleChange}
                placeholder="Document key model assumptions"
              />
            </div>

            <div>
              <label className="label">Limitations</label>
              <textarea
                name="limitations"
                rows={3}
                className="input"
                value={formData.limitations}
                onChange={handleChange}
                placeholder="Document known model limitations"
              />
            </div>
          </div>
        </div>

        {/* Regulatory */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Regulatory Information</h2>
          <div>
            <label className="label">Regulatory Mappings</label>
            <input
              type="text"
              className="input"
              value={formData.regulatoryMappings.join(', ')}
              onChange={handleRegulatoryChange}
              placeholder="e.g., SR 11-7, BCBS 239, IFRS 9 (comma separated)"
            />
            <p className="text-sm text-gray-500 mt-1">
              Enter applicable regulations separated by commas
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link to="/models" className="btn btn-secondary">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? (
              <>
                <div className="spinner mr-2"></div>
                Saving...
              </>
            ) : isEditMode ? (
              'Update Model'
            ) : (
              'Register Model'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ModelFormPage;
