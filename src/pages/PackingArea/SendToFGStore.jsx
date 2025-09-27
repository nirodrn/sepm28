import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, ArrowLeft, Package, Plus, Trash2, CheckCircle, AlertTriangle, Box, Layers } from 'lucide-react';
import { packingAreaStockService } from '../../services/packingAreaStockService';
import { packingAreaProductService } from '../../services/packingAreaProductService';
import { fgDispatchService } from '../../services/fgDispatchService';
import { formatDate } from '../../utils/formatDate';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const SendToFGStore = () => {
  const navigate = useNavigate();
  const [availableBulkStock, setAvailableBulkStock] = useState([]);
  const [availablePackagedProducts, setAvailablePackagedProducts] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');
  const [dispatchType, setDispatchType] = useState('mixed'); // 'bulk', 'units', 'mixed'

  useEffect(() => {
    loadAvailableStock();
  }, []);

  const loadAvailableStock = async () => {
    try {
      setLoading(true);
      const [bulkStock, packagedProducts] = await Promise.all([
        packingAreaStockService.getPackingStock({ status: 'available' }),
        packingAreaProductService.getPackagedProducts({ status: 'packaged', availableForDispatch: true })
      ]);
      
      // Only show items with quantity > 0
      const availableBulk = bulkStock.filter(item => (item.quantity || 0) > 0);
      const availablePackaged = packagedProducts.filter(item => 
        (item.unitsProduced || 0) > 0 && item.availableForDispatch !== false
      );
      
      setAvailableBulkStock(availableBulk);
      setAvailablePackagedProducts(availablePackaged);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const addBulkItemToDispatch = (stockItem) => {
    const existingItem = selectedItems.find(item => item.id === stockItem.id && item.type === 'bulk');
    
    if (existingItem) {
      setError('This bulk item is already added to the dispatch');
      return;
    }
    
    const newItem = {
      id: stockItem.id,
      type: 'bulk',
      stockId: stockItem.id,
      productId: stockItem.productId,
      productName: stockItem.productName,
      batchNumber: stockItem.batchNumber,
      availableQuantity: stockItem.quantity,
      dispatchQuantity: Math.min(stockItem.quantity, 1),
      unit: stockItem.unit,
      qualityGrade: stockItem.qualityGrade,
      expiryDate: stockItem.expiryDate,
      location: stockItem.location,
      displayName: `${stockItem.productName} (Bulk - ${stockItem.batchNumber})`
    };
    
    setSelectedItems([...selectedItems, newItem]);
    setError('');
  };

  const addPackagedItemToDispatch = (packagedProduct) => {
    const existingItem = selectedItems.find(item => item.id === packagedProduct.id && item.type === 'units');
    
    if (existingItem) {
      setError('This packaged product is already added to the dispatch');
      return;
    }
    
    const newItem = {
      id: packagedProduct.id,
      type: 'units',
      packagedProductId: packagedProduct.id,
      productId: packagedProduct.productId,
      productName: packagedProduct.productName,
      variantName: packagedProduct.variantName,
      batchNumber: packagedProduct.batchNumber,
      availableUnits: packagedProduct.unitsProduced,
      dispatchUnits: Math.min(packagedProduct.unitsProduced, 1),
      variantSize: packagedProduct.variantSize,
      variantUnit: packagedProduct.variantUnit,
      qualityGrade: packagedProduct.qualityGrade,
      expiryDate: packagedProduct.expiryDate,
      location: packagedProduct.location,
      displayName: `${packagedProduct.productName} - ${packagedProduct.variantName} (${packagedProduct.unitsProduced} units)`
    };
    
    setSelectedItems([...selectedItems, newItem]);
    setError('');
  };

  const removeItemFromDispatch = (itemId, itemType) => {
    setSelectedItems(selectedItems.filter(item => !(item.id === itemId && item.type === itemType)));
  };

  const updateBulkDispatchQuantity = (itemId, quantity) => {
    setSelectedItems(selectedItems.map(item => {
      if (item.id === itemId && item.type === 'bulk') {
        const newQuantity = Math.min(Math.max(0, quantity), item.availableQuantity);
        return { ...item, dispatchQuantity: newQuantity };
      }
      return item;
    }));
  };

  const updateUnitDispatchQuantity = (itemId, units) => {
    setSelectedItems(selectedItems.map(item => {
      if (item.id === itemId && item.type === 'units') {
        const newUnits = Math.min(Math.max(0, units), item.availableUnits);
        return { ...item, dispatchUnits: newUnits };
      }
      return item;
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedItems.length === 0) {
      setError('Please select at least one item to dispatch');
      return;
    }
    
    // Validate bulk items
    const bulkItems = selectedItems.filter(item => item.type === 'bulk');
    const invalidBulkItems = bulkItems.filter(item => 
      !item.dispatchQuantity || item.dispatchQuantity <= 0 || item.dispatchQuantity > item.availableQuantity
    );
    
    // Validate unit items
    const unitItems = selectedItems.filter(item => item.type === 'units');
    const invalidUnitItems = unitItems.filter(item => 
      !item.dispatchUnits || item.dispatchUnits <= 0 || item.dispatchUnits > item.availableUnits
    );
    
    if (invalidBulkItems.length > 0 || invalidUnitItems.length > 0) {
      setError('Please ensure all dispatch quantities are valid and within available stock');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const results = [];

      // Handle bulk dispatches
      if (bulkItems.length > 0) {
        const bulkDispatchData = {
          items: bulkItems.map(item => ({
            stockId: item.stockId,
            productId: item.productId,
            productName: item.productName,
            batchNumber: item.batchNumber,
            quantity: item.dispatchQuantity,
            unit: item.unit,
            qualityGrade: item.qualityGrade,
            expiryDate: item.expiryDate,
            sourceLocation: item.location
          })),
          totalQuantity: bulkItems.reduce((sum, item) => sum + item.dispatchQuantity, 0),
          totalItems: bulkItems.length,
          notes: notes,
          destination: 'finished_goods_store',
          dispatchType: 'bulk'
        };
        
        const bulkResult = await fgDispatchService.createFGDispatch(bulkDispatchData);
        results.push({ type: 'bulk', result: bulkResult });
      }

      // Handle unit dispatches
      if (unitItems.length > 0) {
        const unitDispatchData = {
          items: unitItems.map(item => ({
            packagedProductId: item.packagedProductId,
            productId: item.productId,
            productName: item.productName,
            variantName: item.variantName,
            batchNumber: item.batchNumber,
            unitsToExport: item.dispatchUnits,
            variantSize: item.variantSize,
            variantUnit: item.variantUnit,
            qualityGrade: item.qualityGrade,
            expiryDate: item.expiryDate,
            sourceLocation: item.location
          })),
          totalUnits: unitItems.reduce((sum, item) => sum + item.dispatchUnits, 0),
          totalVariants: unitItems.length,
          notes: notes,
          destination: 'finished_goods_store'
        };
        
        const unitResult = await packingAreaProductService.exportToFGStore(unitDispatchData);
        results.push({ type: 'units', result: unitResult });
      }
      
      // Show success message with release codes
      let successMessage = 'Dispatch(es) created successfully!\n\n';
      results.forEach((result, index) => {
        successMessage += `${result.type === 'bulk' ? 'Bulk' : 'Unit'} Dispatch:\n`;
        successMessage += `Release Code: ${result.result.releaseCode}\n`;
        if (result.type === 'bulk') {
          successMessage += `Total Items: ${result.result.totalItems}\n`;
          successMessage += `Total Quantity: ${result.result.totalQuantity}\n`;
        } else {
          successMessage += `Total Units: ${result.result.totalUnits}\n`;
          successMessage += `Total Variants: ${result.result.totalVariants}\n`;
        }
        if (index < results.length - 1) successMessage += '\n';
      });
      
      alert(successMessage);
      navigate('/packing-area/stock');
    } catch (error) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
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

  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return null;
    
    const daysToExpiry = Math.ceil((new Date(expiryDate) - new Date()) / (24 * 60 * 60 * 1000));
    
    if (daysToExpiry <= 0) return { status: 'Expired', color: 'text-red-600' };
    if (daysToExpiry <= 7) return { status: 'Critical', color: 'text-red-600' };
    if (daysToExpiry <= 14) return { status: 'Warning', color: 'text-yellow-600' };
    if (daysToExpiry <= 30) return { status: 'Caution', color: 'text-orange-600' };
    return { status: 'Good', color: 'text-green-600' };
  };

  const getDispatchSummary = () => {
    const bulkItems = selectedItems.filter(item => item.type === 'bulk');
    const unitItems = selectedItems.filter(item => item.type === 'units');
    
    return {
      totalItems: selectedItems.length,
      bulkItems: bulkItems.length,
      unitItems: unitItems.length,
      totalBulkQuantity: bulkItems.reduce((sum, item) => sum + item.dispatchQuantity, 0),
      totalUnits: unitItems.reduce((sum, item) => sum + item.dispatchUnits, 0)
    };
  };

  const summary = getDispatchSummary();

  if (loading) {
    return <LoadingSpinner text="Loading available stock..." />;
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/packing-area/stock')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Send className="h-8 w-8 mr-3 text-purple-600" />
              Send to Finished Goods Store
            </h1>
            <p className="text-gray-600 mt-2">Dispatch bulk materials and packaged products to FG Store</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Stock */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Available Stock</h2>
          
          {/* Dispatch Type Filter */}
          <div className="mb-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setDispatchType('mixed')}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  dispatchType === 'mixed' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Items
              </button>
              <button
                onClick={() => setDispatchType('bulk')}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  dispatchType === 'bulk' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Bulk Only
              </button>
              <button
                onClick={() => setDispatchType('units')}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  dispatchType === 'units' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Units Only
              </button>
            </div>
          </div>
          
          {(availableBulkStock.length === 0 && availablePackagedProducts.length === 0) ? (
            <div className="text-center py-8">
              <Package className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">No available stock for dispatch</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {/* Bulk Stock Items */}
              {(dispatchType === 'mixed' || dispatchType === 'bulk') && availableBulkStock.map((item) => {
                const expiryStatus = getExpiryStatus(item.expiryDate);
                const isSelected = selectedItems.some(selected => selected.id === item.id && selected.type === 'bulk');
                
                return (
                  <div key={`bulk-${item.id}`} className={`border rounded-lg p-4 ${
                    isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <Layers className="h-4 w-4 text-blue-600" />
                          <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">BULK</span>
                        </div>
                        <h4 className="font-medium text-gray-900">{item.productName}</h4>
                        <p className="text-sm text-gray-500">Batch: {item.batchNumber}</p>
                        <p className="text-sm text-gray-500">Location: {item.location}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm text-gray-600">
                            Available: {item.quantity} {item.unit}
                          </span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getQualityGradeColor(item.qualityGrade)}`}>
                            Grade {item.qualityGrade}
                          </span>
                        </div>
                        {item.expiryDate && (
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-sm text-gray-500">
                              Expiry: {new Date(item.expiryDate).toLocaleDateString()}
                            </span>
                            {expiryStatus && (
                              <span className={`text-xs font-medium ${expiryStatus.color}`}>
                                ({expiryStatus.status})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => addBulkItemToDispatch(item)}
                        disabled={isSelected}
                        className={`px-3 py-1 rounded text-sm transition-colors ${
                          isSelected 
                            ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {isSelected ? 'Added' : 'Add Bulk'}
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Packaged Products */}
              {(dispatchType === 'mixed' || dispatchType === 'units') && availablePackagedProducts.map((product) => {
                const expiryStatus = getExpiryStatus(product.expiryDate);
                const isSelected = selectedItems.some(selected => selected.id === product.id && selected.type === 'units');
                
                return (
                  <div key={`units-${product.id}`} className={`border rounded-lg p-4 ${
                    isSelected ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <Box className="h-4 w-4 text-green-600" />
                          <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">UNITS</span>
                        </div>
                        <h4 className="font-medium text-gray-900">{product.productName}</h4>
                        <p className="text-sm text-gray-500">Variant: {product.variantName}</p>
                        <p className="text-sm text-gray-500">Batch: {product.batchNumber}</p>
                        <p className="text-sm text-gray-500">Location: {product.location}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm text-gray-600">
                            Available: {product.unitsProduced} units ({product.variantSize} {product.variantUnit} each)
                          </span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getQualityGradeColor(product.qualityGrade)}`}>
                            Grade {product.qualityGrade}
                          </span>
                        </div>
                        {product.expiryDate && (
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-sm text-gray-500">
                              Expiry: {new Date(product.expiryDate).toLocaleDateString()}
                            </span>
                            {expiryStatus && (
                              <span className={`text-xs font-medium ${expiryStatus.color}`}>
                                ({expiryStatus.status})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => addPackagedItemToDispatch(product)}
                        disabled={isSelected}
                        className={`px-3 py-1 rounded text-sm transition-colors ${
                          isSelected 
                            ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        {isSelected ? 'Added' : 'Add Units'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Dispatch Items */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Dispatch Items ({selectedItems.length})
          </h2>
          
          {selectedItems.length === 0 ? (
            <div className="text-center py-8">
              <Send className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">No items selected for dispatch</p>
              <p className="text-xs text-gray-400">Select items from available stock</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-4 max-h-64 overflow-y-auto">
                {selectedItems.map((item) => (
                  <div key={`${item.type}-${item.id}`} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          {item.type === 'bulk' ? (
                            <>
                              <Layers className="h-4 w-4 text-blue-600" />
                              <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">BULK</span>
                            </>
                          ) : (
                            <>
                              <Box className="h-4 w-4 text-green-600" />
                              <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">UNITS</span>
                            </>
                          )}
                        </div>
                        <h4 className="font-medium text-gray-900">{item.productName}</h4>
                        {item.type === 'units' && (
                          <p className="text-sm text-gray-500">Variant: {item.variantName}</p>
                        )}
                        <p className="text-sm text-gray-500">Batch: {item.batchNumber}</p>
                        {item.type === 'bulk' ? (
                          <p className="text-sm text-gray-500">Available: {item.availableQuantity} {item.unit}</p>
                        ) : (
                          <p className="text-sm text-gray-500">
                            Available: {item.availableUnits} units ({item.variantSize} {item.variantUnit} each)
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItemFromDispatch(item.id, item.type)}
                        className="text-red-600 hover:text-red-800 p-1 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {item.type === 'bulk' ? 'Dispatch Quantity *' : 'Dispatch Units *'}
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="number"
                          min="1"
                          max={item.type === 'bulk' ? item.availableQuantity : item.availableUnits}
                          value={item.type === 'bulk' ? item.dispatchQuantity : item.dispatchUnits}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            if (item.type === 'bulk') {
                              updateBulkDispatchQuantity(item.id, value);
                            } else {
                              updateUnitDispatchQuantity(item.id, value);
                            }
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder={item.type === 'bulk' ? 'Enter quantity' : 'Enter units'}
                        />
                        <span className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-600">
                          {item.type === 'bulk' ? item.unit : 'units'}
                        </span>
                      </div>
                      {item.type === 'bulk' && item.dispatchQuantity > item.availableQuantity && (
                        <p className="text-red-600 text-xs mt-1">
                          Quantity cannot exceed available stock
                        </p>
                      )}
                      {item.type === 'units' && item.dispatchUnits > item.availableUnits && (
                        <p className="text-red-600 text-xs mt-1">
                          Units cannot exceed available units
                        </p>
                      )}
                      {item.type === 'units' && (
                        <p className="text-blue-600 text-xs mt-1">
                          Total volume: {((item.dispatchUnits || 0) * item.variantSize).toFixed(2)} {item.variantUnit}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h3 className="font-medium text-gray-900 mb-2">Dispatch Summary</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Total Items:</span>
                      <span className="font-medium text-gray-900 ml-2">{summary.totalItems}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Bulk Items:</span>
                      <span className="font-medium text-blue-900 ml-2">{summary.bulkItems}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Unit Items:</span>
                      <span className="font-medium text-green-900 ml-2">{summary.unitItems}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Units:</span>
                      <span className="font-medium text-green-900 ml-2">{summary.totalUnits}</span>
                    </div>
                  </div>
                  {summary.totalBulkQuantity > 0 && (
                    <div className="mt-2 text-sm">
                      <span className="text-gray-600">Total Bulk Quantity:</span>
                      <span className="font-medium text-blue-900 ml-2">{summary.totalBulkQuantity}</span>
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dispatch Notes
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Add any notes for the FG Store Manager..."
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-blue-600 mr-2" />
                    <div>
                      <p className="text-blue-800 font-medium">Release Code Generation</p>
                      <p className="text-blue-700 text-sm">
                        Unique release codes will be automatically generated for each dispatch type (Format: YYMMDDTTTTxxxxxx)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => navigate('/packing-area/stock')}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || selectedItems.length === 0}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="h-4 w-4" />
                    <span>{submitting ? 'Dispatching...' : 'Send to FG Store'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default SendToFGStore;