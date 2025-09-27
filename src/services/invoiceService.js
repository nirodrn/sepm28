import { getData, setData, updateData, pushData } from '../firebase/db';
import { auth } from '../firebase/auth';

export const invoiceService = {
  async createInvoice(invoiceData) {
    try {
      const invoice = {
        ...invoiceData,
        invoiceNumber: await this.generateInvoiceNumber(),
        status: 'verified', // GRN-based invoices are pre-verified
        paymentStatus: 'pending',
        totalPaid: 0,
        remainingAmount: invoiceData.total || 0,
        createdBy: auth.currentUser?.uid,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        // Additional invoice metadata
        invoiceType: invoiceData.grnId ? 'grn_based' : 'manual',
        dueDate: invoiceData.dueDate || (Date.now() + 30 * 24 * 60 * 60 * 1000)
      };
      
      const id = await pushData('invoices', invoice);
      
      // Update stock levels after invoice creation if not already done
      if (invoiceData.grnId && invoiceData.items) {
        await this.updateStockAfterInvoice(invoiceData.items, invoiceData.grnNumber);
      }
      
      return { id, ...invoice };
    } catch (error) {
      throw new Error(`Failed to create invoice: ${error.message}`);
    }
  },

  async updateStockAfterInvoice(items, grnNumber) {
    try {
      for (const item of items) {
        const quantity = Number(item.quantity) || 0;
        
        if (quantity > 0) {
          if (item.materialType === 'packing_material') {
            // Import packing materials service dynamically
            const { packingMaterialsService } = await import('./packingMaterialsService');
            
            // Check if stock was already updated for this GRN
            const movements = await getData('packingMaterialMovements');
            const existingMovement = movements ? Object.values(movements).find(movement => 
              movement.materialId === item.materialId && 
              movement.reference === grnNumber
            ) : null;
            
            if (!existingMovement) {
              // Add to stock
              await packingMaterialsService.addToStock({
                materialId: item.materialId,
                quantity: quantity,
                batchNumber: item.batchNumber,
                supplierId: item.supplierId || '',
                unitPrice: Number(item.unitPrice || 0),
                qualityGrade: item.qualityGrade || 'A'
                // Note: expiryDate is optional and only added if provided in item data
              });
              
              // Record movement with GRN reference
              await packingMaterialsService.recordStockMovement({
                materialId: item.materialId,
                type: 'in',
                quantity: quantity,
                reason: `Invoice Created - GRN ${grnNumber}`,
                reference: grnNumber,
                batchNumber: item.batchNumber,
                supplierId: item.supplierId || ''
              });
            }
          } else if (item.materialType === 'material') {
            // Handle raw materials
            const { inventoryService } = await import('./inventoryService');
            
            const movements = await getData('stockMovements');
            const existingMovement = movements ? Object.values(movements).find(movement => 
              movement.materialId === item.materialId && 
              movement.reference === grnNumber
            ) : null;
            
            if (!existingMovement) {
              await inventoryService.recordStockMovement({
                materialId: item.materialId,
                materialType: 'rawMaterial',
                type: 'in',
                quantity: quantity,
                reason: `Invoice Created - GRN ${grnNumber}`,
                reference: grnNumber,
                batchNumber: item.batchNumber,
                supplierId: item.supplierId || ''
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to update stock after invoice:', error);
      // Don't throw error here as invoice creation should still succeed
    }
  },
  async generateInvoiceNumber() {
    try {
      const invoices = await getData('invoices');
      const count = invoices ? Object.keys(invoices).length : 0;
      const year = new Date().getFullYear();
      return `INV${year}${String(count + 1).padStart(4, '0')}`;
    } catch (error) {
      return `INV${new Date().getFullYear()}${String(Date.now()).slice(-4)}`;
    }
  },

  async getInvoices(filters = {}) {
    try {
      const invoices = await getData('invoices');
      if (!invoices) return [];
      
      let filteredInvoices = Object.entries(invoices).map(([id, invoice]) => ({
        id,
        ...invoice
      }));

      if (filters.status) {
        filteredInvoices = filteredInvoices.filter(inv => inv.status === filters.status);
      }
      
      if (filters.paymentStatus) {
        filteredInvoices = filteredInvoices.filter(inv => inv.paymentStatus === filters.paymentStatus);
      }
      
      if (filters.supplierId) {
        filteredInvoices = filteredInvoices.filter(inv => inv.supplierId === filters.supplierId);
      }

      return filteredInvoices.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      throw new Error(`Failed to fetch invoices: ${error.message}`);
    }
  },

  async perform3WayMatch(invoiceId, poId, grnId) {
    try {
      const [invoice, po, grn] = await Promise.all([
        getData(`invoices/${invoiceId}`),
        getData(`purchaseOrders/${poId}`),
        getData(`goodsReceipts/${grnId}`)
      ]);

      const variances = [];
      
      // Compare quantities and prices
      invoice.items.forEach(invItem => {
        const poItem = po.items.find(item => item.materialId === invItem.materialId);
        const grnItem = grn.items.find(item => item.materialId === invItem.materialId);
        
        if (poItem && grnItem) {
          const qtyVariance = Math.abs(invItem.quantity - grnItem.deliveredQty);
          const priceVariance = Math.abs(invItem.unitPrice - poItem.unitPrice);
          
          if (qtyVariance > 0 || priceVariance > 0.01) {
            variances.push({
              materialId: invItem.materialId,
              materialName: invItem.materialName,
              qtyVariance,
              priceVariance,
              invoiceQty: invItem.quantity,
              grnQty: grnItem.deliveredQty,
              invoicePrice: invItem.unitPrice,
              poPrice: poItem.unitPrice
            });
          }
        }
      });

      const matchResult = {
        hasVariances: variances.length > 0,
        variances,
        matchedAt: Date.now(),
        matchedBy: auth.currentUser?.uid
      };

      await updateData(`invoices/${invoiceId}`, {
        matchResult,
        status: variances.length > 0 ? 'variance_review' : 'verified',
        updatedAt: Date.now()
      });

      return matchResult;
    } catch (error) {
      throw new Error(`Failed to perform 3-way match: ${error.message}`);
    }
  },

  async updatePaymentStatus(invoiceId, paymentData) {
    try {
      const invoice = await getData(`invoices/${invoiceId}`);
      if (!invoice) throw new Error('Invoice not found');
      
      const newTotalPaid = (invoice.totalPaid || 0) + (paymentData.amount || 0);
      const invoiceTotal = invoice.total || 0;
      const newRemainingAmount = invoiceTotal - newTotalPaid;
      
      let newPaymentStatus = 'pending'; // Default to "to be paid"
      if (newRemainingAmount <= 0) {
        newPaymentStatus = 'paid'; // Fully paid
      } else if (newTotalPaid > 0) {
        newPaymentStatus = 'partially_paid'; // Partially paid
      }
      
      const updates = {
        paymentStatus: newPaymentStatus,
        lastPaymentMethod: paymentData.method,
        lastPaymentDate: paymentData.date || Date.now(),
        lastPaymentAmount: paymentData.amount,
        lastPaymentNotes: paymentData.notes || '',
        lastPaymentReference: paymentData.referenceNumber || paymentData.paymentNumber || '',
        totalPaid: newTotalPaid,
        remainingAmount: Math.max(0, newRemainingAmount),
        updatedAt: Date.now(),
        updatedBy: auth.currentUser?.uid
      };
      
      await updateData(`invoices/${invoiceId}`, updates);
      return updates;
    } catch (error) {
      throw new Error(`Failed to update payment status: ${error.message}`);
    }
  },

  async getInvoiceById(invoiceId) {
    try {
      const invoice = await getData(`invoices/${invoiceId}`);
      if (!invoice) throw new Error('Invoice not found');
      return { id: invoiceId, ...invoice };
    } catch (error) {
      throw new Error(`Failed to fetch invoice: ${error.message}`);
    }
  },

  async getInvoicesByGRN(grnId) {
    try {
      const invoices = await this.getInvoices();
      return invoices.filter(invoice => invoice.grnId === grnId);
    } catch (error) {
      throw new Error(`Failed to fetch invoices by GRN: ${error.message}`);
    }
  },

  async markInvoiceAsPaid(invoiceId) {
    try {
      const updates = {
        paymentStatus: 'paid',
        remainingAmount: 0,
        paidAt: Date.now(),
        updatedAt: Date.now(),
        updatedBy: auth.currentUser?.uid
      };
      
      await updateData(`invoices/${invoiceId}`, updates);
      return updates;
    } catch (error) {
      throw new Error(`Failed to mark invoice as paid: ${error.message}`);
    }
  }
};