import React, { useState } from 'react';
import { BarChart3, Calendar, Download, Filter, TrendingUp } from 'lucide-react';

const SalesPerformance = () => {
  const [dateRange, setDateRange] = useState('month');
  const [productCategory, setProductCategory] = useState('');

  const salesData = [
    {
      id: 1,
      productName: 'Product A - 500g',
      category: 'Finished Product',
      unitsSold: 1245,
      revenue: 24900,
      avgPrice: 20.00,
      growthRate: 12.5,
      topMarkets: ['Market A', 'Market B'],
      profitMargin: 35.2
    },
    {
      id: 2,
      productName: 'Product B - 1kg',
      category: 'Finished Product',
      unitsSold: 856,
      revenue: 42800,
      avgPrice: 50.00,
      growthRate: -3.2,
      topMarkets: ['Market C', 'Market A'],
      profitMargin: 28.7
    },
    {
      id: 3,
      productName: 'Product C - 250g',
      category: 'Specialty Product',
      unitsSold: 432,
      revenue: 12960,
      avgPrice: 30.00,
      growthRate: 8.9,
      topMarkets: ['Market B', 'Market D'],
      profitMargin: 42.1
    },
    {
      id: 4,
      productName: 'Product D - 2kg',
      category: 'Finished Product',
      unitsSold: 298,
      revenue: 23840,
      avgPrice: 80.00,
      growthRate: 15.7,
      topMarkets: ['Market A', 'Market C'],
      profitMargin: 31.5
    }
  ];

  const categories = ['Finished Product', 'Specialty Product', 'Semi-Finished Product'];

  const filteredData = productCategory 
    ? salesData.filter(product => product.category === productCategory)
    : salesData;

  const totalRevenue = filteredData.reduce((sum, product) => sum + product.revenue, 0);
  const totalUnits = filteredData.reduce((sum, product) => sum + product.unitsSold, 0);
  const avgGrowthRate = filteredData.reduce((sum, product) => sum + product.growthRate, 0) / filteredData.length;
  const avgProfitMargin = filteredData.reduce((sum, product) => sum + product.profitMargin, 0) / filteredData.length;

  const getGrowthColor = (rate) => {
    if (rate > 10) return 'text-green-600';
    if (rate > 0) return 'text-blue-600';
    return 'text-red-600';
  };

  const getProfitMarginColor = (margin) => {
    if (margin > 35) return 'text-green-600';
    if (margin > 25) return 'text-blue-600';
    return 'text-yellow-600';
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <BarChart3 className="h-8 w-8 mr-3 text-purple-600" />
              Sales Performance Report
            </h1>
            <p className="text-gray-600 mt-2">Analyze revenue trends and product performance</p>
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
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
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-purple-900">${totalRevenue.toLocaleString()}</p>
                </div>
                <div className="h-8 w-8 bg-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">$</span>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Units Sold</p>
                  <p className="text-2xl font-bold text-blue-900">{totalUnits.toLocaleString()}</p>
                </div>
                <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">#</span>
                </div>
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Avg Growth Rate</p>
                  <p className={`text-2xl font-bold ${getGrowthColor(avgGrowthRate)}`}>
                    {avgGrowthRate > 0 ? '+' : ''}{avgGrowthRate.toFixed(1)}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">Avg Profit Margin</p>
                  <p className="text-2xl font-bold text-orange-900">{avgProfitMargin.toFixed(1)}%</p>
                </div>
                <div className="h-8 w-8 bg-orange-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Units Sold
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Growth Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Profit Margin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Top Markets
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{product.productName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.unitsSold.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${product.revenue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${product.avgPrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${getGrowthColor(product.growthRate)}`}>
                        {product.growthRate > 0 ? '+' : ''}{product.growthRate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${getProfitMarginColor(product.profitMargin)}`}>
                        {product.profitMargin}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.topMarkets.join(', ')}
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

export default SalesPerformance;