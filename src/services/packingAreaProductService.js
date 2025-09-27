import { getData, setData, updateData, pushData } from '../firebase/db';
import { auth } from '../firebase/auth';
import { productVariantService } from './productVariantService';

export const packingAreaProductService = {
  // Convert bulk product to packaged units
  async packageBulkProduct(packagingData) {
    try {
      const currentUser = auth.currentUser;
      
      // Validate stock availability
      const stockItem = await getData(`packingAreaStock/${packagingData.stockId}`);
      if (!stockItem) {
        throw new Error('Stock item not found');
      }
      
      if (stockItem.quantity < packagingData.bulkQuantityUsed) {
        throw new Error('Insufficient bulk quantity available');
      }
      
      // Create packaged product entry
      const packagedProduct = {
        stockId: packagingData.stockId,
        batchId: stockItem.batchId,
        batchNumber: stockItem.batchNumber,
        productId: stockItem.productId,
        productName: stockItem.productName,
        variantId: packagingData.variantId,
        variantName: packagingData.variantName,
        variantSize: packagingData.variantSize,
        variantUnit: packagingData.variantUnit,
        bulkQuantityUsed: packagingData.bulkQuantityUsed,
        bulkUnit: stockItem.unit,
        unitsProduced: packagingData.unitsProduced,
        qualityGrade: stockItem.qualityGrade,
        expiryDate: stockItem.expiryDate,
        packagingDate: Date.now(),
        packagedBy: currentUser?.uid,
        packagedByName: currentUser?.displayName || currentUser?.email || 'Packing Area Manager',
        location: packagingData.location || 'PACK-FINISHED',
        status: 'packaged',
        availableForDispatch: true,
        notes: packagingData.notes || '',
        createdAt: Date.now()
      };
      
      const id = await pushData('packagedProducts', packagedProduct);
      
      // Update bulk stock quantity
      await updateData(`packingAreaStock/${packagingData.stockId}`, {
        quantity: stockItem.quantity - packagingData.bulkQuantityUsed,
        lastPackaged: Date.now(),
        updatedAt: Date.now()
      });
      
      // Record packaging activity
      await this.recordPackagingActivity({
        stockId: packagingData.stockId,
        packagedProductId: id,
        batchNumber: stockItem.batchNumber,
        productName: stockItem.productName,
        variantName: packagingData.variantName,
        bulkUsed: packagingData.bulkQuantityUsed,
        bulkUnit: stockItem.unit,
        unitsProduced: packagingData.unitsProduced,
        efficiency: (packagingData.unitsProduced / (packagingData.bulkQuantityUsed / packagingData.variantSize)) * 100
      });
      
      return { id, ...packagedProduct };
    } catch (error) {
      throw new Error(`Failed to package bulk product: ${error.message}`);
    }
  },

  // Get packaged products ready for FG export
  async getPackagedProducts(filters = {}) {
    try {
      const products = await getData('packagedProducts');
      if (!products) return [];
      
      let filteredProducts = Object.entries(products).map(([id, product]) => ({
        id,
        ...product
      }));

      if (filters.status) {
        filteredProducts = filteredProducts.filter(product => product.status === filters.status);
      }
      
      if (filters.productId) {
        filteredProducts = filteredProducts.filter(product => product.productId === filters.productId);
      }
      
      if (filters.variantId) {
        filteredProducts = filteredProducts.filter(product => product.variantId === filters.variantId);
      }

      return filteredProducts.sort((a, b) => b.packagingDate - a.packagingDate);
    } catch (error) {
      throw new Error(`Failed to fetch packaged products: ${error.message}`);
    }
  },

  // Export packaged products to FG Store
  async exportToFGStore(exportData) {
    try {
      const currentUser = auth.currentUser;
      const releaseCode = this.generateReleaseCode();
      
      // Validate all selected products
      for (const item of exportData.items) {
        const packagedProduct = await getData(`packagedProducts/${item.packagedProductId}`);
        if (!packagedProduct) {
          throw new Error(`Packaged product ${item.packagedProductId} not found`);
        }
        
        if (packagedProduct.unitsProduced < item.unitsToExport) {
          throw new Error(`Insufficient units for ${packagedProduct.variantName}. Available: ${packagedProduct.unitsProduced}, Requested: ${item.unitsToExport}`);
        }
      }
      
      const dispatch = {
        ...exportData,
        releaseCode,
        dispatchType: 'packaged_units',
        dispatchedBy: currentUser?.uid,
        dispatchedByName: currentUser?.displayName || currentUser?.email || 'Packing Area Manager',
        dispatchedAt: Date.now(),
        status: 'dispatched',
        claimedByFG: false,
        totalUnits: exportData.items.reduce((sum, item) => sum + item.unitsToExport, 0),
        totalVariants: exportData.items.length,
        destination: exportData.destination || 'finished_goods_store',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      const dispatchId = await pushData('fgUnitDispatches', dispatch);
      
      // Update packaged product quantities
      for (const item of exportData.items) {
        const packagedProduct = await getData(`packagedProducts/${item.packagedProductId}`);
        const remainingUnits = packagedProduct.unitsProduced - item.unitsToExport;
        
        await updateData(`packagedProducts/${item.packagedProductId}`, {
          unitsProduced: remainingUnits,
          lastExported: Date.now(),
          lastExportedQuantity: item.unitsToExport,
          status: remainingUnits === 0 ? 'fully_exported' : 'partially_exported',
          availableForDispatch: remainingUnits > 0,
          updatedAt: Date.now()
        });
        
        // Record export activity
        await this.recordExportActivity({
          packagedProductId: item.packagedProductId,
          dispatchId,
          productName: packagedProduct.productName,
          variantName: packagedProduct.variantName,
          unitsExported: item.unitsToExport,
          remainingUnits: remainingUnits,
          releaseCode: releaseCode
        });
      }
      
      // Notify FG Store Manager
      await this.notifyFGStoreManager(dispatchId, dispatch);
      
      return { dispatchId, ...dispatch };
    } catch (error) {
      throw new Error(`Failed to export to FG store: ${error.message}`);
    }
  },

  // Record packaging activity
  async recordPackagingActivity(activityData) {
    try {
      const currentUser = auth.currentUser;
      const activity = {
        ...activityData,
        type: 'packaging',
        createdBy: currentUser?.uid,
        createdByName: currentUser?.displayName || currentUser?.email || 'Packing Area Manager',
        createdAt: Date.now()
      };
      
      const id = await pushData('packingActivities', activity);
      return { id, ...activity };
    } catch (error) {
      throw new Error(`Failed to record packaging activity: ${error.message}`);
    }
  },

  // Record export activity
  async recordExportActivity(activityData) {
    try {
      const currentUser = auth.currentUser;
      const activity = {
        ...activityData,
        type: 'export',
        createdBy: currentUser?.uid,
        createdByName: currentUser?.displayName || currentUser?.email || 'Packing Area Manager',
        createdAt: Date.now()
      };
      
      const id = await pushData('packingActivities', activity);
      return { id, ...activity };
    } catch (error) {
      throw new Error(`Failed to record export activity: ${error.message}`);
    }
  },

  // Generate release code for FG dispatch
  generateReleaseCode() {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const time = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    return `${year}${month}${day}${time}${random}`;
  },

  // Get packaging activities
  async getPackagingActivities(filters = {}) {
    try {
      const activities = await getData('packingActivities');
      if (!activities) return [];
      
      let filteredActivities = Object.entries(activities).map(([id, activity]) => ({
        id,
        ...activity
      }));

      if (filters.type) {
        filteredActivities = filteredActivities.filter(activity => activity.type === filters.type);
      }
      
      if (filters.productId) {
        filteredActivities = filteredActivities.filter(activity => activity.productId === filters.productId);
      }

      return filteredActivities.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      throw new Error(`Failed to fetch packaging activities: ${error.message}`);
    }
  },

  // Get FG unit dispatches
  async getFGUnitDispatches(filters = {}) {
    try {
      const dispatches = await getData('fgUnitDispatches');
      if (!dispatches) return [];
      
      let filteredDispatches = Object.entries(dispatches).map(([id, dispatch]) => ({
        id,
        ...dispatch
      }));

      if (filters.status) {
        filteredDispatches = filteredDispatches.filter(dispatch => dispatch.status === filters.status);
      }
      
      if (filters.claimedByFG !== undefined) {
        filteredDispatches = filteredDispatches.filter(dispatch => dispatch.claimedByFG === filters.claimedByFG);
      }

      return filteredDispatches.sort((a, b) => b.dispatchedAt - a.dispatchedAt);
    } catch (error) {
      throw new Error(`Failed to fetch FG unit dispatches: ${error.message}`);
    }
  },

  // Notify FG Store Manager
  async notifyFGStoreManager(dispatchId, dispatchData) {
    try {
      const notification = {
        type: 'fg_unit_dispatch',
        dispatchId,
        message: `New packaged products ready for claiming: ${dispatchData.totalUnits} units across ${dispatchData.totalVariants} variants`,
        data: { 
          dispatchType: 'packaged_units',
          items: dispatchData.items,
          totalUnits: dispatchData.totalUnits,
          totalVariants: dispatchData.totalVariants,
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