import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Factory, Send, ArrowLeft, Plus, Trash2, CheckCircle } from 'lucide-react';
import { packingAreaService } from '../../services/packingAreaService';
import { productionService } from '../../services/productionService';
import { productService } from '../../services/productService';

const RequestProducts = () => {
  const navigate = useNavigate();
  const [requestBatches, setRequestBatches] = useState([
    { id: 1, productId: '', productName: '', batchNumber: '', quantity: '', unit: '', urgency: 'normal', packagingType: '', reason: '' }
  ]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [availableBatches, setAvailableBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [products, handovers] = await Promise.all([
        productService.getProducts(),
        productionService.getBatchHandovers({ receivedByPacking: false })
      ]);
      
      setAvailableProducts(products.filter(p => p.status === 'active'));
      setAvailableBatches(handovers);
    } catch (error) {
      setError('Failed to load data');
    }
  };

  const addBatch = () => {
    const newId = Math.max(...requestBatches.map(item => item.id)) + 1;
    setRequestBatches([
      ...requestBatches,
      { id: newId, productId: '', productName: '', batchNumber: '', quantity: '', unit: '', urgency: 'normal', packagingType: '', reason: '' }
    ]);
  };

  const removeBatch = (id) => {
    if (requestBatches.length > 1) {
      setRequestBatches(requestBatches.filter(item => item.id !== id));
    }
  };

  const updateBatch = (id, field, value) => {
    setRequestBatches(requestBatches.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // Auto-fill product details when product is selected
        if (field === 'productId') {
          const product = availableProducts.find(p => p.id === value);
          if (product) {
            updatedItem.productName = product.name;
            updatedItem.unit = product.unit;
          }
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const requestData = {
        batches: requestBatches.filter(item => item.productId && item.quantity).map(item => ({
          productId: item.productId,
          productName: item.productName,
          batchNumber: item.batchNumber,
          quantity: parseInt(item.quantity),
          unit: item.unit,
          urgency: item.urgency,
          packagingType: item.packagingType,
          reason: item.reason
        })),
        notes: additionalNotes,
        priority: requestBatches.some(item => item.urgency === 'urgent') ? 'urgent' : 'normal'
      };
      
      if (requestData.batches.length === 0) {
        setError('Please add at least one product batch to the request');
        setLoading(false);
        return;
      }
      
      await packingAreaService.createProductRequest(requestData);
      navigate('/dashboard');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Factory className="h-8 w-8 mr-3 text-blue-600" />
              Request Products from Production
            </h1>
            <p className="text-gray-600 mt-2">Request completed batches from Production Manager</p>
          </div>
        </div>
      </div>

      {availableBatches.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            <div>
              <p className="text-green-800 font-medium">Available Batches</p>
              <p className="text-green-700 text-sm">
                {availableBatches.length} completed batches are ready for packing. You can receive them directly or submit a formal request.
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-6xl">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Request Batches</h2>
            <button
              type="button"
              onClick={addBatch}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Batch</span>
            </button>
          </div>

          <div className="space-y-6">
            {requestBatches.map((item, index) => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900">Batch Request {index + 1}</h3>
                  {requestBatches.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBatch(item.id)}
                      className="text-red-600 hover:text-red-800 p-1 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product *
                    </label>
                    <select
                      value={item.productId}
                      onChange={(e) => updateBatch(item.id, 'productId', e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select product</option>
                      {availableProducts.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Batch Number
                    </label>
                    <input
                      type="text"
                      value={item.batchNumber}
                      onChange={(e) => updateBatch(item.id, 'batchNumber', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Specific batch"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateBatch(item.id, 'quantity', e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter quantity"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Packaging Type
                    </label>
                    <select
                      value={item.packagingType}
                      onChange={(e) => updateBatch(item.id, 'packagingType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select type</option>
                      <option value="bottles">Bottles</option>
                      <option value="sachets">Sachets</option>
                      <option value="boxes">Boxes</option>
                      <option value="bulk">Bulk Packaging</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unit
                    </label>
                    <input
                      type="text"
                      value={item.unit}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Urgency
                    </label>
                    <select
                      value={item.urgency}
                      onChange={(e) => updateBatch(item.id, 'urgency', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Request *
                  </label>
                  <textarea
                    rows={2}
                    value={item.reason}
                    onChange={(e) => updateBatch(item.id, 'reason', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Explain why this batch is needed for packing..."
                  />
                </div>

                <div className="mt-3 flex justify-end">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getUrgencyColor(item.urgency)}`}>
                    {item.urgency.charAt(0).toUpperCase() + item.urgency.slice(1)} Priority
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes
            </label>
            <textarea
              rows={3}
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add any additional information for the Production Manager..."
            />
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || requestBatches.every(item => !item.productId || !item.quantity) || requestBatches.some(item => item.productId && item.quantity && !item.reason)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-4 w-4" />
              <span>{loading ? 'Submitting...' : 'Submit Request'}</span>
            </button>
          </div>
          
          {requestBatches.some(item => item.productId && item.quantity && !item.reason) && (
            <div className="mt-2 text-center">
              <p className="text-sm text-red-600">
                Please provide a reason for all selected products
              </p>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default RequestProducts;