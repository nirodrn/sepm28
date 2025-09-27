import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  User,
  Calendar,
  Package
} from 'lucide-react';
import { packingMaterialRequestService } from '../../../services/packingMaterialRequestService';
import { supplierService } from '../../../services/supplierService';
import { userService } from '../../../services/userService';
import { purchasePreparationService } from '../../../services/purchasePreparationService';
import { updateData, getData } from '../../../firebase/db';
import LoadingSpinner from '../../../components/Common/LoadingSpinner';
import ErrorMessage from '../../../components/Common/ErrorMessage';
import jsPDF from 'jspdf';

const PackingMaterialSupplierAllocation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [requestData, setRequestData] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load request data
      const requests = await packingMaterialRequestService.getPackingMaterialRequests();
      const request = requests.find(r => r.id === id);
      
      if (!request) {
        throw new Error('Request not found');
      }

      // Get user name for requested by
      if (request.requestedBy) {
        try {
          const userData = await userService.getUserById(request.requestedBy);
          request.requestedByName = userData?.name || userData?.email || 'Unknown User';
        } catch (err) {
          request.requestedByName = 'Unknown User';
        }
      }

      setRequestData(request);

      // Load suppliers
      const suppliersData = await supplierService.getSuppliers();
      const activeSuppliers = suppliersData.filter(supplier => supplier.status === 'active');
      setSuppliers(activeSuppliers);

      // Initialize allocations for each material
      const materials = request.materials || request.items || [];
      const initialAllocations = materials.map(item => ({
        materialId: item.materialId,
        materialName: item.materialName,
        requestedQuantity: item.requestedQuantity || item.quantity,
        unit: item.unit,
        suppliers: []
      }));

      // Load existing preparations for this request
      try {
        const existingPreparations = await purchasePreparationService.getPurchasePreparations();
        const requestPreparations = existingPreparations.filter(prep => prep.requestId === id);

        // Populate existing allocations from preparations
        if (requestPreparations.length > 0) {
          requestPreparations.forEach(prep => {
            const materialIndex = initialAllocations.findIndex(alloc => alloc.materialId === prep.materialId);
            if (materialIndex !== -1) {
              const existingSupplier = initialAllocations[materialIndex].suppliers.find(s => s.supplierId === prep.supplierId);
              if (!existingSupplier) {
                initialAllocations[materialIndex].suppliers.push({
                  preparationId: prep.id,
                  supplierId: prep.supplierId,
                  supplierName: prep.supplierName || '',
                  quantity: prep.requiredQuantity || 0,
                  unitPrice: prep.unitPrice || 0,
                  deliveryDate: prep.expectedDeliveryDate ? new Date(prep.expectedDeliveryDate).toISOString().split('T')[0] : '',
                  notes: prep.notes || ''
                });
              }
            }
          });
        }
      } catch (prepError) {
        console.warn('Could not load existing preparations:', prepError.message);
      }

      setAllocations(initialAllocations);

    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const addSupplierToMaterial = (materialIndex) => {
    const newAllocations = [...allocations];
    newAllocations[materialIndex].suppliers.push({
      supplierId: '',
      supplierName: '',
      quantity: 0,
      unitPrice: 0,
      deliveryDate: '',
      notes: ''
    });
    setAllocations(newAllocations);
  };

  const removeSupplierFromMaterial = (materialIndex, supplierIndex) => {
    const newAllocations = [...allocations];
    newAllocations[materialIndex].suppliers.splice(supplierIndex, 1);
    setAllocations(newAllocations);
  };

  const updateSupplierAllocation = (materialIndex, supplierIndex, field, value) => {
    const newAllocations = [...allocations];
    newAllocations[materialIndex].suppliers[supplierIndex][field] = value;
    
    // Update supplier name when supplier is selected
    if (field === 'supplierId') {
      const supplier = suppliers.find(s => s.id === value);
      newAllocations[materialIndex].suppliers[supplierIndex].supplierName = supplier?.name || '';
    }
    
    setAllocations(newAllocations);
  };

  const getTotalAllocated = (materialIndex) => {
    return allocations[materialIndex]?.suppliers.reduce((total, supplier) => {
      return total + (parseFloat(supplier.quantity) || 0);
    }, 0) || 0;
  };

  const getRemainingQuantity = (materialIndex) => {
    const requested = allocations[materialIndex]?.requestedQuantity || 0;
    const allocated = getTotalAllocated(materialIndex);
    return requested - allocated;
  };

  const getTotalValue = () => {
    return allocations.reduce((total, material) => {
      return total + material.suppliers.reduce((materialTotal, supplier) => {
        return materialTotal + ((parseFloat(supplier.quantity) || 0) * (parseFloat(supplier.unitPrice) || 0));
      }, 0);
    }, 0);
  };

  const getMaxQuantityForSupplier = (materialIndex, supplierIndex) => {
    const remaining = getRemainingQuantity(materialIndex);
    const currentQuantity = parseFloat(allocations[materialIndex]?.suppliers[supplierIndex]?.quantity) || 0;
    return remaining + currentQuantity;
  };

  const isValidAllocation = () => {
    if (allocations.length === 0) return true;
    
    return allocations.every(material => {
      const materialIndex = allocations.indexOf(material);
      const totalAllocated = getTotalAllocated(materialIndex);
      const isOverAllocated = totalAllocated > material.requestedQuantity;
      return !isOverAllocated;
    });
  };

  const hasAnyCompleteAllocation = () => {
    return allocations.some(material => 
      material.suppliers.some(supplier => 
        supplier.supplierId && supplier.quantity > 0 && supplier.unitPrice > 0 && supplier.deliveryDate
      )
    );
  };

  const handleSaveAllocations = async () => {
    try {
      setSaving(true);
      setError('');

      // Validate that we have at least one valid supplier allocation
      const hasValidAllocations = allocations.some(material => 
        material.suppliers.some(supplier => 
          supplier.supplierId && supplier.quantity > 0 && supplier.unitPrice > 0 && supplier.deliveryDate
        )
      );

      if (!hasValidAllocations) {
        throw new Error('Please add at least one complete supplier allocation');
      }

      // Create purchase preparations and POs for each valid allocation
      const createdPOs = [];
      
      for (const material of allocations) {
        for (const supplier of material.suppliers) {
          if (supplier.supplierId && supplier.quantity > 0 && supplier.unitPrice > 0 && supplier.deliveryDate) {
            try {
              await purchasePreparationService.createOrUpdatePreparationForAllocation(
                id,
                'packing_material',
                {
                  materialId: material.materialId,
                  materialName: material.materialName,
                  unit: material.unit,
                  mdApprovedAt: requestData.mdApprovedAt,
                  mdApprovedBy: requestData.mdApprovedBy
                },
                supplier
              );
              createdPOs.push({ materialName: material.materialName, supplierName: supplier.supplierName });
            } catch (error) {
              console.error('Error creating PO for supplier allocation:', error);
              throw new Error(`Failed to create PO for ${supplier.supplierName}: ${error.message}`);
            }
          }
        }
      }
      
      // Update request status
      await updateData(`packingMaterialRequests/${id}`, {
        status: 'supplier_allocated',
        allocatedAt: Date.now(),
        updatedAt: Date.now()
      });

      // Generate PDFs
      const allocationData = {
        id: requestData.id,
        materialName: requestData.items?.[0]?.materialName || 'Multiple Materials',
        allocations: allocations.map(material => ({
          materialId: material.materialId,
          materialName: material.materialName,
          requestedQuantity: material.requestedQuantity,
          unit: material.unit,
          suppliers: material.suppliers.filter(s => s.supplierId && s.quantity > 0)
        })).filter(material => material.suppliers.length > 0)
      };
      
      generateSupplierPDFs(allocationData);

      setSuccess(`Supplier allocations saved successfully! ${createdPOs.length} Purchase Orders created and PDFs generated.`);
      
      setTimeout(() => {
        navigate('/warehouse/packing-materials/requests');
      }, 2000);

    } catch (err) {
      console.error('Error saving allocations:', err);
      setError('Failed to save allocations: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const generateSupplierPDFs = (allocationData) => {
    // Create a PDF for each unique supplier across all materials
    const supplierAllocations = new Map();
    
    allocationData.allocations.forEach(material => {
      material.suppliers.forEach(supplier => {
        const key = supplier.supplierId;
        if (!supplierAllocations.has(key)) {
          supplierAllocations.set(key, {
            supplierId: supplier.supplierId,
            supplierName: supplier.supplierName,
            materials: []
          });
        }
        
        supplierAllocations.get(key).materials.push({
          materialName: material.materialName,
          quantity: supplier.quantity,
          unit: material.unit,
          unitPrice: supplier.unitPrice,
          totalCost: supplier.quantity * supplier.unitPrice,
          deliveryDate: supplier.deliveryDate,
          notes: supplier.notes
        });
      });
    });
    
    // Generate PDF for each supplier
    supplierAllocations.forEach((supplierData, supplierId) => {
      generateSupplierPDF(supplierData, allocationData);
    });
  };

  const generateSupplierPDF = (supplierData, allocationData) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;
    
    // Document border
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.rect(margin, margin, pageWidth - 2*margin, pageHeight - 2*margin);
    
    // Company Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Sewanagala Ayurvedic Drugs Manufacture Pvt Ltd', pageWidth / 2, 30, { align: 'center' });
    
    // Document Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('PURCHASE ORDER / SUPPLIER ALLOCATION', pageWidth / 2, 45, { align: 'center' });
    
    // Supplier Information Box
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(margin + 5, 55, pageWidth - 2*margin - 10, 35);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('SUPPLIER INFORMATION', margin + 10, 65);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Supplier Name: ${supplierData.supplierName}`, margin + 10, 73);
    doc.text(`Supplier ID: ${supplierData.supplierId}`, margin + 10, 80);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - 60, 73);
    doc.text(`PO Number: PO-${Date.now().toString().slice(-8)}`, pageWidth - 60, 80);
    
    // Request Information
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('REQUEST DETAILS', margin + 5, 105);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Request ID: ${requestData?.id?.slice(-8) || 'N/A'}`, margin + 5, 115);
    doc.text(`Type: Packing Material Request`, margin + 5, 123);
    doc.text(`Request Date: ${requestData?.createdAt ? new Date(requestData.createdAt).toLocaleDateString() : 'N/A'}`, margin + 5, 131);
    
    if (requestData?.mdApprovedAt) {
      doc.text(`MD Approved: ${new Date(requestData.mdApprovedAt).toLocaleDateString()}`, pageWidth - 80, 115);
    }
    if (requestData?.hoApprovedAt) {
      doc.text(`HO Approved: ${new Date(requestData.hoApprovedAt).toLocaleDateString()}`, pageWidth - 80, 123);
    }
    
    let yPosition = 150;
    
    // Materials Table Header
    doc.setFont('helvetica', 'bold');
    doc.text('MATERIALS TO BE SUPPLIED', margin + 5, yPosition);
    yPosition += 10;
    
    // Table headers
    doc.setFontSize(10);
    doc.text('Material Name', margin + 5, yPosition);
    doc.text('Qty', margin + 70, yPosition);
    doc.text('Unit Price', margin + 95, yPosition);
    doc.text('Total', margin + 130, yPosition);
    doc.text('Delivery', margin + 160, yPosition);
    
    // Table header line
    doc.setLineWidth(0.3);
    doc.line(margin + 5, yPosition + 2, margin + 185, yPosition + 2);
    yPosition += 10;
    
    let grandTotal = 0;
    
    // Material rows
    doc.setFont('helvetica', 'normal');
    supplierData.materials.forEach(material => {
      // Truncate long material names
      const materialName = material.materialName.length > 25 ? 
        material.materialName.substring(0, 22) + '...' : material.materialName;
      
      doc.text(materialName, margin + 5, yPosition);
      doc.text(`${material.quantity} ${material.unit}`, margin + 70, yPosition);
      doc.text(`${material.unitPrice.toLocaleString()}`, margin + 95, yPosition);
      doc.text(`${material.totalCost.toLocaleString()}`, margin + 130, yPosition);
      doc.text(material.deliveryDate || 'TBD', margin + 160, yPosition);
      
      grandTotal += material.totalCost;
      yPosition += 8;
      
      if (material.notes) {
        doc.setFontSize(9);
        doc.text(`Notes: ${material.notes}`, margin + 10, yPosition);
        yPosition += 6;
        doc.setFontSize(10);
      }
      
      if (yPosition > pageHeight - 80) {
        doc.addPage();
        yPosition = margin + 20;
      }
    });
    
    // Total line
    doc.setLineWidth(0.3);
    doc.line(margin + 5, yPosition + 2, margin + 185, yPosition + 2);
    yPosition += 10;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`TOTAL ORDER VALUE: LKR ${grandTotal.toLocaleString()}`, margin + 130, yPosition);
    yPosition += 25;
    
    // Terms and Conditions
    doc.setFont('helvetica', 'bold');
    doc.text('TERMS & CONDITIONS:', margin + 5, yPosition);
    yPosition += 8;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const terms = [
      '1. Delivery must be made as per the specified delivery date',
      '2. All materials must meet quality specifications',
      '3. Payment terms: Net 30 days from delivery',
      '4. Supplier must provide quality certificates',
      '5. Any delays must be communicated immediately'
    ];
    
    terms.forEach(term => {
      doc.text(term, margin + 10, yPosition);
      yPosition += 6;
    });
    
    yPosition += 15;
    
    // Authorization Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('AUTHORIZATION', margin + 5, yPosition);
    yPosition += 10;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    
    // Single authorization box
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(margin + 5, yPosition, pageWidth - 2*margin - 10, 40);
    
    doc.text('Authorized by (Procurement Manager):', margin + 10, yPosition + 8);
    doc.text('Name: _________________________________', margin + 10, yPosition + 18);
    doc.text('Signature: ____________________________', margin + 10, yPosition + 26);
    doc.text('Date: __________________________________', margin + 10, yPosition + 34);
    
    doc.text('Company Seal:', pageWidth - 80, yPosition + 18);
    doc.rect(pageWidth - 75, yPosition + 22, 30, 15);
    
    yPosition += 50;
    
    // Footer
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on: ${new Date().toLocaleString()}`, margin + 5, pageHeight - 20);
    doc.text(`Document ID: PO-${supplierData.supplierId}-${Date.now().toString().slice(-6)}`, pageWidth / 2, pageHeight - 20, { align: 'center' });
    doc.text('This is a computer-generated document', pageWidth - margin - 5, pageHeight - 20, { align: 'right' });
    
    // Save the PDF
    const fileName = `purchase-order-${supplierData.supplierName.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now().toString().slice(-6)}.pdf`;
    doc.save(fileName);
  };

  if (loading) return <LoadingSpinner text="Loading request data..." />;
  if (error) return <ErrorMessage message={error} onRetry={loadData} />;
  if (!requestData) return <ErrorMessage message="Request not found" />;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/warehouse/packing-materials/requests')}
                  className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back to Requests
                </button>
                <div className="h-6 w-px bg-gray-300"></div>
                <h1 className="text-2xl font-bold text-gray-900">Packing Material Supplier Allocation</h1>
              </div>
              <button
                onClick={() => generateSupplierPDFs({
                  allocations: allocations.map(material => ({
                    ...material,
                    suppliers: material.suppliers.filter(s => s.supplierId && s.quantity > 0)
                  })).filter(material => material.suppliers.length > 0)
                })}
                disabled={!hasAnyCompleteAllocation()}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </button>
            </div>
          </div>

          {/* Success Message */}
          {success && (
            <div className="px-6 py-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span className="text-green-700">{success}</span>
                </div>
              </div>
            </div>
          )}

          {/* Request Info */}
          <div className="px-6 py-4 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Requested by</p>
                  <p className="font-medium">{requestData.requestedByName || 'Unknown User'}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Priority</p>
                  <p className="font-medium">{requestData.priority || 'Normal'}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Request Date</p>
                  <p className="font-medium">
                    {requestData.createdAt ? new Date(requestData.createdAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Package className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Total Value</p>
                  <p className="font-medium text-green-600">LKR {getTotalValue().toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} />
          </div>
        )}

        {/* Materials Allocation */}
        <div className="space-y-6">
          {allocations.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Materials Found</h3>
              <p className="text-gray-500">
                This request doesn't contain any materials to allocate.
              </p>
            </div>
          ) : (
            allocations.map((material, materialIndex) => {
              const totalAllocated = getTotalAllocated(materialIndex);
              const remaining = getRemainingQuantity(materialIndex);
              const isFullyAllocated = remaining === 0;
              const isOverAllocated = remaining < 0;

              return (
                <div key={material.materialId} className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{material.materialName}</h3>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                          <span>MD Approved: {material.requestedQuantity} {material.unit}</span>
                          <span>Allocated: {totalAllocated} {material.unit}</span>
                          <span className={`font-medium ${
                            isOverAllocated ? 'text-red-600' : 
                            isFullyAllocated ? 'text-green-600' : 'text-orange-600'
                          }`}>
                            Remaining: {remaining} {material.unit}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {isOverAllocated && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Over Allocated
                          </span>
                        )}
                        {isFullyAllocated && !isOverAllocated && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Fully Allocated
                          </span>
                        )}
                        {!isFullyAllocated && !isOverAllocated && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            <Clock className="w-3 h-3 mr-1" />
                            Partially Allocated
                          </span>
                        )}
                        <button
                          onClick={() => addSupplierToMaterial(materialIndex)}
                          className="flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Supplier
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    {material.suppliers.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>No suppliers allocated yet</p>
                        <p className="text-sm">Click "Add Supplier" to start allocation</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {material.suppliers.map((supplier, supplierIndex) => (
                          <div key={supplierIndex} className="border border-gray-200 rounded-lg p-4">
                            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Supplier *
                                </label>
                                <select
                                  value={supplier.supplierId}
                                  onChange={(e) => updateSupplierAllocation(materialIndex, supplierIndex, 'supplierId', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  required
                                >
                                  <option value="">Select Supplier</option>
                                  {suppliers.map(sup => (
                                    <option key={sup.id} value={sup.id}>{sup.name}</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Quantity ({material.unit}) *
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  max={getMaxQuantityForSupplier(materialIndex, supplierIndex)}
                                  step="0.01"
                                  value={supplier.quantity}
                                  onChange={(e) => updateSupplierAllocation(materialIndex, supplierIndex, 'quantity', parseFloat(e.target.value) || 0)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="0.00"
                                  required
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  Max: {getMaxQuantityForSupplier(materialIndex, supplierIndex)} {material.unit}
                                </p>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Unit Price (LKR) *
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={supplier.unitPrice}
                                  onChange={(e) => updateSupplierAllocation(materialIndex, supplierIndex, 'unitPrice', parseFloat(e.target.value) || 0)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="0.00"
                                  required
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Delivery Date *
                                </label>
                                <input
                                  type="date"
                                  value={supplier.deliveryDate}
                                  onChange={(e) => updateSupplierAllocation(materialIndex, supplierIndex, 'deliveryDate', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  required
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Total (LKR)
                                </label>
                                <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 font-medium">
                                  {((supplier.quantity || 0) * (supplier.unitPrice || 0)).toLocaleString()}
                                </div>
                              </div>

                              <div className="flex items-end">
                                <button
                                  type="button"
                                  onClick={() => removeSupplierFromMaterial(materialIndex, supplierIndex)}
                                  className="w-full flex items-center justify-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            <div className="mt-4">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Notes
                              </label>
                              <textarea
                                value={supplier.notes}
                                onChange={(e) => updateSupplierAllocation(materialIndex, supplierIndex, 'notes', e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Additional notes or requirements..."
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={() => navigate('/warehouse/packing-materials/requests')}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-600">Total Allocation Value</p>
              <p className="text-xl font-bold text-green-600">LKR {getTotalValue().toLocaleString()}</p>
            </div>
            
            <button
              onClick={handleSaveAllocations}
              disabled={!isValidAllocation() || saving || !hasAnyCompleteAllocation()}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {saving ? 'Saving...' : 'Save Allocations'}
            </button>
            
            <button
              onClick={() => generateSupplierPDFs({
                allocations: allocations.map(material => ({
                  ...material,
                  suppliers: material.suppliers.filter(s => s.supplierId && s.quantity > 0 && s.unitPrice > 0)
                })).filter(material => material.suppliers.length > 0)
              })}
              disabled={!allocations.some(material => material.suppliers.some(s => s.supplierId && s.quantity > 0 && s.unitPrice > 0))}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              Generate PDFs
            </button>
          </div>
        </div>

        {!isValidAllocation() && allocations.some(material => material.suppliers.length > 0) && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" />
              <div>
                <h4 className="text-sm font-medium text-yellow-800">Over Allocation Detected</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Some materials have been allocated more than the approved quantity. Please adjust the allocations.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PackingMaterialSupplierAllocation;