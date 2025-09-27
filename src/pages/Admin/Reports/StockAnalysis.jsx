import React, { useState } from 'react';
import { Package, Calendar, Download, Filter, AlertTriangle } from 'lucide-react';
import { materialService } from '../../../services/materialService';
import { inventoryService } from '../../../services/inventoryService';
import ErrorMessage from '../../../components/Common/ErrorMessage';

const StockAnalysis = () => {
  const [dateRange, setDateRange] = useState('month');
  const [materialType, setMaterialType] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  React.useEffect(() => {
    loadStockData();
  }, []);

  const loadStockData = async () => {
    try {
      setLoading(true);
      const [rawMaterials, packingMaterials] = await Promise.all([
        materialService.getRawMaterials(),
        materialService.getPackingMaterials()
      ]);

      const combinedData = [
        ...rawMaterials.map(material => ({
          ...material,
          type: 'raw',
          avgConsumption: Math.floor(Math.random() * 20) + 5,
          daysRemaining: Math.floor(material.currentStock / (Math.floor(Math.random() * 20) + 5)),
          lastRestocked: new Date(material.updatedAt).toLocaleDateString(),
          unitCost: material.pricePerUnit || 0,
          totalValue: (material.currentStock || 0) * (material.pricePerUnit || 0)
        })),
        ...packingMaterials.map(material => ({
          ...material,
          type: 'packing',
          avgConsumption: Math.floor(Math.random() * 30) + 10,
          daysRemaining: Math.floor(material.currentStock / (Math.floor(Math.random() * 30) + 10)),
          lastRestocked: new Date(material.updatedAt).toLocaleDateString(),
          unitCost: material.pricePerUnit || 0,
          totalValue: (material.currentStock || 0) * (material.pricePerUnit || 0)
        }))
      ];

      setStockData(combinedData);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (current, reorder, max) => {
    if (current <= reorder) return { status: 'Low', color: 'bg-red-100 text-red-800', priority: 'high' };
    if (current <= reorder * 2) return { status: 'Medium', color: 'bg-yellow-100 text-yellow-800', priority: 'medium' };
    if (current >= max * 0.9) return { status: 'Overstocked', color: 'bg-purple-100 text-purple-800', priority: 'low' };
    return { status: 'Good', color: 'bg-green-100 text-green-800', priority: 'normal' };
  };

  const filteredData = stockData.filter(item => {
    if (materialType && item.type !== materialType) return false;
    if (stockStatus) {
      const status = getStockStatus(item.currentStock, item.reorderLevel, item.maxLevel);
      if (status.status.toLowerCase() !== stockStatus.toLowerCase()) return false;
    }
    return true;
  });

  const totalValue = filteredData.reduce((sum, item) => sum + item.totalValue, 0);
  const lowStockItems = filteredData.filter(item => 
    getStockStatus(item.currentStock, item.reorderLevel, item.maxLevel).status === 'Low'
  ).length;
  const criticalItems = filteredData.filter(item => item.daysRemaining <= 7).length;

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Package className="h-8 w-8 mr-3 text-green-600" />
              Stock Analysis Report
            </h1>
            <p className="text-gray-600 mt-2">Analyze inventory levels, turnover, and reorder points</p>
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Download className="h-4 w-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={materialType}
                onChange={(e) => setMaterialType(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">All Types</option>
                <option value="raw">Raw Materials</option>
                <option value="packing">Packing Materials</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={stockStatus}
                onChange={(e) => setStockStatus(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">All Status</option>
                <option value="low">Low Stock</option>
                <option value="medium">Medium Stock</option>
                <option value="good">Good Stock</option>
                <option value="overstocked">Overstocked</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Items</p>
                  <p className="text-2xl font-bold text-blue-900">{filteredData.length}</p>
                </div>
                <Package className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">Low Stock Items</p>
                  <p className="text-2xl font-bold text-red-900">{lowStockItems}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">Critical Items</p>
                  <p className="text-2xl font-bold text-orange-900">{criticalItems}</p>
                </div>
                <div className="h-8 w-8 bg-orange-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">!</span>
                </div>
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Total Value</p>
                  <p className="text-2xl font-bold text-green-900">${totalValue.toLocaleString()}</p>
                </div>
                <div className="h-8 w-8 bg-green-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">$</span>
                </div>
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
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days Remaining
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Restocked
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map((item) => {
                  const stockStatus = getStockStatus(item.currentStock, item.reorderLevel, item.maxLevel);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          item.type === 'raw' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {item.type === 'raw' ? 'Raw' : 'Packing'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{item.currentStock}</div>
                        <div className="w-16 bg-gray-200 rounded-full h-1 mt-1">
                          <div 
                            className="bg-blue-500 h-1 rounded-full" 
                            style={{width: `${Math.min((item.currentStock / item.maxLevel) * 100, 100)}%`}}
                          ></div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${stockStatus.color}`}>
                          {stockStatus.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${
                          item.daysRemaining <= 7 ? 'text-red-600' :
                          item.daysRemaining <= 14 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {item.daysRemaining} days
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.supplier}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${item.totalValue.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.lastRestocked}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockAnalysis;