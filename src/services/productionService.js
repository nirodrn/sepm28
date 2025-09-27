import { getData, setData, updateData, pushData } from '../firebase/db';
import { auth } from '../firebase/auth';

export const productionService = {
  // Production Products Management
  async getProductionProducts() {
    try {
      const products = await getData('productionProducts');
      if (!products) return [];
      
      return Object.entries(products).map(([id, product]) => ({
        id,
        ...product
      }));
    } catch (error) {
      throw new Error(`Failed to fetch production products: ${error.message}`);
    }
  },

  async createProductionProduct(productData) {
    try {
      const currentUser = auth.currentUser;
      const product = {
        ...productData,
        createdBy: currentUser?.uid,
        createdByName: currentUser?.displayName || currentUser?.email || 'Production Manager',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      const id = await pushData('productionProducts', product);
      return { id, ...product };
    } catch (error) {
      throw new Error(`Failed to create production product: ${error.message}`);
    }
  },

  async updateProductionProduct(id, updates) {
    try {
      const currentUser = auth.currentUser;
      const updateData = {
        ...updates,
        updatedAt: Date.now(),
        updatedBy: currentUser?.uid
      };
      
      await updateData(`productionProducts/${id}`, updateData);
      return updateData;
    } catch (error) {
      throw new Error(`Failed to update production product: ${error.message}`);
    }
  },

  async deleteProductionProduct(id) {
    try {
      const currentUser = auth.currentUser;
      await updateData(`productionProducts/${id}`, {
        status: 'inactive',
        deletedAt: Date.now(),
        deletedBy: currentUser?.uid
      });
      return true;
    } catch (error) {
      throw new Error(`Failed to delete production product: ${error.message}`);
    }
  },

  // Raw Material Requests (direct to Warehouse, copy to HO)
  async createRawMaterialRequest(requestData) {
    try {
      const currentUser = auth.currentUser;
      const request = {
        ...requestData,
        requestType: 'production_raw_material',
        status: 'submitted_to_warehouse',
        requestedBy: currentUser?.uid,
        requestedByName: currentUser?.displayName || currentUser?.email || 'Production Manager',
        requestedByRole: 'ProductionManager',
        department: 'Production',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        // HO is notified for monitoring (not approval)
        hoNotified: true,
        hoNotifiedAt: Date.now()
      };
      
      const id = await pushData('productionRawMaterialRequests', request);
      
      // Notify warehouse staff
      await this.notifyWarehouseStaff(id, request);
      
      // Notify HO for monitoring
      await this.notifyHeadOfOperations(id, request, 'monitoring');
      
      return { id, ...request };
    } catch (error) {
      throw new Error(`Failed to create raw material request: ${error.message}`);
    }
  },

  async getRawMaterialRequests(filters = {}) {
    try {
      const requests = await getData('productionRawMaterialRequests');
      if (!requests) return [];
      
      let filteredRequests = Object.entries(requests).map(([id, request]) => ({
        id,
        ...request
      }));

      if (filters.status) {
        filteredRequests = filteredRequests.filter(req => req.status === filters.status);
      }
      
      if (filters.requestedBy) {
        filteredRequests = filteredRequests.filter(req => req.requestedBy === filters.requestedBy);
      }

      return filteredRequests.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      throw new Error(`Failed to fetch raw material requests: ${error.message}`);
    }
  },

  // Batch Management
  async createBatch(batchData) {
    try {
      const currentUser = auth.currentUser;
      const batch = {
        ...batchData,
        batchNumber: await this.generateBatchNumber(batchData.productId),
        status: 'active',
        stage: 'preparation',
        progress: 0,
        outputQuantity: 0,
        createdBy: currentUser?.uid,
        createdByName: currentUser?.displayName || currentUser?.email || 'Production Manager',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        qcStages: {
          preparation: { completed: false },
          mixing: { completed: false },
          heating: { completed: false },
          cooling: { completed: false },
          final_qc: { completed: false }
        }
      };
      
      const id = await pushData('productionBatches', batch);
      return { id, ...batch };
    } catch (error) {
      throw new Error(`Failed to create batch: ${error.message}`);
    }
  },

  async getBatches(filters = {}) {
    try {
      const batches = await getData('productionBatches');
      if (!batches) return [];
      
      let filteredBatches = Object.entries(batches).map(([id, batch]) => ({
        id,
        ...batch
      }));

      if (filters.status) {
        filteredBatches = filteredBatches.filter(batch => batch.status === filters.status);
      }
      
      if (filters.productId) {
        filteredBatches = filteredBatches.filter(batch => batch.productId === filters.productId);
      }

      return filteredBatches.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      throw new Error(`Failed to fetch batches: ${error.message}`);
    }
  },

  async updateBatchStage(batchId, stage, stageData = {}) {
    try {
      const currentUser = auth.currentUser;
      
      // Get current batch data to preserve existing QC stages
      const batches = await this.getBatches();
      const currentBatch = batches.find(b => b.id === batchId);
      const existingQCStages = currentBatch?.qcStages || {};
      
      const updates = {
        stage,
        qcStages: {
          ...existingQCStages,
          [stage]: {
            completed: true,
            completedAt: Date.now(),
            completedBy: currentUser?.uid,
            ...stageData
          }
        },
        updatedAt: Date.now(),
        updatedBy: currentUser?.uid
      };
      
      // Update progress based on stage
      const stageProgress = {
        preparation: 10,
        mixing: 30,
        heating: 60,
        cooling: 90,
        final_qc: 100,
        completed: 100
      };
      
      updates.progress = stageProgress[stage] || 0;
      
      if (stage === 'completed') {
        updates.status = 'completed';
        updates.completedAt = Date.now();
        updates.outputQuantity = updates.outputQuantity || currentBatch?.targetQuantity || 0;
      }
      
      await updateData(`productionBatches/${batchId}`, updates);
      return updates;
    } catch (error) {
      throw new Error(`Failed to update batch stage: ${error.message}`);
    }
  },

  // Manual batch update with automatic progress calculation
  async updateBatchProgress(batchId, updates) {
    try {
      const currentUser = auth.currentUser;
      
      const batchUpdates = {
        ...updates,
        updatedAt: Date.now(),
        updatedBy: currentUser?.uid
      };
      
      // If completing the batch
      if (updates.status === 'completed') {
        batchUpdates.status = 'completed';
        batchUpdates.completedAt = Date.now();
      }
      
      await updateData(`productionBatches/${batchId}`, batchUpdates);
      return batchUpdates;
    } catch (error) {
      throw new Error(`Failed to update batch progress: ${error.message}`);
    }
  },

  // Get batches with enhanced filtering for HO monitoring
  async getBatchesForMonitoring(filters = {}) {
    try {
      const batches = await this.getBatches(filters);
      
      // Add additional monitoring data
      return batches.map(batch => ({
        ...batch,
        efficiency: batch.outputQuantity && batch.targetQuantity ? 
          ((batch.outputQuantity / batch.targetQuantity) * 100).toFixed(1) : 0,
        cycleTime: batch.completedAt && batch.createdAt ? 
          Math.round((batch.completedAt - batch.createdAt) / (24 * 60 * 60 * 1000)) : null,
        isDelayed: batch.expectedCompletionDate && Date.now() > batch.expectedCompletionDate
      }));
    } catch (error) {
      throw new Error(`Failed to fetch batches for monitoring: ${error.message}`);
    }
  },

  // Batch Handover to Packing Area
  async handoverBatchToPacking(batchId, handoverData) {
    try {
      const currentUser = auth.currentUser;
      const batch = await getData(`productionBatches/${batchId}`);
      
      if (!batch) {
        throw new Error('Batch not found');
      }
      
      // Check if batch is completed (either status is 'completed' OR progress is 100%)
      const isCompleted = batch.status === 'completed' || 
                         batch.status === 'qc_passed' || 
                         (batch.progress && batch.progress >= 100);
      
      if (!isCompleted) {
        throw new Error('Batch must be completed (100% progress or QC passed) before handover');
      }
      
      const handover = {
        batchId,
        batchNumber: batch.batchNumber,
        productId: batch.productId,
        productName: batch.productName,
        quantity: handoverData.quantity,
        unit: handoverData.unit,
        qualityGrade: handoverData.qualityGrade || 'A',
        expiryDate: handoverData.expiryDate,
        storageInstructions: handoverData.storageInstructions || '',
        handedOverBy: currentUser?.uid,
        handedOverByName: currentUser?.displayName || currentUser?.email || 'Production Manager',
        handoverDate: Date.now(),
        status: 'handed_over',
        receivedByPacking: false,
        notes: handoverData.notes || ''
      };
      
      const id = await pushData('batchHandovers', handover);
      
      // Update batch status
      await updateData(`productionBatches/${batchId}`, {
        status: 'handed_over',
        handoverId: id,
        handedOverAt: Date.now(),
        updatedAt: Date.now()
      });
      
      // Notify Packing Area Manager
      await this.notifyPackingAreaManager(id, handover);
      
      return { id, ...handover };
    } catch (error) {
      throw new Error(`Failed to handover batch: ${error.message}`);
    }
  },

  async getBatchHandovers(filters = {}) {
    try {
      const handovers = await getData('batchHandovers');
      if (!handovers) return [];
      
      let filteredHandovers = Object.entries(handovers).map(([id, handover]) => ({
        id,
        ...handover
      }));

      if (filters.status) {
        filteredHandovers = filteredHandovers.filter(h => h.status === filters.status);
      }
      
      if (filters.receivedByPacking !== undefined) {
        filteredHandovers = filteredHandovers.filter(h => h.receivedByPacking === filters.receivedByPacking);
      }

      return filteredHandovers.sort((a, b) => b.handoverDate - a.handoverDate);
    } catch (error) {
      throw new Error(`Failed to fetch batch handovers: ${error.message}`);
    }
  },

  async generateBatchNumber(productId) {
    try {
      const batches = await getData('productionBatches');
      const count = batches ? Object.keys(batches).length : 0;
      const year = new Date().getFullYear();
      const productCode = 'PROD'; // Default product code
      return `BATCH-${productCode}-${year}-${String(count + 1).padStart(4, '0')}`;
    } catch (error) {
      return `BATCH-${Date.now().toString().slice(-8)}`;
    }
  },

  // QC Records
  async recordQCData(batchId, stage, qcData) {
    try {
      const currentUser = auth.currentUser;
      const qcRecord = {
        batchId,
        stage, // 'mixing', 'heating', 'cooling', 'final'
        ...qcData,
        qcOfficer: currentUser?.uid,
        qcOfficerName: currentUser?.displayName || currentUser?.email || 'QC Officer',
        timestamp: Date.now(),
        createdAt: Date.now()
      };
      
      const id = await pushData('productionQCRecords', qcRecord);
      
      // Update batch QC stage
      await updateData(`productionBatches/${batchId}`, {
        [`qcStages.${stage}`]: {
          completed: true,
          completedAt: Date.now(),
          qcId: id,
          ...qcData
        },
        updatedAt: Date.now()
      });
      
      return { id, ...qcRecord };
    } catch (error) {
      throw new Error(`Failed to record QC data: ${error.message}`);
    }
  },

  async getQCRecords(batchId) {
    try {
      const records = await getData('productionQCRecords');
      if (!records) return [];
      
      return Object.entries(records)
        .filter(([_, record]) => record.batchId === batchId)
        .map(([id, record]) => ({ id, ...record }))
        .sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      throw new Error(`Failed to fetch QC records: ${error.message}`);
    }
  },

  // Notifications
  async notifyWarehouseStaff(requestId, requestData) {
    try {
      const notification = {
        type: 'production_raw_material_request',
        requestId,
        message: `New raw material request from Production: ${requestData.items?.[0]?.materialName || 'Multiple items'}`,
        data: { requestType: 'production', items: requestData.items },
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

  async notifyHeadOfOperations(requestId, requestData, type = 'monitoring') {
    try {
      const notification = {
        type: 'production_request_monitoring',
        requestId,
        message: `Production raw material request for monitoring: ${requestData.items?.[0]?.materialName || 'Multiple items'}`,
        data: { requestType: 'production_monitoring', items: requestData.items },
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

  async notifyPackingAreaManager(handoverId, handoverData) {
    try {
      const notification = {
        type: 'batch_handover',
        handoverId,
        message: `New batch ready for packing: ${handoverData.productName} (${handoverData.batchNumber})`,
        data: { 
          batchId: handoverData.batchId,
          productName: handoverData.productName,
          quantity: handoverData.quantity
        },
        status: 'unread',
        createdAt: Date.now()
      };
      
      // Get packing area manager users
      const users = await getData('users');
      if (users) {
        const packingUsers = Object.entries(users)
          .filter(([_, user]) => user.role === 'PackingAreaManager')
          .map(([uid, _]) => uid);
        
        for (const packingId of packingUsers) {
          await pushData(`notifications/${packingId}`, notification);
        }
      }
    } catch (error) {
      console.error('Failed to notify packing area manager:', error);
    }
  }
};