import { getData, setData, updateData, pushData } from '../firebase/db';
import { auth } from '../firebase/auth';

export const purchasePreparationService = {
  // Create purchase preparation entry after MD approval
  async createPurchasePreparation(requestData) {
    try {
      const currentUser = auth.currentUser;
      
      // Create entries for each material in the request
      const preparations = [];
      
      const materials = requestData.items || requestData.materials || [];
      for (const item of materials) {
        const preparation = {
          requestId: requestData.id,
          requestType: requestData.type || 'material', // 'material' or 'packing_material'
          materialId: item.materialId,
          materialName: item.materialName || item.name,
          requiredQuantity: item.requestedQuantity || item.quantity,
          unit: item.unit,
          urgency: item.urgency || 'normal',
          status: 'pending_supplier_assignment',
          createdBy: currentUser?.uid,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          mdApprovedAt: requestData.mdApprovedAt,
          mdApprovedBy: requestData.mdApprovedBy
        };
        
        const id = await pushData('purchasePreparations', preparation);
        preparations.push({ id, ...preparation });
      }
      
      return preparations;
    } catch (error) {
      throw new Error(`Failed to create purchase preparation: ${error.message}`);
    }
  },

  // Create or update preparation for allocation
  async createOrUpdatePreparationForAllocation(requestId, requestType, materialData, supplierAllocation) {
    try {
      const currentUser = auth.currentUser;
      
      // Check if preparation already exists for this request, material, and supplier
      const preparations = await getData('purchasePreparations');
      let existingPreparation = null;
      let preparationId = null;
      
      if (preparations) {
        const existingEntry = Object.entries(preparations).find(([id, prep]) => 
          prep.requestId === requestId && 
          prep.materialId === materialData.materialId && 
          prep.supplierId === supplierAllocation.supplierId
        );
        
        if (existingEntry) {
          preparationId = existingEntry[0];
          existingPreparation = existingEntry[1];
        }
      }
      
      const preparationData = {
        requestId,
        requestType,
        materialId: materialData.materialId,
        materialName: materialData.materialName,
        requiredQuantity: supplierAllocation.quantity,
        unit: materialData.unit,
        supplierId: supplierAllocation.supplierId,
        supplierName: supplierAllocation.supplierName,
        unitPrice: supplierAllocation.unitPrice,
        expectedDeliveryDate: supplierAllocation.deliveryDate,
        notes: supplierAllocation.notes || '',
        status: 'pending_supplier_assignment',
        createdBy: currentUser?.uid,
        updatedAt: Date.now(),
        mdApprovedAt: materialData.mdApprovedAt,
        mdApprovedBy: materialData.mdApprovedBy
      };
      
      if (existingPreparation) {
        // Update existing preparation
        await updateData(`purchasePreparations/${preparationId}`, preparationData);
      } else {
        // Create new preparation
        preparationData.createdAt = Date.now();
        preparationId = await pushData('purchasePreparations', preparationData);
      }
      
      // Now assign supplier to create PO
      await this.assignSupplier(preparationId, {
        supplierId: supplierAllocation.supplierId,
        supplierName: supplierAllocation.supplierName,
        unitPrice: supplierAllocation.unitPrice,
        expectedDeliveryDate: supplierAllocation.deliveryDate,
        notes: supplierAllocation.notes || ''
      });
      
      return { preparationId, ...preparationData };
    } catch (error) {
      throw new Error(`Failed to create/update preparation for allocation: ${error.message}`);
    }
  },

  // Get all purchase preparations
  async getPurchasePreparations(filters = {}) {
    try {
      const preparations = await getData('purchasePreparations');
      if (!preparations) return [];
      
      let filteredPreparations = Object.entries(preparations).map(([id, prep]) => ({
        id,
        ...prep
      }));

      if (filters.status) {
        filteredPreparations = filteredPreparations.filter(prep => prep.status === filters.status);
      }
      
      if (filters.requestType) {
        filteredPreparations = filteredPreparations.filter(prep => prep.requestType === filters.requestType);
      }

      return filteredPreparations.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      throw new Error(`Failed to fetch purchase preparations: ${error.message}`);
    }
  },

  // Assign supplier to material
  async assignSupplier(preparationId, supplierData) {
    try {
      const currentUser = auth.currentUser;
      const preparation = await getData(`purchasePreparations/${preparationId}`);
      
      if (!preparation) {
        throw new Error('Preparation not found');
      }
      
      const updates = {
        status: 'supplier_assigned',
        supplierId: supplierData.supplierId,
        supplierName: supplierData.supplierName,
        expectedDeliveryDate: supplierData.expectedDeliveryDate,
        unitPrice: supplierData.unitPrice || preparation.unitPrice || 0,
        totalCost: (supplierData.unitPrice || preparation.unitPrice || 0) * preparation.requiredQuantity,
        assignedBy: currentUser?.uid,
        assignedAt: Date.now(),
        updatedAt: Date.now()
      };
      
      await updateData(`purchasePreparations/${preparationId}`, updates);
      
      // Create PO entry
      await this.createPurchaseOrder(preparationId, supplierData);
      
      return updates;
    } catch (error) {
      throw new Error(`Failed to assign supplier: ${error.message}`);
    }
  },

  // Create purchase order
  async createPurchaseOrder(preparationId, supplierData) {
    try {
      const preparation = await getData(`purchasePreparations/${preparationId}`);
      if (!preparation) throw new Error('Preparation not found');
      
      const po = {
        preparationId,
        requestId: preparation.requestId,
        requestType: preparation.requestType,
        supplierId: supplierData.supplierId,
        supplierName: supplierData.supplierName,
        materialId: preparation.materialId,
        materialName: preparation.materialName,
        quantity: preparation.requiredQuantity || supplierData.quantity,
        unit: preparation.unit,
        unitPrice: preparation.unitPrice || supplierData.unitPrice || 0,
        totalCost: (preparation.unitPrice || supplierData.unitPrice || 0) * preparation.requiredQuantity,
        expectedDeliveryDate: supplierData.expectedDeliveryDate,
        status: 'issued',
        createdBy: auth.currentUser?.uid,
        createdAt: Date.now()
      };
      
      const id = await pushData('purchaseOrders', po);
      return { id, ...po };
    } catch (error) {
      throw new Error(`Failed to create purchase order: ${error.message}`);
    }
  },

  // Mark as delivered (triggers QC form)
  async markAsDelivered(preparationId, deliveryData) {
    try {
      const currentUser = auth.currentUser;
      const preparation = await getData(`purchasePreparations/${preparationId}`);
      
      if (!preparation) throw new Error('Preparation not found');
      
      const updates = {
        status: 'delivered_pending_qc',
        deliveredQuantity: deliveryData.deliveredQuantity,
        deliveryDate: deliveryData.deliveryDate,
        deliveredBy: currentUser?.uid,
        deliveredAt: Date.now(),
        updatedAt: Date.now(),
        batchNumber: deliveryData.batchNumber || `BATCH-${Date.now().toString().slice(-6)}`,
        packagingCondition: deliveryData.packagingCondition || 'good'
      };
      
      await updateData(`purchasePreparations/${preparationId}`, updates);
      
      // Create delivery record for QC
      const deliveryRecord = {
        preparationId,
        materialId: preparation.materialId,
        materialName: preparation.materialName,
        materialType: preparation.requestType === 'material' ? 'rawMaterial' : 'packingMaterial',
        supplierId: preparation.supplierId,
        supplierName: preparation.supplierName,
        deliveredQuantity: deliveryData.deliveredQuantity,
        unit: preparation.unit,
        deliveryDate: deliveryData.deliveryDate,
        batchNumber: updates.batchNumber,
        packagingCondition: updates.packagingCondition,
        status: 'pending_qc',
        createdBy: currentUser?.uid,
        createdAt: Date.now()
      };
      
      const deliveryId = await pushData('deliveries', deliveryRecord);
      
      return { preparationUpdates: updates, deliveryId, deliveryRecord };
    } catch (error) {
      throw new Error(`Failed to mark as delivered: ${error.message}`);
    }
  },

  // Record QC results and update supplier grade
  async recordQCResults(deliveryId, qcData) {
    try {
      const currentUser = auth.currentUser;
      const delivery = await getData(`deliveries/${deliveryId}`);
      
      if (!delivery) throw new Error('Delivery not found');
      
      // Record QC data
      const qcRecord = {
        deliveryId,
        preparationId: delivery.preparationId,
        materialId: delivery.materialId,
        materialName: delivery.materialName,
        materialType: delivery.materialType,
        supplierId: delivery.supplierId,
        supplierName: delivery.supplierName,
        ...qcData,
        qcOfficer: currentUser?.uid,
        qcOfficerName: currentUser?.displayName || currentUser?.email || 'QC Officer',
        qcDate: qcData.qcDate || Date.now(),
        createdAt: Date.now()
      };
      
      const qcId = await pushData('qcRecords', qcRecord);
      
      // Update delivery status
      await updateData(`deliveries/${deliveryId}`, {
        status: qcData.acceptanceStatus === 'accepted' ? 'qc_passed' : 'qc_failed',
        qcId,
        qcCompletedAt: Date.now(),
        qualityGrade: qcData.overallGrade,
        acceptanceStatus: qcData.acceptanceStatus
      });
      
      // Update preparation status
      const preparationStatus = qcData.acceptanceStatus === 'accepted' ? 'completed' : 'qc_failed';
      await updateData(`purchasePreparations/${delivery.preparationId}`, {
        status: preparationStatus,
        qcId,
        qcCompletedAt: Date.now(),
        finalQuantity: qcData.acceptanceStatus === 'accepted' ? qcData.quantityAccepted || delivery.deliveredQuantity : 0,
        updatedAt: Date.now()
      });
      
      // Update supplier grade
      await this.updateSupplierGrade(delivery.supplierId, qcData.overallGrade);
      
      // Add to inventory if accepted
      if (qcData.acceptanceStatus === 'accepted') {
        await this.addToInventory(delivery, qcData);
      }
      
      return { qcId, ...qcRecord };
    } catch (error) {
      throw new Error(`Failed to record QC results: ${error.message}`);
    }
  },

  // Update supplier grade based on QC results
  async updateSupplierGrade(supplierId, newGrade) {
    try {
      // Get all QC records for this supplier
      const qcRecords = await getData('qcRecords');
      if (!qcRecords) return;
      
      const supplierQCRecords = Object.values(qcRecords).filter(qc => qc.supplierId === supplierId);
      
      // Calculate average grade
      const gradePoints = { 'A': 4, 'B': 3, 'C': 2, 'D': 1 };
      const totalPoints = supplierQCRecords.reduce((sum, qc) => sum + (gradePoints[qc.overallGrade] || 0), 0);
      const averagePoints = totalPoints / supplierQCRecords.length;
      
      // Convert back to letter grade
      let averageGrade = 'D';
      if (averagePoints >= 3.5) averageGrade = 'A';
      else if (averagePoints >= 2.5) averageGrade = 'B';
      else if (averagePoints >= 1.5) averageGrade = 'C';
      
      // Update supplier record
      await updateData(`suppliers/${supplierId}`, {
        currentGrade: averageGrade,
        averageGradePoints: averagePoints,
        totalDeliveries: supplierQCRecords.length,
        lastDeliveryGrade: newGrade,
        lastGradeUpdate: Date.now(),
        updatedAt: Date.now()
      });
      
      return { averageGrade, averagePoints, totalDeliveries: supplierQCRecords.length };
    } catch (error) {
      throw new Error(`Failed to update supplier grade: ${error.message}`);
    }
  },

  // Add materials to inventory after QC approval
  async addToInventory(delivery, qcData) {
    try {
      const inventoryPath = delivery.materialType === 'rawMaterial' ? 'rawMaterialsInventory' : 'packingMaterialsInventory';
      const materialPath = delivery.materialType === 'rawMaterial' ? 'rawMaterials' : 'packingMaterials';
      const stockPath = `${inventoryPath}/${delivery.materialId}`;
      const mainMaterialPath = `${materialPath}/${delivery.materialId}`;
      
      const currentStock = await getData(stockPath);
      const quantityToAdd = Number(qcData.quantityAccepted || delivery.deliveredQuantity) || 0;
      
      if (currentStock) {
        // Update existing stock
        const existingQuantity = Number(currentStock.quantity) || 0;
        await updateData(stockPath, {
          quantity: existingQuantity + quantityToAdd,
          lastReceived: Date.now(),
          lastSupplier: delivery.supplierId,
          lastQualityGrade: qcData.overallGrade,
          lastBatchNumber: delivery.batchNumber,
          updatedAt: Date.now()
        });
      } else {
        // Create new stock entry
        await setData(stockPath, {
          materialId: delivery.materialId,
          materialName: delivery.materialName,
          quantity: quantityToAdd,
          unit: delivery.unit,
          lastReceived: Date.now(),
          lastSupplier: delivery.supplierId,
          lastQualityGrade: qcData.overallGrade,
          lastBatchNumber: delivery.batchNumber,
          createdAt: Date.now(),
          createdBy: auth.currentUser?.uid
        });
      }
      
      // Update the main material record's currentStock
      const mainMaterial = await getData(mainMaterialPath);
      if (mainMaterial) {
        const mainCurrentStock = Number(mainMaterial.currentStock) || 0;
        await updateData(mainMaterialPath, {
          currentStock: mainCurrentStock + quantityToAdd,
          lastReceived: Date.now(),
          lastSupplier: delivery.supplierId,
          lastQualityGrade: qcData.overallGrade,
          lastBatchNumber: delivery.batchNumber,
          updatedAt: Date.now()
        });
      }
      
      // Record stock movement
      await pushData('stockMovements', {
        materialId: delivery.materialId,
        materialType: delivery.materialType,
        type: 'in',
        quantity: quantityToAdd,
        reason: `QC Approved - Supplier Delivery`,
        supplierId: delivery.supplierId,
        batchNumber: delivery.batchNumber,
        qcGrade: qcData.overallGrade,
        createdBy: auth.currentUser?.uid,
        createdAt: Date.now()
      });
      
    } catch (error) {
      throw new Error(`Failed to add to inventory: ${error.message}`);
    }
  },

  // Get supplier grade information
  async getSupplierGrade(supplierId) {
    try {
      const supplier = await getData(`suppliers/${supplierId}`);
      if (!supplier) return { grade: 'Not graded yet', isNew: true };
      
      return {
        grade: supplier.currentGrade || 'Not graded yet',
        averagePoints: supplier.averageGradePoints || 0,
        totalDeliveries: supplier.totalDeliveries || 0,
        lastDeliveryGrade: supplier.lastDeliveryGrade || null,
        isNew: !supplier.currentGrade
      };
    } catch (error) {
      throw new Error(`Failed to get supplier grade: ${error.message}`);
    }
  },

  // Get purchase preparation by ID
  async getById(preparationId) {
    try {
      const preparation = await getData(`purchasePreparations/${preparationId}`);
      if (!preparation) {
        throw new Error('Purchase preparation not found');
      }
      return { id: preparationId, ...preparation };
    } catch (error) {
      throw new Error(`Failed to fetch purchase preparation: ${error.message}`);
    }
  },

  // Generate allocation PDF
  generateAllocationPDF(preparationData, allocations) {
    const totalValue = allocations.reduce((sum, allocation) => {
      const qty = parseInt(allocation.quantity) || 0;
      const price = parseFloat(allocation.unitPrice) || 0;
      return sum + (qty * price);
    }, 0);

    const pdfContent = `
SUPPLIER ALLOCATION DOCUMENT
============================

Material: ${preparationData.materialName}
Required Quantity: ${preparationData.requiredQuantity} ${preparationData.unit}
Request Type: ${preparationData.requestType === 'material' ? 'Raw Material' : 'Packing Material'}
Date: ${new Date().toLocaleDateString()}
Generated by: ${auth.currentUser?.displayName || auth.currentUser?.email || 'Warehouse Staff'}

SUPPLIER ALLOCATIONS:
${allocations.map((allocation, index) => `
Supplier ${index + 1}: ${allocation.supplierName}
Allocated Quantity: ${allocation.quantity} ${preparationData.unit}
Unit Price: $${allocation.unitPrice}
Total Cost: $${(parseFloat(allocation.unitPrice) * parseInt(allocation.quantity)).toFixed(2)}
Expected Delivery: ${allocation.deliveryDate}
Notes: ${allocation.notes || 'None'}
`).join('\n')}

SUMMARY:
Total Allocated Quantity: ${allocations.reduce((sum, a) => sum + (parseInt(a.quantity) || 0), 0)} ${preparationData.unit}
Total Estimated Cost: $${totalValue.toFixed(2)}
Number of Suppliers: ${allocations.length}

Generated on: ${new Date().toLocaleString()}
Document ID: ALLOC-${preparationData.id?.slice(-6) || Date.now().toString().slice(-6)}
    `;
    
    const blob = new Blob([pdfContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supplier-allocation-${preparationData.materialName?.replace(/\s+/g, '-')}-${Date.now().toString().slice(-6)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};