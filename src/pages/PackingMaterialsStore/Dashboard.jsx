import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Archive, 
  Package, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Send,
  ShoppingCart,
  Plus,
  Eye
} from 'lucide-react';
import { packingMaterialsService } from '../../services/packingMaterialsService';
import { materialService } from '../../services/materialService';
import { getData } from '../../firebase/db';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const PackingMaterialsStoreDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStockItems: 0,
    pendingRequests: 0,
    recentDispatches: 0,
    totalValue: 0
  });
  const [warehouseStock, setWarehouseStock] = useState([]);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [recentDispatches, setRecentDispatches] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const [stockReport, dispatches, internalRequests, lowStockData, warehouseData] = await Promise.all([
        packingMaterialsService.getStockReport().catch(() => []),
        packingMaterialsService.getDispatches().catch(() => []),
        packingMaterialsService.getInternalRequests().catch(() => []),
        packingMaterialsService.getLowStockAlerts().catch(() => []),
        loadWarehousePackingMaterials().catch(() => [])
      ]);

      setWarehouseStock(warehouseData);

      // Calculate stats
      const totalItems = stockReport.length;
      const lowStockItems = lowStockData.length;
      const pendingRequestsCount = internalRequests.filter(req => req.status === 'pending').length;
      const recentDispatchesCount = dispatches.filter(dispatch => {
        const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        return dispatch.dispatchedAt >= weekAgo;
      }).length;
      const totalValue = stockReport.reduce((sum, item) => sum + (item.totalValue || 0), 0);

      setStats({
        totalItems,
        lowStockItems,
        pendingRequests: pendingRequestsCount,
        recentDispatches: recentDispatchesCount,
        totalValue
      });

      setLowStockAlerts(lowStockData.slice(0, 5));
      setRecentDispatches(dispatches.slice(0, 5));
      setPendingRequests(internalRequests.filter(req => req.status === 'pending').slice(0, 5));

    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load some dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadWarehousePackingMaterials = async () => {
    try {
      // Get packing materials from warehouse
      const [packingMaterials, stockMovements, qcRecords] = await Promise.all([
        materialService.getPackingMaterials(),
        getData('stockMovements'),
        getData('qcRecords')
      ]);

      if (!packingMaterials) return [];

      // Calculate current stock and enrich with warehouse data
      const warehouseStock = packingMaterials.map(material => {
        // Get stock movements for this material
        const materialMovements = stockMovements ? 
          Object.values(stockMovements).filter(movement => 
            movement.materialId === material.id && movement.materialType === 'packingMaterial'
          ) : [];

        // Calculate current warehouse stock
        const warehouseCurrentStock = materialMovements.reduce((stock, movement) => {
          return movement.type === 'in' ? stock + (movement.quantity || 0) : stock - (movement.quantity || 0);
        }, 0);

        // Get latest QC record
        const materialQCRecords = qcRecords ? 
          Object.values(qcRecords).filter(qc => qc.materialId === material.id) : [];
        const latestQC = materialQCRecords.sort((a, b) => b.createdAt - a.createdAt)[0];

        // Get last received info
        const lastInMovement = materialMovements
          .filter(m => m.type === 'in')
          .sort((a, b) => b.createdAt - a.createdAt)[0];

        return {
          id: material.id,
          materialName: material.name,
          materialCode: material.code,
          category: material.category,
          warehouseStock: Math.max(0, warehouseCurrentStock),
          storeStock: material.currentStock || 0,
          totalStock: Math.max(0, warehouseCurrentStock) + (material.currentStock || 0),
          reorderLevel: material.reorderLevel || 0,
          unit: material.unit,
          lastReceived: lastInMovement?.createdAt || null,
          lastBatchNumber: lastInMovement?.batchNumber,
          qualityGrade: latestQC?.overallGrade || material.qualityGrade || 'A',
          supplier: material.supplier || 'Unknown',
          unitPrice: material.pricePerUnit || 0,
          location: 'Warehouse',
          status: material.status || 'active'
        };
      }).filter(item => item.status === 'active');

      return warehouseStock;
    } catch (error) {
      console.error('Failed to load warehouse packing materials:', error);
      return [];
    }
  };

  const getStockStatusColor = (warehouseStock, storeStock, reorderLevel) => {
    const totalStock = warehouseStock + storeStock;
    if (totalStock <= reorderLevel) return 'text-red-600';
    if (totalStock <= reorderLevel * 2) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getQualityGradeColor = (grade) => {
    switch (grade) {
      case 'A': return 'bg-green-100 text-green-800';
      case 'B': return 'bg-blue-100 text-blue-800';
      case 'C': return 'bg-yellow-100 text-yellow-800';
      case 'D': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  const quickActions = [
    {
      title: 'View Stock',
      description: 'Check current inventory levels',
      icon: Archive,
      color: 'bg-blue-600 hover:bg-blue-700',
      path: '/packing-materials/stock'
    },
    {
      title: 'Internal Requests',
      description: 'Manage packing area requests',
      icon: Package,
      color: 'bg-green-600 hover:bg-green-700',
      path: '/packing-materials/requests/internal'
    },
    {
      title: 'Send to Packing',
      description: 'Dispatch materials to packing area',
      icon: Send,
      color: 'bg-purple-600 hover:bg-purple-700',
      path: '/packing-materials/send'
    },
    {
      title: 'Request from Warehouse',
      description: 'Request materials from warehouse',
      icon: ShoppingCart,
      color: 'bg-orange-600 hover:bg-orange-700',
      path: '/packing-materials/request-from-warehouse'
    },
    {
      title: 'View Warehouse Stock',
      description: 'Check warehouse inventory levels',
      icon: Package,
      color: 'bg-indigo-600 hover:bg-indigo-700',
      path: '/warehouse/packing-materials'
    }
  ];

  if (loading) {
    return <LoadingSpinner text="Loading dashboard..." />;
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Archive className="h-8 w-8 mr-3 text-blue-600" />
          Packing Materials Store Dashboard
        </h1>
        <p className="text-gray-600">Manage packing materials inventory and requests</p>
      </div>

      {error && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
            </div>
            <Archive className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-red-600">{stats.lowStockItems}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Requests</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pendingRequests}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Recent Dispatches</p>
              <p className="text-2xl font-bold text-green-600">{stats.recentDispatches}</p>
            </div>
            <Send className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-purple-600">${stats.totalValue.toLocaleString()}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Warehouse Stock Overview */}
      {warehouseStock.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Warehouse Packing Materials Stock</h3>
            <button
              onClick={() => navigate('/warehouse/packing-materials')}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              View Full Warehouse Stock
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Material
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Warehouse Stock
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Store Stock
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Available
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quality Grade
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {warehouseStock.slice(0, 8).map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.materialName}</div>
                        <div className="text-sm text-gray-500">Code: {item.materialCode}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">{item.warehouseStock} {item.unit}</div>
                      <div className="text-sm text-gray-500">In warehouse</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">{item.storeStock} {item.unit}</div>
                      <div className="text-sm text-gray-500">In store</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className={`text-sm font-medium ${getStockStatusColor(item.warehouseStock, item.storeStock, item.reorderLevel)}`}>
                        {item.totalStock} {item.unit}
                      </div>
                      <div className="text-sm text-gray-500">
                        Reorder at: {item.reorderLevel} {item.unit}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getQualityGradeColor(item.qualityGrade)}`}>
                        Grade {item.qualityGrade}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        {item.totalStock <= item.reorderLevel ? (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Low Stock
                          </span>
                        ) : item.totalStock <= item.reorderLevel * 2 ? (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            <Clock className="h-3 w-3 mr-1" />
                            Medium
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Good
                          </span>
                        )}
                        {item.warehouseStock > 0 && item.storeStock < item.reorderLevel && (
                          <button
                            onClick={() => navigate('/packing-materials/request-from-warehouse')}
                            className="text-blue-600 hover:text-blue-800 text-xs underline"
                          >
                            Request Transfer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {warehouseStock.length > 8 && (
            <div className="mt-4 text-center">
              <button
                onClick={() => navigate('/warehouse/packing-materials')}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                View all {warehouseStock.length} warehouse materials →
              </button>
            </div>
          )}
        </div>
      )}
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

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Low Stock Alerts</h3>
            <button
              onClick={() => navigate('/packing-materials/stock')}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              View All
            </button>
          </div>
          <div className="space-y-4">
            {lowStockAlerts.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="mx-auto h-8 w-8 text-green-400" />
                <p className="mt-2 text-sm text-gray-500">All stock levels are adequate</p>
              </div>
            ) : (
              lowStockAlerts.map((alert, index) => (
                <div key={index} className="border border-red-200 rounded-lg p-4 bg-red-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-red-900">{alert.materialName}</p>
                      <p className="text-sm text-red-700">
                        Current: {alert.currentStock} {alert.unit} • 
                        Reorder: {alert.reorderLevel} {alert.unit}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        alert.alertLevel === 'critical' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {alert.alertLevel}
                      </span>
                      <button
                        onClick={() => navigate('/packing-materials/request')}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Request
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Pending Internal Requests */}
      {pendingRequests.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Pending Internal Requests</h3>
            <button
              onClick={() => navigate('/packing-materials/requests/internal')}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              View All
            </button>
          </div>
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      Request from Packing Area
                    </p>
                    <p className="text-sm text-gray-500">
                      {request.items?.length || 0} items • {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      Pending
                    </span>
                    <button
                      onClick={() => navigate(`/packing-materials/requests/${request.id}`)}
                      className="text-blue-600 hover:text-blue-800 p-1 rounded"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Dispatches */}
      {recentDispatches.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Dispatches</h3>
            <button
              onClick={() => navigate('/packing-materials/dispatches')}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              View All
            </button>
          </div>
          <div className="space-y-4">
            {recentDispatches.map((dispatch) => (
              <div key={dispatch.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      Dispatch to {dispatch.destination?.replace('line', 'Line ') || 'Packing Area'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {dispatch.items?.length || 0} items • {new Date(dispatch.dispatchedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    Dispatched
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PackingMaterialsStoreDashboard;