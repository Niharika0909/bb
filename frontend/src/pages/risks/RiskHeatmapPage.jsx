import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { riskAPI, modelAPI } from '../../services/api';

const RiskHeatmapPage = () => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await modelAPI.list({ limit: 100 });
      setModels(response.data.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create heatmap grid (Impact vs Likelihood)
  const impactLevels = ['Critical', 'High', 'Medium', 'Low'];
  const likelihoodLevels = ['Very Likely', 'Likely', 'Possible', 'Unlikely'];

  const getModelsInCell = (impact, likelihood) => {
    // Map model tiers and risk scores to grid positions
    const impactMap = { TIER_1_CRITICAL: 'Critical', TIER_2_HIGH: 'High', TIER_3_MEDIUM: 'Medium', TIER_4_LOW: 'Low' };

    return models.filter((model) => {
      const modelImpact = impactMap[model.tier] || 'Medium';
      // Determine likelihood based on risk score or validation status
      let modelLikelihood = 'Possible';
      if (model.status === 'IN_PRODUCTION') modelLikelihood = 'Likely';
      if (model.status === 'PENDING_VALIDATION') modelLikelihood = 'Very Likely';
      if (model.status === 'DRAFT') modelLikelihood = 'Unlikely';

      return modelImpact === impact && modelLikelihood === likelihood;
    });
  };

  const getCellColor = (impact, likelihood) => {
    const impactScore = { Critical: 4, High: 3, Medium: 2, Low: 1 };
    const likelihoodScore = { 'Very Likely': 4, Likely: 3, Possible: 2, Unlikely: 1 };
    const score = impactScore[impact] * likelihoodScore[likelihood];

    if (score >= 12) return 'bg-red-500 hover:bg-red-600';
    if (score >= 8) return 'bg-orange-500 hover:bg-orange-600';
    if (score >= 4) return 'bg-yellow-500 hover:bg-yellow-600';
    return 'bg-green-500 hover:bg-green-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link to="/risks" className="inline-flex items-center text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Risk Assessments
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Risk Heatmap</h1>
        <p className="mt-1 text-sm text-gray-500">
          Visual overview of model risk distribution across impact and likelihood
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Heatmap */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex">
            {/* Y-axis label */}
            <div className="flex items-center justify-center w-12">
              <span className="-rotate-90 whitespace-nowrap text-sm font-medium text-gray-700">
                Impact
              </span>
            </div>

            <div className="flex-1">
              {/* Grid */}
              <div className="grid grid-cols-4 gap-1">
                {impactLevels.map((impact) =>
                  likelihoodLevels.map((likelihood) => {
                    const cellModels = getModelsInCell(impact, likelihood);
                    return (
                      <button
                        key={`${impact}-${likelihood}`}
                        className={`${getCellColor(impact, likelihood)} h-24 rounded-lg text-white font-semibold transition-colors flex flex-col items-center justify-center`}
                        onClick={() => setSelectedCell({ impact, likelihood, models: cellModels })}
                      >
                        <span className="text-2xl">{cellModels.length}</span>
                        <span className="text-xs opacity-80">models</span>
                      </button>
                    );
                  })
                )}
              </div>

              {/* X-axis labels */}
              <div className="grid grid-cols-4 gap-1 mt-2">
                {likelihoodLevels.map((level) => (
                  <div key={level} className="text-center text-sm text-gray-600">
                    {level}
                  </div>
                ))}
              </div>
              <div className="text-center text-sm font-medium text-gray-700 mt-2">Likelihood</div>
            </div>
          </div>

          {/* Y-axis labels */}
          <div className="flex mt-4 ml-12">
            <div className="grid grid-rows-4 gap-1 mr-2">
              {impactLevels.map((level) => (
                <div key={level} className="h-24 flex items-center text-sm text-gray-600">
                  {level}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-6 flex justify-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-sm text-gray-600">Critical Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded"></div>
              <span className="text-sm text-gray-600">High Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span className="text-sm text-gray-600">Medium Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm text-gray-600">Low Risk</span>
            </div>
          </div>
        </div>

        {/* Selected Cell Details */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {selectedCell
              ? `${selectedCell.impact} Impact / ${selectedCell.likelihood}`
              : 'Select a cell to view details'}
          </h3>

          {selectedCell ? (
            selectedCell.models.length > 0 ? (
              <div className="space-y-3">
                {selectedCell.models.map((model) => (
                  <Link
                    key={model.id}
                    to={`/models/${model.id}`}
                    className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="font-medium text-gray-900">{model.name}</div>
                    <div className="text-sm text-gray-500">{model.modelId}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {model.status?.replace(/_/g, ' ')} • {model.businessUnit}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No models in this risk category</p>
            )
          ) : (
            <p className="text-gray-500 text-sm">
              Click on any cell in the heatmap to see the models in that risk category
            </p>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 mt-6">
        <div className="card p-4 border-l-4 border-red-500">
          <div className="text-2xl font-bold text-red-600">
            {models.filter((m) => m.tier === 'TIER_1_CRITICAL').length}
          </div>
          <div className="text-sm text-gray-500">Critical Models</div>
        </div>
        <div className="card p-4 border-l-4 border-orange-500">
          <div className="text-2xl font-bold text-orange-600">
            {models.filter((m) => m.tier === 'TIER_2_HIGH').length}
          </div>
          <div className="text-sm text-gray-500">High Risk Models</div>
        </div>
        <div className="card p-4 border-l-4 border-yellow-500">
          <div className="text-2xl font-bold text-yellow-600">
            {models.filter((m) => m.tier === 'TIER_3_MEDIUM').length}
          </div>
          <div className="text-sm text-gray-500">Medium Risk Models</div>
        </div>
        <div className="card p-4 border-l-4 border-green-500">
          <div className="text-2xl font-bold text-green-600">
            {models.filter((m) => m.tier === 'TIER_4_LOW').length}
          </div>
          <div className="text-sm text-gray-500">Low Risk Models</div>
        </div>
      </div>
    </div>
  );
};

export default RiskHeatmapPage;
