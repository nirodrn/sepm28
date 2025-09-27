import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ClipboardCheck, Save, ArrowLeft, AlertTriangle, CheckCircle } from 'lucide-react';
import { inventoryService } from '../../../services/inventoryService';
import { materialService } from '../../../services/materialService';

const RawMaterialQCForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [materialData, setMaterialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    materialName: '',
    batchNumber: '',
    supplier: '',
    deliveryDate: '',
    quantityReceived: '',
    unit: '',
    appearance: '',
    color: '',
    odor: '',
    texture: '',
    moistureContent: '',
    purityLevel: '',
    contaminants: '',
    overallGrade: 'A',
    acceptanceStatus: 'accepted',
    remarks: '',
    qcOfficer: 'John Doe',
    qcDate: new Date().toISOString().split('T')[0]
  });

  React.useEffect(() => {
    if (id) {
      loadMaterialData();
    }
  }, [id]);

  const loadMaterialData = async () => {
    try {
      const materials = await materialService.getRawMaterials();
      const material = materials.find(m => m.id === id);
      
      if (material) {
        setMaterialData(material);
        setFormData(prev => ({
          ...prev,
          materialName: material.name,
          batchNumber: `${material.code}-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
          supplier: material.supplier,
          deliveryDate: new Date().toISOString().split('T')[0],
          quantityReceived: '',
          unit: material.unit
        }));
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
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const qcData = {
        materialId: id,
        materialType: 'rawMaterial',
        ...formData,
        quantityReceived: parseInt(formData.quantityReceived)
      };
      
      await inventoryService.recordQCData(qcData);
      
      // Record stock movement if accepted
      if (formData.acceptanceStatus === 'accepted') {
        await inventoryService.recordStockMovement({
          materialId: id,
          materialType: 'rawMaterial',
          type: 'in',
          quantity: parseInt(formData.quantityReceived),
          reason: `QC Approved - Batch ${formData.batchNumber}`,
          batchNumber: formData.batchNumber,
          supplier: formData.supplier
        });
      }
      
      navigate('/warehouse/raw-materials');
    } catch (error) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getGradeColor = (grade) => {
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

  const getStatusColor = (status) => {
    return status === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/warehouse/raw-materials')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <ClipboardCheck className="h-8 w-8 mr-3 text-green-600" />
              Quality Control Form
            </h1>
            <p className="text-gray-600 mt-2">Record quality check results for raw materials</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Material Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Material Name
              </label>
              <input
                type="text"
                name="materialName"
                value={formData.materialName}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Batch Number
              </label>
              <input
                type="text"
                name="batchNumber"
                value={formData.batchNumber}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Supplier
              </label>
              <input
                type="text"
                name="supplier"
                value={formData.supplier}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Date
              </label>
              <input
                type="date"
                name="deliveryDate"
                value={formData.deliveryDate}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity Received
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  name="quantityReceived"
                  value={formData.quantityReceived}
                  onChange={handleChange}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                <input
                  type="text"
                  name="unit"
                  value={formData.unit}
                  readOnly
                  className="w-16 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                QC Date
              </label>
              <input
                type="date"
                name="qcDate"
                value={formData.qcDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Quality Parameters</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Appearance
              </label>
              <textarea
                name="appearance"
                rows={2}
                value={formData.appearance}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Describe the visual appearance..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <input
                type="text"
                name="color"
                value={formData.color}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Enter color description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Odor
              </label>
              <input
                type="text"
                name="odor"
                value={formData.odor}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Describe the odor"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Texture
              </label>
              <input
                type="text"
                name="texture"
                value={formData.texture}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Describe the texture"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Moisture Content (%)
              </label>
              <input
                type="number"
                step="0.1"
                name="moistureContent"
                value={formData.moistureContent}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Enter moisture percentage"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Purity Level (%)
              </label>
              <input
                type="number"
                step="0.1"
                name="purityLevel"
                value={formData.purityLevel}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Enter purity percentage"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contaminants Found
              </label>
              <textarea
                name="contaminants"
                rows={2}
                value={formData.contaminants}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="List any contaminants found or write 'None'"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Quality Assessment</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Overall Grade
              </label>
              <select
                name="overallGrade"
                value={formData.overallGrade}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="A">Grade A - Excellent</option>
                <option value="B">Grade B - Good</option>
                <option value="C">Grade C - Acceptable</option>
                <option value="D">Grade D - Poor</option>
              </select>
              <div className="mt-2">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getGradeColor(formData.overallGrade)}`}>
                  Grade {formData.overallGrade}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Acceptance Status
              </label>
              <select
                name="acceptanceStatus"
                value={formData.acceptanceStatus}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </select>
              <div className="mt-2">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(formData.acceptanceStatus)}`}>
                  {formData.acceptanceStatus === 'accepted' ? (
                    <><CheckCircle className="h-3 w-3 mr-1" /> Accepted</>
                  ) : (
                    <><AlertTriangle className="h-3 w-3 mr-1" /> Rejected</>
                  )}
                </span>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                QC Officer Remarks
              </label>
              <textarea
                name="remarks"
                rows={3}
                value={formData.remarks}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Add any additional remarks or observations..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                QC Officer
              </label>
              <input
                type="text"
                name="qcOfficer"
                value={formData.qcOfficer}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Enter QC officer name"
              />
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
            onClick={() => navigate('/warehouse/raw-materials')}
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
            <span>{submitting ? 'Saving...' : 'Save QC Results'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default RawMaterialQCForm;