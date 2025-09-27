import { getData, setData, updateData, pushData } from '../firebase/db';
import { auth } from '../firebase/auth';

export const productionWarehouseService = {
  // Production Manager → Warehouse Staff: Raw Material Requests
  async createRawMaterialRequest(requestData) {
    try {
      const currentUser = auth.currentUser;
      const request = {
        ...requestData,
        requestType: 'production_raw_material',
        status: 'pending_warehouse',
        requestedBy: currentUser?.uid,
        requestedByName: currentUser?.displayName || currentUser?.email || 'Production Manager',
        requestedByRole: 'ProductionManager',
        department: 'Production',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        workflow: {
          submitted: {
            by: currentUser?.uid,
            at: Date.now(),
            role: 'ProductionManager'
          }
        }
      };
      
      const id = await pushData('productionRawMaterialRequests', request);
      
      // Notify Warehouse Staff directly
      await this.notifyWarehouseStaff(id, request);
      
      // Notify HO for monitoring (not approval)
      await this.notifyHeadOfOperationsForMonitoring(id, request);
      
      return { id, ...request };
    } catch (error) {
      throw new Error(`Failed to create raw material request: ${error.message}`);
    }
  },

  // Get Production Raw Material Requests
  async getProductionRawMaterialRequests(filters = {}) {
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
      throw new Error(`Failed to fetch production raw material requests: ${error.message}`);
    }
  },

  // Warehouse Staff: Check Stock Availability
  async checkStockAvailability(materialId, requestedQuantity) {
    try {
      const material = await getData(`rawMaterials/${materialId}`);
      if (!material) {
        return { available: false, reason: 'Material not found' };
      }
      
      const currentStock = Number(material.currentStock) || 0;
      const available = currentStock >= requestedQuantity;
      
      return {
        available,
        currentStock,
        requestedQuantity,
        shortfall: available ? 0 : requestedQuantity - currentStock,
        reason: available ? 'Stock available' : `Insufficient stock. Available: ${currentStock}, Required: ${requestedQuantity}`
      };
    } catch (error) {
      throw new Error(`Failed to check stock availability: ${error.message}`);
    }
  },

  // Warehouse Staff: Approve and Dispatch Materials
  async approveAndDispatchMaterials(requestId, dispatchData) {
    try {
      const currentUser = auth.currentUser;
      const request = await getData(`productionRawMaterialRequests/${requestId}`);
      
      if (!request) {
        throw new Error('Request not found');
      }

      // Check stock availability for all items
      const stockChecks = [];
      for (const item of request.items) {
        const stockCheck = await this.checkStockAvailability(item.materialId, item.quantity);
        stockChecks.push({ ...item, stockCheck });
      }

      const hasInsufficientStock = stockChecks.some(item => !item.stockCheck.available);
      
      if (hasInsufficientStock) {
        // Handle stock shortage
        return await this.handleStockShortage(requestId, stockChecks);
      }

      // All items available - proceed with dispatch
      const dispatch = {
        requestId,
        requestType: 'production_raw_material',
        items: stockChecks.map(item => ({
          materialId: item.materialId,
          materialName: item.materialName,
          requestedQuantity: item.quantity,
          dispatchedQuantity: item.quantity,
          unit: item.unit,
          batchNumber: item.batchNumber || '',
          stockBefore: item.stockCheck.currentStock,
          stockAfter: item.stockCheck.currentStock - item.quantity
        })),
        dispatchedBy: currentUser?.uid,
        dispatchedByName: currentUser?.displayName || currentUser?.email || 'Warehouse Staff',
        dispatchedAt: Date.now(),
        status: 'dispatched',
        notes: dispatchData.notes || '',
        createdAt: Date.now()
      };
      
      const dispatchId = await pushData('productionMaterialDispatches', dispatch);
      
      // Update stock levels
      for (const item of stockChecks) {
        await this.updateRawMaterialStock(item.materialId, -item.quantity, 'production_dispatch');
      }
      
      // Update request status
      await updateData(`productionRawMaterialRequests/${requestId}`, {
        status: 'dispatched',
        dispatchId,
        dispatchedAt: Date.now(),
        dispatchedBy: currentUser?.uid,
        updatedAt: Date.now(),
        workflow: {
          ...request.workflow,
          dispatched: {
            by: currentUser?.uid,
            at: Date.now(),
            role: 'WarehouseStaff'
          }
        }
      });
      
      // Notify Production Manager
      await this.notifyProductionManager(requestId, 'dispatched', {
        dispatchId,
        items: dispatch.items
      });
      
      return { dispatchId, ...dispatch };
    } catch (error) {
      throw new Error(`Failed to approve and dispatch materials: ${error.message}`);
    }
  },

  // Handle Stock Shortage
  async handleStockShortage(requestId, stockChecks) {
    try {
      const currentUser = auth.currentUser;
      const shortageItems = stockChecks.filter(item => !item.stockCheck.available);
      
      // Update request status to shortage
      await updateData(`productionRawMaterialRequests/${requestId}`, {
        status: 'stock_shortage',
        shortageItems: shortageItems.map(item => ({
          materialId: item.materialId,
          materialName: item.materialName,
          requested: item.quantity,
          available: item.stockCheck.currentStock,
          shortfall: item.stockCheck.shortfall
        })),
        shortageReportedAt: Date.now(),
        shortageReportedBy: currentUser?.uid,
        updatedAt: Date.now()
      });
      
      // Notify Production Manager about shortage
      await this.notifyProductionManager(requestId, 'stock_shortage', {
        shortageItems: shortageItems.map(item => ({
          materialName: item.materialName,
          requested: item.quantity,
          available: item.stockCheck.currentStock,
          shortfall: item.stockCheck.shortfall
        }))
      });
      
      // Notify HO about shortage for escalation
      await this.notifyHeadOfOperationsForShortage(requestId, shortageItems);
      
      return {
        status: 'stock_shortage',
        shortageItems: shortageItems.map(item => ({
          materialName: item.materialName,
          requested: item.quantity,
          available: item.stockCheck.currentStock,
          shortfall: item.stockCheck.shortfall
        }))
      };
    } catch (error) {
      throw new Error(`Failed to handle stock shortage: ${error.message}`);
    }
  },

  // Production Manager: Acknowledge Receipt
  async acknowledgeReceipt(dispatchId, receiptData) {
    try {
      const currentUser = auth.currentUser;
      const dispatch = await getData(`productionMaterialDispatches/${dispatchId}`);
      
      if (!dispatch) {
        throw new Error('Dispatch not found');
      }

      // Update dispatch with receipt confirmation
      await updateData(`productionMaterialDispatches/${dispatchId}`, {
        receivedBy: currentUser?.uid,
        receivedByName: currentUser?.displayName || currentUser?.email || 'Production Manager',
        receivedAt: Date.now(),
        status: 'received',
        receiptNotes: receiptData.notes || '',
        receiptConfirmed: true,
        updatedAt: Date.now()
      });
      
      // Update original request status
      await updateData(`productionRawMaterialRequests/${dispatch.requestId}`, {
        status: 'received',
        receivedAt: Date.now(),
        receivedBy: currentUser?.uid,
        updatedAt: Date.now()
      });
      
      // Add materials to production store
      for (const item of dispatch.items) {
        await this.addToProductionStore({
          materialId: item.materialId,
          materialName: item.materialName,
          quantity: item.dispatchedQuantity,
          unit: item.unit,
          batchNumber: item.batchNumber,
          fromDispatch: dispatchId
        });
      }
      
      // Notify Warehouse Staff of receipt confirmation
      await this.notifyWarehouseStaffOfReceipt(dispatchId, dispatch.requestId);
      
      return true;
    } catch (error) {
      throw new Error(`Failed to acknowledge receipt: ${error.message}`);
    }
  },

  // Add materials to production store
  async addToProductionStore(stockData) {
    try {
      const currentUser = auth.currentUser;
      const movement = {
        materialId: stockData.materialId,
        materialName: stockData.materialName,
        type: 'in',
        quantity: Number(stockData.quantity) || 0,
        unit: stockData.unit,
        reason: `Received from Warehouse - Dispatch ${stockData.fromDispatch}`,
        batchNumber: stockData.batchNumber,
        location: 'production_store',
        fromLocation: 'warehouse',
        dispatchId: stockData.fromDispatch,
        receivedBy: currentUser?.uid,
        receivedByName: currentUser?.displayName || currentUser?.email || 'Production Manager',
        createdAt: Date.now()
      };

      const id = await pushData('productionStockMovements', movement);
      return { id, ...movement };
    } catch (error) {
      throw new Error(`Failed to add to production store: ${error.message}`);
    }
  },

  // Get Material Dispatches
  async getMaterialDispatches(filters = {}) {
    try {
      const dispatches = await getData('productionMaterialDispatches');
      if (!dispatches) return [];
      
      let filteredDispatches = Object.entries(dispatches).map(([id, dispatch]) => ({
        id,
        ...dispatch
      }));

      if (filters.status) {
        filteredDispatches = filteredDispatches.filter(d => d.status === filters.status);
      }
      
      if (filters.requestId) {
        filteredDispatches = filteredDispatches.filter(d => d.requestId === filters.requestId);
      }

      return filteredDispatches.sort((a, b) => b.dispatchedAt - a.dispatchedAt);
    } catch (error) {
      throw new Error(`Failed to fetch material dispatches: ${error.message}`);
    }
  },

  // Update Raw Material Stock
  async updateRawMaterialStock(materialId, quantityChange, reason) {
    try {
      const currentUser = auth.currentUser;
      const material = await getData(`rawMaterials/${materialId}`);
      
      if (!material) {
        throw new Error('Material not found');
      }
      
      const currentStock = Number(material.currentStock) || 0;
      const newStock = Math.max(0, currentStock + quantityChange);
      
      await updateData(`rawMaterials/${materialId}`, {
        currentStock: newStock,
        lastUpdated: Date.now(),
        updatedBy: currentUser?.uid
      });
      
      // Record stock movement
      await pushData('stockMovements', {
        materialId,
        materialType: 'rawMaterial',
        type: quantityChange > 0 ? 'in' : 'out',
        quantity: Math.abs(quantityChange),
        reason,
        previousStock: currentStock,
        newStock: newStock,
        createdBy: currentUser?.uid,
        createdAt: Date.now()
      });
      
      return { previousStock: currentStock, newStock };
    } catch (error) {
      throw new Error(`Failed to update raw material stock: ${error.message}`);
    }
  },

  // Notifications
  async notifyWarehouseStaff(requestId, requestData) {
    try {
      const notification = {
        type: 'production_raw_material_request',
        requestId,
        message: `New raw material request from Production: ${requestData.items?.[0]?.materialName || 'Multiple items'}`,
        data: { 
          requestType: 'production_direct',
          items: requestData.items,
          urgency: requestData.priority || 'normal',
          batchReference: requestData.batchReference
        },
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

  async notifyHeadOfOperationsForMonitoring(requestId, requestData) {
    try {
      const notification = {
        type: 'production_request_monitoring',
        requestId,
        message: `Production raw material request for monitoring: ${requestData.items?.[0]?.materialName || 'Multiple items'}`,
        data: { 
          requestType: 'production_monitoring',
          items: requestData.items,
          fromDepartment: 'Production',
          toDepartment: 'Warehouse'
        },
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
      console.error('Failed to notify HO for monitoring:', error);
    }
  },

  async notifyHeadOfOperationsForShortage(requestId, shortageItems) {
    try {
      const notification = {
        type: 'production_stock_shortage',
        requestId,
        message: `Stock shortage for production request - escalation needed`,
        data: { 
          requestType: 'production_shortage',
          shortageItems: shortageItems.map(item => ({
            materialName: item.materialName,
            shortfall: item.stockCheck.shortfall
          })),
          escalationRequired: true
        },
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
      console.error('Failed to notify HO for shortage:', error);
    }
  },

  async notifyProductionManager(requestId, status, additionalData = {}) {
    try {
      const request = await getData(`productionRawMaterialRequests/${requestId}`);
      if (!request) return;
      
      let message = '';
      let notificationType = '';
      
      switch (status) {
        case 'dispatched':
          message = `Raw materials dispatched for your request`;
          notificationType = 'materials_dispatched';
          break;
        case 'stock_shortage':
          message = `Stock shortage for your raw material request`;
          notificationType = 'stock_shortage';
          break;
        case 'approved':
          message = `Raw material request approved - preparing dispatch`;
          notificationType = 'request_approved';
          break;
        default:
          message = `Raw material request status updated: ${status}`;
          notificationType = 'request_status_update';
      }
      
      const notification = {
        type: notificationType,
        requestId,
        message,
        data: { 
          requestType: 'production_response',
          status,
          ...additionalData
        },
        status: 'unread',
        createdAt: Date.now()
      };
      
      await pushData(`notifications/${request.requestedBy}`, notification);
    } catch (error) {
      console.error('Failed to notify production manager:', error);
    }
  },

  async notifyWarehouseStaffOfReceipt(dispatchId, requestId) {
    try {
      const dispatch = await getData(`productionMaterialDispatches/${dispatchId}`);
      if (!dispatch) return;
      
      const notification = {
        type: 'production_receipt_confirmed',
        requestId,
        dispatchId,
        message: `Production confirmed receipt of dispatched materials`,
        data: { 
          requestType: 'receipt_confirmation',
          items: dispatch.items
        },
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
      console.error('Failed to notify warehouse staff of receipt:', error);
    }
  },

  // Get requests by current user (Production Manager)
  async getMyRequests() {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return [];

      const requests = await this.getProductionRawMaterialRequests({ requestedBy: currentUser.uid });
      return requests;
    } catch (error) {
      throw new Error(`Failed to fetch user requests: ${error.message}`);
    }
  },

  // Get requests for Warehouse Staff
  async getRequestsForWarehouse() {
    try {
      return await this.getProductionRawMaterialRequests({ status: 'pending_warehouse' });
    } catch (error) {
      throw new Error(`Failed to fetch requests for warehouse: ${error.message}`);
    }
  },

  // Get dispatches for Production Manager
  async getDispatchesForProduction() {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return [];

      const dispatches = await this.getMaterialDispatches();
      
      // Filter dispatches for requests made by current user
      const userRequests = await this.getMyRequests();
      const userRequestIds = userRequests.map(req => req.id);
      
      return dispatches.filter(dispatch => userRequestIds.includes(dispatch.requestId));
    } catch (error) {
      throw new Error(`Failed to fetch dispatches for production: ${error.message}`);
    }
  }
};