import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  CubeIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  ArrowPathIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  ChartBarIcon,
  XMarkIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import useAuthStore from '../../store/authStore';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, roles: [] },
  { name: 'Models', href: '/models', icon: CubeIcon, roles: [] },
  { name: 'Validations', href: '/validations', icon: ClipboardDocumentCheckIcon, roles: [] },
  { name: 'Findings', href: '/findings', icon: ExclamationTriangleIcon, roles: [] },
  { name: 'Risk Assessments', href: '/risks', icon: ShieldExclamationIcon, roles: ['ADMIN', 'RISK_MANAGER', 'EXECUTIVE', 'COMPLIANCE_OFFICER'] },
  { name: 'Workflows', href: '/workflows', icon: ArrowPathIcon, roles: [] },
  { name: 'Tasks', href: '/tasks', icon: ClipboardDocumentListIcon, roles: [] },
  { name: 'Reports', href: '/reports', icon: ChartBarIcon, roles: ['ADMIN', 'EXECUTIVE', 'RISK_MANAGER', 'COMPLIANCE_OFFICER'] },
];

const adminNavigation = [
  { name: 'Users', href: '/users', icon: UsersIcon, roles: ['ADMIN', 'RISK_MANAGER'] },
];

const Sidebar = ({ open, onClose }) => {
  const location = useLocation();
  const { user } = useAuthStore();

  const isActive = (href) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(href);
  };

  const filterByRole = (items) => {
    return items.filter((item) => {
      if (item.roles.length === 0) return true;
      return item.roles.includes(user?.role);
    });
  };

  const filteredNavigation = filterByRole(navigation);
  const filteredAdminNav = filterByRole(adminNavigation);

  const NavLink = ({ item }) => {
    const active = isActive(item.href);
    return (
      <Link
        to={item.href}
        onClick={onClose}
        className={`
          group flex items-center gap-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors
          ${active
            ? 'bg-primary-50 text-primary-700'
            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
          }
        `}
      >
        <item.icon
          className={`h-5 w-5 shrink-0 ${active ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'}`}
        />
        {item.name}
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4 border-r border-gray-200">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">MRM</span>
          </div>
          <span className="font-semibold text-gray-900">Platform</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {filteredNavigation.map((item) => (
                <li key={item.name}>
                  <NavLink item={item} />
                </li>
              ))}
            </ul>
          </li>

          {filteredAdminNav.length > 0 && (
            <li>
              <div className="text-xs font-semibold leading-6 text-gray-400 uppercase tracking-wider">
                Administration
              </div>
              <ul role="list" className="-mx-2 mt-2 space-y-1">
                {filteredAdminNav.map((item) => (
                  <li key={item.name}>
                    <NavLink item={item} />
                  </li>
                ))}
              </ul>
            </li>
          )}

          {/* User info at bottom */}
          <li className="mt-auto">
            <Link
              to="/profile"
              className="group -mx-2 flex items-center gap-x-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            >
              <Cog6ToothIcon className="h-5 w-5 shrink-0 text-gray-400 group-hover:text-gray-500" />
              Settings
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-72 bg-white transition-transform duration-300 lg:hidden
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="absolute right-0 top-0 -mr-12 pt-2">
          <button
            type="button"
            className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
            onClick={onClose}
          >
            <XMarkIcon className="h-6 w-6 text-white" />
          </button>
        </div>
        <SidebarContent />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <SidebarContent />
      </div>
    </>
  );
};

export default Sidebar;
