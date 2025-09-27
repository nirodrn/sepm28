import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ClipboardCheck, Save, ArrowLeft, Star, AlertTriangle, CheckCircle } from 'lucide-react';
import { purchasePreparationService } from '../../../services/purchasePreparationService';
import LoadingSpinner from '../../../components/Common/LoadingSpinner';

const DeliveryQCForm = () => {
  const navigate = useNavigate();
  const { deliveryId } = useParams();
  const location = useLocation();
  
  const [delivery, setDelivery] = useState(location.state?.delivery || null);
  const [preparation, setPreparation] = useState(location.state?.preparation || null);
  const [supplierGrade, setSupplierGrade] = useState(null);
  const [formData, setFormData] = useState({
    appearance: '',
    color: '',
    odor: '',
    texture: '',
    moistureContent: '',
    purityLevel: '',
    contaminants: '',
    dimensions: '',
    strength: '',
    printQuality: '',
    adhesion: '',
    defectRate: '',
    packagingCondition: 'good',
    overallGrade: 'A',
    acceptanceStatus: 'accepted',
    quantityAccepted: '',
    remarks: '',
    qcOfficer: '',
    qcDate: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(!delivery);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!delivery && deliveryId) {
      loadDeliveryData();
    } else if (delivery) {
      initializeForm();
    }
  }, [deliveryId, delivery]);

  const loadDeliveryData = async () => {
    try {
      setLoading(true);
      const { getData } = await import('../../../firebase/db');
      const deliveryData = await getData(`deliveries/${deliveryId}`);
      if (deliveryData) {
        setDelivery(deliveryData);
        
        // Load preparation data
        const preparations = await purchasePreparationService.getPurchasePreparations();
        const prep = preparations.find(p => p.id === deliveryData.preparationId);
        setPreparation(prep);
        
        await initializeForm(deliveryData);
      } else {
        setError('Delivery not found');
      }
    } catch (error) {
      setError('Failed to load delivery data');
    } finally {
      setLoading(false);
    }
  };

  const initializeForm = async (deliveryData = delivery) => {
    try {
      if (deliveryData?.supplierId) {
        const gradeInfo = await purchasePreparationService.getSupplierGrade(deliveryData.supplierId);
        setSupplierGrade(gradeInfo);
      }
      
      setFormData(prev => ({
        ...prev,
        quantityAccepted: deliveryData?.deliveredQuantity?.toString() || '',
        packagingCondition: deliveryData?.packagingCondition || 'good',
        qcOfficer: auth.currentUser?.displayName || auth.currentUser?.email || 'QC Officer'
      }));
    } catch (error) {
      console.error('Failed to initialize form:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-adjust accepted quantity based on acceptance status
    if (name === 'acceptanceStatus') {
      if (value === 'rejected') {
        setFormData(prev => ({ ...prev, quantityAccepted: '0' }));
      } else if (value === 'accepted' && delivery) {
        setFormData(prev => ({ ...prev, quantityAccepted: delivery.deliveredQuantity.toString() }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const qcData = {
        ...formData,
        quantityAccepted: parseInt(formData.quantityAccepted) || 0,
        defectRate: parseFloat(formData.defectRate) || 0,
        moistureContent: parseFloat(formData.moistureContent) || 0,
        purityLevel: parseFloat(formData.purityLevel) || 0
      };
      
      await purchasePreparationService.recordQCResults(deliveryId, qcData);
      navigate('/warehouse/purchase-preparation');
      
    } catch (error) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A': return 'bg-green-100 text-green-800';
      case 'B': return 'bg-blue-100 text-blue-800';
      case 'C': return 'bg-yellow-100 text-yellow-800';
      case 'D': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    return status === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getGradeStars = (grade) => {
    const gradePoints = { 'A': 4, 'B': 3, 'C': 2, 'D': 1 };
    const points = gradePoints[grade] || 0;
    
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < points ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  const isPackingMaterial = delivery?.materialType === 'packingMaterial';

  if (loading) {
    return <LoadingSpinner text="Loading delivery data..." />;
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/warehouse/purchase-preparation')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <ClipboardCheck className="h-8 w-8 mr-3 text-green-600" />
              Quality Control Form
            </h1>
            <p className="text-gray-600 mt-2">Record quality check results for delivered materials</p>
          </div>
        </div>
      </div>

      {/* Delivery Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <span className="text-blue-700 text-sm">Material:</span>
            <p className="font-medium text-blue-900">{delivery?.materialName}</p>
          </div>
          <div>
            <span className="text-blue-700 text-sm">Supplier:</span>
            <p className="font-medium text-blue-900">{delivery?.supplierName}</p>
          </div>
          <div>
            <span className="text-blue-700 text-sm">Delivered:</span>
            <p className="font-medium text-blue-900">{delivery?.deliveredQuantity} {delivery?.unit}</p>
          </div>
          <div>
            <span className="text-blue-700 text-sm">Batch:</span>
            <p className="font-medium text-blue-900">{delivery?.batchNumber}</p>
          </div>
        </div>
      </div>

      {/* Supplier Grade Display */}
      {supplierGrade && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Supplier Performance</h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              {supplierGrade.isNew ? (
                <span className="text-gray-500 text-sm">Not graded yet - This is their first delivery</span>
              ) : (
                <>
                  {getGradeStars(supplierGrade.grade)}
                  <span className={`text-sm font-medium ml-2 px-2 py-1 rounded-full ${getGradeColor(supplierGrade.grade)}`}>
                    Current Grade: {supplierGrade.grade}
                  </span>
                  <span className="text-sm text-gray-500">
                    ({supplierGrade.totalDeliveries} deliveries, avg: {supplierGrade.averagePoints?.toFixed(1)}/4.0)
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-4xl">
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

            {!isPackingMaterial && (
              <>
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
              </>
            )}

            {isPackingMaterial && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dimensions Accuracy
                  </label>
                  <input
                    type="text"
                    name="dimensions"
                    value={formData.dimensions}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Check dimensions accuracy"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Strength/Durability
                  </label>
                  <input
                    type="text"
                    name="strength"
                    value={formData.strength}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Assess material strength"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Print Quality
                  </label>
                  <input
                    type="text"
                    name="printQuality"
                    value={formData.printQuality}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Check print quality if applicable"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adhesion Quality
                  </label>
                  <input
                    type="text"
                    name="adhesion"
                    value={formData.adhesion}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Check adhesive properties if applicable"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Defect Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    name="defectRate"
                    value={formData.defectRate}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter defect percentage"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Quality Assessment</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Overall Grade *
              </label>
              <select
                name="overallGrade"
                value={formData.overallGrade}
                onChange={handleChange}
                required
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
                Acceptance Status *
              </label>
              <select
                name="acceptanceStatus"
                value={formData.acceptanceStatus}
                onChange={handleChange}
                required
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity Accepted *
              </label>
              <input
                type="number"
                name="quantityAccepted"
                value={formData.quantityAccepted}
                onChange={handleChange}
                required
                min="0"
                max={delivery?.deliveredQuantity}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Enter accepted quantity"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                QC Date *
              </label>
              <input
                type="date"
                name="qcDate"
                value={formData.qcDate}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                QC Officer *
              </label>
              <input
                type="text"
                name="qcOfficer"
                value={formData.qcOfficer}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Enter QC officer name"
              />
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
            onClick={() => navigate('/warehouse/purchase-preparation')}
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
            <span>{submitting ? 'Saving...' : 'Complete QC & Add to Inventory'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default DeliveryQCForm;