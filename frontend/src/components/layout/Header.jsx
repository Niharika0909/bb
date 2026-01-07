import React, { useState, useEffect, Fragment } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import {
  Bars3Icon,
  BellIcon,
  ChevronDownIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import useAuthStore from '../../store/authStore';
import { userAPI } from '../../services/api';

const roleLabels = {
  ADMIN: 'Administrator',
  EXECUTIVE: 'Executive',
  RISK_MANAGER: 'Risk Manager',
  MODEL_VALIDATOR: 'Model Validator',
  MODEL_DEVELOPER: 'Model Developer',
  COMPLIANCE_OFFICER: 'Compliance Officer',
  AUDITOR: 'Auditor',
  VIEWER: 'Viewer',
};

const Header = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
    }
  }, [user?.id]);

  const fetchNotifications = async () => {
    try {
      const response = await userAPI.getNotifications(user.id, true);
      setNotifications(response.data.data.slice(0, 5));
      setUnreadCount(response.data.data.length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const markAsRead = async () => {
    try {
      await userAPI.markNotificationsRead(user.id);
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      {/* Mobile menu button */}
      <button
        type="button"
        className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
        onClick={onMenuClick}
      >
        <Bars3Icon className="h-6 w-6" />
      </button>

      {/* Separator */}
      <div className="h-6 w-px bg-gray-200 lg:hidden" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        {/* Search placeholder */}
        <div className="flex flex-1 items-center">
          <h1 className="text-lg font-semibold text-gray-900">
            Model Risk Management
          </h1>
        </div>

        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* Notifications */}
          <Menu as="div" className="relative">
            <Menu.Button
              className="relative -m-2.5 p-2.5 text-gray-400 hover:text-gray-500"
              onClick={markAsRead}
            >
              <BellIcon className="h-6 w-6" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Menu.Button>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 z-10 mt-2.5 w-80 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-gray-200 focus:outline-none">
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Notifications
                  </h3>
                  <div className="mt-3 space-y-3">
                    {notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <Link
                          key={notification.id}
                          to={notification.linkUrl || '#'}
                          className="block rounded-lg p-2 hover:bg-gray-50"
                        >
                          <p className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {notification.message}
                          </p>
                        </Link>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">
                        No new notifications
                      </p>
                    )}
                  </div>
                </div>
              </Menu.Items>
            </Transition>
          </Menu>

          {/* Separator */}
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" />

          {/* Profile dropdown */}
          <Menu as="div" className="relative">
            <Menu.Button className="-m-1.5 flex items-center p-1.5">
              <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-sm font-medium text-primary-700">
                  {user?.firstName?.[0]}
                  {user?.lastName?.[0]}
                </span>
              </div>
              <span className="hidden lg:flex lg:items-center">
                <span className="ml-4 text-sm font-semibold leading-6 text-gray-900">
                  {user?.firstName} {user?.lastName}
                </span>
                <ChevronDownIcon className="ml-2 h-5 w-5 text-gray-400" />
              </span>
            </Menu.Button>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 z-10 mt-2.5 w-56 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-gray-200 focus:outline-none">
                <div className="p-3 border-b border-gray-200">
                  <p className="text-sm font-semibold text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                  <span className="mt-2 inline-flex items-center rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
                    {roleLabels[user?.role] || user?.role}
                  </span>
                </div>

                <div className="py-1">
                  <Menu.Item>
                    {({ active }) => (
                      <Link
                        to="/profile"
                        className={`flex items-center gap-2 px-4 py-2 text-sm ${
                          active ? 'bg-gray-50 text-gray-900' : 'text-gray-700'
                        }`}
                      >
                        <UserCircleIcon className="h-5 w-5 text-gray-400" />
                        Your Profile
                      </Link>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <Link
                        to="/profile#settings"
                        className={`flex items-center gap-2 px-4 py-2 text-sm ${
                          active ? 'bg-gray-50 text-gray-900' : 'text-gray-700'
                        }`}
                      >
                        <Cog6ToothIcon className="h-5 w-5 text-gray-400" />
                        Settings
                      </Link>
                    )}
                  </Menu.Item>
                </div>

                <div className="border-t border-gray-200 py-1">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={handleLogout}
                        className={`flex w-full items-center gap-2 px-4 py-2 text-sm ${
                          active ? 'bg-gray-50 text-gray-900' : 'text-gray-700'
                        }`}
                      >
                        <ArrowRightOnRectangleIcon className="h-5 w-5 text-gray-400" />
                        Sign out
                      </button>
                    )}
                  </Menu.Item>
                </div>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>
    </header>
  );
};

export default Header;
