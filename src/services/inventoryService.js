import { getData, setData, updateData, pushData } from '../firebase/db';
import { auth } from '../firebase/auth';

export const inventoryService = {
  // Stock Movements
  async recordStockMovement(movementData) {
    try {
      // Validate required fields
      if (!movementData.materialId || !movementData.type || movementData.quantity === undefined || movementData.quantity === null) {
        throw new Error('Missing required fields: materialId, type, and quantity are required');
      }
      
      // Ensure quantity is a valid number
      const validatedQuantity = Number(movementData.quantity) || 0;
      
      const movement = {
        ...movementData,
        quantity: validatedQuantity,
        createdBy: auth.currentUser?.uid,
        createdAt: Date.now()
      };
      
      const id = await pushData('stockMovements', movement);
      
      // Update material stock levels
      if (movementData.materialType === 'rawMaterial') {
        await this.updateRawMaterialStock(movementData.materialId, validatedQuantity, movementData.type);
      } else if (movementData.materialType === 'packingMaterial') {
        await this.updatePackingMaterialStock(movementData.materialId, validatedQuantity, movementData.type);
      }
      
      return { id, ...movement };
    } catch (error) {
      throw new Error(`Failed to record stock movement: ${error.message}`);
    }
  },

  async updateRawMaterialStock(materialId, quantity, type) {
    try {
      const material = await getData(`rawMaterials/${materialId}`);
      if (!material) throw new Error('Material not found');
      
      // Ensure currentStock is a valid number
      const currentStock = Number(material.currentStock) || 0;
      const quantityToUpdate = Number(quantity) || 0;
      
      const newStock = type === 'in' 
        ? currentStock + quantityToUpdate 
        : currentStock - quantityToUpdate;
      
      await updateData(`rawMaterials/${materialId}`, {
        currentStock: Math.max(0, newStock),
        lastUpdated: Date.now()
      });
    } catch (error) {
      throw new Error(`Failed to update raw material stock: ${error.message}`);
    }
  },

  async updatePackingMaterialStock(materialId, quantity, type) {
    try {
      const material = await getData(`packingMaterials/${materialId}`);
      if (!material) throw new Error('Material not found');
      
      // Ensure currentStock is a valid number
      const currentStock = Number(material.currentStock) || 0;
      const quantityToUpdate = Number(quantity) || 0;
      
      const newStock = type === 'in' 
        ? currentStock + quantityToUpdate 
        : currentStock - quantityToUpdate;
      
      await updateData(`packingMaterials/${materialId}`, {
        currentStock: Math.max(0, newStock),
        lastUpdated: Date.now()
      });
    } catch (error) {
      throw new Error(`Failed to update packing material stock: ${error.message}`);
    }
  },

  // QC Records
  async recordQCData(qcData) {
    try {
      const qcRecord = {
        ...qcData,
        qcOfficer: auth.currentUser?.uid,
        createdAt: Date.now()
      };
      
      const id = await pushData('qcRecords', qcRecord);
      
      // Update material quality grade
      const materialPath = qcData.materialType === 'rawMaterial' 
        ? `rawMaterials/${qcData.materialId}`
        : `packingMaterials/${qcData.materialId}`;
      
      await updateData(materialPath, {
        qualityGrade: qcData.overallGrade,
        lastQCDate: qcData.qcDate,
        lastQCStatus: qcData.acceptanceStatus
      });
      
      return { id, ...qcRecord };
    } catch (error) {
      throw new Error(`Failed to record QC data: ${error.message}`);
    }
  },

  async getQCRecords(filters = {}) {
    try {
      const records = await getData('qcRecords');
      if (!records) return [];
      
      let filteredRecords = Object.entries(records).map(([id, record]) => ({
        id,
        ...record
      }));

      if (filters.materialId) {
        filteredRecords = filteredRecords.filter(record => record.materialId === filters.materialId);
      }
      
      if (filters.materialType) {
        filteredRecords = filteredRecords.filter(record => record.materialType === filters.materialType);
      }

      return filteredRecords.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      throw new Error(`Failed to fetch QC records: ${error.message}`);
    }
  },

  // Low Stock Alerts
  async getLowStockAlerts() {
    try {
      const [rawMaterials, packingMaterials] = await Promise.all([
        getData('rawMaterials'),
        getData('packingMaterials')
      ]);

      const alerts = [];

      if (rawMaterials) {
        Object.entries(rawMaterials).forEach(([id, material]) => {
          if (material.currentStock <= material.reorderLevel) {
            alerts.push({
              id,
              type: 'rawMaterial',
              ...material,
              alertLevel: material.currentStock <= material.reorderLevel * 0.5 ? 'critical' : 'warning'
            });
          }
        });
      }

      if (packingMaterials) {
        Object.entries(packingMaterials).forEach(([id, material]) => {
          if (material.currentStock <= material.reorderLevel) {
            alerts.push({
              id,
              type: 'packingMaterial',
              ...material,
              alertLevel: material.currentStock <= material.reorderLevel * 0.5 ? 'critical' : 'warning'
            });
          }
        });
      }

      return alerts.sort((a, b) => a.currentStock - b.currentStock);
    } catch (error) {
      throw new Error(`Failed to get low stock alerts: ${error.message}`);
    }
  }
};