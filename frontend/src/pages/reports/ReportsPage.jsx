import React, { useState, useEffect } from 'react';
import {
  DocumentChartBarIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { modelAPI, validationAPI, findingAPI } from '../../services/api';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const ReportsPage = () => {
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('inventory');
  const [dateRange, setDateRange] = useState('quarter');
  const [data, setData] = useState({
    modelsByStatus: [],
    modelsByTier: [],
    modelsByType: [],
    validationTrend: [],
    findingsBySeverity: [],
    findingsTrend: [],
  });

  useEffect(() => {
    fetchReportData();
  }, [reportType, dateRange]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      // Fetch models data
      const modelsRes = await modelAPI.list({ limit: 1000 });
      const models = modelsRes.data.data;

      // Models by status
      const statusCounts = {};
      models.forEach((m) => {
        statusCounts[m.status] = (statusCounts[m.status] || 0) + 1;
      });
      const modelsByStatus = Object.entries(statusCounts).map(([name, value]) => ({
        name: name.replace(/_/g, ' '),
        value,
      }));

      // Models by tier
      const tierCounts = {};
      models.forEach((m) => {
        tierCounts[m.tier] = (tierCounts[m.tier] || 0) + 1;
      });
      const modelsByTier = Object.entries(tierCounts).map(([name, value]) => ({
        name: name.replace(/_/g, ' ').replace('TIER ', 'T'),
        value,
      }));

      // Models by type
      const typeCounts = {};
      models.forEach((m) => {
        typeCounts[m.type] = (typeCounts[m.type] || 0) + 1;
      });
      const modelsByType = Object.entries(typeCounts).map(([name, value]) => ({
        name: name.replace(/_/g, ' '),
        value,
      }));

      // Fetch findings data
      const findingsRes = await findingAPI.list({ limit: 1000 });
      const findings = findingsRes.data.data;

      // Findings by severity
      const severityCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
      findings.forEach((f) => {
        severityCounts[f.severity] = (severityCounts[f.severity] || 0) + 1;
      });
      const findingsBySeverity = Object.entries(severityCounts).map(([name, value]) => ({
        name,
        value,
      }));

      // Mock trend data (in real app, aggregate by date)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      const validationTrend = months.map((month) => ({
        month,
        completed: Math.floor(Math.random() * 10) + 5,
        pending: Math.floor(Math.random() * 8) + 2,
      }));

      const findingsTrend = months.map((month) => ({
        month,
        opened: Math.floor(Math.random() * 15) + 5,
        closed: Math.floor(Math.random() * 12) + 3,
      }));

      setData({
        modelsByStatus,
        modelsByTier,
        modelsByType,
        validationTrend,
        findingsBySeverity,
        findingsTrend,
      });
    } catch (error) {
      console.error('Failed to fetch report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format) => {
    // In a real app, this would trigger a download
    console.log(`Exporting report as ${format}`);
    alert(`Report export as ${format} initiated. This feature requires backend implementation.`);
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
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Generate and view model risk management reports
          </p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <button onClick={() => handleExport('pdf')} className="btn btn-secondary">
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            Export PDF
          </button>
          <button onClick={() => handleExport('excel')} className="btn btn-secondary">
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Report Type</label>
            <select
              className="input"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              <option value="inventory">Model Inventory</option>
              <option value="validation">Validation Status</option>
              <option value="findings">Findings Analysis</option>
              <option value="risk">Risk Overview</option>
            </select>
          </div>
          <div>
            <label className="label">Date Range</label>
            <select
              className="input"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="month">Last Month</option>
              <option value="quarter">Last Quarter</option>
              <option value="year">Last Year</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Models by Status */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Models by Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.modelsByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.modelsByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Models by Tier */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Models by Tier</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.modelsByTier}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#4F46E5" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Findings by Severity */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Findings by Severity</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.findingsBySeverity} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" />
                <Tooltip />
                <Bar dataKey="value" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Models by Type */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Models by Type</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.modelsByType}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.modelsByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Validation Trend */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Validation Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.validationTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="completed" stroke="#10B981" name="Completed" />
                <Line type="monotone" dataKey="pending" stroke="#F59E0B" name="Pending" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Findings Trend */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Findings Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.findingsTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="opened" stroke="#EF4444" name="Opened" />
                <Line type="monotone" dataKey="closed" stroke="#10B981" name="Closed" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Predefined Reports */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Standard Reports</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-gray-50 cursor-pointer transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <DocumentChartBarIcon className="h-6 w-6 text-primary-600" />
              <span className="font-medium text-gray-900">Model Inventory Report</span>
            </div>
            <p className="text-sm text-gray-500">
              Complete inventory of all models with status, tier, and ownership details
            </p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-gray-50 cursor-pointer transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <DocumentTextIcon className="h-6 w-6 text-green-600" />
              <span className="font-medium text-gray-900">Validation Summary</span>
            </div>
            <p className="text-sm text-gray-500">
              Summary of validation activities including completion rates and outcomes
            </p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-gray-50 cursor-pointer transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <DocumentChartBarIcon className="h-6 w-6 text-red-600" />
              <span className="font-medium text-gray-900">Risk Assessment Report</span>
            </div>
            <p className="text-sm text-gray-500">
              Comprehensive risk scores and assessments across all models
            </p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-gray-50 cursor-pointer transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <DocumentTextIcon className="h-6 w-6 text-orange-600" />
              <span className="font-medium text-gray-900">Findings Tracker</span>
            </div>
            <p className="text-sm text-gray-500">
              Open findings, remediation status, and aging analysis
            </p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-gray-50 cursor-pointer transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <CalendarIcon className="h-6 w-6 text-purple-600" />
              <span className="font-medium text-gray-900">Regulatory Compliance</span>
            </div>
            <p className="text-sm text-gray-500">
              Compliance status against SR 11-7, BCBS 239, and other regulations
            </p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-gray-50 cursor-pointer transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <DocumentChartBarIcon className="h-6 w-6 text-indigo-600" />
              <span className="font-medium text-gray-900">Executive Dashboard</span>
            </div>
            <p className="text-sm text-gray-500">
              High-level summary for board and executive presentations
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
