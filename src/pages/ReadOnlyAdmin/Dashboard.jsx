import React from 'react';
import { Eye, BarChart3, Users, Package, TruckIcon } from 'lucide-react';

const ReadOnlyAdminDashboard = () => {
  const stats = [
    {
      name: 'Total Users',
      value: '24',
      change: 'View only access',
      changeType: 'neutral',
      icon: Users,
      color: 'blue'
    },
    {
      name: 'Active Materials',
      value: '156',
      change: 'Monitoring only',
      changeType: 'neutral',
      icon: Package,
      color: 'green'
    },
    {
      name: 'Suppliers',
      value: '12',
      change: 'Read access',
      changeType: 'neutral',
      icon: TruckIcon,
      color: 'purple'
    },
    {
      name: 'Reports Available',
      value: '8',
      change: 'Full visibility',
      changeType: 'neutral',
      icon: BarChart3,
      color: 'orange'
    }
  ];

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600'
  };

  const recentActivities = [
    { action: 'Material request approved', user: 'Warehouse Staff', time: '2 hours ago', type: 'approval' },
    { action: 'New supplier added', user: 'Admin', time: '4 hours ago', type: 'create' },
    { action: 'Production batch completed', user: 'Production Manager', time: '6 hours ago', type: 'completion' },
    { action: 'Invoice payment processed', user: 'Warehouse Staff', time: '1 day ago', type: 'payment' }
  ];

  const getActivityIcon = (type) => {
    switch (type) {
      case 'approval':
        return '✅';
      case 'create':
        return '➕';
      case 'completion':
        return '🏁';
      case 'payment':
        return '💰';
      default:
        return '📋';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center">
          <Eye className="h-8 w-8 text-blue-600 mr-3" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Read-Only Admin Dashboard</h1>
            <p className="text-gray-600">Monitor system activities and view reports</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${colorClasses[stat.color]}`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm font-medium text-gray-600">{stat.change}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent System Activities</h3>
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <span className="text-lg">{getActivityIcon(activity.type)}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                  <p className="text-xs text-gray-500">by {activity.user} • {activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Reports</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <div>
                <p className="font-medium text-gray-900">Supplier Performance</p>
                <p className="text-sm text-gray-500">Monthly supplier analysis</p>
              </div>
              <Eye className="h-4 w-4 text-gray-400" />
            </div>
            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <div>
                <p className="font-medium text-gray-900">Stock Analysis</p>
                <p className="text-sm text-gray-500">Inventory levels and trends</p>
              </div>
              <Eye className="h-4 w-4 text-gray-400" />
            </div>
            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <div>
                <p className="font-medium text-gray-900">Production Summary</p>
                <p className="text-sm text-gray-500">Batch completion rates</p>
              </div>
              <Eye className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <Eye className="h-5 w-5 text-blue-600 mr-2" />
          <p className="text-sm text-blue-800">
            <strong>Read-Only Access:</strong> You have view-only permissions. Contact an administrator for data modifications.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReadOnlyAdminDashboard;