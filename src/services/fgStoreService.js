import { getData, setData, updateData, pushData } from '../firebase/db';
import { auth } from '../firebase/auth';

export const fgStoreService = {
  // Get pending dispatches from Packing Area
  async getPendingDispatches() {
    try {
      const [bulkDispatches, unitDispatches] = await Promise.all([
        getData('fgDispatches'),
        getData('fgUnitDispatches')
      ]);
      
      const pending = [];
      
      // Process bulk dispatches
      if (bulkDispatches) {
        Object.entries(bulkDispatches)
          .filter(([_, dispatch]) => !dispatch.claimedByFG)
          .forEach(([id, dispatch]) => {
            pending.push({
              id,
              ...dispatch,
              type: 'bulk',
              dispatchDate: dispatch.dispatchedAt
            });
          });
      }
      
      // Process unit dispatches
      if (unitDispatches) {
        Object.entries(unitDispatches)
          .filter(([_, dispatch]) => !dispatch.claimedByFG)
          .forEach(([id, dispatch]) => {
            pending.push({
              id,
              ...dispatch,
              type: 'units',
              dispatchDate: dispatch.dispatchedAt
            });
          });
      }
      
      return pending.sort((a, b) => b.dispatchDate - a.dispatchDate);
    } catch (error) {
      throw new Error(`Failed to fetch pending dispatches: ${error.message}`);
    }
  },

  // Get claimed dispatches
  async getClaimedDispatches() {
    try {
      const [bulkDispatches, unitDispatches] = await Promise.all([
        getData('fgDispatches'),
        getData('fgUnitDispatches')
      ]);
      
      const claimed = [];
      
      // Process bulk dispatches
      if (bulkDispatches) {
        Object.entries(bulkDispatches)
          .filter(([_, dispatch]) => dispatch.claimedByFG)
          .forEach(([id, dispatch]) => {
            claimed.push({
              id,
              ...dispatch,
              type: 'bulk',
              dispatchDate: dispatch.dispatchedAt
            });
          });
      }
      
      // Process unit dispatches
      if (unitDispatches) {
        Object.entries(unitDispatches)
          .filter(([_, dispatch]) => dispatch.claimedByFG)
          .forEach(([id, dispatch]) => {
            claimed.push({
              id,
              ...dispatch,
              type: 'units',
              dispatchDate: dispatch.dispatchedAt
            });
          });
      }
      
      return claimed.sort((a, b) => b.claimedAt - a.claimedAt);
    } catch (error) {
      throw new Error(`Failed to fetch claimed dispatches: ${error.message}`);
    }
  },

  // Claim bulk dispatch
  async claimBulkDispatch(dispatchId, claimData) {
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
        storageLocation: claimData.location || 'FG-A1',
        updatedAt: Date.now()
      };
      
      await updateData(`fgDispatches/${dispatchId}`, updates);
      
      // Add to FG Store inventory
      for (const item of dispatch.items) {
        await this.addToInventory({
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
          receivedFrom: 'packing_area',
          dispatchType: 'bulk'
        });
      }
      
      return updates;
    } catch (error) {
      throw new Error(`Failed to claim bulk dispatch: ${error.message}`);
    }
  },

  // Claim unit dispatch
  async claimUnitDispatch(dispatchId, claimData) {
    try {
      const currentUser = auth.currentUser;
      const dispatch = await getData(`fgUnitDispatches/${dispatchId}`);
      
      if (!dispatch) {
        throw new Error('Unit dispatch not found');
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
        storageLocation: claimData.location || 'FG-A1',
        updatedAt: Date.now()
      };
      
      await updateData(`fgUnitDispatches/${dispatchId}`, updates);
      
      // Add packaged units to FG Store inventory
      for (const item of dispatch.items) {
        await this.addPackagedUnitsToInventory({
          productId: item.productId,
          productName: item.productName,
          variantName: item.variantName,
          batchNumber: item.batchNumber,
          unitsReceived: item.unitsToExport,
          variantSize: item.variantSize,
          variantUnit: item.variantUnit,
          qualityGrade: item.qualityGrade,
          expiryDate: item.expiryDate,
          location: claimData.location || 'FG-A1',
          releaseCode: dispatch.releaseCode,
          dispatchId: dispatchId,
          receivedFrom: 'packing_area',
          dispatchType: 'units'
        });
      }
      
      return updates;
    } catch (error) {
      throw new Error(`Failed to claim unit dispatch: ${error.message}`);
    }
  },

  // Add bulk products to FG inventory
  async addToInventory(inventoryData) {
    try {
      const currentUser = auth.currentUser;
      const inventoryKey = `${inventoryData.productId}_${inventoryData.batchNumber}`;
      const existingInventory = await getData(`finishedGoodsInventory/${inventoryKey}`);
      
      if (existingInventory) {
        // Update existing inventory
        const currentQuantity = Number(existingInventory.quantity) || 0;
        const newQuantity = currentQuantity + (Number(inventoryData.quantity) || 0);
        
        await updateData(`finishedGoodsInventory/${inventoryKey}`, {
          quantity: newQuantity,
          lastReceived: Date.now(),
          lastReleaseCode: inventoryData.releaseCode,
          location: inventoryData.location,
          updatedAt: Date.now(),
          updatedBy: currentUser?.uid
        });
      } else {
        // Create new inventory entry
        await setData(`finishedGoodsInventory/${inventoryKey}`, {
          productId: inventoryData.productId,
          productName: inventoryData.productName,
          batchNumber: inventoryData.batchNumber,
          quantity: Number(inventoryData.quantity) || 0,
          unit: inventoryData.unit,
          qualityGrade: inventoryData.qualityGrade,
          expiryDate: inventoryData.expiryDate,
          releaseCode: inventoryData.releaseCode,
          location: inventoryData.location,
          receivedFrom: inventoryData.receivedFrom,
          dispatchType: inventoryData.dispatchType,
          dispatchId: inventoryData.dispatchId,
          createdAt: Date.now(),
          createdBy: currentUser?.uid
        });
      }
      
      // Record inventory movement
      await this.recordInventoryMovement({
        productId: inventoryData.productId,
        batchNumber: inventoryData.batchNumber,
        type: 'in',
        quantity: Number(inventoryData.quantity) || 0,
        reason: `Received from Packing Area - Release Code: ${inventoryData.releaseCode}`,
        location: inventoryData.location,
        releaseCode: inventoryData.releaseCode,
        dispatchId: inventoryData.dispatchId,
        dispatchType: inventoryData.dispatchType
      });
      
    } catch (error) {
      throw new Error(`Failed to add to inventory: ${error.message}`);
    }
  },

  // Add packaged units to FG inventory
  async addPackagedUnitsToInventory(inventoryData) {
    try {
      const currentUser = auth.currentUser;
      const inventoryKey = `${inventoryData.productId}_${inventoryData.variantName}_${inventoryData.batchNumber}`;
      const existingInventory = await getData(`finishedGoodsPackagedInventory/${inventoryKey}`);
      
      if (existingInventory) {
        // Update existing packaged inventory
        const currentUnits = Number(existingInventory.unitsInStock) || 0;
        const newUnits = currentUnits + (Number(inventoryData.unitsReceived) || 0);
        
        await updateData(`finishedGoodsPackagedInventory/${inventoryKey}`, {
          unitsInStock: newUnits,
          lastReceived: Date.now(),
          lastReleaseCode: inventoryData.releaseCode,
          location: inventoryData.location,
          updatedAt: Date.now(),
          updatedBy: currentUser?.uid
        });
      } else {
        // Create new packaged inventory entry
        await setData(`finishedGoodsPackagedInventory/${inventoryKey}`, {
          productId: inventoryData.productId,
          productName: inventoryData.productName,
          variantName: inventoryData.variantName,
          batchNumber: inventoryData.batchNumber,
          unitsInStock: Number(inventoryData.unitsReceived) || 0,
          variantSize: inventoryData.variantSize,
          variantUnit: inventoryData.variantUnit,
          qualityGrade: inventoryData.qualityGrade,
          expiryDate: inventoryData.expiryDate,
          releaseCode: inventoryData.releaseCode,
          location: inventoryData.location,
          receivedFrom: inventoryData.receivedFrom,
          dispatchType: inventoryData.dispatchType,
          dispatchId: inventoryData.dispatchId,
          createdAt: Date.now(),
          createdBy: currentUser?.uid
        });
      }
      
      // Record packaged inventory movement
      await this.recordPackagedInventoryMovement({
        productId: inventoryData.productId,
        variantName: inventoryData.variantName,
        batchNumber: inventoryData.batchNumber,
        type: 'in',
        units: Number(inventoryData.unitsReceived) || 0,
        reason: `Received packaged units from Packing Area - Release Code: ${inventoryData.releaseCode}`,
        location: inventoryData.location,
        releaseCode: inventoryData.releaseCode,
        dispatchId: inventoryData.dispatchId
      });
      
    } catch (error) {
      throw new Error(`Failed to add packaged units to inventory: ${error.message}`);
    }
  },

  // Get FG inventory (bulk products)
  async getInventory(filters = {}) {
    try {
      const inventory = await getData('finishedGoodsInventory');
      if (!inventory) return [];
      
      let filteredInventory = Object.entries(inventory).map(([id, item]) => ({
        id,
        ...item
      }));

      if (filters.productId) {
        filteredInventory = filteredInventory.filter(item => item.productId === filters.productId);
      }
      
      if (filters.location) {
        filteredInventory = filteredInventory.filter(item => item.location === filters.location);
      }

      return filteredInventory.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      throw new Error(`Failed to fetch inventory: ${error.message}`);
    }
  },

  // Get packaged inventory
  async getPackagedInventory(filters = {}) {
    try {
      const inventory = await getData('finishedGoodsPackagedInventory');
      if (!inventory) return [];
      
      let filteredInventory = Object.entries(inventory).map(([id, item]) => ({
        id,
        ...item
      }));

      if (filters.productId) {
        filteredInventory = filteredInventory.filter(item => item.productId === filters.productId);
      }
      
      if (filters.location) {
        filteredInventory = filteredInventory.filter(item => item.location === filters.location);
      }

      return filteredInventory.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      throw new Error(`Failed to fetch packaged inventory: ${error.message}`);
    }
  },

  // Record inventory movement for bulk products
  async recordInventoryMovement(movementData) {
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
      throw new Error(`Failed to record inventory movement: ${error.message}`);
    }
  },

  // Record packaged inventory movement
  async recordPackagedInventoryMovement(movementData) {
    try {
      const currentUser = auth.currentUser;
      const movement = {
        ...movementData,
        createdBy: currentUser?.uid,
        createdByName: currentUser?.displayName || currentUser?.email || 'FG Store Manager',
        createdAt: Date.now()
      };
      
      const id = await pushData('fgPackagedInventoryMovements', movement);
      return { id, ...movement };
    } catch (error) {
      throw new Error(`Failed to record packaged inventory movement: ${error.message}`);
    }
  },

  // Get dashboard statistics
  async getDashboardStats() {
    try {
      const [bulkInventory, packagedInventory, pendingDispatches] = await Promise.all([
        this.getInventory(),
        this.getPackagedInventory(),
        this.getPendingDispatches()
      ]);
      
      const totalBulkItems = bulkInventory.length;
      const totalPackagedItems = packagedInventory.length;
      const totalItems = totalBulkItems + totalPackagedItems;
      
      const totalBulkQuantity = bulkInventory.reduce((sum, item) => sum + (item.quantity || 0), 0);
      const totalPackagedUnits = packagedInventory.reduce((sum, item) => sum + (item.unitsInStock || 0), 0);
      
      // Calculate expiring items (within 30 days)
      const currentDate = new Date();
      const alertDate = new Date(currentDate.getTime() + (30 * 24 * 60 * 60 * 1000));
      
      const expiringBulkItems = bulkInventory.filter(item => {
        if (!item.expiryDate) return false;
        return new Date(item.expiryDate) <= alertDate;
      }).length;
      
      const expiringPackagedItems = packagedInventory.filter(item => {
        if (!item.expiryDate) return false;
        return new Date(item.expiryDate) <= alertDate;
      }).length;
      
      const expiringItems = expiringBulkItems + expiringPackagedItems;
      
      return {
        totalItems,
        totalBulkItems,
        totalPackagedItems,
        totalBulkQuantity,
        totalPackagedUnits,
        expiringItems,
        pendingClaims: pendingDispatches.length
      };
    } catch (error) {
      throw new Error(`Failed to get dashboard stats: ${error.message}`);
    }
  },

  // Get expiry alerts
  async getExpiryAlerts(daysAhead = 30) {
    try {
      const [bulkInventory, packagedInventory] = await Promise.all([
        this.getInventory(),
        this.getPackagedInventory()
      ]);
      
      const currentDate = new Date();
      const alertDate = new Date(currentDate.getTime() + (daysAhead * 24 * 60 * 60 * 1000));
      
      const alerts = [];
      
      // Check bulk inventory
      bulkInventory.forEach(item => {
        if (item.expiryDate && new Date(item.expiryDate) <= alertDate) {
          alerts.push({
            ...item,
            type: 'bulk',
            daysToExpiry: Math.ceil((new Date(item.expiryDate) - currentDate) / (24 * 60 * 60 * 1000)),
            alertLevel: this.getExpiryAlertLevel(item.expiryDate)
          });
        }
      });
      
      // Check packaged inventory
      packagedInventory.forEach(item => {
        if (item.expiryDate && new Date(item.expiryDate) <= alertDate) {
          alerts.push({
            ...item,
            type: 'units',
            daysToExpiry: Math.ceil((new Date(item.expiryDate) - currentDate) / (24 * 60 * 60 * 1000)),
            alertLevel: this.getExpiryAlertLevel(item.expiryDate)
          });
        }
      });
      
      return alerts.sort((a, b) => a.daysToExpiry - b.daysToExpiry);
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
  },

  // Get recent stock movements
  async getRecentMovements(limit = 10) {
    try {
      const [bulkMovements, packagedMovements] = await Promise.all([
        getData('fgInventoryMovements'),
        getData('fgPackagedInventoryMovements')
      ]);
      
      const movements = [];
      
      if (bulkMovements) {
        Object.entries(bulkMovements).forEach(([id, movement]) => {
          movements.push({
            id,
            ...movement,
            type: 'bulk',
            displayText: `${movement.productName} (Bulk - ${movement.batchNumber}): ${movement.type === 'in' ? '+' : '-'}${movement.quantity} ${movement.unit || 'units'}`
          });
        });
      }
      
      if (packagedMovements) {
        Object.entries(packagedMovements).forEach(([id, movement]) => {
          movements.push({
            id,
            ...movement,
            type: 'units',
            displayText: `${movement.productName} - ${movement.variantName} (${movement.batchNumber}): ${movement.type === 'in' ? '+' : '-'}${movement.units} units`
          });
        });
      }
      
      return movements
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit);
    } catch (error) {
      throw new Error(`Failed to get recent movements: ${error.message}`);
    }
  }
};