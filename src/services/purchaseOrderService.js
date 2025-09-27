import { getData, setData, updateData, pushData } from '../firebase/db';
import { auth } from '../firebase/auth';

export const purchaseOrderService = {
  async createPO(poData) {
    try {
      const po = {
        ...poData,
        poNumber: await this.generatePONumber(),
        status: 'draft',
        createdBy: auth.currentUser?.uid,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      const id = await pushData('purchaseOrders', po);
      return { id, ...po };
    } catch (error) {
      throw new Error(`Failed to create PO: ${error.message}`);
    }
  },

  async getPOs(filters = {}) {
    try {
      const pos = await getData('purchaseOrders');
      if (!pos) return [];
      
      let filteredPOs = Object.entries(pos).map(([id, po]) => ({
        id,
        ...po
      }));

      if (filters.status) {
        filteredPOs = filteredPOs.filter(po => po.status === filters.status);
      }
      
      if (filters.supplierId) {
        filteredPOs = filteredPOs.filter(po => po.supplierId === filters.supplierId);
      }
      
      if (filters.requestType) {
        filteredPOs = filteredPOs.filter(po => po.requestType === filters.requestType);
      }

      if (filters.materialType) {
        filteredPOs = filteredPOs.filter(po => {
          if (filters.materialType === 'raw') {
            return po.requestType === 'material';
          } else if (filters.materialType === 'packing') {
            return po.requestType === 'packing_material';
          }
          return true;
        });
      }
      return filteredPOs.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      throw new Error(`Failed to fetch POs: ${error.message}`);
    }
  },

  async updatePOStatus(poId, status, notes = '') {
    try {
      const updates = {
        status,
        statusNotes: notes,
        updatedAt: Date.now(),
        updatedBy: auth.currentUser?.uid
      };
      
      await updateData(`purchaseOrders/${poId}`, updates);
      return updates;
    } catch (error) {
      throw new Error(`Failed to update PO status: ${error.message}`);
    }
  },

  async generatePONumber() {
    try {
      const pos = await getData('purchaseOrders');
      const count = pos ? Object.keys(pos).length : 0;
      const year = new Date().getFullYear();
      return `PO${year}${String(count + 1).padStart(4, '0')}`;
    } catch (error) {
      return `PO${new Date().getFullYear()}${String(Date.now()).slice(-4)}`;
    }
  }
};