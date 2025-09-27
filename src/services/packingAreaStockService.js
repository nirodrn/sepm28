import { getData, setData, updateData, pushData } from '../firebase/db';
import { auth } from '../firebase/auth';

export const packingAreaStockService = {
  // Receive Product Batches from Production
  async receiveProductBatch(handoverId, receiptData) {
    try {
      const currentUser = auth.currentUser;
      
      // Get handover data
      const handover = await getData(`batchHandovers/${handoverId}`);
      if (!handover) {
        throw new Error('Handover not found');
      }
      
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
      
      // Add to packing area stock
      await this.addToPackingStock({
        handoverId: handoverId,
        batchId: handover.batchId,
        batchNumber: handover.batchNumber,
        productId: handover.productId,
        productName: handover.productName,
        quantity: handover.quantity,
        unit: handover.unit,
        qualityGrade: handover.qualityGrade || 'A',
        expiryDate: handover.expiryDate,
        storageInstructions: handover.storageInstructions,
        location: receiptData.location || 'PACK-A1',
        status: 'available',
        receivedFrom: 'production'
      });
      
      return true;
    } catch (error) {
      throw new Error(`Failed to receive product batch: ${error.message}`);
    }
  },

  // Add to Packing Area Stock
  async addToPackingStock(stockData) {
    try {
      const currentUser = auth.currentUser;
      
      const stockEntry = {
        handoverId: stockData.handoverId,
        batchId: stockData.batchId,
        batchNumber: stockData.batchNumber,
        productId: stockData.productId,
        productName: stockData.productName,
        quantity: Number(stockData.quantity) || 0,
        unit: stockData.unit,
        qualityGrade: stockData.qualityGrade,
        expiryDate: stockData.expiryDate,
        storageInstructions: stockData.storageInstructions,
        location: stockData.location,
        status: stockData.status || 'available',
        receivedFrom: stockData.receivedFrom,
        receivedBy: currentUser?.uid,
        receivedByName: currentUser?.displayName || currentUser?.email || 'Packing Area Manager',
        receivedAt: Date.now(),
        createdAt: Date.now()
      };
      
      const id = await pushData('packingAreaStock', stockEntry);
      
      // Record stock movement
      await this.recordStockMovement({
        stockId: id,
        batchId: stockData.batchId,
        batchNumber: stockData.batchNumber,
        productId: stockData.productId,
        productName: stockData.productName,
        type: 'in',
        quantity: Number(stockData.quantity) || 0,
        reason: `Received from Production - Handover ${stockData.handoverId}`,
        location: stockData.location
      });
      
      return { id, ...stockEntry };
    } catch (error) {
      throw new Error(`Failed to add to packing stock: ${error.message}`);
    }
  },

  // Get Packing Area Stock
  async getPackingStock(filters = {}) {
    try {
      const stock = await getData('packingAreaStock');
      if (!stock) return [];
      
      let filteredStock = Object.entries(stock).map(([id, item]) => ({
        id,
        ...item
      }));

      if (filters.status) {
        filteredStock = filteredStock.filter(item => item.status === filters.status);
      }
      
      if (filters.productId) {
        filteredStock = filteredStock.filter(item => item.productId === filters.productId);
      }
      
      if (filters.location) {
        filteredStock = filteredStock.filter(item => item.location === filters.location);
      }

      return filteredStock.sort((a, b) => b.receivedAt - a.receivedAt);
    } catch (error) {
      throw new Error(`Failed to fetch packing stock: ${error.message}`);
    }
  },

  // Update Stock Status
  async updateStockStatus(stockId, status, notes = '') {
    try {
      const currentUser = auth.currentUser;
      const updates = {
        status,
        statusNotes: notes,
        statusUpdatedAt: Date.now(),
        statusUpdatedBy: currentUser?.uid,
        updatedAt: Date.now()
      };
      
      await updateData(`packingAreaStock/${stockId}`, updates);
      return updates;
    } catch (error) {
      throw new Error(`Failed to update stock status: ${error.message}`);
    }
  },

  // Update Stock Location
  async updateStockLocation(stockId, newLocation) {
    try {
      const currentUser = auth.currentUser;
      
      // Validate location exists
      const locations = await getData('packingAreaLocations');
      let locationExists = false;
      if (locations) {
        locationExists = Object.values(locations).some(loc => 
          loc.code === newLocation && loc.status === 'active'
        );
      }
      
      // If location doesn't exist in database, still allow update (for backward compatibility)
      if (!locationExists) {
        console.warn(`Location ${newLocation} not found in database, but allowing update for backward compatibility`);
      }
      
      const updates = {
        location: newLocation,
        locationUpdatedAt: Date.now(),
        locationUpdatedBy: currentUser?.uid,
        updatedAt: Date.now()
      };
      
      await updateData(`packingAreaStock/${stockId}`, updates);
      
      // Record movement
      const stockItem = await getData(`packingAreaStock/${stockId}`);
      if (stockItem) {
        await this.recordStockMovement({
          stockId,
          batchId: stockItem.batchId,
          batchNumber: stockItem.batchNumber,
          productId: stockItem.productId,
          productName: stockItem.productName,
          type: 'location_change',
          quantity: 0,
          reason: `Location changed to ${newLocation}`,
          location: newLocation
        });
      }
      
      return updates;
    } catch (error) {
      throw new Error(`Failed to update stock location: ${error.message}`);
    }
  },

  // Issue Stock for Packing
  async issueStockForPacking(stockId, issueData) {
    try {
      const currentUser = auth.currentUser;
      const stockItem = await getData(`packingAreaStock/${stockId}`);
      
      if (!stockItem) {
        throw new Error('Stock item not found');
      }
      
      const issueQuantity = Number(issueData.quantity) || 0;
      const currentQuantity = Number(stockItem.quantity) || 0;
      
      if (issueQuantity > currentQuantity) {
        throw new Error('Issue quantity cannot exceed available stock');
      }
      
      const newQuantity = currentQuantity - issueQuantity;
      
      // Update stock quantity
      await updateData(`packingAreaStock/${stockId}`, {
        quantity: newQuantity,
        lastIssued: Date.now(),
        lastIssuedBy: currentUser?.uid,
        status: newQuantity === 0 ? 'depleted' : stockItem.status,
        updatedAt: Date.now()
      });
      
      // Record stock movement
      await this.recordStockMovement({
        stockId,
        batchId: stockItem.batchId,
        batchNumber: stockItem.batchNumber,
        productId: stockItem.productId,
        productName: stockItem.productName,
        type: 'out',
        quantity: issueQuantity,
        reason: issueData.reason || 'Issued for packing operations',
        location: stockItem.location,
        issuedTo: issueData.issuedTo || 'Packing Line',
        packingLine: issueData.packingLine
      });
      
      return { newQuantity, issued: issueQuantity };
    } catch (error) {
      throw new Error(`Failed to issue stock: ${error.message}`);
    }
  },

  // Record Stock Movement
  async recordStockMovement(movementData) {
    try {
      const currentUser = auth.currentUser;
      const movement = {
        ...movementData,
        createdBy: currentUser?.uid,
        createdByName: currentUser?.displayName || currentUser?.email || 'Packing Area Manager',
        createdAt: Date.now()
      };
      
      const id = await pushData('packingAreaStockMovements', movement);
      return { id, ...movement };
    } catch (error) {
      throw new Error(`Failed to record stock movement: ${error.message}`);
    }
  },

  // Get Stock Movements
  async getStockMovements(filters = {}) {
    try {
      const movements = await getData('packingAreaStockMovements');
      if (!movements) return [];
      
      let filteredMovements = Object.entries(movements).map(([id, movement]) => ({
        id,
        ...movement
      }));

      if (filters.stockId) {
        filteredMovements = filteredMovements.filter(movement => movement.stockId === filters.stockId);
      }
      
      if (filters.batchId) {
        filteredMovements = filteredMovements.filter(movement => movement.batchId === filters.batchId);
      }
      
      if (filters.productId) {
        filteredMovements = filteredMovements.filter(movement => movement.productId === filters.productId);
      }

      return filteredMovements.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      throw new Error(`Failed to fetch stock movements: ${error.message}`);
    }
  },

  // Get Pending Handovers
  async getPendingHandovers() {
    try {
      const handovers = await getData('batchHandovers');
      if (!handovers) return [];
      
      return Object.entries(handovers)
        .filter(([_, handover]) => !handover.receivedByPacking)
        .map(([id, handover]) => ({ id, ...handover }))
        .sort((a, b) => b.handoverDate - a.handoverDate);
    } catch (error) {
      throw new Error(`Failed to fetch pending handovers: ${error.message}`);
    }
  },

  // Get Stock Summary
  async getStockSummary() {
    try {
      const stock = await this.getPackingStock();
      
      const totalItems = stock.length;
      const availableItems = stock.filter(item => item.status === 'available').length;
      const inUseItems = stock.filter(item => item.status === 'in_use').length;
      const depletedItems = stock.filter(item => item.status === 'depleted').length;
      const totalQuantity = stock.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
      
      // Get expiry alerts (items expiring within 30 days)
      const currentDate = new Date();
      const alertDate = new Date(currentDate.getTime() + (30 * 24 * 60 * 60 * 1000));
      const expiringItems = stock.filter(item => {
        if (!item.expiryDate) return false;
        const expiryDate = new Date(item.expiryDate);
        return expiryDate <= alertDate;
      }).length;

      return {
        totalItems,
        availableItems,
        inUseItems,
        depletedItems,
        totalQuantity,
        expiringItems
      };
    } catch (error) {
      throw new Error(`Failed to get stock summary: ${error.message}`);
    }
  },

  // Get Expiry Alerts
  async getExpiryAlerts(daysAhead = 30) {
    try {
      const stock = await this.getPackingStock();
      const currentDate = new Date();
      const alertDate = new Date(currentDate.getTime() + (daysAhead * 24 * 60 * 60 * 1000));

      return stock.filter(item => {
        if (!item.expiryDate) return false;
        const expiryDate = new Date(item.expiryDate);
        return expiryDate <= alertDate;
      }).map(item => ({
        ...item,
        daysToExpiry: Math.ceil((new Date(item.expiryDate) - currentDate) / (24 * 60 * 60 * 1000)),
        alertLevel: this.getExpiryAlertLevel(item.expiryDate)
      })).sort((a, b) => a.daysToExpiry - b.daysToExpiry);
    } catch (error) {
      throw new Error(`Failed to get expiry alerts: ${error.message}`);
    }
  },

  getExpiryAlertLevel(expiryDate) {
    if (!expiryDate) return 'none';
    
    const daysToExpiry = Math.ceil((new Date(expiryDate) - new Date()) / (24 * 60 * 60 * 1000));
    
    if (daysToExpiry <= 0) return 'expired';
    if (daysToExpiry <= 7) return 'critical';
    if (daysToExpiry <= 14) return 'warning';
    if (daysToExpiry <= 30) return 'caution';
    return 'good';
  }
};