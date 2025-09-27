import { getData, setData, updateData, pushData, removeData } from '../firebase/db';
import { auth } from '../firebase/auth';

export const materialService = {
  // Raw Materials
  async getRawMaterials() {
    try {
      const materials = await getData('rawMaterials');
      if (!materials) return [];
      
      return Object.entries(materials).map(([id, material]) => ({
        id,
        ...material
      }));
    } catch (error) {
      throw new Error(`Failed to fetch raw materials: ${error.message}`);
    }
  },

  async addRawMaterial(materialData) {
    try {
      const material = {
        ...materialData,
        currentStock: 0, // Initialize stock to 0 for new materials
        status: 'active',
        createdAt: Date.now(),
        createdBy: auth.currentUser?.uid || 'system',
        updatedAt: Date.now()
      };
      
      const id = await pushData('rawMaterials', material);
      return { id, ...material };
    } catch (error) {
      throw new Error(`Failed to add raw material: ${error.message}`);
    }
  },

  async updateRawMaterial(id, updates) {
    try {
      const updateData = {
        ...updates,
        updatedAt: Date.now(),
        updatedBy: auth.currentUser?.uid || 'system'
      };
      
      await updateData(`rawMaterials/${id}`, updateData);
      return updateData;
    } catch (error) {
      throw new Error(`Failed to update raw material: ${error.message}`);
    }
  },

  async deleteRawMaterial(id) {
    try {
      await updateData(`rawMaterials/${id}`, {
        status: 'inactive',
        deletedAt: Date.now(),
        deletedBy: auth.currentUser?.uid || 'system'
      });
      return true;
    } catch (error) {
      throw new Error(`Failed to delete raw material: ${error.message}`);
    }
  },

  // Packing Materials
  async getPackingMaterials() {
    try {
      const materials = await getData('packingMaterials');
      if (!materials) return [];
      
      return Object.entries(materials).map(([id, material]) => ({
        id,
        ...material
      }));
    } catch (error) {
      throw new Error(`Failed to fetch packing materials: ${error.message}`);
    }
  },

  async addPackingMaterial(materialData) {
    try {
      const material = {
        ...materialData,
        currentStock: 0, // Initialize stock to 0 for new materials
        status: 'active',
        createdAt: Date.now(),
        createdBy: auth.currentUser?.uid || 'system',
        updatedAt: Date.now()
      };
      
      const id = await pushData('packingMaterials', material);
      return { id, ...material };
    } catch (error) {
      throw new Error(`Failed to add packing material: ${error.message}`);
    }
  },

  async updatePackingMaterial(id, updates) {
    try {
      const updateData = {
        ...updates,
        updatedAt: Date.now(),
        updatedBy: auth.currentUser?.uid || 'system'
      };
      
      await updateData(`packingMaterials/${id}`, updateData);
      return updateData;
    } catch (error) {
      throw new Error(`Failed to update packing material: ${error.message}`);
    }
  },

  async deletePackingMaterial(id) {
    try {
      await updateData(`packingMaterials/${id}`, {
        status: 'inactive',
        deletedAt: Date.now(),
        deletedBy: auth.currentUser?.uid || 'system'
      });
      return true;
    } catch (error) {
      throw new Error(`Failed to delete packing material: ${error.message}`);
    }
  },

  // Material Types
  async getMaterialTypes() {
    try {
      const types = await getData('materialTypes');
      if (!types) return [];
      
      return Object.entries(types).map(([id, type]) => ({
        id,
        ...type
      }));
    } catch (error) {
      throw new Error(`Failed to fetch material types: ${error.message}`);
    }
  },

  async addMaterialType(typeData) {
    try {
      const type = {
        ...typeData,
        status: 'active',
        createdAt: Date.now(),
        createdBy: auth.currentUser?.uid || 'system'
      };
      
      const id = await pushData('materialTypes', type);
      return { id, ...type };
    } catch (error) {
      throw new Error(`Failed to add material type: ${error.message}`);
    }
  },

  async updateMaterialType(id, updates) {
    try {
      const updateData = {
        ...updates,
        updatedAt: Date.now(),
        updatedBy: auth.currentUser?.uid || 'system'
      };
      
      await updateData(`materialTypes/${id}`, updateData);
      return updateData;
    } catch (error) {
      throw new Error(`Failed to update material type: ${error.message}`);
    }
  },

  async deleteMaterialType(id) {
    try {
      await updateData(`materialTypes/${id}`, {
        status: 'inactive',
        deletedAt: Date.now(),
        deletedBy: auth.currentUser?.uid || 'system'
      });
      return true;
    } catch (error) {
      throw new Error(`Failed to delete material type: ${error.message}`);
    }
  }
};