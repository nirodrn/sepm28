import { getData, setData, updateData, pushData } from '../firebase/db';
import { auth } from '../firebase/auth';

export const fgPricingService = {
  // Get product pricing
  async getProductPricing(productId) {
    try {
      const pricing = await getData(`productPricing/${productId}`);
      return pricing || null;
    } catch (error) {
      throw new Error(`Failed to fetch product pricing: ${error.message}`);
    }
  },

  // Get all product pricing
  async getAllProductPricing() {
    try {
      const pricing = await getData('productPricing');
      if (!pricing) return [];
      
      return Object.entries(pricing).map(([productId, priceData]) => ({
        productId,
        ...priceData
      }));
    } catch (error) {
      throw new Error(`Failed to fetch all product pricing: ${error.message}`);
    }
  },

  // Update product price
  async updateProductPrice(productId, priceData) {
    try {
      const currentUser = auth.currentUser;
      const currentPricing = await this.getProductPricing(productId);
      
      // Save price history
      if (currentPricing && currentPricing.currentPrice !== priceData.price) {
        await this.savePriceHistory(productId, {
          previousPrice: currentPricing.currentPrice,
          newPrice: priceData.price,
          changeReason: priceData.changeReason || 'Price update',
          effectiveDate: priceData.effectiveDate || Date.now(),
          changedBy: currentUser?.uid,
          changedByName: currentUser?.displayName || currentUser?.email || 'FG Store Manager'
        });
      }
      
      const pricingUpdate = {
        productId,
        currentPrice: priceData.price,
        currency: priceData.currency || 'LKR',
        priceType: priceData.priceType || 'retail',
        effectiveDate: priceData.effectiveDate || Date.now(),
        changeReason: priceData.changeReason || 'Price update',
        lastUpdatedBy: currentUser?.uid,
        lastUpdatedByName: currentUser?.displayName || currentUser?.email || 'FG Store Manager',
        lastUpdatedAt: Date.now(),
        status: 'active'
      };
      
      if (!currentPricing) {
        pricingUpdate.createdAt = Date.now();
        pricingUpdate.createdBy = currentUser?.uid;
      }
      
      await setData(`productPricing/${productId}`, pricingUpdate);
      return pricingUpdate;
    } catch (error) {
      throw new Error(`Failed to update product price: ${error.message}`);
    }
  },

  // Get product pricing for direct shop requests
  async getProductPricingForDispatch(productName) {
    try {
      // Try to find pricing by product name or ID
      const allPricing = await this.getAllProductPricing();
      
      // First try exact match by product ID
      let pricing = allPricing.find(p => p.productId === productName);
      
      // If not found, try to match by product name in the pricing data
      if (!pricing) {
        const products = await getData('productionProducts');
        if (products) {
          const product = Object.entries(products).find(([_, prod]) => 
            prod.name === productName
          );
          if (product) {
            pricing = allPricing.find(p => p.productId === product[0]);
          }
        }
      }
      
      // If still not found, try to match by product name directly
      if (!pricing) {
        pricing = allPricing.find(p => p.productName === productName);
      }
      
      return pricing || null;
    } catch (error) {
      throw new Error(`Failed to get product pricing: ${error.message}`);
    }
  },

  // Set default pricing for products without pricing
  async setDefaultProductPricing(productName, defaultPrice = 100) {
    try {
      const currentUser = auth.currentUser;
      
      // Find product ID by name
      const products = await getData('productionProducts');
      let productId = productName; // fallback to using name as ID
      
      if (products) {
        const product = Object.entries(products).find(([_, prod]) => 
          prod.name === productName
        );
        if (product) {
          productId = product[0];
        }
      }
      
      const pricingData = {
        productId,
        productName,
        currentPrice: defaultPrice,
        currency: 'LKR',
        priceType: 'retail',
        effectiveDate: Date.now(),
        changeReason: 'Default pricing set for direct shop dispatch',
        createdAt: Date.now(),
        createdBy: currentUser?.uid,
        lastUpdatedBy: currentUser?.uid,
        lastUpdatedByName: currentUser?.displayName || currentUser?.email || 'FG Store Manager',
        lastUpdatedAt: Date.now(),
        status: 'active'
      };
      
      await setData(`productPricing/${productId}`, pricingData);
      
      // Save initial price history
      await this.savePriceHistory(productId, {
        previousPrice: 0,
        newPrice: defaultPrice,
        changeReason: 'Initial pricing set',
        effectiveDate: Date.now(),
        changedBy: currentUser?.uid,
        changedByName: currentUser?.displayName || currentUser?.email || 'FG Store Manager'
      });
      
      return pricingData;
    } catch (error) {
      throw new Error(`Failed to set default pricing: ${error.message}`);
    }
  },
  // Save price history
  async savePriceHistory(productId, historyData) {
    try {
      const currentUser = auth.currentUser;
      const historyEntry = {
        productId,
        ...historyData,
        timestamp: Date.now(),
        recordedBy: currentUser?.uid,
        recordedByName: currentUser?.displayName || currentUser?.email || 'FG Store Manager'
      };
      
      const id = await pushData('productPriceHistory', historyEntry);
      return { id, ...historyEntry };
    } catch (error) {
      throw new Error(`Failed to save price history: ${error.message}`);
    }
  },

  // Get price history for a product
  async getProductPriceHistory(productId) {
    try {
      const history = await getData('productPriceHistory');
      if (!history) return [];
      
      return Object.entries(history)
        .filter(([_, entry]) => entry.productId === productId)
        .map(([id, entry]) => ({ id, ...entry }))
        .sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      throw new Error(`Failed to fetch price history: ${error.message}`);
    }
  },

  // Get all price history
  async getAllPriceHistory(filters = {}) {
    try {
      const history = await getData('productPriceHistory');
      if (!history) return [];
      
      let filteredHistory = Object.entries(history).map(([id, entry]) => ({
        id,
        ...entry
      }));

      if (filters.productId) {
        filteredHistory = filteredHistory.filter(entry => entry.productId === filters.productId);
      }
      
      if (filters.dateFrom) {
        filteredHistory = filteredHistory.filter(entry => entry.timestamp >= filters.dateFrom);
      }
      
      if (filters.dateTo) {
        filteredHistory = filteredHistory.filter(entry => entry.timestamp <= filters.dateTo);
      }

      return filteredHistory.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      throw new Error(`Failed to fetch price history: ${error.message}`);
    }
  },

  // Calculate price change percentage
  calculatePriceChange(oldPrice, newPrice) {
    if (!oldPrice || oldPrice === 0) return 0;
    return ((newPrice - oldPrice) / oldPrice) * 100;
  },

  // Get pricing analytics
  async getPricingAnalytics(productId) {
    try {
      const history = await this.getProductPriceHistory(productId);
      if (history.length === 0) return null;
      
      const prices = history.map(h => h.newPrice || h.previousPrice).filter(Boolean);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      
      const recentChanges = history.slice(0, 5);
      const totalChanges = history.length;
      
      return {
        minPrice,
        maxPrice,
        avgPrice,
        totalChanges,
        recentChanges,
        priceVolatility: ((maxPrice - minPrice) / avgPrice) * 100
      };
    } catch (error) {
      throw new Error(`Failed to get pricing analytics: ${error.message}`);
    }
  }
};