import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { packingAreaStockService } from '../../services/packingAreaStockService';
import { productionService } from '../../services/productionService';
import { Package, Clock, AlertTriangle, CheckCircle, Users, TrendingUp, Factory, Send, Archive, Package2, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../utils/formatDate';

export default function PackingAreaDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stockSummary, setStockSummary] = useState({});
  const [pendingHandovers, setPendingHandovers] = useState([]);
  const [expiryAlerts, setExpiryAlerts] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const [summary, handovers, alerts] = await Promise.all([
        packingAreaStockService.getStockSummary(),
        packingAreaStockService.getPendingHandovers(),
        packingAreaStockService.getExpiryAlerts()
      ]);
      
      setStockSummary(summary);
      setPendingHandovers(handovers);
      setExpiryAlerts(alerts);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleReceiveHandover = async (handoverId, receiptData = {}) => {
    try {
      await packingAreaStockService.receiveProductBatch(handoverId, {
        location: receiptData.location || 'PACK-A1',
        notes: receiptData.notes || 'Received by Packing Area Manager'
      });
      loadDashboardData();
    } catch (error) {
      console.error('Error receiving handover:', error);
      setError('Failed to receive handover: ' + error.message);
    }
  };

  const quickActions = [
    {
      title: 'View Stock',
      description: 'Manage product batches',
      icon: Package,
      color: 'bg-blue-600 hover:bg-blue-700',
      path: '/packing-area/stock'
    },
    {
      title: 'Send to FG Store',
      description: 'Dispatch packed products',
      icon: Send,
      color: 'bg-purple-600 hover:bg-purple-700',
      path: '/packing-area/send-to-fg'
    },
    {
      title: 'Package Products',
      description: 'Convert bulk quantities to units',
      icon: Package2,
      color: 'bg-indigo-600 hover:bg-indigo-700',
      path: '/packing-area/package-products'
    },
    {
      title: 'Product Variants',
      description: 'Define packaging sizes & types',
      icon: Settings,
      color: 'bg-gray-600 hover:bg-gray-700',
      path: '/packing-area/variants'
    },
    {
      title: 'Request Materials',
      description: 'Request packing materials',
      icon: Archive,
      color: 'bg-green-600 hover:bg-green-700',
      path: '/packing-area/request-materials'
    },
    {
      title: 'Request Products',
      description: 'Request products from production',
      icon: Factory,
      color: 'bg-orange-600 hover:bg-orange-700',
      path: '/packing-area/request-products'
    },
    {
      title: 'Dispatch History',
      description: 'View dispatch records',
      icon: Clock,
      color: 'bg-indigo-600 hover:bg-indigo-700',
      path: '/packing-area/dispatch-history'
    }
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow h-32"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Packing Area Dashboard</h1>
          <p className="text-gray-600">Manage product batches and packing operations</p>
        </div>
        <div className="text-sm text-gray-500">
          Welcome back, {user?.email}
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Stock Items</p>
              <p className="text-2xl font-bold text-gray-900">{stockSummary.totalItems || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Available Items</p>
              <p className="text-2xl font-bold text-gray-900">{stockSummary.availableItems || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
              <p className="text-2xl font-bold text-gray-900">{stockSummary.expiringItems || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Handovers</p>
              <p className="text-2xl font-bold text-gray-900">{pendingHandovers.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
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

        {/* Pending Handovers */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Pending Handovers</h2>
              <button
                onClick={() => navigate('/packing-area/stock')}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                View All Stock
              </button>
            </div>
          </div>
          {pendingHandovers.length === 0 ? (
            <div className="text-center py-8">
              <Factory className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">No pending handovers</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingHandovers.slice(0, 3).map((handover) => (
                <div key={handover.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{handover.productName}</h4>
                      <p className="text-sm text-gray-500">Batch: {handover.batchNumber}</p>
                      <p className="text-sm text-gray-500">
                        Quantity: {handover.quantity} {handover.unit}
                      </p>
                      <p className="text-sm text-gray-500">
                        Handed Over: {formatDate(handover.handoverDate)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleReceiveHandover(handover.id, { location: 'PACK-A1', notes: 'Quick receive from dashboard' })}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Receive</span>
                    </button>
                  </div>
                </div>
              ))}
              {pendingHandovers.length > 3 && (
                <div className="text-center">
                  <button
                    onClick={() => navigate('/packing-area/stock')}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    View {pendingHandovers.length - 3} more handovers
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expiry Alerts */}
      {expiryAlerts.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
              Expiry Alerts
            </h3>
            <button
              onClick={() => navigate('/packing-area/stock')}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              View All Stock
            </button>
          </div>
          <div className="space-y-3">
            {expiryAlerts.slice(0, 3).map((item) => (
              <div key={item.id} className={`border rounded-lg p-3 ${
                item.alertLevel === 'expired' || item.alertLevel === 'critical' ? 'border-red-300 bg-red-50' :
                item.alertLevel === 'warning' ? 'border-yellow-300 bg-yellow-50' :
                'border-orange-300 bg-orange-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{item.productName}</p>
                    <p className="text-sm text-gray-600">Batch: {item.batchNumber}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      item.alertLevel === 'expired' || item.alertLevel === 'critical' ? 'bg-red-100 text-red-800' :
                      item.alertLevel === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {item.daysToExpiry <= 0 ? 'Expired' : `${item.daysToExpiry} days left`}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {expiryAlerts.length > 3 && (
              <p className="text-sm text-gray-500 text-center">
                ... and {expiryAlerts.length - 3} more items expiring soon
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}