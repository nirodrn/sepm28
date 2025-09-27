import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, ArrowLeft, Calendar, Filter, Download } from 'lucide-react';

const RawMaterialPriceQualityHistory = () => {
  const navigate = useNavigate();
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [dateRange, setDateRange] = useState('6months');

  const materials = ['Raw Material A', 'Chemical B', 'Additive C', 'Preservative D'];
  const suppliers = ['ABC Supplies Ltd.', 'XYZ Materials Co.', 'Global Chemicals Inc.', 'Premium Raw Materials'];

  const historyData = [
    {
      id: 1,
      date: '2025-01-15',
      material: 'Raw Material A',
      supplier: 'ABC Supplies Ltd.',
      quantity: 500,
      unitPrice: 12.50,
      totalCost: 6250,
      qualityGrade: 'A',
      purity: 98.5,
      moisture: 2.1,
      deliveryTime: 3
    },
    {
      id: 2,
      date: '2025-01-10',
      material: 'Raw Material A',
      supplier: 'XYZ Materials Co.',
      quantity: 300,
      unitPrice: 11.80,
      totalCost: 3540,
      qualityGrade: 'B',
      purity: 96.2,
      moisture: 2.8,
      deliveryTime: 5
    },
    {
      id: 3,
      date: '2025-01-05',
      material: 'Chemical B',
      supplier: 'Global Chemicals Inc.',
      quantity: 200,
      unitPrice: 45.00,
      totalCost: 9000,
      qualityGrade: 'A',
      purity: 99.1,
      moisture: 1.5,
      deliveryTime: 2
    },
    {
      id: 4,
      date: '2024-12-28',
      material: 'Raw Material A',
      supplier: 'ABC Supplies Ltd.',
      quantity: 400,
      unitPrice: 12.20,
      totalCost: 4880,
      qualityGrade: 'A',
      purity: 97.8,
      moisture: 2.3,
      deliveryTime: 3
    },
    {
      id: 5,
      date: '2024-12-20',
      material: 'Additive C',
      supplier: 'Premium Raw Materials',
      quantity: 150,
      unitPrice: 28.75,
      totalCost: 4312.50,
      qualityGrade: 'A',
      purity: 98.9,
      moisture: 1.8,
      deliveryTime: 4
    }
  ];

  const filteredData = historyData.filter(item => {
    if (selectedMaterial && item.material !== selectedMaterial) return false;
    if (selectedSupplier && item.supplier !== selectedSupplier) return false;
    return true;
  });

  const getQualityColor = (grade) => {
    switch (grade) {
      case 'A': return 'bg-green-100 text-green-800';
      case 'B': return 'bg-blue-100 text-blue-800';
      case 'C': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriceChange = (currentPrice, previousPrice) => {
    if (!previousPrice) return null;
    const change = ((currentPrice - previousPrice) / previousPrice) * 100;
    return {
      percentage: Math.abs(change).toFixed(1),
      direction: change >= 0 ? 'up' : 'down',
      color: change >= 0 ? 'text-red-600' : 'text-green-600'
    };
  };

  const calculateAverages = () => {
    if (filteredData.length === 0) return { avgPrice: 0, avgQuality: 0, avgDelivery: 0 };
    
    const avgPrice = filteredData.reduce((sum, item) => sum + item.unitPrice, 0) / filteredData.length;
    const avgPurity = filteredData.reduce((sum, item) => sum + item.purity, 0) / filteredData.length;
    const avgDelivery = filteredData.reduce((sum, item) => sum + item.deliveryTime, 0) / filteredData.length;
    
    return {
      avgPrice: avgPrice.toFixed(2),
      avgQuality: avgPurity.toFixed(1),
      avgDelivery: avgDelivery.toFixed(1)
    };
  };

  const averages = calculateAverages();

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/warehouse/raw-materials')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <TrendingUp className="h-8 w-8 mr-3 text-purple-600" />
              Price & Quality History
            </h1>
            <p className="text-gray-600 mt-2">Track price trends and quality performance of raw materials</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Records</p>
              <p className="text-2xl font-bold text-gray-900">{filteredData.length}</p>
            </div>
            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 text-sm font-bold">#</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Unit Price</p>
              <p className="text-2xl font-bold text-gray-900">${averages.avgPrice}</p>
            </div>
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 text-sm font-bold">$</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Quality</p>
              <p className="text-2xl font-bold text-gray-900">{averages.avgQuality}%</p>
            </div>
            <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-purple-600 text-sm font-bold">★</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Delivery</p>
              <p className="text-2xl font-bold text-gray-900">{averages.avgDelivery} days</p>
            </div>
            <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-orange-600 text-sm font-bold">⏱</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  value={selectedMaterial}
                  onChange={(e) => setSelectedMaterial(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">All Materials</option>
                  {materials.map(material => (
                    <option key={material} value={material}>{material}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <select
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">All Suppliers</option>
                  {suppliers.map(supplier => (
                    <option key={supplier} value={supplier}>{supplier}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="1month">Last Month</option>
                  <option value="3months">Last 3 Months</option>
                  <option value="6months">Last 6 Months</option>
                  <option value="1year">Last Year</option>
                </select>
              </div>
            </div>
            <button className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
              <Download className="h-4 w-4" />
              <span>Export Data</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quality</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery Time</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.map((record, index) => {
                const previousRecord = filteredData[index + 1];
                const priceChange = previousRecord ? getPriceChange(record.unitPrice, previousRecord.unitPrice) : null;
                
                return (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{record.material}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.supplier}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.quantity} kg</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">${record.unitPrice}</span>
                        {priceChange && (
                          <span className={`text-xs ${priceChange.color}`}>
                            {priceChange.direction === 'up' ? '↑' : '↓'}{priceChange.percentage}%
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${record.totalCost.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getQualityColor(record.qualityGrade)}`}>
                        Grade {record.qualityGrade}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.purity}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.deliveryTime} days</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredData.length === 0 && (
          <div className="text-center py-12">
            <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No records found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your filter criteria to see more results.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RawMaterialPriceQualityHistory;