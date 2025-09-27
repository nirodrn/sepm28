import { getData, setData, updateData, pushData } from '../firebase/db';
import { auth } from '../firebase/auth';
import { materialService } from './materialService';

export const productionStoreService = {
  // Get production inventory (materials available in production store)
  async getProductionInventory() {
    try {
      const [rawMaterials, stockMovements] = await Promise.all([
        materialService.getRawMaterials(),
        getData('productionStockMovements')
      ]);

      if (!rawMaterials || rawMaterials.length === 0) return [];

      // Calculate production store inventory
      const inventory = rawMaterials.map(material => {
        // Get movements for this material in production store
        const materialMovements = stockMovements ? 
          Object.values(stockMovements).filter(movement => 
            movement.materialId === material.id && movement.location === 'production_store'
          ) : [];

        // Calculate current production store stock
        const productionStock = materialMovements.reduce((stock, movement) => {
          return movement.type === 'in' ? stock + (movement.quantity || 0) : stock - (movement.quantity || 0);
        }, 0);

        // Get last received info
        const lastInMovement = materialMovements
          .filter(m => m.type === 'in')
          .sort((a, b) => b.createdAt - a.createdAt)[0];

        return {
          materialId: material.id,
          materialName: material.name,
          materialCode: material.code,
          category: material.category,
          currentStock: Math.max(0, productionStock),
          minimumStock: material.productionMinStock || material.reorderLevel || 10,
          unit: material.unit,
          lastReceived: lastInMovement?.createdAt || null,
          lastBatchNumber: lastInMovement?.batchNumber,
          location: 'Production Store',
          qualityGrade: material.qualityGrade || 'A'
        };
      }).filter(item => item.currentStock > 0); // Only show items with stock

      return inventory.sort((a, b) => a.materialName.localeCompare(b.materialName));
    } catch (error) {
      throw new Error(`Failed to fetch production inventory: ${error.message}`);
    }
  },

  // Check if material has sufficient stock for batch creation
  async checkMaterialAvailability(materialId, requiredQuantity) {
    try {
      const inventory = await this.getProductionInventory();
      const material = inventory.find(item => item.materialId === materialId);
      
      if (!material) {
        return {
          available: false,
          currentStock: 0,
          requiredQuantity,
          shortfall: requiredQuantity,
          status: 'not_in_store'
        };
      }
      
      const available = material.currentStock >= requiredQuantity;
      
      return {
        available,
        currentStock: material.currentStock,
        requiredQuantity,
        shortfall: available ? 0 : requiredQuantity - material.currentStock,
        status: available ? 'sufficient' : 'insufficient',
        materialName: material.materialName,
        unit: material.unit
      };
    } catch (error) {
      throw new Error(`Failed to check material availability: ${error.message}`);
    }
  },

  // Get recent stock movements in production store
  async getRecentMovements(limit = 10) {
    try {
      const movements = await getData('productionStockMovements');
      if (!movements) return [];

      return Object.entries(movements)
        .map(([id, movement]) => ({ id, ...movement }))
        .filter(movement => movement.location === 'production_store')
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit);
    } catch (error) {
      throw new Error(`Failed to fetch recent movements: ${error.message}`);
    }
  },

  // Get low stock alerts for production store
  async getLowStockAlerts() {
    try {
      const inventory = await this.getProductionInventory();
      
      return inventory.filter(item => {
        const currentStock = Number(item.currentStock) || 0;
        const minimumStock = Number(item.minimumStock) || 0;
        return currentStock <= minimumStock;
      }).map(item => ({
        ...item,
        alertLevel: item.currentStock <= item.minimumStock * 0.5 ? 'critical' : 'warning'
      })).sort((a, b) => a.currentStock - b.currentStock);
    } catch (error) {
      throw new Error(`Failed to get low stock alerts: ${error.message}`);
    }
  },

  // Get pending material requests from production
  async getPendingRequests() {
    try {
      const requests = await getData('productionRawMaterialRequests');
      if (!requests) return [];

      return Object.entries(requests)
        .map(([id, request]) => ({ id, ...request }))
        .filter(request => ['pending_warehouse', 'dispatched'].includes(request.status))
        .sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      throw new Error(`Failed to fetch pending requests: ${error.message}`);
    }
  },

  // Record material receipt in production store (from warehouse)
  async receiveFromWarehouse(receiptData) {
    try {
      const currentUser = auth.currentUser;
      const movement = {
        materialId: receiptData.materialId,
        materialName: receiptData.materialName,
        type: 'in',
        quantity: Number(receiptData.quantity) || 0,
        unit: receiptData.unit,
        reason: `Received from Warehouse - ${receiptData.dispatchId || 'Direct Transfer'}`,
        batchNumber: receiptData.batchNumber,
        location: 'production_store',
        fromLocation: 'warehouse',
        dispatchId: receiptData.dispatchId,
        qualityGrade: receiptData.qualityGrade || 'A',
        receivedBy: currentUser?.uid,
        receivedByName: currentUser?.displayName || currentUser?.email || 'Production Manager',
        createdAt: Date.now()
      };

      const id = await pushData('productionStockMovements', movement);
      return { id, ...movement };
    } catch (error) {
      throw new Error(`Failed to record material receipt: ${error.message}`);
    }
  },

  // Issue materials for batch production
  async issueMaterialsForBatch(batchId, materialUsage) {
    try {
      const currentUser = auth.currentUser;
      const movements = [];

      for (const usage of materialUsage) {
        const movement = {
          materialId: usage.materialId,
          materialName: usage.materialName,
          type: 'out',
          quantity: Number(usage.quantity) || 0,
          unit: usage.unit,
          reason: `Issued for Batch Production - ${usage.batchNumber}`,
          batchId: batchId,
          batchNumber: usage.batchNumber,
          location: 'production_store',
          toLocation: 'production_line',
          issuedBy: currentUser?.uid,
          issuedByName: currentUser?.displayName || currentUser?.email || 'Production Manager',
          createdAt: Date.now()
        };

        const id = await pushData('productionStockMovements', movement);
        movements.push({ id, ...movement });
      }

      return movements;
    } catch (error) {
      throw new Error(`Failed to issue materials for batch: ${error.message}`);
    }
  }
};