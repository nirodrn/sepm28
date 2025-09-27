import { getData, setData, updateData, pushData, removeData } from '../firebase/db';
import { auth } from '../firebase/auth';

export const productService = {
  async getProducts() {
    try {
      const products = await getData('products');
      if (!products) return [];
      
      return Object.entries(products).map(([id, product]) => ({
        id,
        ...product
      }));
    } catch (error) {
      throw new Error(`Failed to fetch products: ${error.message}`);
    }
  },

  async addProduct(productData) {
    try {
      const product = {
        ...productData,
        status: 'active',
        createdAt: Date.now(),
        createdBy: auth.currentUser?.uid || 'system',
        updatedAt: Date.now()
      };
      
      const id = await pushData('products', product);
      return { id, ...product };
    } catch (error) {
      throw new Error(`Failed to add product: ${error.message}`);
    }
  },

  async updateProduct(id, updates) {
    try {
      const updateData = {
        ...updates,
        updatedAt: Date.now(),
        updatedBy: auth.currentUser?.uid || 'system'
      };
      
      await updateData(`products/${id}`, updateData);
      return updateData;
    } catch (error) {
      throw new Error(`Failed to update product: ${error.message}`);
    }
  },

  async deleteProduct(id) {
    try {
      await updateData(`products/${id}`, {
        status: 'inactive',
        deletedAt: Date.now(),
        deletedBy: auth.currentUser?.uid || 'system'
      });
      return true;
    } catch (error) {
      throw new Error(`Failed to delete product: ${error.message}`);
    }
  }
};