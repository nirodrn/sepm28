import React, { useState, useEffect } from 'react';
import { Archive, Search, Filter, Edit, Plus, AlertTriangle, TrendingUp, Eye, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { packingMaterialsService } from '../../services/packingMaterialsService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import ErrorMessage from '../../components/Common/ErrorMessage';

const StockList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStockData();
  }, []);

  const loadStockData = async () => {
    try {
      setLoading(true);
      const stockReport = await packingMaterialsService.getStockReport();
      setStockData(stockReport);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStock = async (materialId, newQuantity) => {
    try {
      await packingMaterialsService.updateStock(materialId, newQuantity);
      await loadStockData();
    } catch (error) {
      setError(error.message);
    }
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'low':
        return { color: 'bg-red-100 text-red-800', icon: AlertTriangle };
      case 'medium':
        return { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle };
      case 'good':
        return { color: 'bg-green-100 text-green-800', icon: Package };
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: Package };
    }
  };

  const getQualityColor = (grade) => {
    switch (grade) {
      case 'A':
        return 'bg-green-100 text-green-800';
      case 'B':
        return 'bg-blue-100 text-blue-800';
      case 'C':
        return 'bg-yellow-100 text-yellow-800';
      case 'D':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const categories = [...new Set(stockData.map(item => item.category))];

  const filteredInventory = stockData.filter(item => {
    const matchesSearch = item.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.materialCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !filterStatus || item.status === filterStatus;
    const matchesCategory = !filterCategory || item.category === filterCategory;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const stockSummary = {
    totalItems: filteredInventory.length,
    totalValue: filteredInventory.reduce((sum, item) => sum + item.totalValue, 0),
    lowStockItems: filteredInventory.filter(item => item.status === 'low').length,
    criticalItems: filteredInventory.filter(item => item.currentStock === 0).length
  };

  if (loading) {
    return <LoadingSpinner text="Loading stock data..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadStockData} />;
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Archive className="h-8 w-8 mr-3 text-blue-600" />
              Packing Materials Stock
            </h1>
            <p className="text-gray-600 mt-2">Manage packing materials inventory</p>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => navigate('/packing-materials/request-from-warehouse')}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Request from Warehouse</span>
            </button>
            <button 
              onClick={() => navigate('/packing-materials/requests/internal')}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Package className="h-4 w-4" />
              <span>Internal Requests</span>
            </button>
            <button 
              onClick={() => navigate('/packing-materials/receive')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Receive Stock</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{stockSummary.totalItems}</p>
            </div>
            <Archive className="h-8 w-8 text-gray-600" />
          </div>
        </div>
        <div className="bg-red-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Low Stock</p>
              <p className="text-2xl font-bold text-red-900">{stockSummary.lowStockItems}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <div className="bg-orange-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Out of Stock</p>
              <p className="text-2xl font-bold text-orange-900">{stockSummary.criticalItems}</p>
            </div>
            <div className="h-8 w-8 bg-orange-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">!</span>
            </div>
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Total Value</p>
              <p className="text-2xl font-bold text-green-900">${stockSummary.totalValue.toLocaleString()}</p>
            </div>
            <div className="h-8 w-8 bg-green-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">$</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search materials or locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                <option value="good">Good</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
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
                  Reorder Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quality Grade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInventory.map((item) => {
                const statusInfo = getStatusInfo(item.status);
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
                        <span className="text-sm text-gray-900">{item.currentStock} {item.unit}</span>
                        <button
                          onClick={() => {
                            const newQty = prompt(`Update stock for ${item.materialName}:`, item.currentStock);
                            if (newQty !== null && !isNaN(newQty)) {
                              handleUpdateStock(item.materialId, parseInt(newQty));
                            }
                          }}
                          className="text-blue-600 hover:text-blue-800 text-xs"
                          title="Update Stock"
                        >
                          <Edit className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="w-16 bg-gray-200 rounded-full h-1 mt-1">
                        <div 
                          className="bg-blue-500 h-1 rounded-full" 
                          style={{width: `${Math.min((item.currentStock / item.maxLevel) * 100, 100)}%`}}
                        ></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.reorderLevel} {item.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.color}`}>
                        <statusInfo.icon className="h-3 w-3 mr-1" />
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getQualityColor(item.qualityGrade)}`}>
                        {item.qualityGrade !== 'N/A' ? `Grade ${item.qualityGrade}` : 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${item.totalValue.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => navigate(`/packing-materials/stock/${item.materialId}`)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/packing-materials/stock/${item.materialId}/movements`)}
                          className="text-green-600 hover:text-green-900 p-1 rounded"
                          title="View Movements"
                        >
                          <TrendingUp className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredInventory.length === 0 && (
          <div className="text-center py-12">
            <Archive className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No stock found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {(searchTerm || filterStatus || filterCategory) ? 'Try adjusting your search criteria.' : 'Stock will appear here after receiving materials.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockList;