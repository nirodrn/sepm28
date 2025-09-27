import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Save, ArrowLeft, Star, CheckCircle, XCircle, AlertTriangle, FileText, TruckIcon, X, ClipboardCheck } from 'lucide-react';
import { grnService } from '../../../services/grnService';
import { purchaseOrderService } from '../../../services/purchaseOrderService';
import { supplierService } from '../../../services/supplierService';
import { inventoryService } from '../../../services/inventoryService';
import { getData, updateData } from '../../../firebase/db';
import { auth } from '../../../firebase/auth';
import LoadingSpinner from '../../../components/Common/LoadingSpinner';

const CreateGRN = () => {
  const navigate = useNavigate();
  const [issuedPOs, setIssuedPOs] = useState([]);
  const [selectedPO, setSelectedPO] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [formData, setFormData] = useState({
    grnNumber: '',
    deliveryDate: new Date().toISOString().split('T')[0],
    items: [],
    remarks: '',
    totalAmount: 0
  });
  const [showQualityModal, setShowQualityModal] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
    generateGRNNumber();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pos, supplierData] = await Promise.all([
        purchaseOrderService.getPOs({ status: 'issued' }),
        supplierService.getSuppliers()
      ]);
      
      setIssuedPOs(pos);
      setSuppliers(supplierData);
    } catch (error) {
      setError('Failed to load data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateGRNNumber = async () => {
    try {
      const grnNumber = await grnService.generateGRNNumber();
      setFormData(prev => ({ ...prev, grnNumber }));
    } catch (error) {
      const fallbackNumber = `GRN${new Date().getFullYear()}${String(Date.now()).slice(-4)}`;
      setFormData(prev => ({ ...prev, grnNumber: fallbackNumber }));
    }
  };

  const generateBatchNumber = async () => {
    try {
      const batches = await getData('productionBatches');
      const count = batches ? Object.keys(batches).length : 0;
      const year = new Date().getFullYear();
      const productCode = 'PROD'; // Default product code
      return `BATCH-${productCode}-${year}-${String(count + 1).padStart(4, '0')}`;
    } catch (error) {
      return `BATCH-${Date.now().toString().slice(-8)}`;
    }
  };

  const handlePOSelection = (po) => {
    setSelectedPO(po);
    
    // Create GRN items from PO
    const grnItems = [{
      materialId: po.materialId,
      materialName: po.materialName,
      materialType: po.requestType,
      orderedQuantity: Number(po.quantity || 0),
      deliveredQuantity: Number(po.quantity || 0),
      deliveredQty: Number(po.quantity || 0), // Add both field names for compatibility
      unit: po.unit,
      unitPrice: Number(po.unitPrice || 0),
      totalPrice: Number(po.totalCost || 0),
      qualityGrade: 'A',
      condition: 'good',
      qcRemarks: ''
    }];
    
    setFormData(prev => ({
      ...prev,
      items: grnItems,
      totalAmount: Number(po.totalCost || 0)
    }));
  };

  const openQualityModal = (index) => {
    setSelectedItemIndex(index);
    setShowQualityModal(true);
  };

  const closeQualityModal = () => {
    setShowQualityModal(false);
    setSelectedItemIndex(null);
  };

  const saveQualityAssessment = (qualityData) => {
    if (selectedItemIndex !== null) {
      handleItemChange(selectedItemIndex, 'qualityGrade', qualityData.grade);
      handleItemChange(selectedItemIndex, 'condition', qualityData.condition);
      handleItemChange(selectedItemIndex, 'qcRemarks', qualityData.remarks);
    }
    closeQualityModal();
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    const numericValue = ['deliveredQuantity', 'deliveredQty', 'unitPrice', 'orderedQuantity'].includes(field) 
      ? Number(value) || 0 
      : value;
    
    updatedItems[index] = { ...updatedItems[index], [field]: numericValue };
    
    // Ensure both field names are updated for quantity
    if (field === 'deliveredQuantity') {
      updatedItems[index].deliveredQty = numericValue;
    } else if (field === 'deliveredQty') {
      updatedItems[index].deliveredQuantity = numericValue;
    }
    
    // Recalculate total price for the item
    if (field === 'deliveredQuantity' || field === 'unitPrice') {
      const quantity = field === 'deliveredQuantity' ? numericValue : Number(updatedItems[index].deliveredQuantity || 0);
      const price = field === 'unitPrice' ? numericValue : Number(updatedItems[index].unitPrice || 0);
      updatedItems[index].totalPrice = quantity * price;
    }
    
    // Recalculate total amount
    const totalAmount = updatedItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    
    setFormData(prev => ({
      ...prev,
      items: updatedItems,
      totalAmount
    }));
  };

  const updateSupplierGrade = async (supplierId, qualityGrade) => {
    try {
      // Get current supplier data
      const supplier = await getData(`suppliers/${supplierId}`);
      if (!supplier) return;
      
      // Get all existing QC records for this supplier
      const qcRecords = await getData('qcRecords');
      const supplierQCRecords = qcRecords ? 
        Object.values(qcRecords).filter(qc => qc.supplierId === supplierId) : [];
      
      // Add new grade
      const gradePoints = { 'A': 4, 'B': 3, 'C': 2, 'D': 1 };
      const newGradePoint = gradePoints[qualityGrade] || 1;
      
      // Calculate new average
      const totalPoints = supplierQCRecords.reduce((sum, qc) => {
        return sum + (gradePoints[qc.overallGrade] || 1);
      }, 0) + newGradePoint;
      
      const totalDeliveries = supplierQCRecords.length + 1;
      const averagePoints = totalPoints / totalDeliveries;
      
      // Convert back to letter grade
      let averageGrade = 'D';
      if (averagePoints >= 3.5) averageGrade = 'A';
      else if (averagePoints >= 2.5) averageGrade = 'B';
      else if (averagePoints >= 1.5) averageGrade = 'C';
      
      // Update supplier record
      await updateData(`suppliers/${supplierId}`, {
        currentGrade: averageGrade,
        averageGradePoints: averagePoints,
        totalDeliveries: totalDeliveries,
        lastDeliveryGrade: qualityGrade,
        lastGradeUpdate: Date.now(),
        updatedAt: Date.now()
      });
      
    } catch (error) {
      console.error('Error updating supplier grade:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedPO) {
      setError('Please select a purchase order');
      return;
    }
    
    if (formData.items.length === 0) {
      setError('Please add at least one item');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      // Create GRN
      const grnData = {
        ...formData,
        poId: selectedPO.id,
        poNumber: selectedPO.poNumber || `PO-${selectedPO.id.slice(-6)}`,
        supplierId: selectedPO.supplierId,
        supplierName: getSupplierName(selectedPO.supplierId),
        status: 'completed'
      };

      const newGRN = await grnService.createGRN(grnData);

      // Update supplier grades for each item
      for (const item of formData.items) {
        if (item.qualityGrade && selectedPO.supplierId) {
          await updateSupplierGrade(selectedPO.supplierId, item.qualityGrade);
        }
        
        // Note: Stock levels will be updated when invoice is created from this GRN
        // This prevents double stock updates
      }

      // Update PO status
      await updateData(`purchaseOrders/${selectedPO.id}`, {
        status: 'fully_received',
        grnId: newGRN.id,
        receivedDate: Date.now(),
        updatedAt: Date.now()
      });

      navigate('/warehouse/goods-receipts');
    } catch (error) {
      setError('Failed to create GRN: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getSupplierName = (supplierId) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier ? supplier.name : 'Unknown Supplier';
  };

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A': return 'bg-green-100 text-green-800 border-green-300';
      case 'B': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'C': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'D': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getConditionColor = (condition) => {
    return condition === 'good' 
      ? 'bg-green-100 text-green-800 border-green-300' 
      : 'bg-red-100 text-red-800 border-red-300';
  };

  const getGradeStars = (grade) => {
    const gradePoints = { 'A': 4, 'B': 3, 'C': 2, 'D': 1 };
    const points = gradePoints[grade] || 0;
    
    return Array.from({ length: 4 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < points ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  if (loading) {
    return <LoadingSpinner text="Loading purchase orders..." />;
  }

  return (
    <div className="p-6">
      {/* Quality Assessment Modal */}
      {showQualityModal && selectedItemIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Quality Assessment</h3>
              <button
                onClick={closeQualityModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="mb-4">
              <h4 className="font-medium text-gray-900 mb-2">
                {formData.items[selectedItemIndex]?.materialName}
              </h4>
              <p className="text-sm text-gray-600">
                Delivered: {formData.items[selectedItemIndex]?.deliveredQuantity} {formData.items[selectedItemIndex]?.unit}
              </p>
            </div>

            <QualityAssessmentForm
              initialData={{
                grade: formData.items[selectedItemIndex]?.qualityGrade || 'A',
                condition: formData.items[selectedItemIndex]?.condition || 'good',
                remarks: formData.items[selectedItemIndex]?.qcRemarks || ''
              }}
              onSave={saveQualityAssessment}
              onCancel={closeQualityModal}
            />
          </div>
        </div>
      )}

      <div className="mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/warehouse/goods-receipts')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Package className="h-8 w-8 mr-3 text-green-600" />
              Create Goods Receipt Note (GRN)
            </h1>
            <p className="text-gray-600 mt-2">Record receipt of materials and assess quality</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-6xl">
        {/* GRN Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">GRN Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GRN Number
              </label>
              <input
                type="text"
                value={formData.grnNumber}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Date *
              </label>
              <input
                type="date"
                value={formData.deliveryDate}
                onChange={(e) => setFormData(prev => ({ ...prev, deliveryDate: e.target.value }))}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>
        </div>

        {/* Purchase Order Selection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Select Purchase Order</h2>
          
          {issuedPOs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No issued purchase orders</h3>
              <p className="mt-1 text-sm text-gray-500">
                No purchase orders are available for goods receipt.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {issuedPOs.map((po) => (
                <div
                  key={po.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedPO?.id === po.id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => handlePOSelection(po)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <input
                        type="radio"
                        checked={selectedPO?.id === po.id}
                        onChange={() => handlePOSelection(po)}
                        className="h-4 w-4 text-green-600 focus:ring-green-500"
                      />
                      <div>
                        <div className="flex items-center space-x-3">
                          <span className="font-medium text-gray-900">
                            PO #{po.poNumber || `PO-${po.id.slice(-6)}`}
                          </span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            po.requestType === 'material' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {po.requestType === 'material' ? 'Raw Material' : 'Packing Material'}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-gray-600">
                          <span className="font-medium">Material:</span> {po.materialName}
                        </div>
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Supplier:</span> {getSupplierName(po.supplierId)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        LKR {(po.totalCost || 0).toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {po.quantity} {po.unit} @ LKR {(po.unitPrice || 0).toFixed(2)}/{po.unit}
                      </div>
                      <div className="text-sm text-gray-500">
                        Expected: {po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString() : 'Not set'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Quality Assessment Button */}
                  {selectedPO?.id === po.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => openQualityModal(0)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                      >
                        <ClipboardCheck className="h-4 w-4" />
                        <span>Quality Assessment & Grading</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected PO Items Table */}
        {selectedPO && formData.items.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Quality Assessment & Grading</h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Material
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ordered Qty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Delivered Qty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quality Grade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Condition
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      QC Remarks
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {formData.items.map((item, index) => {
                    const variance = {
                      quantity: item.deliveredQuantity - item.orderedQuantity,
                      variancePercent: item.orderedQuantity > 0 ? 
                        ((item.deliveredQuantity - item.orderedQuantity) / item.orderedQuantity) * 100 : 0
                    };

                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.materialName}</div>
                            <div className="text-sm text-gray-500">{item.materialType === 'material' ? 'Raw Material' : 'Packing Material'}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{item.orderedQuantity} {item.unit}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            value={item.deliveredQuantity}
                            onChange={(e) => handleItemChange(index, 'deliveredQuantity', parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            min="0"
                            step="0.01"
                          />
                          <span className="ml-1 text-sm text-gray-500">{item.unit}</span>
                          {variance.quantity !== 0 && (
                            <div className={`mt-1 text-xs px-2 py-1 rounded ${
                              Math.abs(variance.variancePercent) > 5
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {variance.quantity > 0 ? '+' : ''}{variance.quantity.toFixed(1)} 
                              ({variance.variancePercent > 0 ? '+' : ''}{variance.variancePercent.toFixed(1)}%)
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            min="0"
                            step="0.01"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            LKR {(item.totalPrice || 0).toFixed(2)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-1">
                            {['A', 'B', 'C', 'D'].map((grade) => (
                              <button
                                key={grade}
                                type="button"
                                onClick={() => handleItemChange(index, 'qualityGrade', grade)}
                                className={`px-2 py-1 text-xs font-medium rounded border transition-colors ${
                                  item.qualityGrade === grade
                                    ? getGradeColor(grade)
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {grade}
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center mt-1">
                            {getGradeStars(item.qualityGrade)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-1">
                            <button
                              type="button"
                              onClick={() => handleItemChange(index, 'condition', 'good')}
                              className={`flex items-center px-2 py-1 text-xs font-medium rounded border transition-colors ${
                                item.condition === 'good'
                                  ? getConditionColor('good')
                                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Good
                            </button>
                            <button
                              type="button"
                              onClick={() => handleItemChange(index, 'condition', 'damaged')}
                              className={`flex items-center px-2 py-1 text-xs font-medium rounded border transition-colors ${
                                item.condition === 'damaged'
                                  ? getConditionColor('damaged')
                                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Damaged
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <textarea
                            value={item.qcRemarks}
                            onChange={(e) => handleItemChange(index, 'qcRemarks', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            rows="2"
                            placeholder="QC remarks..."
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Supplier Grade Info */}
            {selectedPO && (
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-blue-900">Supplier: {getSupplierName(selectedPO.supplierId)}</h4>
                    <p className="text-blue-700 text-sm">
                      Quality grades will automatically update supplier's average rating
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-blue-900 font-medium">
                      Current Grade: {suppliers.find(s => s.id === selectedPO.supplierId)?.currentGrade || 'Not graded'}
                    </div>
                    <div className="text-blue-700 text-sm">
                      Total Deliveries: {suppliers.find(s => s.id === selectedPO.supplierId)?.totalDeliveries || 0}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Additional Remarks */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Additional Information</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              General Remarks
            </label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="Enter any additional remarks about the delivery..."
            />
          </div>
        </div>

        {/* Summary */}
        {formData.items.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">GRN Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex justify-between">
                <span className="text-gray-700">Total Items:</span>
                <span className="font-medium text-gray-900">{formData.items.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Total Quantity:</span>
                <span className="font-medium text-gray-900">
                  {formData.items.reduce((sum, item) => sum + (item.deliveredQuantity || 0), 0)} units
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Total Amount:</span>
                <span className="text-xl font-bold text-green-600">
                  LKR {formData.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/warehouse/goods-receipts')}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !selectedPO || formData.items.length === 0}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>{submitting ? 'Creating GRN...' : 'Create GRN'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

// Quality Assessment Form Component
const QualityAssessmentForm = ({ initialData, onSave, onCancel }) => {
  const [formData, setFormData] = useState(initialData);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A': return 'bg-green-100 text-green-800 border-green-300';
      case 'B': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'C': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'D': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getConditionColor = (condition) => {
    return condition === 'good' 
      ? 'bg-green-100 text-green-800 border-green-300' 
      : 'bg-red-100 text-red-800 border-red-300';
  };

  const getGradeStars = (grade) => {
    const gradePoints = { 'A': 4, 'B': 3, 'C': 2, 'D': 1 };
    const points = gradePoints[grade] || 0;
    
    return Array.from({ length: 4 }, (_, i) => (
      <Star
        key={i}
        className={`h-5 w-5 ${i < points ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Quality Grade *
        </label>
        <div className="flex space-x-2 mb-3">
          {['A', 'B', 'C', 'D'].map((grade) => (
            <button
              key={grade}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, grade }))}
              className={`px-4 py-2 text-sm font-medium rounded border-2 transition-colors ${
                formData.grade === grade
                  ? getGradeColor(grade)
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Grade {grade}
            </button>
          ))}
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Rating:</span>
          <div className="flex items-center">
            {getGradeStars(formData.grade)}
          </div>
          <span className="text-sm text-gray-600">
            ({formData.grade === 'A' ? 'Excellent' : formData.grade === 'B' ? 'Good' : formData.grade === 'C' ? 'Acceptable' : 'Poor'})
          </span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Condition *
        </label>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, condition: 'good' }))}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded border-2 transition-colors ${
              formData.condition === 'good'
                ? getConditionColor('good')
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Good Condition
          </button>
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, condition: 'damaged' }))}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded border-2 transition-colors ${
              formData.condition === 'damaged'
                ? getConditionColor('damaged')
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Damaged
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          QC Remarks
        </label>
        <textarea
          value={formData.remarks}
          onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          placeholder="Enter quality check remarks..."
        />
      </div>

      <div className="flex items-center justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          Save Assessment
        </button>
      </div>
    </form>
  );
};

export default CreateGRN;