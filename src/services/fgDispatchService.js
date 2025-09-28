import { getData, setData, updateData, pushData } from '../firebase/db';
import { auth } from '../firebase/auth';

export const fgDispatchService = {
  // Generate Release Code (YYMMDDTTTTxxxxxx format)
  generateReleaseCode() {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const time = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    return `${year}${month}${day}${time}${random}`;
  },

  // Create dispatch from Packing Area to FG Store
  async createFGDispatch(dispatchData) {
    try {
      const currentUser = auth.currentUser;
      const releaseCode = this.generateReleaseCode();
      
      const dispatch = {
        ...dispatchData,
        releaseCode,
        dispatchedBy: currentUser?.uid,
        dispatchedByName: currentUser?.displayName || currentUser?.email || 'Packing Area Manager',
        dispatchedAt: Date.now(),
        status: 'dispatched',
        claimedByFG: false,
        destination: dispatchData.destination || 'finished_goods_store',
        dispatchType: dispatchData.dispatchType || 'bulk',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      const id = await pushData('fgDispatches', dispatch);
      
      // Update packing area stock levels
      for (const item of dispatchData.items) {
        await this.updatePackingAreaStock(item.stockId, item.quantity);
      }
      
      // Notify FG Store Manager
      await this.notifyFGStoreManager(id, dispatch);
      
      return { id, ...dispatch };
    } catch (error) {
      throw new Error(`Failed to create FG dispatch: ${error.message}`);
    }
  },

  // Update packing area stock after dispatch
  async updatePackingAreaStock(stockId, dispatchedQuantity) {
    try {
      const stockItem = await getData(`packingAreaStock/${stockId}`);
      if (!stockItem) {
        throw new Error('Stock item not found');
      }
      
      const currentQuantity = Number(stockItem.quantity) || 0;
      const newQuantity = Math.max(0, currentQuantity - dispatchedQuantity);
      
      await updateData(`packingAreaStock/${stockId}`, {
        quantity: newQuantity,
        lastDispatched: Date.now(),
        status: newQuantity === 0 ? 'depleted' : stockItem.status,
        updatedAt: Date.now()
      });
      
      // Record stock movement
      const { packingAreaStockService } = await import('./packingAreaStockService');
      await packingAreaStockService.recordStockMovement({
        stockId,
        batchId: stockItem.batchId,
        batchNumber: stockItem.batchNumber,
        productId: stockItem.productId,
        productName: stockItem.productName,
        type: 'out',
        quantity: dispatchedQuantity,
        reason: `Dispatched to FG Store`,
        location: stockItem.location
      });
      
    } catch (error) {
      throw new Error(`Failed to update packing area stock: ${error.message}`);
    }
  },

  // Get bulk FG dispatches
  async getFGDispatches(filters = {}) {
    try {
      const dispatches = await getData('fgDispatches');
      if (!dispatches) return [];
      
      let filteredDispatches = Object.entries(dispatches).map(([id, dispatch]) => ({
        id,
        ...dispatch,
        type: 'bulk'
      }));

      if (filters.status) {
        filteredDispatches = filteredDispatches.filter(d => d.status === filters.status);
      }
      
      if (filters.claimedByFG !== undefined) {
        filteredDispatches = filteredDispatches.filter(d => d.claimedByFG === filters.claimedByFG);
      }

      return filteredDispatches.sort((a, b) => b.dispatchedAt - a.dispatchedAt);
    } catch (error) {
      throw new Error(`Failed to fetch FG dispatches: ${error.message}`);
    }
  },

  // Get unit FG dispatches
  async getFGUnitDispatches(filters = {}) {
    try {
      const dispatches = await getData('fgUnitDispatches');
      if (!dispatches) return [];
      
      let filteredDispatches = Object.entries(dispatches).map(([id, dispatch]) => ({
        id,
        ...dispatch,
        type: 'units'
      }));

      if (filters.status) {
        filteredDispatches = filteredDispatches.filter(d => d.status === filters.status);
      }
      
      if (filters.claimedByFG !== undefined) {
        filteredDispatches = filteredDispatches.filter(d => d.claimedByFG === filters.claimedByFG);
      }

      return filteredDispatches.sort((a, b) => b.dispatchedAt - a.dispatchedAt);
    } catch (error) {
      throw new Error(`Failed to fetch FG unit dispatches: ${error.message}`);
    }
  },

  // FG Store claim dispatch
  async claimFGDispatch(dispatchId, claimData) {
    try {
      const currentUser = auth.currentUser;
      const dispatch = await getData(`fgDispatches/${dispatchId}`);
      
      if (!dispatch) {
        throw new Error('Dispatch not found');
      }
      
      if (dispatch.claimedByFG) {
        throw new Error('Dispatch has already been claimed');
      }
      
      const updates = {
        claimedByFG: true,
        claimedBy: currentUser?.uid,
        claimedByName: currentUser?.displayName || currentUser?.email || 'FG Store Manager',
        claimedAt: Date.now(),
        status: 'claimed',
        claimNotes: claimData.notes || '',
        updatedAt: Date.now()
      };
      
      await updateData(`fgDispatches/${dispatchId}`, updates);
      
      // Add to FG Store inventory
      for (const item of dispatch.items) {
        await this.addToFGInventory({
          productId: item.productId,
          productName: item.productName,
          batchNumber: item.batchNumber,
          quantity: item.quantity,
          unit: item.unit,
          qualityGrade: item.qualityGrade,
          expiryDate: item.expiryDate,
          location: claimData.location || 'FG-A1',
          releaseCode: dispatch.releaseCode,
          dispatchId: dispatchId,
          receivedFrom: 'packing_area'
        });
      }
      
      return updates;
    } catch (error) {
      throw new Error(`Failed to claim FG dispatch: ${error.message}`);
    }
  },

  // Add to FG Store inventory
  async addToFGInventory(inventoryData) {
    try {
      const currentUser = auth.currentUser;
      const existingInventory = await getData(`finishedGoodsInventory/${inventoryData.productId}`);
      
      if (existingInventory) {
        // Update existing inventory
        const currentQuantity = Number(existingInventory.quantity) || 0;
        const newQuantity = currentQuantity + (Number(inventoryData.quantity) || 0);
        
        await updateData(`finishedGoodsInventory/${inventoryData.productId}`, {
          quantity: newQuantity,
          lastReceived: Date.now(),
          lastBatchNumber: inventoryData.batchNumber,
          lastExpiryDate: inventoryData.expiryDate,
          lastQualityGrade: inventoryData.qualityGrade,
          lastReleaseCode: inventoryData.releaseCode,
          location: inventoryData.location,
          updatedAt: Date.now(),
          updatedBy: currentUser?.uid
        });
      } else {
        // Create new inventory entry
        await setData(`finishedGoodsInventory/${inventoryData.productId}`, {
          productId: inventoryData.productId,
          productName: inventoryData.productName,
          quantity: Number(inventoryData.quantity) || 0,
          unit: inventoryData.unit,
          batchNumber: inventoryData.batchNumber,
          expiryDate: inventoryData.expiryDate,
          qualityGrade: inventoryData.qualityGrade,
          releaseCode: inventoryData.releaseCode,
          location: inventoryData.location,
          receivedFrom: inventoryData.receivedFrom,
          createdAt: Date.now(),
          createdBy: currentUser?.uid
        });
      }
      
      // Record inventory movement
      await this.recordFGInventoryMovement({
        productId: inventoryData.productId,
        type: 'in',
        quantity: Number(inventoryData.quantity) || 0,
        reason: `Received from Packing Area - Release Code: ${inventoryData.releaseCode}`,
        batchNumber: inventoryData.batchNumber,
        location: inventoryData.location,
        releaseCode: inventoryData.releaseCode,
        dispatchId: inventoryData.dispatchId
      });
      
    } catch (error) {
      throw new Error(`Failed to add to FG inventory: ${error.message}`);
    }
  },

  // Record FG inventory movement
  async recordFGInventoryMovement(movementData) {
    try {
      const currentUser = auth.currentUser;
      const movement = {
        ...movementData,
        createdBy: currentUser?.uid,
        createdByName: currentUser?.displayName || currentUser?.email || 'FG Store Manager',
        createdAt: Date.now()
      };
      
      const id = await pushData('fgInventoryMovements', movement);
      return { id, ...movement };
    } catch (error) {
      throw new Error(`Failed to record FG inventory movement: ${error.message}`);
    }
  },

  // Get pending dispatches for FG Store
  async getPendingFGDispatches() {
    try {
      const [bulkDispatches, unitDispatches] = await Promise.all([
        this.getFGDispatches({ claimedByFG: false }),
        this.getFGUnitDispatches({ claimedByFG: false })
      ]);
      
      return [...bulkDispatches, ...unitDispatches].sort((a, b) => b.dispatchedAt - a.dispatchedAt);
    } catch (error) {
      throw new Error(`Failed to fetch pending FG dispatches: ${error.message}`);
    }
  },

  // Get approved sales requests that need dispatching
  async getApprovedSalesRequests() {
    try {
      const historyRef = await getData('salesApprovalHistory');
      if (!historyRef) return [];
      
      const approvedRequests = [];
      Object.entries(historyRef).forEach(([id, request]) => {
        // Only include approved requests that haven't been dispatched yet
        if (request.status === 'Approved' && !request.isDispatched) {
          approvedRequests.push({ 
            ...request, 
            id,
            remainingQuantities: { ...request.items } // Copy original quantities for tracking remaining amounts
          });
        }
      });
      
      return approvedRequests;
    } catch (error) {
      throw new Error(`Failed to fetch approved sales requests: ${error.message}`);
    }
  },

  // Dispatch sales request with custom quantities
  async dispatchSalesRequest(requestId, dispatchData) {
    try {
      const { items, dispatchedBy, dispatchedByName, dispatchedByRole, notes } = dispatchData;
      
      // Validate dispatch quantities against approved quantities
      const request = await getData(`salesApprovalHistory/${requestId}`);
      if (!request) {
        throw new Error('Request not found');
      }

      const approvedItems = request.items;

      // Verify quantities don't exceed approved amounts
      for (const [itemId, dispatchItem] of Object.entries(items)) {
        const approvedQty = approvedItems[itemId]?.qty || 0;
        if (dispatchItem.qty > approvedQty) {
          throw new Error(`Dispatch quantity for ${dispatchItem.name} exceeds approved quantity`);
        }
      }

      const updates = {};
      const releaseCode = this.generateReleaseCode();
      
      // Create dispatch record
      const dispatchRecord = {
        requestId,
        dispatchedAt: Date.now(),
        items,
        dispatchedBy,
        dispatchedByName,
        dispatchedByRole,
        notes,
        originalRequestType: request.requestType,
        requesterId: request.requesterId,
        requesterName: request.requesterName,
        requesterRole: request.requesterRole,
        type: request.type,
        releaseCode
      };
      
      const dispatchId = await pushData('dispatchHistory', dispatchRecord);
      
      // Check if all items have been fully dispatched
      let isFullyDispatched = true;
      const existingDispatches = await getData('dispatchHistory');
      const totalDispatchedQty = {};
      
      // Sum up existing dispatched quantities
      if (existingDispatches) {
        Object.values(existingDispatches)
          .filter(dispatch => dispatch.requestId === requestId)
          .forEach(dispatch => {
            Object.entries(dispatch.items).forEach(([itemId, item]) => {
              totalDispatchedQty[itemId] = (totalDispatchedQty[itemId] || 0) + item.qty;
            });
          });
      }
      
      // Add current dispatch quantities
      Object.entries(items).forEach(([itemId, item]) => {
        totalDispatchedQty[itemId] = (totalDispatchedQty[itemId] || 0) + item.qty;
      });
      
      // Check if any items still have remaining quantity
      Object.entries(approvedItems).forEach(([itemId, item]) => {
        const totalDispatched = totalDispatchedQty[itemId] || 0;
        if (totalDispatched < item.qty) {
          isFullyDispatched = false;
        }
      });
      
      // Update request status if fully dispatched
      if (isFullyDispatched) {
        await updateData(`salesApprovalHistory/${requestId}`, {
          status: 'Dispatched',
          isDispatched: true,
          fullyDispatchedAt: Date.now()
        });
      }
      
      return { id: dispatchId, ...dispatchRecord };
    } catch (error) {
      throw new Error(`Failed to dispatch request: ${error.message}`);
    }
  },

  // Get dispatch history for a sales request
  async getSalesRequestDispatches(requestId) {
    try {
      const dispatches = await getData('dispatchHistory');
      if (!dispatches) return [];
      
      const requestDispatches = Object.entries(dispatches)
        .filter(([_, dispatch]) => dispatch.requestId === requestId)
        .map(([id, dispatch]) => ({ ...dispatch, id }));
      
      return requestDispatches.sort((a, b) => b.dispatchedAt - a.dispatchedAt);
    } catch (error) {
      throw new Error(`Failed to fetch request dispatches: ${error.message}`);
    }
  },

  // Mark a dispatched sales request as 'Sent'
  async markRequestAsSent(dispatchId, requestId) {
    try {
      const currentUser = auth.currentUser;

      // Update dispatchHistory record
      await updateData(`dispatchHistory/${dispatchId}`, {
        status: 'Sent',
        sentAt: Date.now(),
        sentBy: currentUser?.uid,
        sentByName: currentUser?.displayName || currentUser?.email || 'FG Store Manager',
        updatedAt: Date.now()
      });

      // Update salesApprovalHistory to mark as completed by FG
      await updateData(`salesApprovalHistory/${requestId}`, {
        isCompletedByFG: true,
        completedByFGAt: Date.now(),
        status: 'Sent',
        sentAt: Date.now(),
        sentBy: currentUser?.uid,
        sentByName: currentUser?.displayName || currentUser?.email || 'FG Store Manager',
        updatedAt: Date.now()
      });

      // Notify HO about completion
      await this.notifyHeadOfOperationsCompletion(requestId);

      return true;
    } catch (error) {
      throw new Error(`Failed to mark request as sent: ${error.message}`);
    }
  },

  // Mark sales request as sent to external recipient
  async markSalesRequestAsSent(requestId) {
    try {
      const currentUser = auth.currentUser;

      // Update salesApprovalHistory to mark as completed by FG
      await updateData(`salesApprovalHistory/${requestId}`, {
        isCompletedByFG: true,
        completedByFGAt: Date.now(),
        status: 'Sent',
        sentAt: Date.now(),
        sentBy: currentUser?.uid,
        sentByName: currentUser?.displayName || currentUser?.email || 'FG Store Manager',
        updatedAt: Date.now()
      });

      // Notify HO about completion
      await this.notifyHeadOfOperationsCompletion(requestId);

      return true;
    } catch (error) {
      throw new Error(`Failed to mark sales request as sent: ${error.message}`);
    }
  },
  // Notify HO when FG completes a sales request
  async notifyHeadOfOperationsCompletion(requestId) {
    try {
      const request = await getData(`salesApprovalHistory/${requestId}`);
      if (!request) return;
      
      const notification = {
        type: 'sales_request_completed',
        requestId,
        message: `Sales request completed by FG Store: ${request.requesterName} (${request.requestType})`,
        data: { 
          requestType: 'sales_completion',
          requesterName: request.requesterName,
          requesterRole: request.requesterRole,
          completedAt: Date.now(),
          totalItems: Object.keys(request.items).length
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
      console.error('Failed to notify HO of completion:', error);
    }
  },

  // Notifications
  async notifyFGStoreManager(dispatchId, dispatchData) {
    try {
      const notification = {
        type: 'fg_dispatch_ready',
        dispatchId,
        message: `New packed products ready for claiming: ${dispatchData.items?.[0]?.productName || 'Multiple products'}`,
        data: { 
          dispatchType: 'packed_products',
          items: dispatchData.items,
          totalQuantity: dispatchData.totalQuantity,
          releaseCode: dispatchData.releaseCode
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

