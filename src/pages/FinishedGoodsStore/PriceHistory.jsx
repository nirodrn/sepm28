import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  History, 
  Search, 
  Filter, 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  Package,
  User,
  DollarSign,
  Download,
  Eye,
  ArrowLeft,
  BarChart3,
  AlertTriangle
} from 'lucide-react';
import { fgPricingService } from '../../services/fgPricingService';
import { fgStoreService } from '../../services/fgStoreService';
import { getData } from '../../firebase/db';
import { formatDate } from '../../utils/formatDate';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import * as XLSX from 'xlsx';

const PriceHistory = () => {
  const navigate = useNavigate();
  const [priceHistory, setPriceHistory] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterChangeType, setFilterChangeType] = useState(''); // 'increase', 'decrease', 'all'
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedProductAnalytics, setSelectedProductAnalytics] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [historyData, bulkInventory, packagedInventory, productionProducts] = await Promise.all([
        fgPricingService.getAllPriceHistory(),
        fgStoreService.getInventory(),
        fgStoreService.getPackagedInventory(),
        getData('productionProducts')
      ]);
      
      // Get unique products from all sources
      const allProducts = new Set();
      
      // From inventory
      bulkInventory.forEach(item => allProducts.add(item.productName));
      packagedInventory.forEach(item => allProducts.add(item.productName));
      
      // From production
      if (productionProducts) {
        Object.values(productionProducts).forEach(product => allProducts.add(product.name));
      }
      
      // From price history
      historyData.forEach(history => {
        if (history.productName) allProducts.add(history.productName);
      });
      
      setProducts(Array.from(allProducts).sort());
      setPriceHistory(historyData);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewProductAnalytics = async (productId) => {
    try {
      const analytics = await fgPricingService.getPricingAnalytics(productId);
      setSelectedProductAnalytics(analytics);
      setShowAnalytics(true);
    } catch (error) {
      setError('Failed to load analytics: ' + error.message);
    }
  };

  const exportToExcel = () => {
    const exportData = filteredHistory.map(history => ({
      'Date': new Date(history.timestamp).toLocaleDateString(),
      'Product': history.productName || 'Unknown',
      'Previous Price': `LKR ${(history.previousPrice || 0).toFixed(2)}`,
      'New Price': `LKR ${(history.newPrice || 0).toFixed(2)}`,
      'Change Amount': `LKR ${Math.abs((history.newPrice || 0) - (history.previousPrice || 0)).toFixed(2)}`,
      'Change Percentage': `${fgPricingService.calculatePriceChange(history.previousPrice, history.newPrice).toFixed(1)}%`,
      'Change Type': (history.newPrice || 0) >= (history.previousPrice || 0) ? 'Increase' : 'Decrease',
      'Reason': history.changeReason || 'Not specified',
      'Changed By': history.changedByName || 'Unknown',
      'Effective Date': history.effectiveDate ? new Date(history.effectiveDate).toLocaleDateString() : 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Price History');
    
    XLSX.writeFile(workbook, `price-history-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredHistory = priceHistory.filter(history => {
    const matchesSearch = (history.productName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (history.changeReason || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (history.changedByName || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesProduct = !filterProduct || (history.productName || '').includes(filterProduct);
    
    const matchesDateFrom = !filterDateFrom || history.timestamp >= new Date(filterDateFrom).getTime();
    const matchesDateTo = !filterDateTo || history.timestamp <= new Date(filterDateTo).getTime();
    
    let matchesChangeType = true;
    if (filterChangeType) {
      const priceChange = fgPricingService.calculatePriceChange(history.previousPrice, history.newPrice);
      if (filterChangeType === 'increase') {
        matchesChangeType = priceChange > 0;
      } else if (filterChangeType === 'decrease') {
        matchesChangeType = priceChange < 0;
      }
    }
    
    return matchesSearch && matchesProduct && matchesDateFrom && matchesDateTo && matchesChangeType;
  });

  const calculateSummaryStats = () => {
    const totalChanges = filteredHistory.length;
    const increases = filteredHistory.filter(h => (h.newPrice || 0) > (h.previousPrice || 0)).length;
    const decreases = filteredHistory.filter(h => (h.newPrice || 0) < (h.previousPrice || 0)).length;
    const avgChange = filteredHistory.length > 0 ? 
      filteredHistory.reduce((sum, h) => sum + fgPricingService.calculatePriceChange(h.previousPrice, h.newPrice), 0) / filteredHistory.length : 0;
    
    const uniqueProducts = new Set(filteredHistory.map(h => h.productName)).size;
    
    return { totalChanges, increases, decreases, avgChange, uniqueProducts };
  };

  const stats = calculateSummaryStats();

  const getPriceChangeInfo = (history) => {
    const change = fgPricingService.calculatePriceChange(history.previousPrice, history.newPrice);
    return {
      change: change.toFixed(1),
      direction: change >= 0 ? 'up' : 'down',
      color: change >= 0 ? 'text-red-600' : 'text-green-600',
      bgColor: change >= 0 ? 'bg-red-50' : 'bg-green-50',
      amount: Math.abs((history.newPrice || 0) - (history.previousPrice || 0)).toFixed(2)
    };
  };

  const getChangeTypeColor = (changeType) => {
    switch (changeType) {
      case 'increase':
        return 'bg-red-100 text-red-800';
      case 'decrease':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading price history..." />;
  }

  return (
    <div className="p-6">
      {/* Analytics Modal */}
      {showAnalytics && selectedProductAnalytics && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Pricing Analytics
              </h3>
              <button
                onClick={() => setShowAnalytics(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Min Price</p>
                    <p className="text-xl font-bold text-blue-900">LKR {selectedProductAnalytics.minPrice.toFixed(2)}</p>
                  </div>
                  <TrendingDown className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Max Price</p>
                    <p className="text-xl font-bold text-green-900">LKR {selectedProductAnalytics.maxPrice.toFixed(2)}</p>
                  </div>
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">Avg Price</p>
                    <p className="text-xl font-bold text-purple-900">LKR {selectedProductAnalytics.avgPrice.toFixed(2)}</p>
                  </div>
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600">Volatility</p>
                    <p className="text-xl font-bold text-orange-900">{selectedProductAnalytics.priceVolatility.toFixed(1)}%</p>
                  </div>
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Recent Price Changes</h4>
              <div className="space-y-2">
                {selectedProductAnalytics.recentChanges.map((change, index) => {
                  const changeInfo = getPriceChangeInfo(change);
                  return (
                    <div key={index} className={`p-3 rounded-lg ${changeInfo.bgColor}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            LKR {(change.previousPrice || 0).toFixed(2)} → LKR {(change.newPrice || 0).toFixed(2)}
                          </p>
                          <p className="text-sm text-gray-600">{change.changeReason}</p>
                          <p className="text-sm text-gray-500">{formatDate(change.timestamp)}</p>
                        </div>
                        <div className="text-right">
                          <div className={`flex items-center ${changeInfo.color}`}>
                            {changeInfo.direction === 'up' ? (
                              <TrendingUp className="h-4 w-4 mr-1" />
                            ) : (
                              <TrendingDown className="h-4 w-4 mr-1" />
                            )}
                            <span className="font-medium">
                              {changeInfo.direction === 'up' ? '+' : ''}{changeInfo.change}%
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            LKR {changeInfo.amount}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/finished-goods/pricing')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <History className="h-8 w-8 mr-3 text-blue-600" />
                Product Price History
              </h1>
              <p className="text-gray-600">Track all product price changes and trends over time</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={exportToExcel}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export to Excel</span>
            </button>
            <button
              onClick={() => navigate('/finished-goods/pricing')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <DollarSign className="h-4 w-4" />
              <span>Manage Pricing</span>
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Changes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalChanges}</p>
            </div>
            <History className="h-8 w-8 text-gray-600" />
          </div>
        </div>
        <div className="bg-red-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Price Increases</p>
              <p className="text-2xl font-bold text-red-900">{stats.increases}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Price Decreases</p>
              <p className="text-2xl font-bold text-green-900">{stats.decreases}</p>
            </div>
            <TrendingDown className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Avg Change</p>
              <p className={`text-2xl font-bold ${stats.avgChange >= 0 ? 'text-red-900' : 'text-green-900'}`}>
                {stats.avgChange >= 0 ? '+' : ''}{stats.avgChange.toFixed(1)}%
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-purple-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Products</p>
              <p className="text-2xl font-bold text-purple-900">{stats.uniqueProducts}</p>
            </div>
            <Package className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search products, reasons, or users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  value={filterProduct}
                  onChange={(e) => setFilterProduct(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Products</option>
                  {products.map(product => (
                    <option key={product} value={product}>{product}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <select
                  value={filterChangeType}
                  onChange={(e) => setFilterChangeType(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Changes</option>
                  <option value="increase">Price Increases</option>
                  <option value="decrease">Price Decreases</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="From date"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="To date"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Previous Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  New Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Change
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Changed By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Effective Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredHistory.map((history) => {
                const changeInfo = getPriceChangeInfo(history);
                
                return (
                  <tr key={history.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {formatDate(history.timestamp)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(history.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <Package className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {history.productName || 'Unknown Product'}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {history.productId}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        LKR {(history.previousPrice || 0).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        LKR {(history.newPrice || 0).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className={`flex items-center ${changeInfo.color}`}>
                          {changeInfo.direction === 'up' ? (
                            <TrendingUp className="h-4 w-4 mr-1" />
                          ) : (
                            <TrendingDown className="h-4 w-4 mr-1" />
                          )}
                          <span className="font-medium">
                            {changeInfo.direction === 'up' ? '+' : ''}{changeInfo.change}%
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          (LKR {changeInfo.amount})
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs">
                        {history.changeReason || 'No reason provided'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="text-sm text-gray-900">
                            {history.changedByName || 'Unknown User'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatDate(history.recordedAt || history.timestamp)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {history.effectiveDate ? new Date(history.effectiveDate).toLocaleDateString() : 'Immediate'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewProductAnalytics(history.productId)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        title="View Product Analytics"
                      >
                        <BarChart3 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredHistory.length === 0 && (
          <div className="text-center py-12">
            <History className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No price history found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {priceHistory.length === 0 
                ? 'Price changes will appear here when products are repriced.'
                : 'Try adjusting your search criteria or date filters.'
              }
            </p>
            {priceHistory.length === 0 && (
              <button
                onClick={() => navigate('/finished-goods/pricing')}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 mx-auto"
              >
                <DollarSign className="h-4 w-4" />
                <span>Manage Product Pricing</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Price Trend Analysis */}
      {filteredHistory.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Price Trend Analysis</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Most Volatile Products */}
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Most Volatile Products</h4>
              <div className="space-y-3">
                {products.slice(0, 5).map(product => {
                  const productHistory = filteredHistory.filter(h => h.productName === product);
                  const changes = productHistory.length;
                  const avgChange = changes > 0 ? 
                    productHistory.reduce((sum, h) => sum + Math.abs(fgPricingService.calculatePriceChange(h.previousPrice, h.newPrice)), 0) / changes : 0;
                  
                  return (
                    <div key={product} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{product}</p>
                        <p className="text-sm text-gray-500">{changes} changes</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-orange-600">{avgChange.toFixed(1)}%</p>
                        <p className="text-sm text-gray-500">avg change</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Recent Price Changes</h4>
              <div className="space-y-3">
                {filteredHistory.slice(0, 5).map((history) => {
                  const changeInfo = getPriceChangeInfo(history);
                  
                  return (
                    <div key={history.id} className={`p-3 rounded-lg border ${changeInfo.bgColor}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{history.productName}</p>
                          <p className="text-sm text-gray-600">{history.changeReason}</p>
                          <p className="text-sm text-gray-500">{formatDate(history.timestamp)}</p>
                        </div>
                        <div className="text-right">
                          <div className={`flex items-center ${changeInfo.color}`}>
                            {changeInfo.direction === 'up' ? (
                              <TrendingUp className="h-4 w-4 mr-1" />
                            ) : (
                              <TrendingDown className="h-4 w-4 mr-1" />
                            )}
                            <span className="font-medium">
                              {changeInfo.direction === 'up' ? '+' : ''}{changeInfo.change}%
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            LKR {(history.previousPrice || 0).toFixed(2)} → LKR {(history.newPrice || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceHistory;