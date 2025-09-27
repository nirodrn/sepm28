import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Save, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { productionService } from '../../services/productionService';
import { materialService } from '../../services/materialService';

const CreateProductionProduct = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: '',
    description: '',
    unit: 'kg',
    shelfLife: '',
    storageConditions: '',
    qualityParameters: '',
    status: 'active',
    materialRequirements: []
  });
  const [availableMaterials, setAvailableMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const categories = [
    'Finished Product',
    'Semi-Finished Product',
    'By-Product',
    'Specialty Product'
  ];

  const units = ['kg', 'g', 'L', 'mL', 'pieces', 'boxes'];

  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = async () => {
    try {
      const materials = await materialService.getRawMaterials();
      setAvailableMaterials(materials.filter(m => m.status === 'active'));
    } catch (error) {
      setError('Failed to load materials');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addMaterialRequirement = () => {
    setFormData(prev => ({
      ...prev,
      materialRequirements: [
        ...prev.materialRequirements,
        { materialId: '', materialName: '', quantityPerUnit: '', unit: '', notes: '' }
      ]
    }));
  };

  const removeMaterialRequirement = (index) => {
    setFormData(prev => ({
      ...prev,
      materialRequirements: prev.materialRequirements.filter((_, i) => i !== index)
    }));
  };

  const updateMaterialRequirement = (index, field, value) => {
    const updatedRequirements = [...formData.materialRequirements];
    updatedRequirements[index] = { ...updatedRequirements[index], [field]: value };
    
    // Auto-fill material details when material is selected
    if (field === 'materialId') {
      const material = availableMaterials.find(m => m.id === value);
      if (material) {
        updatedRequirements[index].materialName = material.name;
        updatedRequirements[index].unit = material.unit;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      materialRequirements: updatedRequirements
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const productData = {
        ...formData,
        materialRequirements: formData.materialRequirements.filter(req => 
          req.materialId && req.quantityPerUnit
        ).map(req => ({
          ...req,
          quantityPerUnit: parseFloat(req.quantityPerUnit)
        }))
      };
      
      await productionService.createProductionProduct(productData);
      navigate('/production/products');
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
            onClick={() => navigate('/production/products')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Package className="h-8 w-8 mr-3 text-blue-600" />
              Create Production Product
            </h1>
            <p className="text-gray-600 mt-2">Create a new product with material requirements</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-6xl">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Product Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Product Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter product name"
              />
            </div>

            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                Product Code *
              </label>
              <input
                type="text"
                id="code"
                name="code"
                required
                value={formData.code}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter product code"
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                id="category"
                name="category"
                required
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select category</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-2">
                Unit *
              </label>
              <select
                id="unit"
                name="unit"
                required
                value={formData.unit}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {units.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="shelfLife" className="block text-sm font-medium text-gray-700 mb-2">
                Shelf Life (days)
              </label>
              <input
                type="number"
                id="shelfLife"
                name="shelfLife"
                value={formData.shelfLife}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter shelf life in days"
              />
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="discontinued">Discontinued</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter product description"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="storageConditions" className="block text-sm font-medium text-gray-700 mb-2">
                Storage Conditions
              </label>
              <textarea
                id="storageConditions"
                name="storageConditions"
                rows={2}
                value={formData.storageConditions}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter storage conditions"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="qualityParameters" className="block text-sm font-medium text-gray-700 mb-2">
                Quality Parameters
              </label>
              <textarea
                id="qualityParameters"
                name="qualityParameters"
                rows={2}
                value={formData.qualityParameters}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter quality parameters and specifications"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Material Requirements</h2>
            <button
              type="button"
              onClick={addMaterialRequirement}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Material</span>
            </button>
          </div>

          {formData.materialRequirements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2">No material requirements added yet</p>
              <p className="text-sm">Click "Add Material" to specify what materials are needed for this product</p>
            </div>
          ) : (
            <div className="space-y-4">
              {formData.materialRequirements.map((requirement, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-gray-900">Material {index + 1}</h3>
                    <button
                      type="button"
                      onClick={() => removeMaterialRequirement(index)}
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
                        value={requirement.materialId}
                        onChange={(e) => updateMaterialRequirement(index, 'materialId', e.target.value)}
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
                        Quantity per Unit *
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={requirement.quantityPerUnit}
                        onChange={(e) => updateMaterialRequirement(index, 'quantityPerUnit', e.target.value)}
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
                        value={requirement.unit}
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
                        value={requirement.notes}
                        onChange={(e) => updateMaterialRequirement(index, 'notes', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Optional notes"
                      />
                    </div>
                  </div>
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

        <div className="flex items-center justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/production/products')}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>{loading ? 'Creating...' : 'Create Product'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateProductionProduct;