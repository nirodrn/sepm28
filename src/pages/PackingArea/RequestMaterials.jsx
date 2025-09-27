import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, Send, ArrowLeft, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { packingMaterialsService } from '../../services/packingMaterialsService';
import { materialService } from '../../services/materialService';

const RequestMaterials = () => {
  const navigate = useNavigate();
  const [requestItems, setRequestItems] = useState([
    { id: 1, materialId: '', materialName: '', quantity: '', unit: '', urgency: 'normal', reason: '', productionLine: 'line1' }
  ]);
  const [availableMaterials, setAvailableMaterials] = useState([]);
  const [currentStock, setCurrentStock] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [materials, stockReport] = await Promise.all([
        materialService.getPackingMaterials(),
        packingMaterialsService.getStockReport()
      ]);
      
      setAvailableMaterials(materials.filter(m => m.status === 'active'));
      setCurrentStock(stockReport);
    } catch (error) {
      setError('Failed to load materials data');
    }
  };

  const getStockLevel = (materialId) => {
    const stockItem = currentStock.find(s => s.materialId === materialId);
    return stockItem?.currentStock || 0;
  };

  const addItem = () => {
    const newId = Math.max(...requestItems.map(item => item.id)) + 1;
    setRequestItems([
      ...requestItems,
      { id: newId, materialId: '', materialName: '', quantity: '', unit: '', urgency: 'normal', reason: '', productionLine: 'line1' }
    ]);
  };

  const removeItem = (id) => {
    if (requestItems.length > 1) {
      setRequestItems(requestItems.filter(item => item.id !== id));
    }
  };

  const updateItem = (id, field, value) => {
    setRequestItems(requestItems.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // Auto-fill material details when material is selected
        if (field === 'materialId') {
          const material = availableMaterials.find(m => m.id === value);
          if (material) {
            updatedItem.materialName = material.name;
            updatedItem.unit = material.unit;
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
        materials: requestItems.filter(item => item.materialId && item.quantity).map(item => ({
          materialId: item.materialId,
          materialName: item.materialName,
          quantity: parseInt(item.quantity),
          unit: item.unit,
          urgency: item.urgency,
          reason: item.reason,
          productionLine: item.productionLine
        })),
        requestedFor: 'packing_area',
        notes: additionalNotes,
        requestType: 'packingMaterial'
      };
      
      await packingMaterialsService.createInternalRequest(requestData);
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

  const getStockStatusColor = (current, reorder) => {
    if (current <= reorder) return 'text-red-600';
    if (current <= reorder * 2) return 'text-yellow-600';
    return 'text-green-600';
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
              <Archive className="h-8 w-8 mr-3 text-blue-600" />
              Request Packing Materials
            </h1>
            <p className="text-gray-600 mt-2">Submit request to Packing Materials Store Manager</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-6xl">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Request Items</h2>
            <button
              type="button"
              onClick={addItem}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Item</span>
            </button>
          </div>

          <div className="space-y-6">
            {requestItems.map((item, index) => {
              const stockLevel = getStockLevel(item.materialId);
              const material = availableMaterials.find(m => m.id === item.materialId);
              const isLowStock = material && stockLevel <= material.reorderLevel;
              
              return (
                <div key={item.id} className={`border rounded-lg p-4 ${
                  isLowStock ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-gray-900">Item {index + 1}</h3>
                    {requestItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-red-600 hover:text-red-800 p-1 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Material *
                      </label>
                      <select
                        value={item.materialId}
                        onChange={(e) => updateItem(item.id, 'materialId', e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select material</option>
                        {availableMaterials.map(material => (
                          <option key={material.id} value={material.id}>
                            {material.name} ({material.code})
                          </option>
                        ))}
                      </select>
                      {item.materialId && (
                        <div className="mt-1 text-sm">
                          <span className={`font-medium ${getStockStatusColor(stockLevel, material?.reorderLevel)}`}>
                            Store Stock: {stockLevel} {material?.unit}
                          </span>
                          {isLowStock && (
                            <div className="flex items-center text-red-600 mt-1">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              <span className="text-xs">Low stock in store</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter quantity"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Production Line
                      </label>
                      <select
                        value={item.productionLine}
                        onChange={(e) => updateItem(item.id, 'productionLine', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="line1">Packing Line 1</option>
                        <option value="line2">Packing Line 2</option>
                        <option value="line3">Packing Line 3</option>
                        <option value="line4">Packing Line 4</option>
                        <option value="general">General Packing Area</option>
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
                        onChange={(e) => updateItem(item.id, 'urgency', e.target.value)}
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
                      onChange={(e) => updateItem(item.id, 'reason', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Explain why this material is needed for packing operations..."
                    />
                  </div>

                  <div className="mt-3 flex justify-end">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getUrgencyColor(item.urgency)}`}>
                      {item.urgency.charAt(0).toUpperCase() + item.urgency.slice(1)} Priority
                    </span>
                  </div>
                </div>
              );
            })}
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
              placeholder="Add any additional information for the Store Manager..."
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
              disabled={loading || requestItems.every(item => !item.materialId || !item.quantity) || requestItems.some(item => item.materialId && item.quantity && !item.reason)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-4 w-4" />
              <span>{loading ? 'Submitting...' : 'Submit Request'}</span>
            </button>
          </div>
          
          {requestItems.some(item => item.materialId && item.quantity && !item.reason) && (
            <div className="mt-2 text-center">
              <p className="text-sm text-red-600">
                Please provide a reason for all selected materials
              </p>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default RequestMaterials;