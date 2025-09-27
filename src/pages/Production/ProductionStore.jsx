import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Warehouse, 
  Package, 
  AlertTriangle, 
  Search, 
  RefreshCw,
  Plus,
  CheckCircle,
  Clock
} from 'lucide-react';
import { getData, subscribeToData } from '../../firebase/db';
import { materialService } from '../../services/materialService';
import { productionStoreService } from '../../services/productionStoreService.ts';
import { formatDate } from '../../utils/formatDate';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const ProductionStore = () => {
  const navigate = useNavigate();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadInventory();
    
    // Set up real-time listener for production stock movements
    const unsubscribe = subscribeToData('productionStockMovements', () => {
      loadInventory();
    });
    
    // Auto-refresh every 30 seconds if enabled
    let interval;
    if (autoRefresh) {
      interval = setInterval(loadInventory, 30000);
    }
    
    return () => {
      unsubscribe();
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadInventory = async () => {
    try {
      if (!loading) setLoading(true);
      
      const [rawMaterials, stockMovements] = await Promise.all([
        materialService.getRawMaterials(),
        getData('productionStockMovements')
      ]);

      if (!rawMaterials) {
        setInventory([]);
        return;
      }

      // Calculate production store inventory
      const productionInventory = rawMaterials.map(material => {
        // Get movements for this material in production store
        const materialMovements = stockMovements ? 
          Object.values(stockMovements).filter(movement => 
            movement.materialId === material.id && movement.location === 'production_store'
          ) : [];

        // Calculate current production store stock
        const productionStock = materialMovements.reduce((stock, movement) => {
          return movement.type === 'in' ? stock + (movement.quantity || 0) : stock - (movement.quantity || 0);
        }, 0);

        // Get last received info
        const lastInMovement = materialMovements
          .filter(m => m.type === 'in')
          .sort((a, b) => b.createdAt - a.createdAt)[0];

        return {
          materialId: material.id,
          materialName: material.name,
          materialCode: material.code,
          category: material.category,
          currentStock: Math.max(0, productionStock),
          minimumStock: material.productionMinStock || material.reorderLevel || 10,
          unit: material.unit,
          lastReceived: lastInMovement?.createdAt || null,
          lastBatchNumber: lastInMovement?.batchNumber,
          location: 'Production Store',
          qualityGrade: material.qualityGrade || 'A'
        };
      }).filter(item => item.currentStock > 0); // Only show items with stock

      setInventory(productionInventory);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (current, minimum) => {
    const currentStock = Number(current) || 0;
    const minStock = Number(minimum) || 0;
    
    if (currentStock <= minStock) {
      return { status: 'Critical', color: 'bg-red-100 text-red-800', icon: AlertTriangle };
    } else if (currentStock <= minStock * 2) {
      return { status: 'Low', color: 'bg-yellow-100 text-yellow-800', icon: Clock };
    }
    return { status: 'Good', color: 'bg-green-100 text-green-800', icon: CheckCircle };
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.materialName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.materialCode?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getInventorySummary = () => {
    const total = inventory.length;
    const lowStock = inventory.filter(item => {
      const status = getStockStatus(item.currentStock, item.minimumStock);
      return ['Critical', 'Low'].includes(status.status);
    }).length;
    const totalQuantity = inventory.reduce((sum, item) => sum + (item.currentStock || 0), 0);

    return { total, lowStock, totalQuantity };
  };

  const summary = getInventorySummary();

  if (loading && inventory.length === 0) {
    return <LoadingSpinner text="Loading production store inventory..." />;
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Warehouse className="h-8 w-8 mr-3 text-blue-600" />
              Production Store
            </h1>
            <p className="text-gray-600">Raw materials available for production</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                autoRefresh 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
              <span>Auto Refresh</span>
            </button>
            <button
              onClick={() => navigate('/production/raw-material-requests')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Request Materials</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Materials</p>
              <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
            </div>
            <Package className="h-8 w-8 text-gray-600" />
          </div>
        </div>
        <div className="bg-red-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Low Stock Items</p>
              <p className="text-2xl font-bold text-red-900">{summary.lowStock}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Quantity</p>
              <p className="text-2xl font-bold text-blue-900">{summary.totalQuantity.toLocaleString()}</p>
            </div>
            <Warehouse className="h-8 w-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Raw Material Inventory</h2>
            <button
              onClick={loadInventory}
              className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search materials..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Material
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Received
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quality Grade
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInventory.map((item) => {
                const stockStatus = getStockStatus(item.currentStock, item.minimumStock);
                const Icon = stockStatus.icon;
                
                return (
                  <tr key={item.materialId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.materialName}</div>
                        <div className="text-sm text-gray-500">
                          Code: {item.materialCode} • {item.category}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-900">
                          {item.currentStock} {item.unit}
                        </span>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              stockStatus.status === 'Critical' ? 'bg-red-500' :
                              stockStatus.status === 'Low' ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{
                              width: `${Math.min((item.currentStock / (item.minimumStock * 3)) * 100, 100)}%`
                            }}
                          ></div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Min: {item.minimumStock} {item.unit}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${stockStatus.color}`}>
                        <Icon className="h-3 w-3 mr-1" />
                        {stockStatus.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.lastReceived ? (
                        <div>
                          <div>{formatDate(item.lastReceived)}</div>
                          {item.lastBatchNumber && (
                            <div className="text-xs text-gray-400">
                              Batch: {item.lastBatchNumber}
                            </div>
                          )}
                        </div>
                      ) : (
                        'Never'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        item.qualityGrade === 'A' ? 'bg-green-100 text-green-800' :
                        item.qualityGrade === 'B' ? 'bg-blue-100 text-blue-800' :
                        item.qualityGrade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        Grade {item.qualityGrade}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredInventory.length === 0 && (
          <div className="text-center py-12">
            <Warehouse className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No materials in production store</h3>
            <p className="mt-1 text-sm text-gray-500">
              {inventory.length === 0 
                ? 'Materials will appear here after being received from warehouse requests.'
                : 'Try adjusting your search criteria.'
              }
            </p>
            <button
              onClick={() => navigate('/production/raw-material-requests')}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 mx-auto"
            >
              <Plus className="h-4 w-4" />
              <span>Request Materials</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductionStore;