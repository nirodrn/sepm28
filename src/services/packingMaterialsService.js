import { getData, setData, updateData, pushData } from '../firebase/db';
import { auth } from '../firebase/auth';

export const packingMaterialsService = {
  // Get all materials
  async getAllMaterials() {
    try {
      const materials = await getData('packingMaterials');
      if (!materials) return [];
      
      return Object.entries(materials).map(([id, material]) => ({
        id,
        ...material
      }));
    } catch (error) {
      throw new Error(`Failed to fetch materials: ${error.message}`);
    }
  },

  // Stock Management
  async getPackingMaterialsStock() {
    try {
      const stock = await getData('packingMaterialsStock');
      if (!stock) return [];
      
      return Object.entries(stock).map(([id, item]) => ({
        id,
        ...item
      }));
    } catch (error) {
      throw new Error(`Failed to fetch packing materials stock: ${error.message}`);
    }
  },

  async updateStock(materialId, quantity, operation = 'set') {
    try {
      const currentStock = await getData(`packingMaterialsStock/${materialId}`);
      // Ensure all values are valid numbers
      let newQuantity = Number(quantity) || 0;
      const existingQuantity = Number(currentStock?.quantity) || 0;
      
      if (operation === 'add') {
        newQuantity = existingQuantity + newQuantity;
      } else if (operation === 'subtract') {
        newQuantity = Math.max(0, existingQuantity - newQuantity);
      }
      
      const updates = {
        quantity: newQuantity,
        lastUpdated: Date.now(),
        updatedBy: auth.currentUser?.uid
      };
      
      await updateData(`packingMaterialsStock/${materialId}`, updates);
      
      // Also update the main material record
      const mainMaterial = await getData(`packingMaterials/${materialId}`);
      if (mainMaterial) {
        await updateData(`packingMaterials/${materialId}`, {
          currentStock: newQuantity,
          lastUpdated: Date.now(),
          updatedBy: auth.currentUser?.uid
        });
      }
      
      return updates;
    } catch (error) {
      throw new Error(`Failed to update stock: ${error.message}`);
    }
  },

  // Internal Requests (Packing Area to Store Manager)
  async createInternalRequest(requestData) {
    try {
      const request = {
        ...requestData,
        type: 'internal',
        status: 'pending',
        requestedBy: auth.currentUser?.uid,
        requestedFrom: 'packing_area',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      const id = await pushData('packingMaterialRequests', request);
      
      // Notify store manager
      await this.notifyStoreManager(id, request);
      
      return { id, ...request };
    } catch (error) {
      throw new Error(`Failed to create internal request: ${error.message}`);
    }
  },

  async getInternalRequests(filters = {}) {
    try {
      const requests = await getData('packingMaterialRequests');
      if (!requests) return [];
      
      let filteredRequests = Object.entries(requests)
        .filter(([_, req]) => req.type === 'internal')
        .map(([id, request]) => ({ id, ...request }));

      if (filters.status) {
        filteredRequests = filteredRequests.filter(req => req.status === filters.status);
      }
      
      if (filters.requestedBy) {
        filteredRequests = filteredRequests.filter(req => req.requestedBy === filters.requestedBy);
      }

      return filteredRequests.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      throw new Error(`Failed to fetch internal requests: ${error.message}`);
    }
  },

  async updateInternalRequestStatus(requestId, status, notes = '') {
    try {
      const updates = {
        status,
        statusNotes: notes,
        updatedAt: Date.now(),
        updatedBy: auth.currentUser?.uid
      };
      
      if (status === 'fulfilled') {
        updates.fulfilledAt = Date.now();
        updates.fulfilledBy = auth.currentUser?.uid;
      }
      
      await updateData(`packingMaterialRequests/${requestId}`, updates);
      
      // Notify requester about status change
      await this.notifyRequestStatus(requestId, status);
      
      return updates;
    } catch (error) {
      throw new Error(`Failed to update request status: ${error.message}`);
    }
  },

  // Dispatch to Packing Area
  async dispatchToPacking(dispatchData) {
    try {
      const dispatch = {
        ...dispatchData,
        dispatchedBy: auth.currentUser?.uid,
        dispatchedAt: Date.now(),
        status: 'dispatched'
      };
      
      const id = await pushData('packingMaterialDispatches', dispatch);
      
      // Update stock levels
      for (const item of dispatchData.items) {
        await this.updateStock(item.materialId, item.quantity, 'subtract');
        
        // Record stock movement
        await this.recordStockMovement({
          materialId: item.materialId,
          type: 'out',
          quantity: item.quantity,
          reason: `Dispatched to Packing Area - ${dispatch.destination}`,
          reference: id,
          batchNumber: item.batchNumber || null
        });
      }
      
      // Update internal request status if linked
      if (dispatchData.requestId) {
        await this.updateInternalRequestStatus(dispatchData.requestId, 'fulfilled', 
          `Dispatched ${dispatchData.items.length} items to ${dispatch.destination}`);
      }
      
      return { id, ...dispatch };
    } catch (error) {
      throw new Error(`Failed to dispatch materials: ${error.message}`);
    }
  },

  async getDispatches(filters = {}) {
    try {
      const dispatches = await getData('packingMaterialDispatches');
      if (!dispatches) return [];
      
      let filteredDispatches = Object.entries(dispatches).map(([id, dispatch]) => ({
        id,
        ...dispatch
      }));

      if (filters.destination) {
        filteredDispatches = filteredDispatches.filter(d => d.destination === filters.destination);
      }

      if (filters.dateFrom) {
        filteredDispatches = filteredDispatches.filter(d => d.dispatchedAt >= filters.dateFrom);
      }

      return filteredDispatches.sort((a, b) => b.dispatchedAt - a.dispatchedAt);
    } catch (error) {
      throw new Error(`Failed to fetch dispatches: ${error.message}`);
    }
  },

  // Purchase Requests (Store Manager to HO)
  async createPurchaseRequest(requestData) {
    try {
      const currentUser = auth.currentUser;
      const request = {
        ...requestData,
        type: 'purchase',
        status: 'pending_ho',
        requestedBy: auth.currentUser?.uid,
        requestedByName: currentUser?.displayName || currentUser?.email || 'Packing Materials Store Manager',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      const id = await pushData('packingMaterialRequests', request);
      
      // Notify HO
      await this.notifyHeadOfOperations(id, request);
      
      return { id, ...request };
    } catch (error) {
      throw new Error(`Failed to create purchase request: ${error.message}`);
    }
  },

  async getPurchaseRequests(filters = {}) {
    try {
      const requests = await getData('packingMaterialRequests');
      if (!requests) return [];
      
      let filteredRequests = Object.entries(requests)
        .filter(([_, req]) => req.type === 'purchase')
        .map(([id, request]) => ({ id, ...request }));

      if (filters.status) {
        filteredRequests = filteredRequests.filter(req => req.status === filters.status);
      }

      if (filters.requestedBy) {
        filteredRequests = filteredRequests.filter(req => req.requestedBy === filters.requestedBy);
      }

      return filteredRequests.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      throw new Error(`Failed to fetch purchase requests: ${error.message}`);
    }
  },

  // HO Approval
  async approvePurchaseRequest(requestId, approvalData) {
    try {
      const updates = {
        status: 'approved',
        hoApprovedBy: auth.currentUser?.uid,
        hoApprovedAt: Date.now(),
        hoApprovalNotes: approvalData?.notes || '',
        updatedAt: Date.now()
      };
      
      await updateData(`packingMaterialRequests/${requestId}`, updates);
      
      // Notify warehouse staff that request is approved
      await this.notifyWarehouseStaff(requestId, 'approved');
      
      return updates;
    } catch (error) {
      throw new Error(`Failed to approve purchase request: ${error.message}`);
    }
  },

  async forwardPurchaseRequestToMD(requestId, forwardData) {
    try {
      // First check if HO has approved this request
      const request = await getData(`packingMaterialRequests/${requestId}`);
      if (!request || request.status !== 'approved') {
        throw new Error('Request must be approved by HO before forwarding to MD');
      }
      
      const updates = {
        status: 'forwarded_to_md',
        forwardedToMD: true,
        forwardedBy: auth.currentUser?.uid,
        forwardedAt: Date.now(),
        forwardComments: forwardData?.comments || '',
        updatedAt: Date.now()
      };
      
      await updateData(`packingMaterialRequests/${requestId}`, updates);
      
      // Notify MD
      await this.notifyMainDirector(requestId, 'packing_material_request');
      
      return updates;
    } catch (error) {
      throw new Error(`Failed to forward purchase request to MD: ${error.message}`);
    }
  },
  async rejectPurchaseRequest(requestId, rejectionData) {
    try {
      const updates = {
        status: 'rejected',
        rejectedBy: auth.currentUser?.uid,
        rejectedAt: Date.now(),
        rejectionReason: rejectionData.reason || '',
        updatedAt: Date.now()
      };
      
      await updateData(`packingMaterialRequests/${requestId}`, updates);
      
      // Notify store manager
      await this.notifyRequestStatus(requestId, 'rejected');
      
      return updates;
    } catch (error) {
      throw new Error(`Failed to reject purchase request: ${error.message}`);
    }
  },

  // MD Approval
  async mdApprovePurchaseRequest(requestId, approvalData) {
    try {
      // Check if request was forwarded by HO
      const request = await getData(`packingMaterialRequests/${requestId}`);
      if (!request || request.status !== 'forwarded_to_md') {
        throw new Error('Only requests forwarded by HO can be approved by MD');
      }
      
      const updates = {
        status: 'md_approved',
        mdApprovedBy: auth.currentUser?.uid,
        mdApprovedAt: Date.now(),
        mdApprovalNotes: approvalData.notes || '',
        updatedAt: Date.now()
      };
      
      await updateData(`packingMaterialRequests/${requestId}`, updates);
      
      // Notify warehouse staff
      await this.notifyWarehouseStaff(requestId, 'md_approved');
      // Also notify HO about MD decision
      await this.notifyHeadOfOperations(requestId, 'md_decision');
      
      return updates;
    } catch (error) {
      throw new Error(`Failed to MD approve purchase request: ${error.message}`);
    }
  },

  // Supplier Allocation (by Warehouse Staff)
  async createSupplierAllocation(allocationData) {
    try {
      const allocation = {
        ...allocationData,
        createdBy: auth.currentUser?.uid,
        createdAt: Date.now(),
        status: 'allocated'
      };
      
      const id = await pushData('packingMaterialAllocations', allocation);
      
      // Update request status
      await updateData(`packingMaterialRequests/${allocationData.requestId}`, {
        status: 'allocated',
        allocationId: id,
        allocatedAt: Date.now(),
        allocatedBy: auth.currentUser?.uid,
        updatedAt: Date.now()
      });
      
      return { id, ...allocation };
    } catch (error) {
      throw new Error(`Failed to create supplier allocation: ${error.message}`);
    }
  },

  async getSupplierAllocations(filters = {}) {
    try {
      const allocations = await getData('packingMaterialAllocations');
      if (!allocations) return [];
      
      let filteredAllocations = Object.entries(allocations).map(([id, allocation]) => ({
        id,
        ...allocation
      }));

      if (filters.requestId) {
        filteredAllocations = filteredAllocations.filter(alloc => alloc.requestId === filters.requestId);
      }

      if (filters.supplierId) {
        filteredAllocations = filteredAllocations.filter(alloc => 
          alloc.allocations?.some(a => a.supplierId === filters.supplierId)
        );
      }

      return filteredAllocations.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      throw new Error(`Failed to fetch supplier allocations: ${error.message}`);
    }
  },

  // Delivery & QC (by Warehouse Staff)
  async recordDelivery(deliveryData) {
    try {
      const delivery = {
        ...deliveryData,
        receivedBy: auth.currentUser?.uid,
        receivedAt: Date.now(),
        status: 'pending_qc'
      };
      
      const id = await pushData('packingMaterialDeliveries', delivery);
      
      return { id, ...delivery };
    } catch (error) {
      throw new Error(`Failed to record delivery: ${error.message}`);
    }
  },

  async recordQCData(qcData) {
    try {
      const qcRecord = {
        ...qcData,
        qcOfficer: auth.currentUser?.uid,
        qcDate: qcData.qcDate || Date.now(),
        createdAt: Date.now()
      };
      
      const id = await pushData('packingMaterialQC', qcRecord);
      
      // Update delivery status
      if (qcData.deliveryId) {
        await updateData(`packingMaterialDeliveries/${qcData.deliveryId}`, {
          status: qcData.acceptanceStatus === 'accepted' ? 'qc_passed' : 'qc_failed',
          qcId: id,
          qcCompletedAt: Date.now()
        });
      }
      
      // If accepted, add to stock
      if (qcData.acceptanceStatus === 'accepted') {
        await this.addToStock({
          materialId: qcData.materialId,
          quantity: qcData.quantityAccepted || qcData.quantityReceived,
          batchNumber: qcData.batchNumber,
          supplierId: qcData.supplierId,
          unitPrice: qcData.unitPrice || 0,
          expiryDate: qcData.expiryDate,
          qualityGrade: qcData.overallGrade
        });
      }
      
      return { id, ...qcRecord };
    } catch (error) {
      throw new Error(`Failed to record QC data: ${error.message}`);
    }
  },

  async addToStock(stockData) {
    try {
      // Check if material already exists in stock
      const existingStock = await getData(`packingMaterialsStock/${stockData.materialId}`);
      const quantityToAdd = Number(stockData.quantity) || 0;
      
      if (existingStock) {
        // Update existing stock
        const currentQuantity = Number(existingStock.quantity) || 0;
        const updates = {
          quantity: currentQuantity + quantityToAdd,
          lastReceived: Date.now(),
          lastSupplier: stockData.supplierId,
          lastUnitPrice: stockData.unitPrice,
          lastQualityGrade: stockData.qualityGrade,
          lastBatchNumber: stockData.batchNumber,
          updatedAt: Date.now(),
          updatedBy: auth.currentUser?.uid
        };
        
        // Only update expiryDate if it's provided and valid
        if (stockData.expiryDate) {
          updates.expiryDate = stockData.expiryDate;
        }
        
        await updateData(`packingMaterialsStock/${stockData.materialId}`, updates);
      } else {
        // Create new stock entry
        const newStock = {
          materialId: stockData.materialId,
          quantity: quantityToAdd,
          batchNumber: stockData.batchNumber,
          supplierId: stockData.supplierId,
          unitPrice: stockData.unitPrice,
          qualityGrade: stockData.qualityGrade,
          location: 'Packing Materials Store',
          lastReceived: Date.now(),
          createdAt: Date.now(),
          createdBy: auth.currentUser?.uid
        };
        
        // Only add expiryDate if it's provided and valid
        if (stockData.expiryDate) {
          newStock.expiryDate = stockData.expiryDate;
        }
        
        await setData(`packingMaterialsStock/${stockData.materialId}`, newStock);
      }
      
      // Update the main material record's currentStock
      const mainMaterial = await getData(`packingMaterials/${stockData.materialId}`);
      if (mainMaterial) {
        const mainCurrentStock = Number(mainMaterial.currentStock) || 0;
        const materialUpdates = {
          currentStock: mainCurrentStock + quantityToAdd,
          lastReceived: Date.now(),
          lastSupplier: stockData.supplierId,
          lastQualityGrade: stockData.qualityGrade,
          lastBatchNumber: stockData.batchNumber,
          updatedAt: Date.now()
        };
        
        // Only update expiryDate if it's provided and valid
        if (stockData.expiryDate) {
          materialUpdates.expiryDate = stockData.expiryDate;
        }
        
        await updateData(`packingMaterials/${stockData.materialId}`, materialUpdates);
      }
      
      // Record stock movement
      await this.recordStockMovement({
        materialId: stockData.materialId,
        type: 'in',
        quantity: quantityToAdd,
        reason: `QC Approved - Added to stock`,
        batchNumber: stockData.batchNumber,
        supplierId: stockData.supplierId
      });
      
    } catch (error) {
      throw new Error(`Failed to add to stock: ${error.message}`);
    }
  },

  async getQCRecords(filters = {}) {
    try {
      const records = await getData('packingMaterialQC');
      if (!records) return [];
      
      let filteredRecords = Object.entries(records).map(([id, record]) => ({
        id,
        ...record
      }));

      if (filters.materialId) {
        filteredRecords = filteredRecords.filter(record => record.materialId === filters.materialId);
      }

      if (filters.supplierId) {
        filteredRecords = filteredRecords.filter(record => record.supplierId === filters.supplierId);
      }

      return filteredRecords.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      throw new Error(`Failed to fetch QC records: ${error.message}`);
    }
  },

  // Stock Movements
  async recordStockMovement(movementData) {
    try {
      // Ensure all required fields have default values
      const movement = {
        materialId: movementData.materialId || '',
        type: movementData.type || 'in',
        quantity: Number(movementData.quantity) || 0,
        reason: movementData.reason || 'Stock movement',
        reference: movementData.reference || '',
        batchNumber: movementData.batchNumber || '',
        supplierId: movementData.supplierId || '',
        createdBy: auth.currentUser?.uid,
        createdAt: Date.now()
      };
      
      const id = await pushData('packingMaterialMovements', movement);
      return { id, ...movement };
    } catch (error) {
      throw new Error(`Failed to record stock movement: ${error.message}`);
    }
  },

  async getStockMovements(materialId) {
    try {
      const movements = await getData('packingMaterialMovements');
      if (!movements) return [];
      
      return Object.entries(movements)
        .filter(([_, movement]) => movement.materialId === materialId)
        .map(([id, movement]) => ({ id, ...movement }))
        .sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      throw new Error(`Failed to fetch stock movements: ${error.message}`);
    }
  },

  // Low Stock Alerts
  async getLowStockAlerts() {
    try {
      const [stock, materials] = await Promise.all([
        this.getPackingMaterialsStock(),
        getData('packingMaterials')
      ]);
      
      if (!materials) return [];
      
      const alerts = [];
      
      Object.entries(materials).forEach(([materialId, material]) => {
        const stockItem = stock.find(s => s.materialId === materialId);
        const currentStock = stockItem?.quantity || 0;
        
        if (currentStock <= (material.reorderLevel || 0)) {
          alerts.push({
            materialId,
            materialName: material.name,
            currentStock,
            reorderLevel: material.reorderLevel || 0,
            alertLevel: currentStock <= (material.reorderLevel || 0) * 0.5 ? 'critical' : 'warning',
            supplier: material.supplier,
            unit: material.unit,
            lastUpdated: stockItem?.lastUpdated || material.updatedAt
          });
        }
      });

      return alerts.sort((a, b) => a.currentStock - b.currentStock);
    } catch (error) {
      throw new Error(`Failed to get low stock alerts: ${error.message}`);
    }
  },

  // Reports
  async getStockReport() {
    try {
      const [stock, materials] = await Promise.all([
        this.getPackingMaterialsStock(),
        getData('packingMaterials')
      ]);
      
      if (!materials) return [];
      
      return Object.entries(materials).map(([materialId, material]) => {
        const stockItem = stock.find(s => s.materialId === materialId);
        const currentStock = stockItem?.quantity || 0;
        
        return {
          materialId,
          materialName: material.name,
          materialCode: material.code,
          category: material.category,
          currentStock,
          reorderLevel: material.reorderLevel || 0,
          maxLevel: material.maxLevel || 0,
          unit: material.unit,
          supplier: material.supplier,
          unitPrice: stockItem?.unitPrice || material.pricePerUnit || 0,
          totalValue: currentStock * (stockItem?.unitPrice || material.pricePerUnit || 0),
          qualityGrade: stockItem?.qualityGrade || 'N/A',
          location: stockItem?.location || 'Not assigned',
          status: currentStock <= (material.reorderLevel || 0) ? 'low' : 
                  currentStock <= (material.reorderLevel || 0) * 2 ? 'medium' : 'good',
          lastUpdated: stockItem?.lastUpdated || material.updatedAt,
          expiryDate: stockItem?.expiryDate
        };
      });
    } catch (error) {
      throw new Error(`Failed to generate stock report: ${error.message}`);
    }
  },

  // Notifications
  async notifyStoreManager(requestId, requestData) {
    try {
      const notification = {
        type: 'internal_request',
        requestId,
        message: `New packing material request from Packing Area`,
        status: 'unread',
        createdAt: Date.now()
      };
      
      // Get store manager users
      const users = await getData('users');
      if (users) {
        const storeManagers = Object.entries(users)
          .filter(([_, user]) => user.role === 'PackingAreaManager')
          .map(([uid, _]) => uid);
        
        for (const managerId of storeManagers) {
          await pushData(`notifications/${managerId}`, notification);
        }
      }
    } catch (error) {
      console.error('Failed to notify store manager:', error);
    }
  },

  async notifyHeadOfOperations(requestId, requestData) {
    try {
      const notification = {
        type: 'packing_material_purchase_request',
        requestId,
        message: `New packing material purchase request from Store Manager`,
        status: 'unread',
        createdAt: Date.now()
      };
      
      // Get HO users
      const users = await getData('users');
      if (users) {
        const hoUsers = Object.entries(users)
          .filter(([_, user]) => user.role === 'HeadOfOperations')
          .map(([uid, _]) => uid);
        
        for (const hoId of hoUsers) {
          await pushData(`notifications/${hoId}`, notification);
        }
      }
    } catch (error) {
      console.error('Failed to notify HO:', error);
    }
  },

  async notifyMainDirector(requestId, type) {
    try {
      const notification = {
        type,
        requestId,
        message: `High-value packing material request requires MD approval`,
        status: 'unread',
        createdAt: Date.now()
      };
      
      // Get MD users
      const users = await getData('users');
      if (users) {
        const mdUsers = Object.entries(users)
          .filter(([_, user]) => user.role === 'MainDirector')
          .map(([uid, _]) => uid);
        
        for (const mdId of mdUsers) {
          await pushData(`notifications/${mdId}`, notification);
        }
      }
    } catch (error) {
      console.error('Failed to notify MD:', error);
    }
  },

  async notifyWarehouseStaff(requestId, status) {
    try {
      const notification = {
        type: 'purchase_request_approved',
        requestId,
        message: `Packing material purchase request ${status} - ready for supplier allocation`,
        status: 'unread',
        createdAt: Date.now()
      };
      
      // Get warehouse staff users
      const users = await getData('users');
      if (users) {
        const warehouseUsers = Object.entries(users)
          .filter(([_, user]) => user.role === 'WarehouseStaff')
          .map(([uid, _]) => uid);
        
        for (const staffId of warehouseUsers) {
          await pushData(`notifications/${staffId}`, notification);
        }
      }
    } catch (error) {
      console.error('Failed to notify warehouse staff:', error);
    }
  },

  async notifyRequestStatus(requestId, status) {
    try {
      const request = await getData(`packingMaterialRequests/${requestId}`);
      if (!request) return;
      
      const notification = {
        type: 'request_status',
        requestId,
        message: `Your packing material request has been ${status}`,
        status: 'unread',
        createdAt: Date.now()
      };
      
      await pushData(`notifications/${request.requestedBy}`, notification);
    } catch (error) {
      console.error('Failed to notify request status:', error);
    }
  }
};