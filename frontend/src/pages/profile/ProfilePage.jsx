import React, { useState, useEffect } from 'react';
import {
  UserCircleIcon,
  KeyIcon,
  ShieldCheckIcon,
  BellIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { authAPI, userAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

const ProfilePage = () => {
  const { user, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: '',
    title: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [notifications, setNotifications] = useState({
    emailOnTaskAssignment: true,
    emailOnValidationDue: true,
    emailOnFindingCreated: true,
    emailOnWorkflowUpdate: true,
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        department: user.department || '',
        title: user.title || '',
      });
    }
  }, [user]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await userAPI.update(user.id, profileData);
      setUser({ ...user, ...response.data.data });
      setMessage({ type: 'success', text: 'Profile updated successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update profile' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      setLoading(false);
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      setLoading(false);
      return;
    }

    try {
      await authAPI.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setMessage({ type: 'success', text: 'Password changed successfully' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to change password' });
    } finally {
      setLoading(false);
    }
  };

  const handleMFASetup = async () => {
    try {
      const response = await authAPI.setupMFA();
      // In a real app, show QR code for TOTP setup
      alert('MFA setup initiated. Scan the QR code with your authenticator app.');
      console.log('MFA Secret:', response.data.data.secret);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to setup MFA' });
    }
  };

  const TabButton = ({ id, icon: Icon, label }) => (
    <button
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        activeTab === id
          ? 'bg-primary-100 text-primary-700'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
      onClick={() => setActiveTab(id)}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Account Settings</h1>

      {message.text && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-48 space-y-1">
          <TabButton id="profile" icon={UserCircleIcon} label="Profile" />
          <TabButton id="security" icon={KeyIcon} label="Security" />
          <TabButton id="mfa" icon={ShieldCheckIcon} label="MFA" />
          <TabButton id="notifications" icon={BellIcon} label="Notifications" />
          <TabButton id="activity" icon={ClockIcon} label="Activity" />
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'profile' && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h2>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">First Name</label>
                    <input
                      type="text"
                      className="input"
                      value={profileData.firstName}
                      onChange={(e) =>
                        setProfileData({ ...profileData, firstName: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="label">Last Name</label>
                    <input
                      type="text"
                      className="input"
                      value={profileData.lastName}
                      onChange={(e) =>
                        setProfileData({ ...profileData, lastName: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    className="input"
                    value={profileData.email}
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Contact your administrator to change your email
                  </p>
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input
                    type="tel"
                    className="input"
                    value={profileData.phone}
                    onChange={(e) =>
                      setProfileData({ ...profileData, phone: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Department</label>
                    <input
                      type="text"
                      className="input"
                      value={profileData.department}
                      onChange={(e) =>
                        setProfileData({ ...profileData, department: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="label">Title</label>
                    <input
                      type="text"
                      className="input"
                      value={profileData.title}
                      onChange={(e) =>
                        setProfileData({ ...profileData, title: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="pt-4">
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="label">Current Password</label>
                  <input
                    type="password"
                    className="input"
                    value={passwordData.currentPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, currentPassword: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="label">New Password</label>
                  <input
                    type="password"
                    className="input"
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, newPassword: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="label">Confirm New Password</label>
                  <input
                    type="password"
                    className="input"
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                    }
                  />
                </div>
                <div className="pt-4">
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'mfa' && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Multi-Factor Authentication
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">Authenticator App</div>
                    <div className="text-sm text-gray-500">
                      Use an authenticator app to generate one-time codes
                    </div>
                  </div>
                  <div>
                    {user?.mfaEnabled ? (
                      <span className="badge bg-green-100 text-green-800">Enabled</span>
                    ) : (
                      <button onClick={handleMFASetup} className="btn btn-secondary text-sm">
                        Enable
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Multi-factor authentication adds an extra layer of security to your account.
                  When enabled, you'll need to enter a code from your authenticator app in
                  addition to your password when signing in.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Notification Preferences
              </h2>
              <div className="space-y-4">
                {Object.entries(notifications).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between py-2">
                    <div>
                      <div className="font-medium text-gray-900">
                        {key
                          .replace(/([A-Z])/g, ' $1')
                          .replace(/^./, (str) => str.toUpperCase())
                          .replace('Email On', '')}
                      </div>
                      <div className="text-sm text-gray-500">
                        Receive email notifications for this event
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={value}
                        onChange={(e) =>
                          setNotifications({ ...notifications, [key]: e.target.checked })
                        }
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
              <div className="space-y-4">
                <div className="text-sm text-gray-500">
                  <div className="flex justify-between py-2 border-b">
                    <span>Last login</span>
                    <span className="font-medium text-gray-900">
                      {user?.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleString()
                        : 'Never'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span>Account created</span>
                    <span className="font-medium text-gray-900">
                      {user?.createdAt
                        ? new Date(user.createdAt).toLocaleDateString()
                        : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span>Role</span>
                    <span className="font-medium text-gray-900">
                      {user?.role?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span>Employee ID</span>
                    <span className="font-medium text-gray-900">{user?.employeeId || '-'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
