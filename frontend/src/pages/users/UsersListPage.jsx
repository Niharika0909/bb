import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { userAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

const RoleBadge = ({ role }) => {
  const colors = {
    ADMIN: 'bg-purple-100 text-purple-800',
    EXECUTIVE: 'bg-indigo-100 text-indigo-800',
    RISK_MANAGER: 'bg-blue-100 text-blue-800',
    MODEL_VALIDATOR: 'bg-green-100 text-green-800',
    MODEL_DEVELOPER: 'bg-yellow-100 text-yellow-800',
    COMPLIANCE_OFFICER: 'bg-orange-100 text-orange-800',
    AUDITOR: 'bg-gray-100 text-gray-800',
    VIEWER: 'bg-gray-100 text-gray-800',
  };
  return (
    <span className={`badge ${colors[role] || 'badge-info'}`}>
      {role?.replace(/_/g, ' ')}
    </span>
  );
};

const StatusBadge = ({ isActive }) => (
  <span className={`badge ${isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
    {isActive ? 'Active' : 'Inactive'}
  </span>
);

const UsersListPage = () => {
  const { isAdmin } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [filters, setFilters] = useState({
    role: '',
    search: '',
    isActive: '',
  });

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, filters]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await userAPI.list({
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      });
      setUsers(response.data.data);
      setPagination((prev) => ({
        ...prev,
        total: response.data.pagination.total,
      }));
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      await userAPI.update(userId, { isActive: !currentStatus });
      fetchUsers();
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage user accounts and permissions
          </p>
        </div>
        {isAdmin() && (
          <Link to="/users/new" className="btn btn-primary mt-4 sm:mt-0">
            <PlusIcon className="h-5 w-5 mr-2" />
            Add User
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="text-2xl font-bold text-gray-900">
            {users.filter((u) => u.isActive).length}
          </div>
          <div className="text-sm text-gray-500">Active Users</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-purple-600">
            {users.filter((u) => u.role === 'ADMIN').length}
          </div>
          <div className="text-sm text-gray-500">Administrators</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-green-600">
            {users.filter((u) => u.role === 'MODEL_VALIDATOR').length}
          </div>
          <div className="text-sm text-gray-500">Validators</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-yellow-600">
            {users.filter((u) => u.role === 'MODEL_DEVELOPER').length}
          </div>
          <div className="text-sm text-gray-500">Developers</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div>
            <label className="label">Search</label>
            <input
              type="text"
              className="input"
              placeholder="Search users..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Role</label>
            <select
              className="input"
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
            >
              <option value="">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="EXECUTIVE">Executive</option>
              <option value="RISK_MANAGER">Risk Manager</option>
              <option value="MODEL_VALIDATOR">Model Validator</option>
              <option value="MODEL_DEVELOPER">Model Developer</option>
              <option value="COMPLIANCE_OFFICER">Compliance Officer</option>
              <option value="AUDITOR">Auditor</option>
              <option value="VIEWER">Viewer</option>
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={filters.isActive}
              onChange={(e) => setFilters({ ...filters, isActive: e.target.value })}
            >
              <option value="">All Statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
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
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>MFA</th>
                    <th>Last Login</th>
                    {isAdmin() && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="flex items-center">
                          <UserCircleIcon className="h-8 w-8 text-gray-400 mr-3" />
                          <div>
                            <Link
                              to={`/users/${user.id}`}
                              className="text-gray-900 font-medium hover:text-primary-600"
                            >
                              {user.firstName} {user.lastName}
                            </Link>
                            <div className="text-xs text-gray-500">{user.employeeId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-gray-500">{user.email}</td>
                      <td>
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="text-gray-500">{user.department || '-'}</td>
                      <td>
                        <StatusBadge isActive={user.isActive} />
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            user.mfaEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {user.mfaEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="text-gray-500">
                        {user.lastLoginAt
                          ? new Date(user.lastLoginAt).toLocaleDateString()
                          : 'Never'}
                      </td>
                      {isAdmin() && (
                        <td>
                          <div className="flex gap-2">
                            <Link
                              to={`/users/${user.id}/edit`}
                              className="text-primary-600 hover:text-primary-800 text-sm"
                            >
                              Edit
                            </Link>
                            <button
                              onClick={() => handleToggleStatus(user.id, user.isActive)}
                              className={`text-sm ${
                                user.isActive
                                  ? 'text-red-600 hover:text-red-800'
                                  : 'text-green-600 hover:text-green-800'
                              }`}
                            >
                              {user.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      )}
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

export default UsersListPage;
