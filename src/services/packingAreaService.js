import { getData, setData, updateData, pushData } from '../firebase/db';
import { auth } from '../firebase/auth';

export const packingAreaService = {
  // Dashboard stats
  async getDashboardStats() {
    try {
      return {
        activeLines: 3,
        completedToday: 45,
        pendingOrders: 12,
        efficiency: 87
      };
    } catch (error) {
      throw new Error(`Failed to get dashboard stats: ${error.message}`);
    }
  },

  async getPackingLines() {
    try {
      return [
        { id: 'LINE001', product: 'Product A - 500g', status: 'running', progress: 75, target: 200, completed: 150 },
        { id: 'LINE002', product: 'Product B - 1kg', status: 'running', progress: 45, target: 100, completed: 45 },
        { id: 'LINE003', product: 'Product C - 250g', status: 'setup', progress: 0, target: 150, completed: 0 },
        { id: 'LINE004', product: 'Product D - 2kg', status: 'maintenance', progress: 0, target: 80, completed: 0 }
      ];
    } catch (error) {
      throw new Error(`Failed to get packing lines: ${error.message}`);
    }
  },

  async getRecentActivity() {
    try {
      return [
        { id: 1, action: 'Batch #B2024001 completed on Line 001', time: '2 hours ago', type: 'completion' },
        { id: 2, action: 'Material request submitted for Line 002', time: '3 hours ago', type: 'request' },
        { id: 3, action: 'Quality check passed for Batch #B2024002', time: '4 hours ago', type: 'quality' },
        { id: 4, action: 'Line 003 scheduled for maintenance', time: '5 hours ago', type: 'maintenance' }
      ];
    } catch (error) {
      throw new Error(`Failed to get recent activity: ${error.message}`);
    }
  },

  // Product Requests (from Production)
  async createProductRequest(requestData) {
    try {
      const currentUser = auth.currentUser;
      const request = {
        ...requestData,
        requestType: 'finished_product',
        status: 'pending',
        requestedBy: currentUser?.uid,
        requestedByName: currentUser?.displayName || currentUser?.email || 'Packing Area Manager',
        requestedByRole: 'PackingAreaManager',
        department: 'PackingArea',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      const id = await pushData('packingProductRequests', request);
      
      // Notify Production Manager
      await this.notifyProductionManager(id, request);
      
      return { id, ...request };
    } catch (error) {
      throw new Error(`Failed to create product request: ${error.message}`);
    }
  },

  async getProductRequests(filters = {}) {
    try {
      const requests = await getData('packingProductRequests');
      if (!requests) return [];
      
      let filteredRequests = Object.entries(requests).map(([id, request]) => ({
        id,
        ...request
      }));

      if (filters.status) {
        filteredRequests = filteredRequests.filter(req => req.status === filters.status);
      }

      return filteredRequests.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      throw new Error(`Failed to fetch product requests: ${error.message}`);
    }
  },

  // Receive Products from Production
  async receiveProductFromProduction(handoverId, receiptData) {
    try {
      const currentUser = auth.currentUser;
      
      // Update handover status
      await updateData(`batchHandovers/${handoverId}`, {
        receivedByPacking: true,
        receivedBy: currentUser?.uid,
        receivedByName: currentUser?.displayName || currentUser?.email || 'Packing Area Manager',
        receivedAt: Date.now(),
        status: 'received_by_packing',
        receiptNotes: receiptData.notes || '',
        updatedAt: Date.now()
      });
      
      return true;
    } catch (error) {
      throw new Error(`Failed to receive product: ${error.message}`);
    }
  },

  // Packaging Activities
  async createPackagingLog(packagingData) {
    try {
      const currentUser = auth.currentUser;
      const log = {
        ...packagingData,
        packagedBy: currentUser?.uid,
        packagedByName: currentUser?.displayName || currentUser?.email || 'Packing Area Manager',
        packagingDate: Date.now(),
        status: 'packaged',
        createdAt: Date.now()
      };
      
      const id = await pushData('packagingLogs', log);
      return { id, ...log };
    } catch (error) {
      throw new Error(`Failed to create packaging log: ${error.message}`);
    }
  },

  async getPackagingLogs(filters = {}) {
    try {
      const logs = await getData('packagingLogs');
      if (!logs) return [];
      
      let filteredLogs = Object.entries(logs).map(([id, log]) => ({
        id,
        ...log
      }));

      if (filters.batchId) {
        filteredLogs = filteredLogs.filter(log => log.batchId === filters.batchId);
      }
      
      if (filters.productId) {
        filteredLogs = filteredLogs.filter(log => log.productId === filters.productId);
      }

      return filteredLogs.sort((a, b) => b.packagingDate - a.packagingDate);
    } catch (error) {
      throw new Error(`Failed to fetch packaging logs: ${error.message}`);
    }
  },

  // Dispatch to FG Store
  async dispatchToFGStore(dispatchData) {
    try {
      const currentUser = auth.currentUser;
      const dispatch = {
        ...dispatchData,
        dispatchedBy: currentUser?.uid,
        dispatchedByName: currentUser?.displayName || currentUser?.email || 'Packing Area Manager',
        dispatchedAt: Date.now(),
        status: 'dispatched',
        receivedByFG: false
      };
      
      const id = await pushData('fgDispatches', dispatch);
      
      // Notify FG Store Manager
      await this.notifyFGStoreManager(id, dispatch);
      
      return { id, ...dispatch };
    } catch (error) {
      throw new Error(`Failed to dispatch to FG store: ${error.message}`);
    }
  },

  async getFGDispatches(filters = {}) {
    try {
      const dispatches = await getData('fgDispatches');
      if (!dispatches) return [];
      
      let filteredDispatches = Object.entries(dispatches).map(([id, dispatch]) => ({
        id,
        ...dispatch
      }));

      if (filters.status) {
        filteredDispatches = filteredDispatches.filter(d => d.status === filters.status);
      }

      return filteredDispatches.sort((a, b) => b.dispatchedAt - a.dispatchedAt);
    } catch (error) {
      throw new Error(`Failed to fetch FG dispatches: ${error.message}`);
    }
  },

  // Notifications
  async notifyProductionManager(requestId, requestData) {
    try {
      const notification = {
        type: 'product_request',
        requestId,
        message: `New product request from Packing Area: ${requestData.batches?.[0]?.productName || 'Multiple products'}`,
        data: { requestType: 'product', batches: requestData.batches },
        status: 'unread',
        createdAt: Date.now()
      };
      
      const users = await getData('users');
      if (users) {
        const productionUsers = Object.entries(users)
          .filter(([_, user]) => user.role === 'ProductionManager')
          .map(([uid, _]) => uid);
        
        for (const prodId of productionUsers) {
          await pushData(`notifications/${prodId}`, notification);
        }
      }
    } catch (error) {
      console.error('Failed to notify production manager:', error);
    }
  },

  async notifyFGStoreManager(dispatchId, dispatchData) {
    try {
      const notification = {
        type: 'fg_dispatch',
        dispatchId,
        message: `New packaged products ready for FG Store: ${dispatchData.items?.[0]?.productName || 'Multiple products'}`,
        data: { 
          dispatchType: 'packaged_products',
          items: dispatchData.items,
          totalQuantity: dispatchData.totalQuantity
        },
        status: 'unread',
        createdAt: Date.now()
      };
      
      const users = await getData('users');
      if (users) {
        const fgUsers = Object.entries(users)
          .filter(([_, user]) => user.role === 'FinishedGoodsStoreManager')
          .map(([uid, _]) => uid);
        
        for (const fgId of fgUsers) {
          await pushData(`notifications/${fgId}`, notification);
        }
      }
    } catch (error) {
      console.error('Failed to notify FG store manager:', error);
    }
  }
};