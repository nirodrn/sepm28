import React, { useState, useEffect } from 'react';
import { Send, Package, ArrowRight, AlertTriangle, ArrowLeft, CheckCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { packingMaterialsService } from '../../services/packingMaterialsService';
import { materialService } from '../../services/materialService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const SendToPackingArea = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const requestId = location.state?.requestId;
  
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [batchNumbers, setBatchNumbers] = useState({});
  const [availableMaterials, setAvailableMaterials] = useState([]);
  const [internalRequest, setInternalRequest] = useState(null);
  const [destination, setDestination] = useState('line1');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const stockReport = await packingMaterialsService.getStockReport();
      
      // Only show materials with stock > 0
      const materialsWithStock = stockReport.filter(item => item.currentStock > 0);
      setAvailableMaterials(materialsWithStock);
      
      // If there's a request ID, load the request details
      if (requestId) {
        const requests = await packingMaterialsService.getInternalRequests();
        const request = requests.find(r => r.id === requestId);
        if (request) {
          setInternalRequest(request);
          // Pre-select materials from the request
          const requestedMaterialIds = request.items?.map(item => item.materialId) || [];
          setSelectedMaterials(requestedMaterialIds);
          
          // Pre-fill quantities
          const requestedQuantities = {};
          const requestedBatches = {};
          request.items?.forEach(item => {
            requestedQuantities[item.materialId] = item.quantity;
            requestedBatches[item.materialId] = `BATCH-${Date.now().toString().slice(-6)}`;
          });
          setQuantities(requestedQuantities);
          setBatchNumbers(requestedBatches);
          
          // Set destination from request if available
          if (request.items?.[0]?.productionLine) {
            setDestination(request.items[0].productionLine);
          }
        }
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStockLevel = (materialId) => {
    const material = availableMaterials.find(m => m.materialId === materialId);
    return material?.currentStock || 0;
  };

  const handleMaterialSelect = (materialId) => {
    if (selectedMaterials.includes(materialId)) {
      setSelectedMaterials(selectedMaterials.filter(id => id !== materialId));
      const newQuantities = { ...quantities };
      const newBatches = { ...batchNumbers };
      delete newQuantities[materialId];
      delete newBatches[materialId];
      setQuantities(newQuantities);
      setBatchNumbers(newBatches);
    } else {
      setSelectedMaterials([...selectedMaterials, materialId]);
      setBatchNumbers({
        ...batchNumbers,
        [materialId]: `BATCH-${Date.now().toString().slice(-6)}`
      });
    }
  };

  const handleQuantityChange = (materialId, quantity) => {
    setQuantities({
      ...quantities,
      [materialId]: parseInt(quantity) || 0
    });
  };

  const handleBatchChange = (materialId, batch) => {
    setBatchNumbers({
      ...batchNumbers,
      [materialId]: batch
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await handleDispatch();
  };

  const handleDispatch = async () => {
    setSubmitting(true);
    setError('');

    try {
      const dispatchData = {
        destination,
        notes,
        requestId: requestId || null,
        items: selectedMaterials.map(id => {
          const material = availableMaterials.find(m => m.materialId === id);
          return {
            materialId: id,
            materialName: material.materialName,
            quantity: quantities[id],
            unit: material.unit,
            batchNumber: batchNumbers[id] || null,
            unitPrice: material.unitPrice || 0
          };
        }).filter(item => item.quantity > 0)
      };
      
      await packingMaterialsService.dispatchToPacking(dispatchData);
      navigate('/packing-materials/stock');
    } catch (error) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getTotalItems = () => {
    return selectedMaterials.reduce((total, id) => total + (quantities[id] || 0), 0);
  };

  const getTotalValue = () => {
    return selectedMaterials.reduce((total, id) => {
      const material = availableMaterials.find(m => m.materialId === id);
      const quantity = quantities[id] || 0;
      const unitPrice = material?.unitPrice || 0;
      return total + (quantity * unitPrice);
    }, 0);
  };

  const isValidQuantity = (materialId, quantity) => {
    const availableStock = getStockLevel(materialId);
    return quantity > 0 && quantity <= availableStock;
  };

  const hasValidSelections = () => {
    return selectedMaterials.length > 0 && 
           selectedMaterials.every(id => isValidQuantity(id, quantities[id])) &&
           selectedMaterials.every(id => batchNumbers[id]?.trim());
  };

  const getQualityColor = (grade) => {
    switch (grade) {
      case 'A':
        return 'bg-green-100 text-green-800';
      case 'B':
        return 'bg-blue-100 text-blue-800';
      case 'C':
        return 'bg-yellow-100 text-yellow-800';
      case 'D':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStockStatusColor = (current, reorder) => {
    if (current <= reorder) return 'text-red-600';
    if (current <= reorder * 2) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading) {
    return <LoadingSpinner text="Loading materials..." />;
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/packing-materials/stock')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Send className="h-8 w-8 mr-3 text-blue-600" />
              Send to Packing Area
            </h1>
            <p className="text-gray-600 mt-2">Transfer materials to the packing area</p>
          </div>
        </div>
      </div>

      {internalRequest && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <Package className="h-5 w-5 text-blue-600 mr-2" />
            <div>
              <h3 className="font-medium text-blue-900">Fulfilling Internal Request</h3>
              <p className="text-blue-700 text-sm">
                Request ID: {internalRequest.id.slice(-8)} • {internalRequest.items?.length || 0} items requested
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Materials</h2>
            
            <div className="space-y-4">
              {availableMaterials.map((material) => {
                const isLowStock = material.currentStock <= material.reorderLevel;
                const isSelected = selectedMaterials.includes(material.materialId);
                
                return (
                  <div
                    key={material.materialId}
                    className={`border rounded-lg p-4 transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : isLowStock
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleMaterialSelect(material.materialId)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                        />
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{material.materialName}</h3>
                          <p className="text-sm text-gray-500">
                            Code: {material.materialCode} • Category: {material.category}
                          </p>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className={`text-sm font-medium ${getStockStatusColor(material.currentStock, material.reorderLevel)}`}>
                              Available: {material.currentStock} {material.unit}
                            </span>
                            <span className="text-sm text-gray-500">
                              Location: {material.location}
                            </span>
                            <span className="text-sm text-gray-500">
                              ${material.unitPrice?.toFixed(2)}/{material.unit}
                            </span>
                          </div>
                          {isLowStock && (
                            <div className="flex items-center text-red-600 mt-1">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              <span className="text-xs">Low stock - consider reordering</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {isSelected && (
                        <div className="ml-4 space-y-2">
                          <div className="flex items-center space-x-2">
                            <label className="text-sm text-gray-700">Quantity:</label>
                            <input
                              type="number"
                              min="1"
                              max={material.currentStock}
                              value={quantities[material.materialId] || ''}
                              onChange={(e) => handleQuantityChange(material.materialId, e.target.value)}
                              className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="0"
                            />
                            <span className="text-sm text-gray-500">{material.unit}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <label className="text-sm text-gray-700">Batch:</label>
                            <input
                              type="text"
                              value={batchNumbers[material.materialId] || ''}
                              onChange={(e) => handleBatchChange(material.materialId, e.target.value)}
                              className="w-32 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Batch number"
                            />
                          </div>
                          {quantities[material.materialId] && !isValidQuantity(material.materialId, quantities[material.materialId]) && (
                            <span className="text-red-600 text-xs">Invalid quantity</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Transfer Summary</h3>
            
            {selectedMaterials.length === 0 ? (
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No materials selected</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border-b border-gray-200 pb-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Selected Materials:</span>
                      <span className="font-medium text-gray-900 ml-2">{selectedMaterials.length}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Items:</span>
                      <span className="font-medium text-gray-900 ml-2">{getTotalItems()}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Value:</span>
                      <span className="font-medium text-gray-900 ml-2">${getTotalValue().toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Destination:</span>
                      <span className="font-medium text-gray-900 ml-2">
                        {destination.replace('line', 'Line ').replace('general', 'General Area')}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {selectedMaterials.map(id => {
                    const material = availableMaterials.find(m => m.materialId === id);
                    const quantity = quantities[id] || 0;
                    const batch = batchNumbers[id] || '';
                    const value = quantity * (material?.unitPrice || 0);
                    return (
                      <div key={id} className="flex justify-between items-center text-sm bg-gray-50 rounded-lg p-3">
                        <div>
                          <span className="text-gray-900 font-medium">{material?.materialName}</span>
                          <div className="text-gray-500 text-xs">Batch: {batch}</div>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-900">{quantity} {material?.unit}</span>
                          <div className="text-gray-500 text-xs">${value.toFixed(2)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Transfer Details</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Destination *
                </label>
                <select 
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="line1">Packing Area - Line 1</option>
                  <option value="line2">Packing Area - Line 2</option>
                  <option value="line3">Packing Area - Line 3</option>
                  <option value="line4">Packing Area - Line 4</option>
                  <option value="general">Packing Area - General</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transfer Notes
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add any special instructions or notes..."
                />
              </div>

              <div className="space-y-2">
                <button
                  type="submit"
                  disabled={!hasValidSelections() || submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="h-4 w-4" />
                  <span>{submitting ? 'Dispatching...' : 'Send Materials'}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                
                {!hasValidSelections() && selectedMaterials.length > 0 && (
                  <div className="text-center">
                    <p className="text-sm text-red-600">
                      Please ensure all selected materials have valid quantities and batch numbers
                    </p>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SendToPackingArea;