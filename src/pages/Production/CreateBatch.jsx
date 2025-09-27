import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Factory, Save, ArrowLeft, Plus, Trash2, Package, AlertTriangle, CheckCircle } from 'lucide-react';
import { productionService } from '../../services/productionService';
import { materialService } from '../../services/materialService';
import { productionStoreService } from '../../services/productionStoreService.ts';

const CreateBatch = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const preSelectedProduct = location.state?.selectedProduct;
  
  const [formData, setFormData] = useState({
    productId: preSelectedProduct?.id || '',
    productName: preSelectedProduct?.name || '',
    targetQuantity: '',
    unit: preSelectedProduct?.unit || '',
    priority: 'normal',
    notes: '',
    rawMaterials: preSelectedProduct?.materialRequirements?.map((req, index) => ({
      id: index + 1,
      materialId: req.materialId,
      materialName: req.materialName,
      quantity: '',
      unit: req.unit,
      notes: req.notes || '',
      quantityPerUnit: req.quantityPerUnit
    })) || []
  });
  const [products, setProducts] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [materialAvailability, setMaterialAvailability] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productData, materialData] = await Promise.all([
        productionService.getProductionProducts(),
        materialService.getRawMaterials()
      ]);
      
      setProducts(productData.filter(p => p.status === 'active'));
      setRawMaterials(materialData.filter(m => m.status === 'active'));
    } catch (error) {
      setError('Failed to load data');
    }
  };

  const checkMaterialAvailability = async (materials) => {
    try {
      const availability = {};
      for (const material of materials) {
        if (material.materialId && material.quantity) {
          const check = await productionStoreService.checkMaterialAvailability(
            material.materialId, 
            parseFloat(material.quantity)
          );
          availability[material.materialId] = check;
        }
      }
      setMaterialAvailability(availability);
    } catch (error) {
      console.error('Failed to check material availability:', error);
    }
  };

  useEffect(() => {
    if (formData.rawMaterials.length > 0) {
      checkMaterialAvailability(formData.rawMaterials);
    }
  }, [formData.rawMaterials]);

  const handleProductSelect = (productId) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setFormData(prev => ({
        ...prev,
        productId,
        productName: product.name,
        unit: product.unit || 'kg'
      }));
      
      // Auto-populate raw materials from product requirements
      if (product.materialRequirements && product.materialRequirements.length > 0) {
        const autoMaterials = product.materialRequirements.map((req, index) => ({
          id: index + 1,
          materialId: req.materialId,
          materialName: req.materialName,
          quantity: '', // User will fill based on batch size
          unit: req.unit,
          notes: req.notes || '',
          quantityPerUnit: req.quantityPerUnit // Store for calculation
        }));
        setFormData(prev => ({ ...prev, rawMaterials: autoMaterials }));
      }
    }
  };

  const handleBatchQuantityChange = (batchQuantity) => {
    if (formData.productId && batchQuantity && formData.rawMaterials.length > 0) {
      const updatedMaterials = formData.rawMaterials.map(material => ({
        ...material,
        quantity: material.quantityPerUnit ? 
          (parseFloat(material.quantityPerUnit) * parseFloat(batchQuantity)).toString() : 
          material.quantity
      }));
      setFormData(prev => ({ ...prev, rawMaterials: updatedMaterials }));
    }
  };

  const addRawMaterial = () => {
    setFormData(prev => ({
      ...prev,
      rawMaterials: [
        ...prev.rawMaterials,
        { materialId: '', materialName: '', quantity: '', unit: '', notes: '' }
      ]
    }));
  };

  const removeRawMaterial = (index) => {
    setFormData(prev => ({
      ...prev,
      rawMaterials: prev.rawMaterials.filter((_, i) => i !== index)
    }));
  };

  const updateRawMaterial = (index, field, value) => {
    const updatedMaterials = [...formData.rawMaterials];
    updatedMaterials[index] = { ...updatedMaterials[index], [field]: value };
    
    // Auto-fill material details when material is selected
    if (field === 'materialId') {
      const material = rawMaterials.find(m => m.id === value);
      if (material) {
        updatedMaterials[index].materialName = material.name;
        updatedMaterials[index].unit = material.unit;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      rawMaterials: updatedMaterials
    }));
    
    // Check availability when quantity or material changes
    if (field === 'quantity' || field === 'materialId') {
      setTimeout(() => checkMaterialAvailability(updatedMaterials), 100);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const batchData = {
        ...formData,
        targetQuantity: parseInt(formData.targetQuantity),
        rawMaterials: formData.rawMaterials.filter(material => 
          material.materialId && material.quantity
        ).map(material => ({
          ...material,
          quantity: parseInt(material.quantity)
        }))
      };
      
      await productionService.createBatch(batchData);
      navigate('/production/batches');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/production/batches')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Factory className="h-8 w-8 mr-3 text-blue-600" />
              Create Production Batch
            </h1>
            <p className="text-gray-600 mt-2">Start a new production batch with material requirements</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Batch Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product *
              </label>
              <select
                value={formData.productId}
                onChange={(e) => handleProductSelect(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select product</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Quantity *
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  min="1"
                  value={formData.targetQuantity}
                  onChange={(e) => {
                    const quantity = e.target.value;
                    setFormData(prev => ({ ...prev, targetQuantity: quantity }));
                    handleBatchQuantityChange(quantity);
                  }}
                  required
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter quantity"
                />
                <input
                  type="text"
                  value={formData.unit}
                  readOnly
                  className="w-16 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                />
              </div>
            </div>

            {formData.productId && (
              <div className="md:col-span-2">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Package className="h-5 w-5 text-green-600 mr-2" />
                    <div>
                      <p className="text-green-800 font-medium">Product Selected: {formData.productName}</p>
                      <p className="text-green-700 text-sm">
                        Material requirements have been auto-loaded. Adjust quantities as needed for your batch size.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Batch Notes
              </label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add any batch-specific notes or instructions..."
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Raw Material Requirements</h2>
            <button
              type="button"
              onClick={addRawMaterial}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Material</span>
            </button>
          </div>

          {formData.rawMaterials.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2">No raw materials added yet</p>
              <p className="text-sm">Click "Add Material" to specify material requirements</p>
            </div>
          ) : (
            <div className="space-y-4">
              {formData.rawMaterials.map((material, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-gray-900">Material {index + 1}</h3>
                    <button
                      type="button"
                      onClick={() => removeRawMaterial(index)}
                      className="text-red-600 hover:text-red-800 p-1 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Material *
                      </label>
                      <select
                        value={material.materialId}
                        onChange={(e) => updateRawMaterial(index, 'materialId', e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select material</option>
                        {rawMaterials.map(mat => (
                          <option key={mat.id} value={mat.id}>
                            {mat.name} ({mat.code})
                          </option>
                        ))}
                      </select>
                      {material.quantityPerUnit && (
                        <p className="text-xs text-gray-500 mt-1">
                          Formula: {material.quantityPerUnit} {material.unit} per production unit
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={material.quantity}
                        onChange={(e) => updateRawMaterial(index, 'quantity', e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter quantity"
                      />
                      {materialAvailability[material.materialId] && (
                        <div className="mt-1">
                          {materialAvailability[material.materialId].available ? (
                            <div className="flex items-center text-green-600 text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              <span>Available: {materialAvailability[material.materialId].currentStock} {material.unit}</span>
                            </div>
                          ) : (
                            <div className="flex items-center text-red-600 text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              <span>
                                {materialAvailability[material.materialId].status === 'not_in_store' 
                                  ? 'Not in production store' 
                                  : `Short: ${materialAvailability[material.materialId].shortfall} ${material.unit} (Available: ${materialAvailability[material.materialId].currentStock})`
                                }
                              </span>
                            </div>
                          )}
                        </div>
                      )}
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
                        Notes
                      </label>
                      <input
                        type="text"
                        value={material.notes}
                        onChange={(e) => updateRawMaterial(index, 'notes', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Optional notes"
                      />
                    </div>
                  </div>

                  {material.quantityPerUnit && formData.targetQuantity && (
                    <div className="mt-2 text-sm text-blue-600">
                      <span className="font-medium">Calculated:</span> {material.quantityPerUnit} × {formData.targetQuantity} = {(parseFloat(material.quantityPerUnit) * parseFloat(formData.targetQuantity)).toFixed(2)} {material.unit}
                    </div>
                  )}
                  
                  {materialAvailability[material.materialId] && !materialAvailability[material.materialId].available && (
                    <div className="mt-2 bg-red-50 border border-red-200 rounded p-2">
                      <div className="flex items-center text-red-800 text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        <span className="font-medium">Insufficient Stock</span>
                      </div>
                      <p className="text-red-700 text-xs mt-1">
                        {materialAvailability[material.materialId].status === 'not_in_store' 
                          ? 'Material not available in production store. Request from warehouse first.'
                          : `Need ${materialAvailability[material.materialId].shortfall} ${material.unit} more. Available: ${materialAvailability[material.materialId].currentStock} ${material.unit}`
                        }
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate('/production/raw-material-requests')}
                        className="mt-1 text-red-600 hover:text-red-800 text-xs underline"
                      >
                        Request from warehouse →
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Material Availability Warning */}
        {Object.values(materialAvailability).some(avail => !avail.available) && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
              <div>
                <p className="text-yellow-800 font-medium">Material Availability Warning</p>
                <p className="text-yellow-700 text-sm">
                  Some materials have insufficient stock in production store. Please request materials from warehouse before creating this batch.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/production/batches')}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || Object.values(materialAvailability).some(avail => !avail.available)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>{loading ? 'Creating...' : 'Create Batch'}</span>
          </button>
        </div>
        
        {Object.values(materialAvailability).some(avail => !avail.available) && (
          <div className="mt-2 text-center">
            <p className="text-sm text-red-600">
              Cannot create batch: Insufficient materials in production store
            </p>
          </div>
        )}
      </form>
    </div>
  );
};

export default CreateBatch;