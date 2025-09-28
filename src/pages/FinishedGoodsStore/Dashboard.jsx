import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { fgStoreService } from '../../services/fgStoreService';
import { directShopService } from '../../services/directShopService';
import { 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  Calendar, 
  BarChart3, 
  Clock, 
  CheckCircle,
  Layers,
  Box,
  MapPin,
  Smartphone,
  DollarSign,
  Send
} from 'lucide-react';
import { formatDate } from '../../utils/formatDate';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

export default function FinishedGoodsStoreDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalItems: 0,
    totalBulkItems: 0,
    totalPackagedItems: 0,
    totalBulkQuantity: 0,
    totalPackagedUnits: 0,
    expiringItems: 0,
    pendingClaims: 0
  });
  const [pendingDispatches, setPendingDispatches] = useState([]);
  const [expiryAlerts, setExpiryAlerts] = useState([]);
  const [recentMovements, setRecentMovements] = useState([]);
  const [pendingDirectShopRequests, setPendingDirectShopRequests] = useState(0);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [dashboardStats, pending, alerts, movements, directShopRequests] = await Promise.all([
        fgStoreService.getDashboardStats(),
        fgStoreService.getPendingDispatches(),
        fgStoreService.getExpiryAlerts(),
        fgStoreService.getRecentMovements(),
        directShopService.getDirectShopRequests({ status: 'ho_approved_forwarded_to_fg' }).catch(() => [])
      ]);

      setStats(dashboardStats);
      setPendingDispatches(pending.slice(0, 5)); // Show only first 5
      setExpiryAlerts(alerts.slice(0, 5)); // Show only first 5
      setRecentMovements(movements);
      setPendingDirectShopRequests(directShopRequests.length);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickClaim = async (dispatchId, dispatchType) => {
    try {
      const claimData = {
        location: 'FG-A1',
        notes: 'Quick claim from dashboard'
      };
      
      if (dispatchType === 'bulk') {
        await fgStoreService.claimBulkDispatch(dispatchId, claimData);
      } else {
        await fgStoreService.claimUnitDispatch(dispatchId, claimData);
      }
      
      await loadDashboardData();
    } catch (error) {
      setError(`Failed to claim dispatch: ${error.message}`);
    }
  };

  const getExpiryAlertColor = (alertLevel) => {
    switch (alertLevel) {
      case 'expired': return 'bg-red-50 border-red-200';
      case 'critical': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'caution': return 'bg-orange-50 border-orange-200';
      default: return 'bg-green-50 border-green-200';
    }
  };

  const getMovementTypeColor = (type) => {
    return type === 'bulk' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
  };

  const getMovementIcon = (movementType) => {
    return movementType === 'in' ? 
      <TrendingUp className="w-4 h-4 text-green-600" /> : 
      <Package className="w-4 h-4 text-blue-600" />;
  };

  const quickActions = [
    {
      title: 'Claim Dispatches',
      description: 'Claim products from Packing Area',
      icon: CheckCircle,
      color: 'bg-green-600 hover:bg-green-700',
      path: '/finished-goods/claim-dispatches'
    },
    {
      title: 'Direct Shop Requests',
      description: `${pendingDirectShopRequests} pending dispatch`,
      icon: Smartphone,
      color: 'bg-blue-600 hover:bg-blue-700',
      path: '/finished-goods/direct-shop-requests'
    },
    {
      title: 'Manage Pricing',
      description: 'Update product prices',
      icon: DollarSign,
      color: 'bg-purple-600 hover:bg-purple-700',
      path: '/finished-goods/pricing'
    },
    {
      title: 'View Inventory',
      description: 'Manage stock and locations',
      icon: Package,
      color: 'bg-indigo-600 hover:bg-indigo-700',
      path: '/finished-goods/inventory'
    },
    {
      title: 'Storage Locations',
      description: 'Manage storage areas',
      icon: MapPin,
      color: 'bg-orange-600 hover:bg-orange-700',
      path: '/finished-goods/storage-locations'
    },
    {
      title: 'External Dispatches',
      description: 'Track all external dispatches',
      icon: Send,
      color: 'bg-teal-600 hover:bg-teal-700',
      path: '/finished-goods/external-dispatches'
    },
    {
      title: 'Approved Sales',
      description: 'Send approved sales requests',
      icon: CheckCircle,
      color: 'bg-emerald-600 hover:bg-emerald-700',
      path: '/finished-goods/approved-sales'
    }
  ];

  if (loading) {
    return <LoadingSpinner text="Loading dashboard..." />;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finished Goods Store</h1>
          <p className="text-gray-600">Monitor inventory levels and manage finished products</p>
        </div>
        <div className="text-sm text-gray-500">
          Welcome back, {user?.email}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
              <p className="text-xs text-gray-500">
                {stats.totalBulkItems} bulk + {stats.totalPackagedItems} packaged
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Claims</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingClaims}</p>
              <p className="text-xs text-gray-500">From Packing Area</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Expiring Items</p>
              <p className="text-2xl font-bold text-gray-900">{stats.expiringItems}</p>
              <p className="text-xs text-gray-500">Within 30 days</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Stock</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalBulkQuantity.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">
                + {stats.totalPackagedUnits} units
              </p>
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

        {/* Pending Dispatches */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Pending Dispatches</h3>
            <button
              onClick={() => navigate('/finished-goods/claim-dispatches')}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              View All
            </button>
          </div>
          
          {pendingDispatches.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">No pending dispatches</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingDispatches.map((dispatch) => (
                <div key={`${dispatch.type}-${dispatch.id}`} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        {dispatch.type === 'bulk' ? (
                          <Layers className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Box className="h-4 w-4 text-green-600" />
                        )}
                        <span className="font-medium text-gray-900">
                          {dispatch.releaseCode}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          dispatch.type === 'bulk' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {dispatch.type === 'bulk' ? 'Bulk' : 'Units'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {dispatch.type === 'bulk' ? 
                          `${dispatch.totalItems} items (${dispatch.totalQuantity} total)` :
                          `${dispatch.totalVariants} variants (${dispatch.totalUnits} units)`
                        }
                      </p>
                      <p className="text-sm text-gray-500">
                        From: {dispatch.dispatchedByName} • {formatDate(dispatch.dispatchedAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleQuickClaim(dispatch.id, dispatch.type)}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      Quick Claim
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Expiry Alerts */}
      {expiryAlerts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
              Expiry Alerts
            </h3>
            <button
              onClick={() => navigate('/finished-goods/inventory')}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              View All Inventory
            </button>
          </div>
          <div className="space-y-3">
            {expiryAlerts.map((alert) => (
              <div key={alert.id} className={`border rounded-lg p-3 ${getExpiryAlertColor(alert.alertLevel)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {alert.type === 'bulk' ? (
                      <Layers className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Box className="h-4 w-4 text-green-600" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">
                        {alert.productName}
                        {alert.type === 'units' && alert.variantName && ` - ${alert.variantName}`}
                      </p>
                      <p className="text-sm text-gray-600">
                        Batch: {alert.batchNumber} • 
                        {alert.type === 'bulk' ? (
                          <span> {alert.quantity} {alert.unit}</span>
                        ) : (
                          <span> {alert.unitsInStock} units</span>
                        )}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">{alert.location}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      alert.alertLevel === 'expired' || alert.alertLevel === 'critical' ? 'bg-red-100 text-red-800' :
                      alert.alertLevel === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {alert.daysToExpiry <= 0 ? 'Expired' : `${alert.daysToExpiry} days left`}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Movements */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Stock Movements</h3>
          <button
            onClick={() => navigate('/finished-goods/inventory')}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            View Inventory
          </button>
        </div>
        
        {recentMovements.length === 0 ? (
          <div className="text-center py-8">
            <Package className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">No recent movements</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentMovements.map((movement) => (
              <div key={movement.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  {getMovementIcon(movement.type)}
                  <div className="flex items-center space-x-2">
                    {movement.type === 'bulk' ? (
                      <Layers className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Box className="h-4 w-4 text-green-600" />
                    )}
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getMovementTypeColor(movement.type)}`}>
                      {movement.type === 'bulk' ? 'Bulk' : 'Units'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{movement.displayText}</p>
                    <p className="text-xs text-gray-500">
                      {movement.reason}
                      {movement.releaseCode && <span> • Release: {movement.releaseCode}</span>}
                    </p>
                  </div>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <p>{formatDate(movement.createdAt)}</p>
                  <p>{movement.createdByName}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}