import { getData, setData, updateData, pushData } from '../firebase/db';
import { auth } from '../firebase/auth';

export const fgDispatchToExternalService = {
  // Dispatch products to external entities (Direct Showroom, DR, Distributor)
  async dispatchToExternal(dispatchData) {
    try {
      const currentUser = auth.currentUser;
      const releaseCode = this.generateReleaseCode();
      
      const dispatch = {
        ...dispatchData,
        releaseCode,
        dispatchType: 'external',
        dispatchedBy: currentUser?.uid,
        dispatchedByName: currentUser?.displayName || currentUser?.email || 'FG Store Manager',
        dispatchedAt: Date.now(),
        status: 'dispatched',
        totalItems: dispatchData.items?.length || 0,
        totalQuantity: this.calculateTotalQuantity(dispatchData.items || []),
        totalValue: this.calculateTotalValue(dispatchData.items || []),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      const dispatchId = await pushData('externalDispatches', dispatch);
      
      // Update FG inventory
      for (const item of dispatchData.items) {
        await this.updateFGInventoryAfterDispatch(item);
      }
      
      // Record dispatch tracking for each recipient
      await this.recordDispatchTracking(dispatchId, dispatch);
      
      // Notify mobile app if applicable
      if (dispatchData.recipientType === 'direct_shop') {
        await this.notifyMobileApp(dispatchId, dispatch);
      }
      
      return { dispatchId, ...dispatch };
    } catch (error) {
      throw new Error(`Failed to dispatch to external: ${error.message}`);
    }
  },

  // Update FG inventory after dispatch
  async updateFGInventoryAfterDispatch(item) {
    try {
      const currentUser = auth.currentUser;
      
      if (item.type === 'bulk') {
        // Update bulk inventory
        const inventoryKey = `${item.productId}_${item.batchNumber}`;
        const currentInventory = await getData(`finishedGoodsInventory/${inventoryKey}`);
        
        if (currentInventory) {
          const newQuantity = Math.max(0, (currentInventory.quantity || 0) - (item.quantity || 0));
          await updateData(`finishedGoodsInventory/${inventoryKey}`, {
            quantity: newQuantity,
            lastDispatched: Date.now(),
            updatedAt: Date.now(),
            updatedBy: currentUser?.uid
          });
        }
      } else {
        // Update packaged inventory
        const inventoryKey = `${item.productId}_${item.variantName}_${item.batchNumber}`;
        const currentInventory = await getData(`finishedGoodsPackagedInventory/${inventoryKey}`);
        
        if (currentInventory) {
          const newUnits = Math.max(0, (currentInventory.unitsInStock || 0) - (item.units || 0));
          await updateData(`finishedGoodsPackagedInventory/${inventoryKey}`, {
            unitsInStock: newUnits,
            lastDispatched: Date.now(),
            updatedAt: Date.now(),
            updatedBy: currentUser?.uid
          });
        }
      }
      
      // Record inventory movement
      const { fgStoreService } = await import('./fgStoreService');
      await fgStoreService.recordInventoryMovement({
        productId: item.productId,
        batchNumber: item.batchNumber,
        type: 'out',
        quantity: item.type === 'bulk' ? item.quantity : item.units,
        reason: `Dispatched to ${item.recipientType}: ${item.recipientName}`,
        location: item.fromLocation || 'FG Store',
        dispatchType: 'external'
      });
      
    } catch (error) {
      throw new Error(`Failed to update inventory after dispatch: ${error.message}`);
    }
  },

  // Dispatch to direct shop from dsreqs
  async dispatchDirectShopRequest(requestId, dispatchData) {
    try {
      const currentUser = auth.currentUser;
      const request = await getData(`dsreqs/${requestId}`);
      
      if (!request) {
        throw new Error('Request not found');
      }

      // Get or set product pricing
      const { fgPricingService } = await import('./fgPricingService');
      let pricing = await fgPricingService.getProductPricingForDispatch(request.product);
      
      if (!pricing) {
        // Set default pricing if not exists
        pricing = await fgPricingService.setDefaultProductPricing(request.product, dispatchData.unitPrice || 100);
      }

      const releaseCode = this.generateReleaseCode();
      
      const dispatch = {
        requestId: requestId,
        recipientType: 'direct_shop',
        recipientId: request.requestedBy,
        recipientName: request.requestedByName,
        recipientRole: 'shop_owner',
        recipientLocation: 'Direct Shop',
        shopName: request.shopName || request.requestedByName,
        items: [{
          productId: request.productId || request.product,
          productName: request.product,
          quantity: request.quantity,
          unit: 'units',
          unitPrice: pricing.currentPrice || dispatchData.unitPrice || 100,
          type: 'units'
        }],
        releaseCode,
        dispatchType: 'external',
        dispatchedBy: currentUser?.uid,
        dispatchedByName: currentUser?.displayName || currentUser?.email || 'FG Store Manager',
        dispatchedAt: Date.now(),
        status: 'dispatched',
        notes: dispatchData.notes || `Direct shop dispatch for ${request.product}`,
        expectedDeliveryDate: dispatchData.expectedDeliveryDate,
        totalItems: 1,
        totalQuantity: request.quantity,
        totalValue: request.quantity * (pricing.currentPrice || dispatchData.unitPrice || 100),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      const dispatchId = await pushData('externalDispatches', dispatch);
      
      // Record dispatch tracking
      await this.recordDispatchTracking(dispatchId, dispatch);
      
      // Update request status
      await updateData(`dsreqs/${requestId}`, {
        status: 'dispatched',
        dispatchId: dispatchId,
        dispatchedAt: Date.now(),
        sentAt: Date.now(),
        sentBy: currentUser?.uid,
        sentByName: currentUser?.displayName || currentUser?.email || 'FG Store Manager',
        releaseCode: releaseCode,
        updatedAt: Date.now()
      });
      
      // Notify mobile app
      await this.notifyMobileApp(dispatchId, dispatch);
      
      // Notify HO about completion
      await this.notifyHeadOfOperationsCompletion(requestId, dispatch);
      
      // Mark the sales approval history as sent if this was from a sales request
      if (dispatchData.fromSalesRequest) {
        const { fgDispatchService } = await import('./fgDispatchService');
        await fgDispatchService.markSalesRequestAsSent(dispatchData.salesRequestId);
      }
      
      return { dispatchId, ...dispatch };
    } catch (error) {
      throw new Error(`Failed to dispatch direct shop request: ${error.message}`);
    }
  },

  // Notify HO when direct shop request is completed
  async notifyHeadOfOperationsCompletion(requestId, dispatchData) {
    try {
      const notification = {
        type: 'direct_shop_request_completed',
        requestId,
        message: `Direct shop request completed: ${dispatchData.shopName} received ${dispatchData.items?.[0]?.productName}`,
        data: { 
          requestType: 'direct_shop_completion',
          shopName: dispatchData.shopName,
          releaseCode: dispatchData.releaseCode,
          completedAt: Date.now(),
          totalItems: dispatchData.items?.length || 0
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
      console.error('Failed to notify HO of direct shop completion:', error);
    }
  },
  // Record dispatch tracking by recipient type and role
  async recordDispatchTracking(dispatchId, dispatchData) {
    try {
      const currentUser = auth.currentUser;
      
      const trackingRecord = {
        dispatchId,
        recipientType: dispatchData.recipientType, // 'direct_shop', 'distributor', 'direct_representative'
        recipientId: dispatchData.recipientId,
        recipientName: dispatchData.recipientName,
        recipientRole: dispatchData.recipientRole,
        recipientLocation: dispatchData.recipientLocation,
        shopName: dispatchData.shopName,
        totalItems: dispatchData.items.length,
        totalQuantity: this.calculateTotalQuantity(dispatchData.items),
        totalValue: this.calculateTotalValue(dispatchData.items),
        dispatchDate: dispatchData.dispatchedAt,
        releaseCode: dispatchData.releaseCode,
        items: dispatchData.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          variantName: item.variantName,
          batchNumber: item.batchNumber,
          quantity: item.type === 'bulk' ? item.quantity : item.units,
          unit: item.type === 'bulk' ? item.unit : 'units',
          unitPrice: item.unitPrice || 0,
          totalPrice: (item.type === 'bulk' ? item.quantity : item.units) * (item.unitPrice || 0),
          type: item.type
        })),
        createdBy: currentUser?.uid,
        createdByName: currentUser?.displayName || currentUser?.email || 'FG Store Manager',
        createdAt: Date.now()
      };
      
      const trackingId = await pushData('externalDispatchTracking', trackingRecord);
      
      // Also update recipient-specific tracking
      await this.updateRecipientTracking(dispatchData.recipientType, dispatchData.recipientId, trackingRecord);
      
      return { trackingId, ...trackingRecord };
    } catch (error) {
      throw new Error(`Failed to record dispatch tracking: ${error.message}`);
    }
  },

  // Enhanced recipient tracking with role information
  async updateRecipientTracking(recipientType, recipientId, trackingData) {
    try {
      const trackingPath = `${recipientType}Tracking/${recipientId}`;
      const existingTracking = await getData(trackingPath);
      
      const updates = {
        recipientId,
        recipientType,
        recipientName: trackingData.recipientName,
        recipientRole: trackingData.recipientRole,
        recipientLocation: trackingData.recipientLocation,
        shopName: trackingData.shopName,
        totalDispatches: (existingTracking?.totalDispatches || 0) + 1,
        totalItemsReceived: (existingTracking?.totalItemsReceived || 0) + trackingData.totalItems,
        totalQuantityReceived: (existingTracking?.totalQuantityReceived || 0) + trackingData.totalQuantity,
        totalValueReceived: (existingTracking?.totalValueReceived || 0) + trackingData.totalValue,
        lastDispatchDate: trackingData.dispatchDate,
        lastDispatchId: trackingData.dispatchId,
        lastReleaseCode: trackingData.releaseCode,
        lastProductDispatched: trackingData.items?.[0]?.productName || 'Unknown',
        lastQuantityDispatched: trackingData.totalQuantity,
        updatedAt: Date.now()
      };
      
      if (!existingTracking) {
        updates.firstDispatchDate = trackingData.dispatchDate;
        updates.createdAt = Date.now();
      }
      
      await setData(trackingPath, updates);
      
      // Also create a detailed dispatch log for this recipient
      await this.createDetailedDispatchLog(recipientId, trackingData);
      
      return updates;
    } catch (error) {
      throw new Error(`Failed to update recipient tracking: ${error.message}`);
    }
  },

  // Create detailed dispatch log for analytics
  async createDetailedDispatchLog(recipientId, trackingData) {
    try {
      const logEntry = {
        recipientId,
        recipientType: trackingData.recipientType,
        recipientName: trackingData.recipientName,
        recipientRole: trackingData.recipientRole,
        shopName: trackingData.shopName,
        dispatchId: trackingData.dispatchId,
        releaseCode: trackingData.releaseCode,
        dispatchDate: trackingData.dispatchDate,
        items: trackingData.items,
        totalItems: trackingData.totalItems,
        totalQuantity: trackingData.totalQuantity,
        totalValue: trackingData.totalValue,
        createdAt: Date.now()
      };
      
      await pushData(`detailedDispatchLogs/${recipientId}`, logEntry);
      return logEntry;
    } catch (error) {
      console.error('Failed to create detailed dispatch log:', error);
    }
  },

  // Get dispatch analytics by recipient
  async getRecipientDispatchAnalytics(recipientId, recipientType) {
    try {
      const [tracking, detailedLogs] = await Promise.all([
        getData(`${recipientType}Tracking/${recipientId}`),
        getData(`detailedDispatchLogs/${recipientId}`)
      ]);
      
      const analytics = {
        summary: tracking || {},
        recentDispatches: [],
        monthlyTrends: {},
        topProducts: {}
      };
      
      if (detailedLogs) {
        const logs = Object.values(detailedLogs);
        
        // Recent dispatches (last 10)
        analytics.recentDispatches = logs
          .sort((a, b) => b.dispatchDate - a.dispatchDate)
          .slice(0, 10);
        
        // Monthly trends (last 12 months)
        const monthlyData = {};
        logs.forEach(log => {
          const month = new Date(log.dispatchDate).toISOString().slice(0, 7); // YYYY-MM
          if (!monthlyData[month]) {
            monthlyData[month] = { dispatches: 0, quantity: 0, value: 0 };
          }
          monthlyData[month].dispatches += 1;
          monthlyData[month].quantity += log.totalQuantity;
          monthlyData[month].value += log.totalValue;
        });
        analytics.monthlyTrends = monthlyData;
        
        // Top products
        const productData = {};
        logs.forEach(log => {
          log.items.forEach(item => {
            if (!productData[item.productName]) {
              productData[item.productName] = { quantity: 0, value: 0, dispatches: 0 };
            }
            productData[item.productName].quantity += item.quantity;
            productData[item.productName].value += item.totalPrice;
            productData[item.productName].dispatches += 1;
          });
        });
        analytics.topProducts = Object.entries(productData)
          .map(([product, data]) => ({ product, ...data }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);
      }
      
      return analytics;
    } catch (error) {
      throw new Error(`Failed to get recipient analytics: ${error.message}`);
    }
  },
  // Update recipient-specific tracking
  async updateRecipientTracking(recipientType, recipientId, trackingData) {
    try {
      const trackingPath = `${recipientType}Tracking/${recipientId}`;
      const existingTracking = await getData(trackingPath);
      
      const updates = {
        recipientId,
        recipientType,
        recipientName: trackingData.recipientName,
        recipientRole: trackingData.recipientRole,
        totalDispatches: (existingTracking?.totalDispatches || 0) + 1,
        totalItemsReceived: (existingTracking?.totalItemsReceived || 0) + trackingData.totalItems,
        totalQuantityReceived: (existingTracking?.totalQuantityReceived || 0) + trackingData.totalQuantity,
        totalValueReceived: (existingTracking?.totalValueReceived || 0) + trackingData.totalValue,
        lastDispatchDate: trackingData.dispatchDate,
        lastDispatchId: trackingData.dispatchId,
        lastReleaseCode: trackingData.releaseCode,
        updatedAt: Date.now()
      };
      
      if (!existingTracking) {
        updates.firstDispatchDate = trackingData.dispatchDate;
        updates.createdAt = Date.now();
      }
      
      await setData(trackingPath, updates);
      return updates;
    } catch (error) {
      throw new Error(`Failed to update recipient tracking: ${error.message}`);
    }
  },

  // Get dispatch tracking by recipient type
  async getDispatchTrackingByType(recipientType, filters = {}) {
    try {
      const tracking = await getData('externalDispatchTracking');
      if (!tracking) return [];
      
      let filteredTracking = Object.entries(tracking)
        .filter(([_, record]) => record.recipientType === recipientType)
        .map(([id, record]) => ({ id, ...record }));

      if (filters.recipientId) {
        filteredTracking = filteredTracking.filter(record => record.recipientId === filters.recipientId);
      }
      
      if (filters.dateFrom) {
        filteredTracking = filteredTracking.filter(record => record.dispatchDate >= filters.dateFrom);
      }
      
      if (filters.dateTo) {
        filteredTracking = filteredTracking.filter(record => record.dispatchDate <= filters.dateTo);
      }

      return filteredTracking.sort((a, b) => b.dispatchDate - a.dispatchDate);
    } catch (error) {
      throw new Error(`Failed to fetch dispatch tracking: ${error.message}`);
    }
  },

  // Get recipient summary
  async getRecipientSummary(recipientType) {
    try {
      const trackingPath = `${recipientType}Tracking`;
      const tracking = await getData(trackingPath);
      if (!tracking) return [];
      
      return Object.entries(tracking).map(([recipientId, data]) => ({
        recipientId,
        ...data
      })).sort((a, b) => b.lastDispatchDate - a.lastDispatchDate);
    } catch (error) {
      throw new Error(`Failed to fetch recipient summary: ${error.message}`);
    }
  },

  // Get all external dispatches
  async getExternalDispatches(filters = {}) {
    try {
      const dispatches = await getData('externalDispatches');
      if (!dispatches) return [];
      
      let filteredDispatches = Object.entries(dispatches).map(([id, dispatch]) => ({
        id,
        ...dispatch
      }));

      if (filters.recipientType) {
        filteredDispatches = filteredDispatches.filter(d => d.recipientType === filters.recipientType);
      }
      
      if (filters.status) {
        filteredDispatches = filteredDispatches.filter(d => d.status === filters.status);
      }
      
      if (filters.dateFrom) {
        filteredDispatches = filteredDispatches.filter(d => d.dispatchedAt >= filters.dateFrom);
      }

      return filteredDispatches.sort((a, b) => b.dispatchedAt - a.dispatchedAt);
    } catch (error) {
      throw new Error(`Failed to fetch external dispatches: ${error.message}`);
    }
  },

  // Get pending sales requests that need to be dispatched
  async getPendingSalesRequests() {
    try {
      const salesHistory = await getData('salesApprovalHistory');
      if (!salesHistory) return [];
      
      // Filter approved requests that haven't been completed by FG yet
      const pendingRequests = Object.entries(salesHistory)
        .filter(([_, request]) => request.status === 'Approved' && !request.isCompletedByFG)
        .map(([id, request]) => ({ id, ...request }));
      
      return pendingRequests.sort((a, b) => b.approvedAt - a.approvedAt);
    } catch (error) {
      throw new Error(`Failed to fetch pending sales requests: ${error.message}`);
    }
  },

  // Calculate totals
  calculateTotalQuantity(items) {
    return items.reduce((sum, item) => {
      return sum + (item.type === 'bulk' ? (item.quantity || 0) : (item.units || 0));
    }, 0);
  },

  calculateTotalValue(items) {
    return items.reduce((sum, item) => {
      const quantity = item.type === 'bulk' ? (item.quantity || 0) : (item.units || 0);
      return sum + (quantity * (item.unitPrice || 0));
    }, 0);
  },

  // Generate release code
  generateReleaseCode() {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const time = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    return `${year}${month}${day}${time}${random}`;
  },

  // Notify mobile app about dispatch
  async notifyMobileApp(dispatchId, dispatchData) {
    try {
      const notification = {
        type: 'dispatch_notification',
        dispatchId,
        recipientId: dispatchData.recipientId,
        recipientType: dispatchData.recipientType,
        shopName: dispatchData.shopName,
        releaseCode: dispatchData.releaseCode,
        totalItems: dispatchData.items.length,
        totalQuantity: this.calculateTotalQuantity(dispatchData.items),
        totalValue: this.calculateTotalValue(dispatchData.items),
        dispatchDate: dispatchData.dispatchedAt,
        status: 'dispatched',
        message: `Your order has been dispatched from FG Store`,
        productName: dispatchData.items?.[0]?.productName || 'Product',
        quantity: dispatchData.items?.[0]?.quantity || 0,
        timestamp: Date.now()
      };
      
      await pushData(`mobileNotifications/${dispatchData.recipientId}`, notification);
      
      // Also create a general mobile notification for the request
      if (dispatchData.requestId) {
        await pushData(`mobileNotifications/${dispatchData.requestId}`, {
          ...notification,
          requestId: dispatchData.requestId
        });
      }
    } catch (error) {
      console.error('Failed to notify mobile app:', error);
    }
  }
};