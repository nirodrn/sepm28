import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ArrowLeft, Save, Calculator, AlertTriangle, CheckCircle, Plus, Edit } from 'lucide-react';
import { packingAreaStockService } from '../../services/packingAreaStockService';
import { packingAreaProductService } from '../../services/packingAreaProductService';
import { productVariantService } from '../../services/productVariantService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const PackageProducts = () => {
  const navigate = useNavigate();
  const [bulkStock, setBulkStock] = useState([]);
  const [variants, setVariants] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [formData, setFormData] = useState({
    bulkQuantityToUse: '',
    location: 'PACK-FINISHED',
    notes: ''
  });
  const [calculatedUnits, setCalculatedUnits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [stockData, variantData] = await Promise.all([
        packingAreaStockService.getPackingStock({ status: 'available' }),
        productVariantService.getAllVariants()
      ]);
      
      setBulkStock(stockData.filter(item => item.quantity > 0));
      setVariants(variantData);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStockSelect = (stock) => {
    setSelectedStock(stock);
    setSelectedVariant(null);
    setFormData(prev => ({
      ...prev,
      bulkQuantityToUse: ''
    }));
    setCalculatedUnits(0);
  };

  const handleVariantSelect = (variant) => {
    setSelectedVariant(variant);
    calculateUnits();
  };

  const calculateUnits = () => {
    if (!selectedStock || !selectedVariant || !formData.bulkQuantityToUse) {
      setCalculatedUnits(0);
      return;
    }

    const bulkQuantity = parseFloat(formData.bulkQuantityToUse);
    const units = productVariantService.calculateUnitsFromBulk(
      bulkQuantity,
      selectedStock.unit,
      selectedVariant.size,
      selectedVariant.unit
    );
    
    setCalculatedUnits(units);
  };

  useEffect(() => {
    calculateUnits();
  }, [formData.bulkQuantityToUse, selectedVariant]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedStock || !selectedVariant) {
      setError('Please select both bulk stock and product variant');
      return;
    }

    if (calculatedUnits <= 0) {
      setError('Calculated units must be greater than 0');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const packagingData = {
        stockId: selectedStock.id,
        variantId: selectedVariant.id,
        variantName: selectedVariant.name,
        variantSize: selectedVariant.size,
        variantUnit: selectedVariant.unit,
        bulkQuantityUsed: parseFloat(formData.bulkQuantityToUse),
        unitsProduced: calculatedUnits,
        location: formData.location,
        notes: formData.notes
      };
      
      await packingAreaProductService.packageBulkProduct(packagingData);
      navigate('/packing-area/stock');
    } catch (error) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getAvailableVariants = () => {
    if (!selectedStock) return [];
    return variants.filter(variant => variant.productId === selectedStock.productId);
  };

  if (loading) {
    return <LoadingSpinner text="Loading packaging data..." />;
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/packing-area/stock')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Package className="h-8 w-8 mr-3 text-blue-600" />
                Package Products
              </h1>
              <p className="text-gray-600 mt-2">Convert bulk products into packaged units with variants</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/packing-area/variants')}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Edit className="h-4 w-4" />
            <span>Manage Variants</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bulk Stock Selection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Select Bulk Stock</h2>
          
          {bulkStock.length === 0 ? (
            <div className="text-center py-8">
              <Package className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">No bulk stock available for packaging</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {bulkStock.map((stock) => (
                <div
                  key={stock.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedStock?.id === stock.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => handleStockSelect(stock)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{stock.productName}</h4>
                      <p className="text-sm text-gray-500">Batch: {stock.batchNumber}</p>
                      <p className="text-sm text-gray-500">Location: {stock.location}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-sm text-gray-600">
                          Available: {stock.quantity} {stock.unit}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          stock.qualityGrade === 'A' ? 'bg-green-100 text-green-800' :
                          stock.qualityGrade === 'B' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          Grade {stock.qualityGrade}
                        </span>
                      </div>
                    </div>
                    <input
                      type="radio"
                      checked={selectedStock?.id === stock.id}
                      onChange={() => handleStockSelect(stock)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Packaging Configuration */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Packaging Configuration</h2>
          
          {!selectedStock ? (
            <div className="text-center py-8">
              <Package className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">Select bulk stock to configure packaging</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900">Selected Stock</h3>
                <p className="text-blue-700 text-sm">{selectedStock.productName}</p>
                <p className="text-blue-700 text-sm">Available: {selectedStock.quantity} {selectedStock.unit}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Variant *
                </label>
                <select
                  value={selectedVariant?.id || ''}
                  onChange={(e) => {
                    const variant = getAvailableVariants().find(v => v.id === e.target.value);
                    handleVariantSelect(variant);
                  }}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select variant</option>
                  {getAvailableVariants().map(variant => (
                    <option key={variant.id} value={variant.id}>
                      {variant.name} ({variant.size} {variant.unit})
                    </option>
                  ))}
                </select>
                {getAvailableVariants().length === 0 && selectedStock && (
                  <div className="mt-2 text-sm text-orange-600">
                    No variants available for this product. 
                    <button
                      type="button"
                      onClick={() => navigate('/packing-area/variants')}
                      className="text-blue-600 hover:text-blue-800 underline ml-1"
                    >
                      Create variants first
                    </button>
                  </div>
                )}
              </div>

              {selectedVariant && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-900">Selected Variant</h4>
                  <p className="text-green-700 text-sm">{selectedVariant.name}</p>
                  <p className="text-green-700 text-sm">Size: {selectedVariant.size} {selectedVariant.unit}</p>
                  <p className="text-green-700 text-sm">Type: {selectedVariant.packagingType}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bulk Quantity to Use *
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    min="0.01"
                    max={selectedStock.quantity}
                    step="0.01"
                    value={formData.bulkQuantityToUse}
                    onChange={(e) => setFormData(prev => ({ ...prev, bulkQuantityToUse: e.target.value }))}
                    required
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter quantity"
                  />
                  <span className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-600">
                    {selectedStock.unit}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Maximum: {selectedStock.quantity} {selectedStock.unit}
                </p>
              </div>

              {selectedVariant && formData.bulkQuantityToUse && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Calculator className="h-5 w-5 text-blue-600" />
                    <h4 className="font-medium text-gray-900">Packaging Calculation</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Bulk Quantity:</span>
                      <span className="font-medium">{formData.bulkQuantityToUse} {selectedStock.unit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Variant Size:</span>
                      <span className="font-medium">{selectedVariant.size} {selectedVariant.unit}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-2">
                      <span className="text-gray-900 font-medium">Units Produced:</span>
                      <span className="text-xl font-bold text-blue-600">{calculatedUnits} units</span>
                    </div>
                  </div>
                  
                  {calculatedUnits > 0 && (
                    <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-blue-800 text-sm">
                        <CheckCircle className="h-4 w-4 inline mr-1" />
                        This will produce {calculatedUnits} units of {selectedVariant.name}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Storage Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Storage location for packaged products"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Packaging Notes
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add any packaging notes..."
                />
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
                  disabled={submitting || !selectedStock || !selectedVariant || calculatedUnits <= 0}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="h-4 w-4" />
                  <span>{submitting ? 'Packaging...' : 'Package Products'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default PackageProducts;