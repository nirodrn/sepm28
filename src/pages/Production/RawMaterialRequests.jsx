import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Send, ArrowLeft, Plus, Trash2, AlertTriangle, CheckCircle, Clock, Eye, Calculator, Zap } from 'lucide-react';
import { productionWarehouseService } from '../../services/productionWarehouseService';
import { materialService } from '../../services/materialService';
import { productionService } from '../../services/productionService';
import { formatDate } from '../../utils/formatDate';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const RawMaterialRequests = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('create');
  const [requestMode, setRequestMode] = useState('direct'); // 'direct' or 'product'
  
  // Product-based request state
  const [selectedProduct, setSelectedProduct] = useState('');
  const [productionQuantity, setProductionQuantity] = useState('');
  const [productMaterials, setProductMaterials] = useState([]);
  
  // Direct request state
  const [directMaterials, setDirectMaterials] = useState([
    { id: 1, materialId: '', materialName: '', quantity: '', unit: '', urgency: 'normal', reason: '', currentStock: 0 }
  ]);
  
  // Common state
  const [productionProducts, setProductionProducts] = useState([]);
  const [availableMaterials, setAvailableMaterials] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [myDispatches, setMyDispatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [batchReference, setBatchReference] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [materials, products, requests, dispatches] = await Promise.all([
        materialService.getRawMaterials(),
        productionService.getProductionProducts(),
        productionWarehouseService.getMyRequests(),
        productionWarehouseService.getDispatchesForProduction()
      ]);
      
      setAvailableMaterials(materials.filter(m => m.status === 'active'));
      setProductionProducts(products.filter(p => p.status === 'active'));
      setMyRequests(requests);
      setMyDispatches(dispatches);
    } catch (error) {
      setError('Failed to load data');
    }
  };

  // Product-based request handlers
  const handleProductSelect = (productId) => {
    const product = productionProducts.find(p => p.id === productId);
    setSelectedProduct(productId);
    
    if (product && product.materialRequirements) {
      const materials = product.materialRequirements.map((req, index) => {
        const materialInfo = availableMaterials.find(m => m.id === req.materialId);
        return {
          id: index + 1,
          materialId: req.materialId,
          materialName: req.materialName,
          quantityPerUnit: req.quantityPerUnit,
          calculatedQuantity: '',
          adjustedQuantity: '',
          unit: req.unit,
          urgency: 'normal',
          reason: `Required for ${product.name} production`,
          currentStock: materialInfo?.currentStock || 0,
          notes: req.notes || ''
        };
      });
      setProductMaterials(materials);
    } else {
      setProductMaterials([]);
    }
    setProductionQuantity('');
  };

  const handleProductionQuantityChange = (quantity) => {
    setProductionQuantity(quantity);
    if (quantity && productMaterials.length > 0) {
      const updatedMaterials = productMaterials.map(material => {
        const calculated = (parseFloat(material.quantityPerUnit) * parseFloat(quantity)).toFixed(2);
        return {
          ...material,
          calculatedQuantity: calculated,
          adjustedQuantity: material.adjustedQuantity || calculated
        };
      });
      setProductMaterials(updatedMaterials);
    }
  };

  const updateProductMaterial = (id, field, value) => {
    setProductMaterials(materials => materials.map(material => 
      material.id === id ? { ...material, [field]: value } : material
    ));
  };

  // Direct request handlers
  const addDirectMaterial = () => {
    const newId = Math.max(...directMaterials.map(item => item.id)) + 1;
    setDirectMaterials([
      ...directMaterials,
      { id: newId, materialId: '', materialName: '', quantity: '', unit: '', urgency: 'normal', reason: '', currentStock: 0 }
    ]);
  };

  const removeDirectMaterial = (id) => {
    if (directMaterials.length > 1) {
      setDirectMaterials(directMaterials.filter(item => item.id !== id));
    }
  };

  const updateDirectMaterial = (id, field, value) => {
    setDirectMaterials(materials => materials.map(material => {
      if (material.id === id) {
        const updatedMaterial = { ...material, [field]: value };
        
        // Auto-fill material details when material is selected
        if (field === 'materialId') {
          const materialInfo = availableMaterials.find(m => m.id === value);
          if (materialInfo) {
            updatedMaterial.materialName = materialInfo.name;
            updatedMaterial.unit = materialInfo.unit;
            updatedMaterial.currentStock = materialInfo.currentStock || 0;
          }
        }
        
        return updatedMaterial;
      }
      return material;
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let requestItems = [];
      
      if (requestMode === 'product' && productMaterials.length > 0) {
        requestItems = productMaterials
          .filter(material => material.adjustedQuantity && parseFloat(material.adjustedQuantity) > 0)
          .map(material => ({
            materialId: material.materialId,
            materialName: material.materialName,
            quantity: parseFloat(material.adjustedQuantity),
            unit: material.unit,
            urgency: material.urgency,
            reason: material.reason,
            batchReference: batchReference,
            quantityPerUnit: material.quantityPerUnit,
            calculatedQuantity: material.calculatedQuantity
          }));
      } else {
        requestItems = directMaterials
          .filter(material => material.materialId && material.quantity)
          .map(material => ({
            materialId: material.materialId,
            materialName: material.materialName,
            quantity: parseFloat(material.quantity),
            unit: material.unit,
            urgency: material.urgency,
            reason: material.reason,
            batchReference: batchReference
          }));
      }
      
      if (requestItems.length === 0) {
        setError('Please add at least one material with quantity to the request');
        setLoading(false);
        return;
      }
      
      const requestData = {
        items: requestItems,
        notes: additionalNotes,
        priority: requestItems.some(item => item.urgency === 'urgent') ? 'urgent' : 'normal',
        batchReference: batchReference,
        requestMode: requestMode,
        productId: requestMode === 'product' ? selectedProduct : null,
        productionQuantity: requestMode === 'product' ? parseFloat(productionQuantity) : null
      };
      
      await productionWarehouseService.createRawMaterialRequest(requestData);
      
      // Reset form
      if (requestMode === 'product') {
        setSelectedProduct('');
        setProductionQuantity('');
        setProductMaterials([]);
      } else {
        setDirectMaterials([
          { id: 1, materialId: '', materialName: '', quantity: '', unit: '', urgency: 'normal', reason: '', currentStock: 0 }
        ]);
      }
      setAdditionalNotes('');
      setBatchReference('');
      
      // Switch to tracking tab and reload data
      setActiveTab('tracking');
      await loadData();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledgeReceipt = async (dispatchId) => {
    try {
      await productionWarehouseService.acknowledgeReceipt(dispatchId, {
        notes: 'Materials received and confirmed by Production'
      });
      await loadData();
    } catch (error) {
      setError(error.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending_warehouse':
        return 'bg-yellow-100 text-yellow-800';
      case 'dispatched':
        return 'bg-blue-100 text-blue-800';
      case 'received':
        return 'bg-green-100 text-green-800';
      case 'stock_shortage':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending_warehouse':
        return 'Pending Warehouse';
      case 'dispatched':
        return 'Dispatched';
      case 'received':
        return 'Received';
      case 'stock_shortage':
        return 'Stock Shortage';
      default:
        return status?.replace('_', ' ').toUpperCase() || 'Unknown';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'received':
        return <CheckCircle className="h-4 w-4" />;
      case 'dispatched':
        return <Package className="h-4 w-4" />;
      case 'stock_shortage':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
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

  const getStockStatusColor = (current, requested) => {
    if (current >= requested) return 'text-green-600';
    if (current >= requested * 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const tabs = [
    { id: 'create', label: 'Create Request', icon: Plus },
    { id: 'tracking', label: 'My Requests', icon: Clock, count: myRequests.length },
    { id: 'dispatches', label: 'Dispatches', icon: Package, count: myDispatches.filter(d => !d.receivedBy).length }
  ];

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
              Raw Material Requests
            </h1>
            <p className="text-gray-600 mt-2">Request materials directly from Warehouse Staff</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm">
        {activeTab === 'create' && (
          <div className="p-6">
            {/* Request Mode Selection */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Request Method</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setRequestMode('direct')}
                  className={`p-6 rounded-lg border-2 transition-all ${
                    requestMode === 'direct'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-lg ${
                      requestMode === 'direct' ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <Package className={`h-6 w-6 ${
                        requestMode === 'direct' ? 'text-blue-600' : 'text-gray-600'
                      }`} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">Direct Material Request</h3>
                      <p className="text-sm text-gray-600">Select individual materials with specific quantities</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setRequestMode('product')}
                  className={`p-6 rounded-lg border-2 transition-all ${
                    requestMode === 'product'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-lg ${
                      requestMode === 'product' ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <Zap className={`h-6 w-6 ${
                        requestMode === 'product' ? 'text-green-600' : 'text-gray-600'
                      }`} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">Product-Based Request</h3>
                      <p className="text-sm text-gray-600">Select product and auto-calculate material needs</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Common Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Batch Reference
                  </label>
                  <input
                    type="text"
                    value={batchReference}
                    onChange={(e) => setBatchReference(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Optional batch reference number"
                  />
                </div>
              </div>

              {/* Product-Based Request */}
              {requestMode === 'product' && (
                <div className="space-y-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
                      <Zap className="h-5 w-5 mr-2" />
                      Smart Product-Based Request
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-green-700 mb-2">
                          Select Product *
                        </label>
                        <select
                          value={selectedProduct}
                          onChange={(e) => handleProductSelect(e.target.value)}
                          required
                          className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        >
                          <option value="">Choose a product to auto-load materials</option>
                          {productionProducts.map(product => (
                            <option key={product.id} value={product.id}>
                              {product.name} ({product.code})
                            </option>
                          ))}
                        </select>
                        {productionProducts.length === 0 && (
                          <p className="text-sm text-green-600 mt-1">
                            No products available. Create products first to use this feature.
                          </p>
                        )}
                      </div>

                      {selectedProduct && (
                        <div>
                          <label className="block text-sm font-medium text-green-700 mb-2">
                            Production Quantity *
                          </label>
                          <div className="flex space-x-2">
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={productionQuantity}
                              onChange={(e) => handleProductionQuantityChange(e.target.value)}
                              required
                              className="flex-1 px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              placeholder="Enter batch size"
                            />
                            <div className="px-3 py-2 bg-green-100 border border-green-300 rounded-lg text-green-700 font-medium">
                              {productionProducts.find(p => p.id === selectedProduct)?.unit || 'units'}
                            </div>
                          </div>
                          <p className="text-sm text-green-600 mt-1">
                            Material quantities will be calculated automatically
                          </p>
                        </div>
                      )}
                    </div>

                    {selectedProduct && productMaterials.length > 0 && (
                      <div className="mt-6">
                        <h4 className="font-medium text-green-900 mb-3">
                          Required Materials ({productMaterials.length})
                        </h4>
                        <div className="space-y-4">
                          {productMaterials.map((material) => (
                            <div key={material.id} className="bg-white border border-green-200 rounded-lg p-4">
                              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                                <div className="md:col-span-2">
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Material
                                  </label>
                                  <div className="text-sm font-medium text-gray-900">{material.materialName}</div>
                                  <div className="text-xs text-gray-500">
                                    Stock: <span className={getStockStatusColor(material.currentStock, parseFloat(material.adjustedQuantity || 0))}>
                                      {material.currentStock} {material.unit}
                                    </span>
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Formula
                                  </label>
                                  <div className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                    {material.quantityPerUnit} {material.unit}/unit
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Calculated
                                  </label>
                                  <div className="flex items-center space-x-1">
                                    <Calculator className="h-3 w-3 text-gray-400" />
                                    <span className="text-sm font-medium text-gray-900">
                                      {material.calculatedQuantity || '0'} {material.unit}
                                    </span>
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Adjust Quantity *
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={material.adjustedQuantity}
                                    onChange={(e) => updateProductMaterial(material.id, 'adjustedQuantity', e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    placeholder="Adjust if needed"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Urgency
                                  </label>
                                  <select
                                    value={material.urgency}
                                    onChange={(e) => updateProductMaterial(material.id, 'urgency', e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                  >
                                    <option value="low">Low</option>
                                    <option value="normal">Normal</option>
                                    <option value="high">High</option>
                                    <option value="urgent">Urgent</option>
                                  </select>
                                </div>
                              </div>

                              <div className="mt-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Reason for Request
                                </label>
                                <input
                                  type="text"
                                  value={material.reason}
                                  onChange={(e) => updateProductMaterial(material.id, 'reason', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                  placeholder="Explain why this material is needed..."
                                />
                              </div>

                              <div className="mt-2 flex justify-between items-center">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getUrgencyColor(material.urgency)}`}>
                                  {material.urgency.charAt(0).toUpperCase() + material.urgency.slice(1)} Priority
                                </span>
                                {material.currentStock < parseFloat(material.adjustedQuantity || 0) && (
                                  <div className="flex items-center text-red-600 text-xs">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    <span>Insufficient stock available</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Direct Material Request */}
              {requestMode === 'direct' && (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-blue-900 flex items-center">
                        <Package className="h-5 w-5 mr-2" />
                        Direct Material Request
                      </h3>
                      <button
                        type="button"
                        onClick={addDirectMaterial}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add Material</span>
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

                    <div className="space-y-4">
                      {directMaterials.map((material, index) => (
                        <div key={material.id} className="bg-white border border-blue-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-medium text-gray-900">Material {index + 1}</h4>
                            {directMaterials.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeDirectMaterial(material.id)}
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
                                value={material.materialId}
                                onChange={(e) => updateDirectMaterial(material.id, 'materialId', e.target.value)}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="">Select material</option>
                                {availableMaterials.map(mat => (
                                  <option key={mat.id} value={mat.id}>
                                    {mat.name} ({mat.code})
                                  </option>
                                ))}
                              </select>
                              {material.materialId && (
                                <div className="mt-1 text-xs">
                                  <span className={`font-medium ${getStockStatusColor(material.currentStock, parseFloat(material.quantity || 0))}`}>
                                    Available: {material.currentStock} {material.unit}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Quantity *
                              </label>
                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={material.quantity}
                                onChange={(e) => updateDirectMaterial(material.id, 'quantity', e.target.value)}
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
                                value={material.unit}
                                readOnly
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Urgency
                              </label>
                              <select
                                value={material.urgency}
                                onChange={(e) => updateDirectMaterial(material.id, 'urgency', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="low">Low</option>
                                <option value="normal">Normal</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                              </select>
                            </div>

                            <div className="flex items-end">
                              <div className="w-full">
                                <div className="text-center">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getUrgencyColor(material.urgency)}`}>
                                    {material.urgency.toUpperCase()}
                                  </span>
                                </div>
                                {material.currentStock < parseFloat(material.quantity || 0) && material.quantity && (
                                  <div className="flex items-center justify-center text-red-600 text-xs mt-1">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    <span>Low stock</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Reason for Request *
                            </label>
                            <textarea
                              rows={2}
                              value={material.reason}
                              onChange={(e) => updateDirectMaterial(material.id, 'reason', e.target.value)}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Explain why this material is needed for production..."
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Information */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
                
                <div>
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

                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
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
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || availableMaterials.length === 0 || 
                    (requestMode === 'product' && (!selectedProduct || !productionQuantity || productMaterials.every(m => !m.adjustedQuantity))) ||
                    (requestMode === 'direct' && directMaterials.every(m => !m.materialId || !m.quantity || !m.reason))
                  }
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="h-5 w-5" />
                  <span>{loading ? 'Submitting...' : 'Submit Request'}</span>
                </button>
              </div>
              
              {/* Validation Messages */}
              {requestMode === 'product' && selectedProduct && productionQuantity && productMaterials.every(m => !m.adjustedQuantity) && (
                <div className="text-center">
                  <p className="text-sm text-red-600">
                    Please adjust quantities for the materials you want to request
                  </p>
                </div>
              )}
              
              {requestMode === 'direct' && directMaterials.some(m => m.materialId && m.quantity && !m.reason) && (
                <div className="text-center">
                  <p className="text-sm text-red-600">
                    Please provide a reason for all selected materials
                  </p>
                </div>
              )}
            </form>
          </div>
        )}

        {activeTab === 'tracking' && (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">My Requests</h2>
            {myRequests.length === 0 ? (
              <div className="text-center py-8">
                <Package className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No requests submitted yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myRequests.map((request) => (
                  <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-blue-100">
                          {getStatusIcon(request.status)}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">
                            Request #{request.id.slice(-6)}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {request.items?.length || 0} items • {formatDate(request.createdAt)}
                          </p>
                          {request.requestMode === 'product' && request.productId && (
                            <p className="text-sm text-blue-600">
                              Product-based: {productionProducts.find(p => p.id === request.productId)?.name || 'Unknown Product'}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                        {getStatusIcon(request.status)}
                        <span className="ml-1">{getStatusLabel(request.status)}</span>
                      </span>
                    </div>
                    
                    <div className="space-y-1">
                      {request.items?.map((item, index) => (
                        <div key={index} className="text-sm text-gray-600 flex items-center justify-between bg-gray-50 rounded p-2">
                          <span>• {item.materialName}: {item.quantity} {item.unit}</span>
                          {item.calculatedQuantity && (
                            <span className="text-blue-600 text-xs">
                              Calculated: {item.calculatedQuantity} {item.unit}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {request.notes && (
                      <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                        Notes: {request.notes}
                      </p>
                    )}

                    {request.status === 'stock_shortage' && request.shortageItems && (
                      <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                        <h5 className="font-medium text-red-800 mb-2">Stock Shortage Details:</h5>
                        {request.shortageItems.map((shortage, index) => (
                          <div key={index} className="text-sm text-red-700">
                            • {shortage.materialName}: Need {shortage.requested}, Available {shortage.available} (Short: {shortage.shortfall})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'dispatches' && (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Material Dispatches</h2>
            {myDispatches.length === 0 ? (
              <div className="text-center py-8">
                <Package className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No dispatches received yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myDispatches.map((dispatch) => (
                  <div key={dispatch.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-green-100">
                          <Package className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">
                            Dispatch #{dispatch.id.slice(-6)}
                          </h4>
                          <p className="text-sm text-gray-500">
                            From: {dispatch.dispatchedByName} • {formatDate(dispatch.dispatchedAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {dispatch.status === 'dispatched' && !dispatch.receivedBy && (
                          <button
                            onClick={() => handleAcknowledgeReceipt(dispatch.id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                          >
                            Acknowledge Receipt
                          </button>
                        )}
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          dispatch.receivedBy ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {dispatch.receivedBy ? 'Received' : 'Dispatched'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h5 className="font-medium text-gray-700">Materials:</h5>
                      {dispatch.items?.map((item, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                          <div>
                            <p className="font-medium text-gray-900">{item.materialName}</p>
                            <p className="text-sm text-gray-500">
                              Dispatched: {item.dispatchedQuantity} {item.unit}
                              {item.batchNumber && <span> • Batch: {item.batchNumber}</span>}
                            </p>
                          </div>
                          <div className="text-right text-sm text-gray-600">
                            <p>Stock: {item.stockBefore} → {item.stockAfter}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {dispatch.notes && (
                      <p className="text-sm text-gray-600 mt-3 bg-gray-50 p-2 rounded">
                        Notes: {dispatch.notes}
                      </p>
                    )}

                    {dispatch.receiptNotes && (
                      <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-2">
                        <p className="text-sm text-green-800">
                          <span className="font-medium">Receipt Notes:</span> {dispatch.receiptNotes}
                        </p>
                        <p className="text-xs text-green-600">
                          Received: {formatDate(dispatch.receivedAt)}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RawMaterialRequests;