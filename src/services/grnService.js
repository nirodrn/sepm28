import { getData, setData, updateData, pushData } from '../firebase/db';
import { auth } from '../firebase/auth';

export const grnService = {
  async createGRN(grnData) {
    try {
      const grn = {
        ...grnData,
        grnNumber: await this.generateGRNNumber(),
        status: 'pending_qc',
        createdBy: auth.currentUser?.uid,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      const id = await pushData('goodsReceipts', grn);
      
      // Update PO status if fully received
      if (grnData.poId) {
        await this.updatePOReceiptStatus(grnData.poId);
      }

      // Record QC results if provided
      if (grnData.qcResults) {
        await this.recordQCResults(id, grnData.qcResults);
      }
      
      return { id, ...grn };
    } catch (error) {
      throw new Error(`Failed to create GRN: ${error.message}`);
    }
  },

  async recordQCResults(grnId, qcResults) {
    try {
      const qcRecord = {
        grnId,
        qcResults,
        qcDate: Date.now(),
        qcOfficer: auth.currentUser?.uid,
        createdAt: Date.now()
      };
      
      await pushData('qcRecords', qcRecord);
      
      // Update GRN status to QC completed
      await updateData(`goodsReceipts/${grnId}`, {
        status: 'qc_passed',
        qcCompletedAt: Date.now(),
        qcId: id,
        updatedAt: Date.now()
      });
      
      return qcRecord;
    } catch (error) {
      throw new Error(`Failed to record QC results: ${error.message}`);
    }
  },
  async getGRNs(filters = {}) {
    try {
      const grns = await getData('goodsReceipts');
      if (!grns) return [];
      
      let filteredGRNs = Object.entries(grns).map(([id, grn]) => ({
        id,
        ...grn
      }));

      if (filters.status) {
        filteredGRNs = filteredGRNs.filter(grn => grn.status === filters.status);
      }
      
      if (filters.poId) {
        filteredGRNs = filteredGRNs.filter(grn => grn.poId === filters.poId);
      }

      return filteredGRNs.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      throw new Error(`Failed to fetch GRNs: ${error.message}`);
    }
  },

  async updateGRNStatus(grnId, status, qcData = {}) {
    try {
      const updates = {
        status,
        ...qcData,
        updatedAt: Date.now(),
        updatedBy: auth.currentUser?.uid
      };
      
      await updateData(`goodsReceipts/${grnId}`, updates);
      
      // If status is qc_passed, ensure stock is properly tracked
      if (status === 'qc_passed') {
        const grn = await getData(`goodsReceipts/${grnId}`);
        if (grn && grn.items) {
          // Mark that stock update is pending invoice creation
          await updateData(`goodsReceipts/${grnId}`, {
            ...updates,
            stockUpdatePending: true
          });
        }
      }
      
      return updates;
    } catch (error) {
      throw new Error(`Failed to update GRN status: ${error.message}`);
    }
  },

  async linkInvoiceToGRN(grnId, invoiceId, invoiceNumber) {
    try {
      const updates = {
        invoiceId,
        invoiceNumber,
        invoiceLinkedAt: Date.now(),
        status: 'invoiced',
        updatedAt: Date.now()
      };
      
      await updateData(`goodsReceipts/${grnId}`, updates);
      return updates;
    } catch (error) {
      throw new Error(`Failed to link invoice to GRN: ${error.message}`);
    }
  },

  async updatePOReceiptStatus(poId) {
    try {
      const po = await getData(`purchaseOrders/${poId}`);
      if (!po) return;
      
      const grns = await this.getGRNs({ poId });
      if (!grns || !Array.isArray(grns)) return;
      
      const totalOrdered = po.items ? po.items.reduce((sum, item) => sum + item.quantity, 0) : po.quantity || 0;
      const totalReceived = grns.reduce((sum, grn) => 
        sum + (grn.items ? grn.items.reduce((itemSum, item) => itemSum + (item.deliveredQty || item.deliveredQuantity || 0), 0) : 0), 0
      );
      
      let status = 'issued';
      if (totalReceived >= totalOrdered) {
        status = 'fully_received';
      } else if (totalReceived > 0) {
        status = 'partially_received';
      }
      
      await updateData(`purchaseOrders/${poId}`, {
        status,
        totalReceived,
        updatedAt: Date.now()
      });
    } catch (error) {
      console.error('Failed to update PO receipt status:', error);
    }
  },

  async generateGRNNumber() {
    try {
      const grns = await getData('goodsReceipts');
      const count = grns ? Object.keys(grns).length : 0;
      const year = new Date().getFullYear();
      return `GRN${year}${String(count + 1).padStart(4, '0')}`;
    } catch (error) {
      return `GRN${new Date().getFullYear()}${String(Date.now()).slice(-4)}`;
    }
  }
};