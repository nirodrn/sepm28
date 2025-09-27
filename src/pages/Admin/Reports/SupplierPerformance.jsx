import React, { useState } from 'react';
import { TruckIcon, Calendar, Download, Filter } from 'lucide-react';
import { supplierService } from '../../../services/supplierService';

const SupplierPerformance = () => {
  const [dateRange, setDateRange] = useState('month');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  React.useEffect(() => {
    loadSupplierData();
  }, []);

  const loadSupplierData = async () => {
    try {
      setLoading(true);
      const supplierList = await supplierService.getSuppliers();
      setSuppliers(supplierList.filter(s => s.status === 'active'));
      
      // Load performance data for each supplier
      const performancePromises = supplierList.map(async (supplier) => {
        const performance = await supplierService.getSupplierPerformance(supplier.id);
        return {
          id: supplier.id,
          name: supplier.name,
          deliveryRate: Math.round((performance.onTimeDeliveries / Math.max(performance.totalOrders, 1)) * 100),
          qualityScore: Math.round(performance.qualityScore),
          totalOrders: performance.totalOrders,
          onTimeDeliveries: performance.onTimeDeliveries,
          avgDeliveryTime: performance.avgDeliveryTime,
          priceVariance: Math.random() * 10 - 5, // Would be calculated from actual price history
          qualityIssues: Math.floor(Math.random() * 3),
          totalValue: Math.floor(Math.random() * 50000) + 20000
        };
      });
      
      const performanceResults = await Promise.all(performancePromises);
      setPerformanceData(performanceResults);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = selectedSupplier 
    ? performanceData.filter(supplier => supplier.id === selectedSupplier)
    : performanceData;

  const getPerformanceColor = (score) => {
    if (score >= 95) return 'text-green-600';
    if (score >= 85) return 'text-blue-600';
    if (score >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getVarianceColor = (variance) => {
    if (variance < 0) return 'text-green-600'; // Price decrease is good
    if (variance > 5) return 'text-red-600'; // High price increase is bad
    return 'text-yellow-600'; // Moderate increase
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <TruckIcon className="h-8 w-8 mr-3 text-blue-600" />
              Supplier Performance Report
            </h1>
            <p className="text-gray-600 mt-2">Analyze supplier delivery and quality metrics</p>
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
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
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Suppliers</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Suppliers</p>
                  <p className="text-2xl font-bold text-blue-900">{filteredData.length}</p>
                </div>
                <TruckIcon className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Avg Delivery Rate</p>
                  <p className="text-2xl font-bold text-green-900">
                    {Math.round(filteredData.reduce((sum, s) => sum + s.deliveryRate, 0) / filteredData.length)}%
                  </p>
                </div>
                <div className="h-8 w-8 bg-green-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">✓</span>
                </div>
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Avg Quality Score</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {Math.round(filteredData.reduce((sum, s) => sum + s.qualityScore, 0) / filteredData.length)}%
                  </p>
                </div>
                <div className="h-8 w-8 bg-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">★</span>
                </div>
              </div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">Total Orders</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {filteredData.reduce((sum, s) => sum + s.totalOrders, 0)}
                  </p>
                </div>
                <div className="h-8 w-8 bg-orange-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">#</span>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Delivery Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quality Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Delivery Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price Variance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quality Issues
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Value
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{supplier.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{width: `${supplier.deliveryRate}%`}}
                          ></div>
                        </div>
                        <span className={`text-sm font-medium ${getPerformanceColor(supplier.deliveryRate)}`}>
                          {supplier.deliveryRate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{width: `${supplier.qualityScore}%`}}
                          ></div>
                        </div>
                        <span className={`text-sm font-medium ${getPerformanceColor(supplier.qualityScore)}`}>
                          {supplier.qualityScore}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {supplier.totalOrders}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {supplier.avgDeliveryTime} days
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${getVarianceColor(supplier.priceVariance)}`}>
                        {supplier.priceVariance > 0 ? '+' : ''}{supplier.priceVariance}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        supplier.qualityIssues === 0 ? 'bg-green-100 text-green-800' :
                        supplier.qualityIssues <= 2 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {supplier.qualityIssues}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${supplier.totalValue.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierPerformance;