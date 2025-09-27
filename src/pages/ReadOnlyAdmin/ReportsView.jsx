import React, { useState } from 'react';
import { BarChart3, Download, Calendar, Filter } from 'lucide-react';

const ReportsView = () => {
  const [selectedReport, setSelectedReport] = useState('supplier');
  const [dateRange, setDateRange] = useState('month');

  const reports = [
    { id: 'supplier', name: 'Supplier Performance', description: 'Analyze supplier delivery and quality metrics' },
    { id: 'stock', name: 'Stock Analysis', description: 'Inventory levels, turnover, and reorder points' },
    { id: 'production', name: 'Production Summary', description: 'Batch completion rates and efficiency' },
    { id: 'sales', name: 'Sales Performance', description: 'Revenue trends and product performance' }
  ];

  const supplierData = [
    { name: 'ABC Supplies Ltd.', deliveryRate: 95, qualityScore: 92, totalOrders: 24 },
    { name: 'XYZ Materials Co.', deliveryRate: 88, qualityScore: 89, totalOrders: 18 },
    { name: 'Global Chemicals Inc.', deliveryRate: 92, qualityScore: 94, totalOrders: 31 },
    { name: 'Premium Raw Materials', deliveryRate: 97, qualityScore: 96, totalOrders: 15 }
  ];

  const stockData = [
    { material: 'Raw Material A', currentStock: 245, reorderLevel: 50, status: 'Good' },
    { material: 'Chemical B', currentStock: 28, reorderLevel: 30, status: 'Low' },
    { material: 'Additive C', currentStock: 156, reorderLevel: 40, status: 'Good' },
    { material: 'Base Material D', currentStock: 89, reorderLevel: 25, status: 'Good' }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'Good':
        return 'bg-green-100 text-green-800';
      case 'Low':
        return 'bg-red-100 text-red-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderReportContent = () => {
    switch (selectedReport) {
      case 'supplier':
        return (
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
                    Total Orders
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {supplierData.map((supplier, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {supplier.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{width: `${supplier.deliveryRate}%`}}
                          ></div>
                        </div>
                        {supplier.deliveryRate}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{width: `${supplier.qualityScore}%`}}
                          ></div>
                        </div>
                        {supplier.qualityScore}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {supplier.totalOrders}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'stock':
        return (
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
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stockData.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.material}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.currentStock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.reorderLevel}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      default:
        return (
          <div className="text-center py-12">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Report data loading...</h3>
            <p className="mt-1 text-sm text-gray-500">Please wait while we generate the report.</p>
          </div>
        );
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <BarChart3 className="h-8 w-8 mr-3 text-blue-600" />
          Reports View
        </h1>
        <p className="text-gray-600 mt-2">View and analyze system reports</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Reports</h3>
          <div className="space-y-2">
            {reports.map((report) => (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report.id)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedReport === report.id
                    ? 'bg-blue-50 border border-blue-200 text-blue-900'
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <p className="font-medium">{report.name}</p>
                <p className="text-xs text-gray-500 mt-1">{report.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {reports.find(r => r.id === selectedReport)?.name}
                </h2>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <select
                      value={dateRange}
                      onChange={(e) => setDateRange(e.target.value)}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="week">This Week</option>
                      <option value="month">This Month</option>
                      <option value="quarter">This Quarter</option>
                      <option value="year">This Year</option>
                    </select>
                  </div>
                  <button className="flex items-center space-x-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <Download className="h-4 w-4" />
                    <span>Export</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              {renderReportContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsView;