import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  DollarSign, 
  Edit, 
  Save, 
  X, 
  Plus, 
  TrendingUp, 
  TrendingDown,
  Package,
  Calendar,
  User,
  History,
  Eye,
  Search,
  Filter,
  Smartphone,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { fgPricingService } from '../../services/fgPricingService';
import { fgStoreService } from '../../services/fgStoreService';
import { getData } from '../../firebase/db';
import { formatDate } from '../../utils/formatDate';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const ProductPricing = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [priceHistory, setPriceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [sortField, setSortField] = useState('productName');
  const [sortDirection, setSortDirection] = useState('asc');
  
  // Price editing state
  const [editingProduct, setEditingProduct] = useState(null);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [priceForm, setPriceForm] = useState({
    price: '',
    currency: 'LKR',
    priceType: 'retail',
    changeReason: '',
    effectiveDate: new Date().toISOString().split('T')[0]
  });
  
  // History modal state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedProductHistory, setSelectedProductHistory] = useState([]);
  const [selectedProductName, setSelectedProductName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bulkInventory, packagedInventory, allPricing, allHistory, productionProducts] = await Promise.all([
        fgStoreService.getInventory(),
        fgStoreService.getPackagedInventory(),
        fgPricingService.getAllProductPricing(),
        fgPricingService.getAllPriceHistory(),
        getData('productionProducts')
      ]);
      
      // Combine inventories to get unique products
      const allProducts = [
        ...bulkInventory.map(item => ({
          productId: item.productId,
          productName: item.productName,
          type: 'bulk',
          batchNumber: item.batchNumber,
          quantity: item.quantity,
          unit: item.unit,
          location: item.location
        })),
        ...packagedInventory.map(item => ({
          productId: item.productId,
          productName: item.productName,
          variantName: item.variantName,
          type: 'units',
          batchNumber: item.batchNumber,
          unitsInStock: item.unitsInStock,
          variantSize: item.variantSize,
          variantUnit: item.variantUnit,
          location: item.location
        }))
      ];
      
      // Add production products that might not be in inventory yet
      if (productionProducts) {
        Object.entries(productionProducts).forEach(([id, product]) => {
          const existsInInventory = allProducts.some(p => p.productId === id);
          if (!existsInInventory) {
            allProducts.push({
              productId: id,
              productName: product.name,
              type: 'production',
              location: 'Production',
              unit: product.unit
            });
          }
        });
      }
      
      // Add products from direct shop requests that might not be in production yet
      try {
        const dsreqs = await getData('dsreqs');
        if (dsreqs) {
          Object.values(dsreqs).forEach(request => {
            if (request.product) {
              const existsInProducts = allProducts.some(p => 
                p.productName === request.product || p.productId === request.product
              );
              if (!existsInProducts) {
                allProducts.push({
                  productId: request.product,
                  productName: request.product,
                  type: 'mobile_request',
                  location: 'Mobile App Request',
                  unit: 'units'
                });
              }
            }
          });
        }
      } catch (error) {
        console.warn('Could not load direct shop requests for pricing:', error);
      }
      
      // Get unique products
      const uniqueProducts = [];
      const seenProducts = new Set();
      
      allProducts.forEach(product => {
        const key = product.type === 'bulk' ? 
          product.productId : 
          `${product.productId}_${product.variantName}`;
        
        if (!seenProducts.has(key)) {
          seenProducts.add(key);
          uniqueProducts.push(product);
        }
      });
      
      setProducts(uniqueProducts);
      setPricing(allPricing);
      setPriceHistory(allHistory);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getProductPricing = (productId, variantName = null) => {
    const key = variantName ? `${productId}_${variantName}` : productId;
    return pricing.find(p => p.productId === key || p.productName === productId);
  };

  const handleEditPrice = (product) => {
    const currentPricing = getProductPricing(product.productId, product.variantName);
    
    setEditingProduct(product);
    setPriceForm({
      price: currentPricing?.currentPrice?.toString() || '',
      currency: currentPricing?.currency || 'LKR',
      priceType: currentPricing?.priceType || 'retail',
      changeReason: '',
      effectiveDate: new Date().toISOString().split('T')[0]
    });
    setShowPriceModal(true);
  };

  const handleSavePrice = async () => {
    if (!editingProduct || !priceForm.price) return;
    
    try {
      setError('');
      const productKey = editingProduct.variantName ? 
        `${editingProduct.productId}_${editingProduct.variantName}` : 
        editingProduct.productId;
      
      await fgPricingService.updateProductPrice(productKey, {
        price: parseFloat(priceForm.price),
        currency: priceForm.currency,
        priceType: priceForm.priceType,
        changeReason: priceForm.changeReason,
        effectiveDate: new Date(priceForm.effectiveDate).getTime()
      });
      
      setShowPriceModal(false);
      setEditingProduct(null);
      setSuccess('Price updated successfully');
      setTimeout(() => setSuccess(''), 3000);
      await loadData();
    } catch (error) {
      setError(error.message);
    }
  };

  const handleBulkPriceUpdate = async () => {
    try {
      const updates = [];
      
      for (const product of sortedAndFilteredProducts) {
        const currentPricing = getProductPricing(product.productId, product.variantName);
        if (!currentPricing) {
          // Set default pricing for products without pricing
          const productKey = product.variantName ? 
            `${product.productId}_${product.variantName}` : 
            product.productId;
          
          await fgPricingService.updateProductPrice(productKey, {
            price: 100, // Default price
            currency: 'LKR',
            priceType: 'retail',
            changeReason: 'Bulk default pricing setup',
            effectiveDate: Date.now()
          });
          
          updates.push(product.productName);
        }
      }
      
      if (updates.length > 0) {
        setSuccess(`Default pricing set for ${updates.length} products: ${updates.slice(0, 3).join(', ')}${updates.length > 3 ? '...' : ''}`);
        setTimeout(() => setSuccess(''), 5000);
        await loadData();
      } else {
        setError('All products already have pricing set');
        setTimeout(() => setError(''), 3000);
      }
    } catch (error) {
      setError('Failed to update bulk pricing: ' + error.message);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="h-4 w-4 text-blue-600" /> : 
      <ArrowDown className="h-4 w-4 text-blue-600" />;
  };

  const sortProducts = (products) => {
    return [...products].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortField) {
        case 'productName':
          aValue = a.productName?.toLowerCase() || '';
          bValue = b.productName?.toLowerCase() || '';
          break;
        case 'type':
          aValue = a.type || '';
          bValue = b.type || '';
          break;
        case 'currentPrice':
          const aPricing = getProductPricing(a.productId, a.variantName);
          const bPricing = getProductPricing(b.productId, b.variantName);
          aValue = aPricing?.currentPrice || 0;
          bValue = bPricing?.currentPrice || 0;
          break;
        case 'priceChange':
          const aChange = getPriceChangeInfo(a.productId, a.variantName);
          const bChange = getPriceChangeInfo(b.productId, b.variantName);
          aValue = aChange ? parseFloat(aChange.change) : 0;
          bValue = bChange ? parseFloat(bChange.change) : 0;
          break;
        case 'lastUpdated':
          const aPricingUpdate = getProductPricing(a.productId, a.variantName);
          const bPricingUpdate = getProductPricing(b.productId, b.variantName);
          aValue = aPricingUpdate?.lastUpdatedAt || 0;
          bValue = bPricingUpdate?.lastUpdatedAt || 0;
          break;
        case 'location':
          aValue = a.location?.toLowerCase() || '';
          bValue = b.location?.toLowerCase() || '';
          break;
        case 'stock':
          if (a.type === 'bulk' && b.type === 'bulk') {
            aValue = a.quantity || 0;
            bValue = b.quantity || 0;
          } else if (a.type === 'units' && b.type === 'units') {
            aValue = a.unitsInStock || 0;
            bValue = b.unitsInStock || 0;
          } else {
            // Mixed types - prioritize by type first, then by quantity
            if (a.type !== b.type) {
              aValue = a.type === 'bulk' ? 1 : 0;
              bValue = b.type === 'bulk' ? 1 : 0;
            } else {
              aValue = (a.quantity || a.unitsInStock) || 0;
              bValue = (b.quantity || b.unitsInStock) || 0;
            }
          }
          break;
        default:
          aValue = '';
          bValue = '';
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortDirection === 'asc' ? comparison : -comparison;
      } else {
        const comparison = aValue - bValue;
        return sortDirection === 'asc' ? comparison : -comparison;
      }
    });
  };

  const handleViewHistory = async (product) => {
    try {
      const productKey = product.variantName ? 
        `${product.productId}_${product.variantName}` : 
        product.productId;
      
      const history = await fgPricingService.getProductPriceHistory(productKey);
      setSelectedProductHistory(history);
      setSelectedProductName(product.variantName ? 
        `${product.productName} - ${product.variantName}` : 
        product.productName
      );
      setShowHistoryModal(true);
    } catch (error) {
      setError(error.message);
    }
  };

  const getPriceChangeInfo = (productId, variantName = null) => {
    const productKey = variantName ? `${productId}_${variantName}` : productId;
    const history = priceHistory.filter(h => h.productId === productKey);
    
    if (history.length < 2) return null;
    
    const latest = history[0];
    const previous = history[1];
    
    const change = fgPricingService.calculatePriceChange(previous.previousPrice || previous.newPrice, latest.newPrice);
    
    return {
      change: change.toFixed(1),
      direction: change >= 0 ? 'up' : 'down',
      color: change >= 0 ? 'text-red-600' : 'text-green-600'
    };
  };

  const filteredProducts = products.filter(product => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      product.productName?.toLowerCase().includes(searchLower) ||
      product.variantName?.toLowerCase().includes(searchLower) ||
      product.batchNumber?.toLowerCase().includes(searchLower) ||
      product.productId?.toLowerCase().includes(searchLower);
    
    // Enhanced category filtering
    let matchesCategory = true;
    if (filterCategory) {
      if (filterCategory === 'mobile') {
        matchesCategory = product.type === 'mobile_request';
      } else {
        matchesCategory = product.productName?.toLowerCase().includes(filterCategory.toLowerCase());
      }
    }
    
    return matchesSearch && matchesCategory;
  });

  const sortedAndFilteredProducts = sortProducts(filteredProducts);

  const getProductsWithoutPricing = () => {
    return sortedAndFilteredProducts.filter(product => {
      const productPricing = getProductPricing(product.productId, product.variantName);
      return !productPricing || !productPricing.currentPrice;
    });
  };

  const productsWithoutPricing = getProductsWithoutPricing();
  if (loading) {
    return <LoadingSpinner text="Loading product pricing..." />;
  }

  return (
    <div className="p-6">
      {/* Price Edit Modal */}
      {showPriceModal && editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Update Price - {editingProduct.productName}
              {editingProduct.variantName && ` (${editingProduct.variantName})`}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price *
                </label>
                <div className="flex space-x-2">
                  <select
                    value={priceForm.currency}
                    onChange={(e) => setPriceForm(prev => ({ ...prev, currency: e.target.value }))}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="LKR">LKR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={priceForm.price}
                    onChange={(e) => setPriceForm(prev => ({ ...prev, price: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Enter price"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price Type
                </label>
                <select
                  value={priceForm.priceType}
                  onChange={(e) => setPriceForm(prev => ({ ...prev, priceType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="retail">Retail Price</option>
                  <option value="wholesale">Wholesale Price</option>
                  <option value="distributor">Distributor Price</option>
                  <option value="special">Special Price</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Effective Date
                </label>
                <input
                  type="date"
                  value={priceForm.effectiveDate}
                  onChange={(e) => setPriceForm(prev => ({ ...prev, effectiveDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Change *
                </label>
                <textarea
                  rows={3}
                  value={priceForm.changeReason}
                  onChange={(e) => setPriceForm(prev => ({ ...prev, changeReason: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Explain the reason for price change..."
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowPriceModal(false);
                  setEditingProduct(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePrice}
                disabled={!priceForm.price || !priceForm.changeReason}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="h-4 w-4 mr-2" />
                Update Price
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Price History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Price History - {selectedProductName}
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            {selectedProductHistory.length === 0 ? (
              <div className="text-center py-8">
                <History className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No price history available</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Previous Price
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        New Price
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Change
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reason
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Changed By
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedProductHistory.map((history, index) => {
                      const change = fgPricingService.calculatePriceChange(history.previousPrice, history.newPrice);
                      
                      return (
                        <tr key={history.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(history.timestamp)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            LKR {(history.previousPrice || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            LKR {(history.newPrice || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center space-x-1">
                              {change >= 0 ? (
                                <TrendingUp className="h-4 w-4 text-red-600" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-green-600" />
                              )}
                              <span className={`text-sm font-medium ${change >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {history.changeReason}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {history.recordedByName}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <DollarSign className="h-8 w-8 mr-3 text-purple-600" />
              Product Pricing Management
            </h1>
            <p className="text-gray-600">Manage product prices and track pricing history</p>
          </div>
          <div className="flex items-center space-x-3">
            {productsWithoutPricing.length > 0 && (
              <button
                onClick={handleBulkPriceUpdate}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Set Default Pricing ({productsWithoutPricing.length})</span>
              </button>
            )}
            <button
              onClick={() => navigate('/finished-goods/inventory')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Package className="h-4 w-4" />
              <span>Back to Inventory</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Products without pricing alert */}
      {productsWithoutPricing.length > 0 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800">Products Without Pricing</h3>
                <p className="text-yellow-700 text-sm">
                  {productsWithoutPricing.length} product{productsWithoutPricing.length !== 1 ? 's' : ''} don't have pricing set
                </p>
              </div>
            </div>
            <button
              onClick={handleBulkPriceUpdate}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Set Default Pricing</span>
            </button>
          </div>
        </div>
      )}
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">{sortedAndFilteredProducts.length}</p>
            </div>
            <Package className="h-8 w-8 text-gray-600" />
          </div>
        </div>
        <div className="bg-purple-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Priced Products</p>
              <p className="text-2xl font-bold text-purple-900">
                {sortedAndFilteredProducts.filter(product => {
                  const productPricing = getProductPricing(product.productId, product.variantName);
                  return productPricing && productPricing.currentPrice > 0;
                }).length}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">Without Pricing</p>
              <p className="text-2xl font-bold text-yellow-900">{productsWithoutPricing.length}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Price Changes</p>
              <p className="text-2xl font-bold text-blue-900">{priceHistory.length}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Mobile Requests</p>
              <p className="text-2xl font-bold text-green-900">
                {sortedAndFilteredProducts.filter(product => product.type === 'mobile_request').length}
              </p>
            </div>
            <Smartphone className="h-8 w-8 text-green-600" />
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
                placeholder="Search products, variants, batches, or IDs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">All Categories</option>
                <option value="syrup">Syrups</option>
                <option value="tablet">Tablets</option>
                <option value="capsule">Capsules</option>
                <option value="powder">Powders</option>
                <option value="oil">Oils</option>
                <option value="mobile">Mobile Requests</option>
              </select>
            </div>
          </div>
          
          {/* Search Results Info */}
          {searchTerm && (
            <div className="mt-4 text-sm text-gray-600">
              Showing {sortedAndFilteredProducts.length} result{sortedAndFilteredProducts.length !== 1 ? 's' : ''} for "{searchTerm}"
              {sortedAndFilteredProducts.length !== products.length && (
                <span className="ml-2 text-blue-600">
                  (filtered from {products.length} total)
                </span>
              )}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('productName')}
                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                  >
                    <span>Product</span>
                    {getSortIcon('productName')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('type')}
                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                  >
                    <span>Type & Stock</span>
                    {getSortIcon('type')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('currentPrice')}
                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                  >
                    <span>Current Price</span>
                    {getSortIcon('currentPrice')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('priceChange')}
                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                  >
                    <span>Price Change</span>
                    {getSortIcon('priceChange')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('lastUpdated')}
                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                  >
                    <span>Last Updated</span>
                    {getSortIcon('lastUpdated')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('location')}
                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                  >
                    <span>Location</span>
                    {getSortIcon('location')}
                  </button>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedAndFilteredProducts.map((product) => {
                const productPricing = getProductPricing(product.productId, product.variantName);
                const priceChange = getPriceChangeInfo(product.productId, product.variantName);
                
                return (
                  <tr key={`${product.productId}_${product.variantName || 'bulk'}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{product.productName}</div>
                        {product.variantName && (
                          <div className="text-sm text-gray-500">Variant: {product.variantName}</div>
                        )}
                        {product.batchNumber && (
                          <div className="text-sm text-gray-500">Batch: {product.batchNumber}</div>
                        )}
                        {searchTerm && (
                          <div className="text-xs text-blue-600 mt-1">
                            ID: {product.productId}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          product.type === 'bulk' ? 'bg-blue-100 text-blue-800' : 
                          product.type === 'units' ? 'bg-green-100 text-green-800' :
                          product.type === 'mobile_request' ? 'bg-purple-100 text-purple-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {product.type === 'bulk' ? 'Bulk' : 
                           product.type === 'units' ? 'Units' : 
                           product.type === 'mobile_request' ? 'Mobile Request' :
                           'Production'}
                        </span>
                        <div className="text-sm text-gray-500 mt-1">
                          {product.type === 'bulk' ? 
                            `${product.quantity} ${product.unit}` :
                            product.type === 'units' ?
                            `${product.unitsInStock} units (${product.variantSize} ${product.variantUnit})` :
                            product.type === 'mobile_request' ?
                            'From Mobile App Request' :
                            'In Production'
                          }
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {productPricing ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {productPricing.currency} {(productPricing.currentPrice || 0).toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {productPricing.priceType}
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Not Set
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {priceChange ? (
                        <div className="flex items-center space-x-1">
                          {priceChange.direction === 'up' ? (
                            <TrendingUp className="h-4 w-4 text-red-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-green-600" />
                          )}
                          <span className={`text-sm font-medium ${priceChange.color}`}>
                            {priceChange.direction === 'up' ? '+' : ''}{priceChange.change}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">No changes</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {productPricing ? formatDate(productPricing.lastUpdatedAt) : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEditPrice(product)}
                          className="text-purple-600 hover:text-purple-900 p-1 rounded"
                          title="Edit Price"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleViewHistory(product)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="View Price History"
                        >
                          <History className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {sortedAndFilteredProducts.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {searchTerm ? `No products found matching "${searchTerm}"` : 'No products found'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {products.length === 0 
                ? 'No products available in FG inventory or mobile app requests.'
                : searchTerm 
                ? 'Try adjusting your search term or filters.'
                : 'Try adjusting your search criteria.'
              }
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-4 text-blue-600 hover:text-blue-800 text-sm underline"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Sorting and Search Info */}
      {(searchTerm || sortField !== 'productName' || sortDirection !== 'asc') && (
        <div className="mt-4 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              {searchTerm && (
                <span>
                  Search: <span className="font-medium text-gray-900">"{searchTerm}"</span>
                </span>
              )}
              {(sortField !== 'productName' || sortDirection !== 'asc') && (
                <span>
                  Sorted by: <span className="font-medium text-gray-900">
                    {sortField === 'productName' ? 'Product Name' :
                     sortField === 'type' ? 'Type' :
                     sortField === 'currentPrice' ? 'Current Price' :
                     sortField === 'priceChange' ? 'Price Change' :
                     sortField === 'lastUpdated' ? 'Last Updated' :
                     sortField === 'location' ? 'Location' :
                     sortField === 'stock' ? 'Stock Level' :
                     sortField}
                  </span> ({sortDirection === 'asc' ? 'ascending' : 'descending'})
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Clear search
                </button>
              )}
              {(sortField !== 'productName' || sortDirection !== 'asc') && (
                <button
                  onClick={() => {
                    setSortField('productName');
                    setSortDirection('asc');
                  }}
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Reset sorting
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductPricing;