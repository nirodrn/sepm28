import { getData, setData, updateData, pushData } from '../firebase/db';
import { auth } from '../firebase/auth';

export const productVariantService = {
  // Create product variant
  async createProductVariant(variantData) {
    try {
      const currentUser = auth.currentUser;
      const variant = {
        ...variantData,
        status: 'active',
        createdBy: currentUser?.uid,
        createdByName: currentUser?.displayName || currentUser?.email || 'User',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      const id = await pushData('productVariants', variant);
      return { id, ...variant };
    } catch (error) {
      throw new Error(`Failed to create product variant: ${error.message}`);
    }
  },

  // Get variants for a product
  async getProductVariants(productId) {
    try {
      const variants = await getData('productVariants');
      if (!variants) return [];
      
      return Object.entries(variants)
        .filter(([_, variant]) => variant.productId === productId && variant.status === 'active')
        .map(([id, variant]) => ({ id, ...variant }))
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      throw new Error(`Failed to fetch product variants: ${error.message}`);
    }
  },

  // Get all variants
  async getAllVariants() {
    try {
      const variants = await getData('productVariants');
      if (!variants) return [];
      
      return Object.entries(variants)
        .map(([id, variant]) => ({ id, ...variant }))
        .filter(variant => variant.status === 'active')
        .sort((a, b) => a.productName.localeCompare(b.productName));
    } catch (error) {
      throw new Error(`Failed to fetch all variants: ${error.message}`);
    }
  },

  // Update variant
  async updateVariant(variantId, updates) {
    try {
      const currentUser = auth.currentUser;
      const updateData = {
        ...updates,
        updatedAt: Date.now(),
        updatedBy: currentUser?.uid
      };
      
      await updateData(`productVariants/${variantId}`, updateData);
      return updateData;
    } catch (error) {
      throw new Error(`Failed to update variant: ${error.message}`);
    }
  },

  // Delete variant (soft delete)
  async deleteVariant(variantId) {
    try {
      const currentUser = auth.currentUser;
      await updateData(`productVariants/${variantId}`, {
        status: 'inactive',
        deletedAt: Date.now(),
        deletedBy: currentUser?.uid
      });
      return true;
    } catch (error) {
      throw new Error(`Failed to delete variant: ${error.message}`);
    }
  },

  // Calculate units from bulk quantity
  calculateUnitsFromBulk(bulkQuantity, bulkUnit, variantSize, variantUnit) {
    // Convert bulk quantity to base unit (grams or ml)
    let baseQuantity = bulkQuantity;
    
    // Convert bulk to base unit
    if (bulkUnit === 'kg') baseQuantity *= 1000;
    else if (bulkUnit === 'L') baseQuantity *= 1000;
    
    // Convert variant size to base unit
    let variantBaseSize = variantSize;
    if (variantUnit === 'kg') variantBaseSize *= 1000;
    else if (variantUnit === 'L') variantBaseSize *= 1000;
    
    return Math.floor(baseQuantity / variantBaseSize);
  },

  // Calculate bulk quantity needed for units
  calculateBulkFromUnits(units, variantSize, variantUnit, targetBulkUnit) {
    // Convert variant to base unit
    let variantBaseSize = variantSize;
    if (variantUnit === 'kg') variantBaseSize *= 1000;
    else if (variantUnit === 'L') variantBaseSize *= 1000;
    
    // Calculate total base quantity needed
    const totalBaseQuantity = units * variantBaseSize;
    
    // Convert to target bulk unit
    if (targetBulkUnit === 'kg') return totalBaseQuantity / 1000;
    else if (targetBulkUnit === 'L') return totalBaseQuantity / 1000;
    
    return totalBaseQuantity;
  }
};