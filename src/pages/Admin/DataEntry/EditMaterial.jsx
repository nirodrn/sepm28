import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Package2, Save, ArrowLeft } from 'lucide-react';
import { materialService } from '../../../services/materialService';
import LoadingSpinner from '../../../components/Common/LoadingSpinner';

const EditMaterial = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const materialType = searchParams.get('type');
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: materialType || 'raw',
    category: '',
    description: '',
    unit: 'kg',
    reorderLevel: '',
    maxStockLevel: '',
    storageConditions: '',
    qualityParameters: '',
    status: 'active'
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const materialTypes = [
    { value: 'raw', label: 'Raw Material' },
    { value: 'packing', label: 'Packing Material' }
  ];

  const rawMaterialCategories = [
    'Primary Ingredient',
    'Secondary Ingredient',
    'Additive',
    'Preservative',
    'Flavoring',
    'Coloring'
  ];

  const packingMaterialCategories = [
    'Primary Packaging',
    'Secondary Packaging',
    'Labels',
    'Sealing Materials',
    'Protective Materials'
  ];

  const units = ['kg', 'g', 'L', 'mL', 'pieces', 'rolls', 'sheets', 'meters'];

  useEffect(() => {
    if (id) {
      loadMaterialData();
    }
  }, [id]);

  const loadMaterialData = async () => {
    try {
      setLoading(true);
      let material = null;
      
      if (materialType === 'raw') {
        const rawMaterials = await materialService.getRawMaterials();
        material = rawMaterials.find(m => m.id === id);
      } else {
        const packingMaterials = await materialService.getPackingMaterials();
        material = packingMaterials.find(m => m.id === id);
      }
      
      if (material) {
        setFormData({
          name: material.name || '',
          code: material.code || '',
          type: materialType || 'raw',
          category: material.category || '',
          description: material.description || '',
          unit: material.unit || 'kg',
          reorderLevel: material.reorderLevel || '',
          maxStockLevel: material.maxStockLevel || '',
          storageConditions: material.storageConditions || '',
          qualityParameters: material.qualityParameters || '',
          status: material.status || 'active'
        });
      } else {
        setError('Material not found');
      }
    } catch (error) {
      setError('Failed to load material data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'type' && { category: '' })
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      if (formData.type === 'raw') {
        await materialService.updateRawMaterial(id, formData);
      } else {
        await materialService.updatePackingMaterial(id, formData);
      }
      
      setSuccess('Material updated successfully!');
      
      setTimeout(() => {
        navigate('/admin/materials');
      }, 2000);
    } catch (error) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getCategories = () => {
    return formData.type === 'raw' ? rawMaterialCategories : packingMaterialCategories;
  };

  if (loading) {
    return <LoadingSpinner text="Loading material data..." />;
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/admin/materials')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Package2 className="h-8 w-8 mr-3 text-green-600" />
              Edit Material
            </h1>
            <p className="text-gray-600 mt-2">Update material information and specifications</p>
          </div>
        </div>
      </div>

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-green-800 font-medium">{success}</p>
              <p className="text-green-600 text-sm">Redirecting to material list...</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Material Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Enter material name"
              />
            </div>

            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                Material Code *
              </label>
              <input
                type="text"
                id="code"
                name="code"
                required
                value={formData.code}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Enter material code"
              />
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                Material Type *
              </label>
              <select
                id="type"
                name="type"
                required
                value={formData.type}
                onChange={handleChange}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
              >
                {materialTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">Material type cannot be changed after creation</p>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Select category</option>
                {getCategories().map(category => (
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                {units.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="reorderLevel" className="block text-sm font-medium text-gray-700 mb-2">
                Reorder Level
              </label>
              <input
                type="number"
                id="reorderLevel"
                name="reorderLevel"
                value={formData.reorderLevel}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Enter reorder level"
              />
            </div>

            <div>
              <label htmlFor="maxStockLevel" className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Stock Level
              </label>
              <input
                type="number"
                id="maxStockLevel"
                name="maxStockLevel"
                value={formData.maxStockLevel}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Enter maximum stock level"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Enter material description"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Enter quality parameters and specifications"
              />
            </div>
          </div>

          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="mt-8 flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/admin/materials')}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>{submitting ? 'Updating...' : 'Update Material'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditMaterial;