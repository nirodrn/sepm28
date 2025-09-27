import { getData, setData, updateData, pushData, removeData } from '../firebase/db';
import { auth } from '../firebase/auth';

export const supplierService = {
  async getSuppliers() {
    try {
      const suppliers = await getData('suppliers');
      if (!suppliers) return [];
      
      return Object.entries(suppliers).map(([id, supplier]) => ({
        id,
        ...supplier
      }));
    } catch (error) {
      throw new Error(`Failed to fetch suppliers: ${error.message}`);
    }
  },

  async addSupplier(supplierData) {
    try {
      const supplier = {
        ...supplierData,
        status: 'active',
        rating: 0,
        totalOrders: 0,
        createdAt: Date.now(),
        createdBy: auth.currentUser?.uid || 'system',
        updatedAt: Date.now()
      };
      
      const id = await pushData('suppliers', supplier);
      return { id, ...supplier };
    } catch (error) {
      throw new Error(`Failed to add supplier: ${error.message}`);
    }
  },

  async updateSupplier(id, updates) {
    try {
      const updateData = {
        ...updates,
        updatedAt: Date.now(),
        updatedBy: auth.currentUser?.uid || 'system'
      };
      
      await updateData(`suppliers/${id}`, updateData);
      return updateData;
    } catch (error) {
      throw new Error(`Failed to update supplier: ${error.message}`);
    }
  },

  async deleteSupplier(id) {
    try {
      await updateData(`suppliers/${id}`, {
        status: 'inactive',
        deletedAt: Date.now(),
        deletedBy: auth.currentUser?.uid || 'system'
      });
      return true;
    } catch (error) {
      throw new Error(`Failed to delete supplier: ${error.message}`);
    }
  },

  async getSupplierPerformance(supplierId) {
    try {
      const [orders, qcRecords] = await Promise.all([
        getData(`supplierOrders/${supplierId}`),
        getData(`qcRecords`)
      ]);

      const supplierQC = qcRecords ? 
        Object.values(qcRecords).filter(qc => qc.supplier === supplierId) : [];

      const performance = {
        totalOrders: orders ? Object.keys(orders).length : 0,
        onTimeDeliveries: 0,
        qualityScore: 0,
        avgDeliveryTime: 0
      };

      if (orders) {
        const orderList = Object.values(orders);
        performance.onTimeDeliveries = orderList.filter(order => 
          order.deliveredOnTime === true
        ).length;
        
        performance.avgDeliveryTime = orderList.reduce((sum, order) => 
          sum + (order.deliveryTime || 0), 0
        ) / orderList.length;
      }

      if (supplierQC.length > 0) {
        const gradePoints = { 'A': 4, 'B': 3, 'C': 2, 'D': 1 };
        const avgGrade = supplierQC.reduce((sum, qc) => 
          sum + (gradePoints[qc.overallGrade] || 0), 0
        ) / supplierQC.length;
        performance.qualityScore = (avgGrade / 4) * 100;
      }

      return performance;
    } catch (error) {
      throw new Error(`Failed to get supplier performance: ${error.message}`);
    }
  }
};