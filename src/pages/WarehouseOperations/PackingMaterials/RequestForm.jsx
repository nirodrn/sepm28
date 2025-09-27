import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Minus, Send, ArrowLeft } from 'lucide-react';
import { packingMaterialRequestService } from '../../../services/packingMaterialRequestService';
import { materialService } from '../../../services/materialService';
import { useAuth } from '../../../hooks/useAuth';
import LoadingSpinner from '../../../components/Common/LoadingSpinner';
import ErrorMessage from '../../../components/Common/ErrorMessage';

const RequestForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [materials, setMaterials] = useState([]);
  const [selectedMaterials, setSelectedMaterials] = useState([{
    materialId: '',
    materialName: '',
    requestedQuantity: '',
    unit: '',
    urgency: 'normal'
  }]);
  const [formData, setFormData] = useState({
    reasonForRequest: '',
    additionalNotes: ''
  });

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const packingMaterials = await materialService.getPackingMaterials();
      setMaterials(packingMaterials);
    } catch (error) {
      console.error('Error fetching materials:', error);
      setError('Failed to load materials');
    }
  };

  const handleMaterialChange = (index, field, value) => {
    const updatedMaterials = [...selectedMaterials];
    updatedMaterials[index][field] = value;

    if (field === 'materialId') {
      const selectedMaterial = materials.find(m => m.id === value);
      if (selectedMaterial) {
        updatedMaterials[index].materialName = selectedMaterial.name;
        updatedMaterials[index].unit = selectedMaterial.unit;
      }
    }

    setSelectedMaterials(updatedMaterials);
  };

  const addMaterial = () => {
    setSelectedMaterials([...selectedMaterials, {
      materialId: '',
      materialName: '',
      requestedQuantity: '',
      unit: '',
      urgency: 'normal'
    }]);
  };

  const removeMaterial = (index) => {
    if (selectedMaterials.length > 1) {
      const updatedMaterials = selectedMaterials.filter((_, i) => i !== index);
      setSelectedMaterials(updatedMaterials);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate required fields
      const validMaterials = selectedMaterials.filter(material => 
        material.materialId && material.requestedQuantity > 0
      );

      if (validMaterials.length === 0) {
        throw new Error('Please select at least one material with quantity');
      }

      const requestData = {
        materials: validMaterials,
        reasonForRequest: formData.reasonForRequest || '',
        additionalNotes: formData.additionalNotes || '',
        requestedBy: user.uid,
        requestedByName: user.displayName || user.email,
        department: 'warehouse_operations',
        status: 'pending_ho_approval',
        priority: validMaterials.some(m => m.urgency === 'urgent') ? 'urgent' : 'normal',
        createdAt: new Date().toISOString()
      };

      await packingMaterialRequestService.createPackingMaterialRequest(requestData);
      navigate('/warehouse-operations/packing-materials');
    } catch (error) {
      console.error('Error submitting request:', error);
      setError(error.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => navigate('/warehouse-operations/packing-materials')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h1 className="text-2xl font-bold text-gray-900">Request Packing Materials</h1>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && <ErrorMessage message={error} />}

            {/* Materials Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Materials Required *</h3>
                <button
                  type="button"
                  onClick={addMaterial}
                  className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Material</span>
                </button>
              </div>

              {selectedMaterials.map((material, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">Material {index + 1}</h4>
                    {selectedMaterials.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMaterial(index)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Material *
                      </label>
                      <select
                        value={material.materialId}
                        onChange={(e) => handleMaterialChange(index, 'materialId', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">Select Material</option>
                        {materials.map(mat => (
                          <option key={mat.id} value={mat.id}>
                            {mat.name} ({mat.unit})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        value={material.requestedQuantity}
                        onChange={(e) => handleMaterialChange(index, 'requestedQuantity', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter quantity"
                        min="1"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Urgency
                      </label>
                      <select
                        value={material.urgency}
                        onChange={(e) => handleMaterialChange(index, 'urgency', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="normal">Normal</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Reason for Request */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Request
              </label>
              <textarea
                value={formData.reasonForRequest}
                onChange={(e) => setFormData({...formData, reasonForRequest: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
                placeholder="Explain why these materials are needed..."
              />
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                value={formData.additionalNotes}
                onChange={(e) => setFormData({...formData, additionalNotes: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
                placeholder="Add any additional information for the Store Manager..."
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/warehouse-operations/packing-materials')}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>{loading ? 'Submitting...' : 'Submit Request'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RequestForm;