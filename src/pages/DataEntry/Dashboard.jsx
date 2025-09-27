import React from 'react';
import { FileText, Package, Package2, Tags, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { productService } from '../../services/productService';
import { materialService } from '../../services/materialService';

const DataEntryDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = React.useState([]);
  const [recentEntries, setRecentEntries] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [products, rawMaterials, packingMaterials, materialTypes] = await Promise.all([
        productService.getProducts(),
        materialService.getRawMaterials(),
        materialService.getPackingMaterials(),
        materialService.getMaterialTypes()
      ]);

      const totalMaterials = rawMaterials.length + packingMaterials.length;
      const activeTypes = materialTypes.filter(type => type.status === 'active').length;

      setStats([
        {
          name: 'Products Added',
          value: products.length.toString(),
          change: 'Total products',
          changeType: 'neutral',
          icon: Package,
          color: 'blue'
        },
        {
          name: 'Materials Added',
          value: totalMaterials.toString(),
          change: `${rawMaterials.length} raw, ${packingMaterials.length} packing`,
          changeType: 'neutral',
          icon: Package2,
          color: 'green'
        },
        {
          name: 'Material Types',
          value: activeTypes.toString(),
          change: 'Active categories',
          changeType: 'neutral',
          icon: Tags,
          color: 'purple'
        },
        {
          name: 'System Status',
          value: 'Active',
          change: 'All systems operational',
          changeType: 'positive',
          icon: FileText,
          color: 'yellow'
        }
      ]);

      // Create recent entries from latest items
      const recent = [
        ...products.slice(-2).map(product => ({
          type: 'Product',
          name: product.name,
          date: new Date(product.createdAt).toLocaleDateString(),
          status: 'approved'
        })),
        ...rawMaterials.slice(-2).map(material => ({
          type: 'Material',
          name: material.name,
          date: new Date(material.createdAt).toLocaleDateString(),
          status: 'approved'
        }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 4);

      setRecentEntries(recent);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    yellow: 'bg-yellow-100 text-yellow-600'
  };

  const quickActions = [
    {
      title: 'Add New Product',
      description: 'Create a new product entry',
      icon: Package,
      color: 'bg-blue-600 hover:bg-blue-700',
      path: '/data-entry/add-product'
    },
    {
      title: 'Add New Material',
      description: 'Create a new material entry',
      icon: Package2,
      color: 'bg-green-600 hover:bg-green-700',
      path: '/data-entry/add-material'
    },
    {
      title: 'Manage Material Types',
      description: 'Add or edit material categories',
      icon: Tags,
      color: 'bg-purple-600 hover:bg-purple-700',
      path: '/data-entry/material-types'
    }
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <FileText className="h-8 w-8 mr-3 text-blue-600" />
          Data Entry Dashboard
        </h1>
        <p className="text-gray-600 mt-2">Manage product and material data entries</p>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
          <div className="space-y-4">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => navigate(action.path)}
                className={`w-full p-4 rounded-lg text-white text-left transition-colors ${action.color}`}
              >
                <div className="flex items-center space-x-3">
                  <action.icon className="h-6 w-6" />
                  <div>
                    <h4 className="font-medium">{action.title}</h4>
                    <p className="text-sm opacity-90">{action.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Entries</h3>
          <div className="space-y-4">
            {recentEntries.map((entry, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    entry.type === 'Product' ? 'bg-blue-100' : 'bg-green-100'
                  }`}>
                    {entry.type === 'Product' ? (
                      <Package className={`h-4 w-4 ${
                        entry.type === 'Product' ? 'text-blue-600' : 'text-green-600'
                      }`} />
                    ) : (
                      <Package2 className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{entry.name}</p>
                    <p className="text-sm text-gray-500">{entry.type} • {entry.date}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  entry.status === 'approved' ? 'bg-green-100 text-green-800' :
                  entry.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {entry.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <FileText className="h-5 w-5 text-blue-600 mr-2" />
          <p className="text-sm text-blue-800">
            <strong>Data Entry Guidelines:</strong> Ensure all product and material information is accurate and complete. All entries require admin approval before becoming active in the system.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DataEntryDashboard;