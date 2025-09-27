import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Package, 
  TrendingUp, 
  AlertTriangle,
  DollarSign,
  ShoppingCart,
  Warehouse,
  FileText
} from 'lucide-react';
import { materialService } from '../../services/materialService';
import { productService } from '../../services/productService';
import { userService } from '../../services/userService';
import { supplierService } from '../../services/supplierService';
import { LoadingSpinner } from '../../components/Common';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalMaterials: 0,
    totalSuppliers: 0,
    rawMaterialsValue: 0,
    packingMaterialsValue: 0,
    lowStockItems: 0,
    pendingRequests: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [users, suppliers, products, materials] = await Promise.all([
          userService.getAllUsers(),
          supplierService.getSuppliers(),
          productService.getProducts(),
          materialService.getRawMaterials()
        ]);

        // Calculate material values
        const rawMaterials = materials.filter(m => m.type === 'raw');
        const packingMaterials = materials.filter(m => m.type === 'packing');
        
        const rawMaterialsValue = rawMaterials.reduce((total, material) => {
          const currentStock = Number(material.currentStock) || 0;
          const unitPrice = Number(material.unitPrice || material.pricePerUnit) || 0;
          return total + (currentStock * unitPrice);
        }, 0);

        const packingMaterialsValue = packingMaterials.reduce((total, material) => {
          const currentStock = Number(material.currentStock) || 0;
          const unitPrice = Number(material.unitPrice || material.pricePerUnit) || 0;
          return total + (currentStock * unitPrice);
        }, 0);

        // Count low stock items
        const lowStockItems = materials.filter(m => 
          (Number(m.currentStock) || 0) <= (Number(m.minimumStock || m.reorderLevel) || 0)
        ).length;

        setStats({
          totalUsers: users.length,
          totalProducts: products.length,
          totalMaterials: materials.length,
          totalSuppliers: suppliers.length,
          rawMaterialsValue,
          packingMaterialsValue,
          lowStockItems,
          pendingRequests: 0 // This would come from request service
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-blue-500',
      textColor: 'text-blue-600'
    },
    {
      title: 'Total Products',
      value: stats.totalProducts,
      icon: Package,
      color: 'bg-green-500',
      textColor: 'text-green-600'
    },
    {
      title: 'Total Materials',
      value: stats.totalMaterials,
      icon: Warehouse,
      color: 'bg-purple-500',
      textColor: 'text-purple-600'
    },
    {
      title: 'Total Suppliers',
      value: stats.totalSuppliers,
      icon: TrendingUp,
      color: 'bg-orange-500',
      textColor: 'text-orange-600'
    },
    {
      title: 'Raw Materials Value',
      value: formatCurrency(stats.rawMaterialsValue),
      icon: DollarSign,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600'
    },
    {
      title: 'Packing Materials Value',
      value: formatCurrency(stats.packingMaterialsValue),
      icon: ShoppingCart,
      color: 'bg-cyan-500',
      textColor: 'text-cyan-600'
    },
    {
      title: 'Low Stock Items',
      value: stats.lowStockItems,
      icon: AlertTriangle,
      color: 'bg-red-500',
      textColor: 'text-red-600'
    },
    {
      title: 'Pending Requests',
      value: stats.pendingRequests,
      icon: FileText,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600'
    }
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Overview of system statistics and key metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, index) => {
          const IconComponent = card.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                </div>
                <div className={`p-3 rounded-full ${card.color}`}>
                  <IconComponent className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <div className="flex items-center">
                <Users className="w-5 h-5 text-blue-600 mr-3" />
                <span className="font-medium">Manage Users</span>
              </div>
            </button>
            <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <div className="flex items-center">
                <Package className="w-5 h-5 text-green-600 mr-3" />
                <span className="font-medium">Manage Products</span>
              </div>
            </button>
            <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <div className="flex items-center">
                <Warehouse className="w-5 h-5 text-purple-600 mr-3" />
                <span className="font-medium">Manage Materials</span>
              </div>
            </button>
            <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <div className="flex items-center">
                <TrendingUp className="w-5 h-5 text-orange-600 mr-3" />
                <span className="font-medium">View Reports</span>
              </div>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">System Status</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-green-800 font-medium">System Health</span>
              <span className="text-green-600 font-semibold">Operational</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-blue-800 font-medium">Database Status</span>
              <span className="text-blue-600 font-semibold">Connected</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <span className="text-yellow-800 font-medium">Low Stock Alerts</span>
              <span className="text-yellow-600 font-semibold">{stats.lowStockItems} Items</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;