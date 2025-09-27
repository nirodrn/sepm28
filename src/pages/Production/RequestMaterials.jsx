import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Send, ArrowLeft, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { productionService } from '../../services/productionService';
import { materialService } from '../../services/materialService';

const RequestMaterials = () => {
  const navigate = useNavigate();
  const [requestItems, setRequestItems] = useState([
    { id: 1, materialId: '', materialName: '', quantity: '', unit: '', urgency: 'normal', reason: '', batchNumber: '' }
  ]);
  const [availableMaterials, setAvailableMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = async () => {
    try {
      const materials = await materialService.getRawMaterials();
      setAvailableMaterials(materials.filter(m => m.status === 'active'));
    } catch (error) {
      setError('Failed to load materials data');
    }
  };

  const addItem = () => {
    const newId = Math.max(...requestItems.map(item => item.id)) + 1;
    setRequestItems([
      ...requestItems,
      { id: newId, materialId: '', materialName: '', quantity: '', unit: '', urgency: 'normal', reason: '', batchNumber: '' }
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
        items: requestItems.filter(item => item.materialId && item.quantity).map(item => ({
          materialId: item.materialId,
          materialName: item.materialName,
          quantity: parseInt(item.quantity),
          unit: item.unit,
          urgency: item.urgency,
          reason: item.reason,
          batchNumber: item.batchNumber
        })),
        notes: additionalNotes,
        priority: requestItems.some(item => item.urgency === 'urgent') ? 'urgent' : 'normal'
      };
      
      if (requestData.items.length === 0) {
        setError('Please add at least one material item to the request');
        setLoading(false);
        return;
      }
      
      await productionService.createRawMaterialRequest(requestData);
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
              <Package className="h-8 w-8 mr-3 text-blue-600" />
              Request Raw Materials
            </h1>
            <p className="text-gray-600 mt-2">Submit request directly to Warehouse Staff (HO will be notified for monitoring)</p>
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

          {availableMaterials.length === 0 && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                <div>
                  <p className="text-yellow-800 font-medium">No Materials Available</p>
                  <p className="text-yellow-700 text-sm">
                    No raw materials are currently available in the system. Please contact an administrator to add materials first.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {requestItems.map((item, index) => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-4">
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Batch Number
                    </label>
                    <input
                      type="text"
                      value={item.batchNumber}
                      onChange={(e) => updateItem(item.id, 'batchNumber', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Optional batch ref"
                    />
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
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Explain why this material is needed for production..."
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
              placeholder="Add any additional information for the Warehouse Staff..."
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <Package className="h-5 w-5 text-blue-600 mr-2" />
              <div>
                <p className="text-blue-800 font-medium">Direct Request to Warehouse</p>
                <p className="text-blue-700 text-sm">
                  This request will be sent directly to Warehouse Staff for processing. Head of Operations will be notified for monitoring purposes only.
                </p>
              </div>
            </div>
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
              disabled={loading || availableMaterials.length === 0 || requestItems.every(item => !item.materialId || !item.quantity) || requestItems.some(item => item.materialId && item.quantity && !item.reason)}
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