import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';

// Layout
import DashboardLayout from './components/layout/DashboardLayout';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';

// Dashboard Pages
import DashboardPage from './pages/dashboard/DashboardPage';

// Model Pages
import ModelsListPage from './pages/models/ModelsListPage';
import ModelDetailPage from './pages/models/ModelDetailPage';
import ModelFormPage from './pages/models/ModelFormPage';

// Validation Pages
import ValidationsListPage from './pages/validations/ValidationsListPage';
import ValidationDetailPage from './pages/validations/ValidationDetailPage';

// Finding Pages
import FindingsListPage from './pages/findings/FindingsListPage';
import FindingDetailPage from './pages/findings/FindingDetailPage';

// Risk Pages
import RiskAssessmentsPage from './pages/risks/RiskAssessmentsPage';
import RiskHeatmapPage from './pages/risks/RiskHeatmapPage';

// Workflow Pages
import WorkflowsListPage from './pages/workflows/WorkflowsListPage';
import WorkflowDetailPage from './pages/workflows/WorkflowDetailPage';

// Task Pages
import TasksListPage from './pages/tasks/TasksListPage';

// User Pages
import UsersListPage from './pages/users/UsersListPage';
import ProfilePage from './pages/profile/ProfilePage';

// Reports
import ReportsPage from './pages/reports/ReportsPage';

// Protected Route Component
const ProtectedRoute = ({ children, roles = [] }) => {
  const { isAuthenticated, user, fetchUser } = useAuthStore();

  useEffect(() => {
    if (!user && localStorage.getItem('accessToken')) {
      fetchUser();
    }
  }, [user, fetchUser]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles.length > 0 && !roles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  const { fetchUser, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (localStorage.getItem('accessToken')) {
      fetchUser();
    }
  }, [fetchUser]);

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />

      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
        />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />

          {/* Models */}
          <Route path="models" element={<ModelsListPage />} />
          <Route path="models/new" element={<ModelFormPage />} />
          <Route path="models/:id" element={<ModelDetailPage />} />
          <Route path="models/:id/edit" element={<ModelFormPage />} />

          {/* Validations */}
          <Route path="validations" element={<ValidationsListPage />} />
          <Route path="validations/:id" element={<ValidationDetailPage />} />

          {/* Findings */}
          <Route path="findings" element={<FindingsListPage />} />
          <Route path="findings/:id" element={<FindingDetailPage />} />

          {/* Risk */}
          <Route path="risks" element={<RiskAssessmentsPage />} />
          <Route path="risks/heatmap" element={<RiskHeatmapPage />} />

          {/* Workflows */}
          <Route path="workflows" element={<WorkflowsListPage />} />
          <Route path="workflows/:id" element={<WorkflowDetailPage />} />

          {/* Tasks */}
          <Route path="tasks" element={<TasksListPage />} />

          {/* Users (Admin only) */}
          <Route
            path="users"
            element={
              <ProtectedRoute roles={['ADMIN', 'RISK_MANAGER']}>
                <UsersListPage />
              </ProtectedRoute>
            }
          />

          {/* Profile */}
          <Route path="profile" element={<ProfilePage />} />

          {/* Reports */}
          <Route path="reports" element={<ReportsPage />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}

export default App;
