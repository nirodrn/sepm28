import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, ClipboardList, Users, LayoutDashboard } from 'lucide-react';
import { useRole } from '../../hooks/useRole';
import { PCS_PAGES, PCS_PAGE_TITLES } from '../../constants/pcsConstants';

const PCSLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasRole } = useRole();

  const navigationItems = [
    {
      path: PCS_PAGES.DASHBOARD,
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['MainDirector', 'Admin']
    },
    {
      path: PCS_PAGES.PERMISSION_CONTROL,
      label: 'Permission Control',
      icon: Shield,
      roles: ['MainDirector', 'Admin']
    },
    {
      path: PCS_PAGES.USER_MATRIX,
      label: 'User Matrix',
      icon: Users,
      roles: ['MainDirector', 'Admin']
    },
    {
      path: PCS_PAGES.SALES_APPROVAL_HISTORY,
      label: 'Sales History',
      icon: ClipboardList,
      roles: ['MainDirector', 'HeadOfOperations', 'Admin']
    }
  ];

  const allowedNavItems = navigationItems.filter(item => 
    item.roles.some(role => hasRole(role))
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Permission Control System
            </h1>
          </div>

          {/* Navigation */}
          <div className="bg-white shadow-sm rounded-lg mb-6">
            <div className="px-4 sm:px-6 lg:px-8">
              <nav className="-mb-px flex space-x-8">
                {allowedNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className={`
                        ${isActive
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }
                        whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center
                      `}
                    >
                      <Icon className="h-5 w-5 mr-2" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Content */}
          <main>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default PCSLayout;