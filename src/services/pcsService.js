import { getData, setData, updateData, pushData } from '../firebase/db';
import { auth } from '../firebase/auth';

// Helper functions to handle Firebase key restrictions
const formatPathForFirebase = (path) => {
  // Convert paths like '/dashboard' to 'dashboard' and '/admin/users' to 'admin_users'
  return path.replace(/^\//, '').replace(/\//g, '_');
};

const formatFirebaseKeyToPath = (key) => {
  // Convert Firebase keys back to paths: 'dashboard' to '/dashboard' and 'admin_users' to '/admin/users'
  if (!key.includes('_')) {
    return `/${key}`;
  }
  return `/${key.replace(/_/g, '/')}`;
};

export const pcsService = {
  // Get all available pages in the system
  getAllAvailablePages() {
    return [
      // Dashboard
      { path: '/dashboard', name: 'Dashboard', category: 'General', description: 'Main dashboard view' },
      
      // Admin Pages
      { path: '/admin/users', name: 'User Management', category: 'Admin', description: 'Manage system users' },
      { path: '/admin/users/add', name: 'Add User', category: 'Admin', description: 'Add new users' },
      { path: '/admin/suppliers', name: 'Supplier Management', category: 'Admin', description: 'Manage suppliers' },
      { path: '/admin/suppliers/add', name: 'Add Supplier', category: 'Admin', description: 'Add new suppliers' },
      { path: '/admin/products', name: 'Product Management', category: 'Admin', description: 'Manage products' },
      { path: '/admin/materials', name: 'Material Management', category: 'Admin', description: 'Manage materials' },
      { path: '/admin/data-entry', name: 'Data Entry', category: 'Admin', description: 'Data entry dashboard' },
      { path: '/admin/data-entry/add-product', name: 'Add Product', category: 'Admin', description: 'Add new products' },
      { path: '/admin/data-entry/add-material', name: 'Add Material', category: 'Admin', description: 'Add new materials' },
      { path: '/admin/data-entry/material-types', name: 'Material Types', category: 'Admin', description: 'Manage material types' },
      { path: '/admin/reports/supplier-performance', name: 'Supplier Performance', category: 'Admin Reports', description: 'Supplier performance reports' },
      { path: '/admin/reports/stock-analysis', name: 'Stock Analysis', category: 'Admin Reports', description: 'Stock analysis reports' },
      { path: '/admin/reports/sales-performance', name: 'Sales Performance', category: 'Admin Reports', description: 'Sales performance reports' },
      { path: '/admin/reports/packing-material-requests', name: 'Packing Material Status', category: 'Admin Reports', description: 'Packing material request status' },
      { path: '/admin/system/data-override', name: 'System Override', category: 'Admin', description: 'System data override' },
      { path: '/admin/pcs', name: 'Permission Control', category: 'Admin', description: 'Manage user permissions' },
      { path: '/admin/pcs/sales-history', name: 'Sales Approval History', category: 'Admin', description: 'View sales approval history' },
      
      // Warehouse Operations
      { path: '/warehouse/raw-materials', name: 'Raw Materials', category: 'Warehouse', description: 'Raw materials inventory' },
      { path: '/warehouse/raw-materials/request', name: 'Request Raw Materials', category: 'Warehouse', description: 'Request raw materials' },
      { path: '/warehouse/raw-materials/requests', name: 'Raw Material Requests', category: 'Warehouse', description: 'View raw material requests' },
      { path: '/warehouse/packing-materials', name: 'Packing Materials', category: 'Warehouse', description: 'Packing materials inventory' },
      { path: '/warehouse/packing-materials/request', name: 'Request Packing Materials', category: 'Warehouse', description: 'Request packing materials' },
      { path: '/warehouse/packing-materials/requests', name: 'Packing Material Requests', category: 'Warehouse', description: 'View packing material requests' },
      { path: '/warehouse/purchase-orders', name: 'Purchase Orders', category: 'Warehouse', description: 'Manage purchase orders' },
      { path: '/warehouse/goods-receipts', name: 'Goods Receipts', category: 'Warehouse', description: 'Manage goods receipts' },
      { path: '/warehouse/invoices', name: 'Invoices & Payments', category: 'Warehouse', description: 'Manage invoices and payments' },
      { path: '/warehouse/purchase-preparation', name: 'Purchase Preparation', category: 'Warehouse', description: 'Purchase preparation table' },
      { path: '/warehouse/qc/grn-list', name: 'GRN Quality Control', category: 'Warehouse', description: 'GRN quality control' },
      { path: '/warehouse/production-requests', name: 'Production Requests', category: 'Warehouse', description: 'Production material requests' },
      
      // Production
      { path: '/production/store', name: 'Production Store', category: 'Production', description: 'Production store inventory' },
      { path: '/production/batches', name: 'Batch Management', category: 'Production', description: 'Manage production batches' },
      { path: '/production/monitor', name: 'Active Monitor', category: 'Production', description: 'Monitor active batches' },
      { path: '/production/raw-material-requests', name: 'Raw Material Requests', category: 'Production', description: 'Raw material requests' },
      { path: '/production/products/create', name: 'Create Product', category: 'Production', description: 'Create new products' },
      { path: '/production/create-batch', name: 'Create Batch', category: 'Production', description: 'Create production batch' },
      { path: '/production/handover', name: 'Handover to Packing', category: 'Production', description: 'Handover to packing area' },
      { path: '/production/qc-records', name: 'QC Records', category: 'Production', description: 'Quality control records' },
      { path: '/production/reports', name: 'Production Reports', category: 'Production', description: 'Production reports' },
      { path: '/production/batch-table', name: 'Batch Table', category: 'Production', description: 'Batch data table' },
      { path: '/production/products', name: 'Product Details', category: 'Production', description: 'Product details view' },
      { path: '/production/products-table', name: 'Products Table', category: 'Production', description: 'Products data table' },
      
      // Packing Area
      { path: '/packing-area/stock', name: 'Product Stock', category: 'Packing Area', description: 'Packing area stock' },
      { path: '/packing-area/send-to-fg', name: 'Send to FG Store', category: 'Packing Area', description: 'Send to finished goods store' },
      { path: '/packing-area/package-products', name: 'Package Products', category: 'Packing Area', description: 'Convert bulk to units' },
      { path: '/packing-area/variants', name: 'Product Variants', category: 'Packing Area', description: 'Define packaging variants' },
      { path: '/packing-area/dispatch-history', name: 'Dispatch History', category: 'Packing Area', description: 'Dispatch history' },
      { path: '/packing-area/request-materials', name: 'Request Materials', category: 'Packing Area', description: 'Request packing materials' },
      { path: '/packing-area/request-products', name: 'Request Products', category: 'Packing Area', description: 'Request products from production' },
      
      // Finished Goods Store
      { path: '/finished-goods/inventory', name: 'Inventory', category: 'Finished Goods', description: 'Finished goods inventory' },
      { path: '/finished-goods/storage-locations', name: 'Storage Locations', category: 'Finished Goods', description: 'Storage location management' },
      { path: '/finished-goods/claim-dispatches', name: 'Claim Dispatches', category: 'Finished Goods', description: 'Claim dispatches from packing' },
      { path: '/finished-goods/direct-shop-requests', name: 'Direct Shop Requests', category: 'Finished Goods', description: 'Process direct shop requests' },
      { path: '/finished-goods/pricing', name: 'Product Pricing', category: 'Finished Goods', description: 'Manage product prices' },
      { path: '/finished-goods/external-dispatches', name: 'External Dispatches', category: 'Finished Goods', description: 'Track external dispatches' },
      
      // Additional FG Store Pages
      { path: '/finished-goods/price-history', name: 'Price History', category: 'Finished Goods', description: 'View product price history' },
      { path: '/finished-goods/dispatch-tracking', name: 'Dispatch Tracking', category: 'Finished Goods', description: 'Track all dispatches by recipient' },
      { path: '/finished-goods/recipient-analytics', name: 'Recipient Analytics', category: 'Finished Goods', description: 'View recipient dispatch analytics' },
      { path: '/finished-goods/approved-sales', name: 'Approved Sales Requests', category: 'Finished Goods', description: 'Send approved sales to recipients' },
      { path: '/finished-goods/mobile-requests', name: 'Mobile App Requests', category: 'Finished Goods', description: 'Manage requests from mobile app' },
      { path: '/finished-goods/stock-movements', name: 'Stock Movements', category: 'Finished Goods', description: 'View detailed stock movement history' },
      { path: '/finished-goods/expiry-management', name: 'Expiry Management', category: 'Finished Goods', description: 'Manage product expiry dates and alerts' },
      { path: '/finished-goods/quality-control', name: 'Quality Control', category: 'Finished Goods', description: 'Quality control for finished goods' },
      { path: '/finished-goods/batch-tracking', name: 'Batch Tracking', category: 'Finished Goods', description: 'Track products by batch numbers' },
      { path: '/finished-goods/location-management', name: 'Location Management', category: 'Finished Goods', description: 'Advanced storage location management' },
      { path: '/finished-goods/dispatch-reports', name: 'Dispatch Reports', category: 'Finished Goods', description: 'Generate dispatch reports' },
      
      // Packing Materials Store
      { path: '/packing-materials/stock', name: 'Stock List', category: 'Packing Materials Store', description: 'Packing materials stock' },
      { path: '/packing-materials/send', name: 'Send to Packing', category: 'Packing Materials Store', description: 'Send materials to packing area' },
      { path: '/packing-materials/request-from-warehouse', name: 'Request from Warehouse', category: 'Packing Materials Store', description: 'Request from warehouse' },
      { path: '/packing-materials/requests/internal', name: 'Internal Requests', category: 'Packing Materials Store', description: 'Internal material requests' },
      { path: '/packing-materials/requests/history', name: 'Request History', category: 'Packing Materials Store', description: 'Request history' },
      { path: '/packing-materials/dispatches', name: 'Dispatch History', category: 'Packing Materials Store', description: 'Dispatch history' },
      
      // Head of Operations
      { path: '/approvals', name: 'Approval Queue', category: 'Head of Operations', description: 'Approval queue' },
      { path: '/approvals/history', name: 'Request History', category: 'Head of Operations', description: 'Request history' },
      { path: '/approvals/supplier-monitoring', name: 'Supplier Monitoring', category: 'Head of Operations', description: 'Supplier monitoring' },
      { path: '/approvals/direct-shop-requests', name: 'Direct Shop Requests', category: 'Head of Operations', description: 'Approve direct shop requests' },
      
      // Reports
      { path: '/reports', name: 'Reports', category: 'Reports', description: 'General reports view' },
      
      // Main Director
      { path: '/direct-shop-requests', name: 'Direct Shop Requests', category: 'Main Director', description: 'Review direct shop requests from mobile app' },
      
      // Data Entry
      { path: '/data-entry', name: 'Data Entry Dashboard', category: 'Data Entry', description: 'Data entry dashboard' },
      { path: '/data-entry/add-product', name: 'Add Product', category: 'Data Entry', description: 'Add new product' },
      { path: '/data-entry/add-material', name: 'Add Material', category: 'Data Entry', description: 'Add new material' },
      { path: '/data-entry/material-types', name: 'Material Types', category: 'Data Entry', description: 'Manage material types' }
    ];
  },

  // Get user permissions
  async getUserPermissions(userId) {
    try {
      const permissions = await getData(`pcs/${userId}`);
      const firebasePages = permissions?.pages || {};
      
      // Convert Firebase keys back to page paths
      const convertedPages = {};
      Object.entries(firebasePages).forEach(([firebaseKey, value]) => {
        const pagePath = formatFirebaseKeyToPath(firebaseKey);
        convertedPages[pagePath] = value;
      });
      
      return convertedPages;
    } catch (error) {
      console.error('Failed to get user permissions:', error);
      return {};
    }
  },

  // Update user permissions
  async updateUserPermissions(userId, permissions) {
    try {
      const currentUser = auth.currentUser;
      
      // Always ensure dashboard is included for non-Admin users
      const finalPermissions = { '/dashboard': true, ...permissions };
      
      // Convert page paths to Firebase-safe keys
      const firebasePages = {};
      Object.entries(finalPermissions).forEach(([pagePath, value]) => {
        const firebaseKey = formatPathForFirebase(pagePath);
        firebasePages[firebaseKey] = value;
      });
      
      const permissionData = {
        pages: firebasePages,
        updatedAt: Date.now(),
        updatedBy: currentUser?.uid
      };
      
      // Use setData to completely replace the permissions object for immediate update
      await setData(`pcs/${userId}`, permissionData);
      
      return permissionData;
    } catch (error) {
      throw new Error(`Failed to update user permissions: ${error.message}`);
    }
  },

  // Check if user has permission for a specific page
  async hasPagePermission(userId, pagePath) {
    try {
      const permissions = await this.getUserPermissions(userId);
      return permissions[pagePath] === true;
    } catch (error) {
      console.error('Failed to check page permission:', error);
      return false;
    }
  },

  // Get all users with their current permissions
  async getAllUsersWithPermissions() {
    try {
      const [users, allPermissions] = await Promise.all([
        getData('users'),
        getData('pcs')
      ]);
      
      if (!users) return [];
      
      return Object.entries(users).map(([uid, userData]) => ({
        uid,
        ...userData,
        permissions: this.convertFirebaseKeysToPermissions(allPermissions?.[uid]?.pages || {})
      }));
    } catch (error) {
      throw new Error(`Failed to get users with permissions: ${error.message}`);
    }
  },

  // Helper method to convert Firebase keys back to permissions
  convertFirebaseKeysToPermissions(firebasePages) {
    const permissions = {};
    Object.entries(firebasePages).forEach(([firebaseKey, value]) => {
      const pagePath = formatFirebaseKeyToPath(firebaseKey);
      permissions[pagePath] = value;
    });
    return permissions;
  },

  // Reset user permissions to role defaults
  async resetUserPermissions(userId) {
    try {
      const currentUser = auth.currentUser;
      
      // Get user data to determine role
      const userData = await getData(`users/${userId}`);
      const userRole = userData?.role;
      
      // Set default permissions based on role
      const defaultPermissions = this.getDefaultRolePermissions(userRole);
      
      // Convert page paths to Firebase-safe keys
      const firebasePages = {};
      Object.entries(defaultPermissions).forEach(([pagePath, value]) => {
        const firebaseKey = formatPathForFirebase(pagePath);
        firebasePages[firebaseKey] = value;
      });
      
      // Use setData to completely replace the permissions object
      await setData(`pcs/${userId}`, {
        pages: firebasePages,
        resetAt: Date.now(),
        resetBy: currentUser?.uid,
        role: userRole,
        note: 'Reset to role defaults'
      });
      return true;
    } catch (error) {
      throw new Error(`Failed to reset user permissions: ${error.message}`);
    }
  },

  // Get default permissions for a role
  getDefaultRolePermissions(role) {
    const rolePermissions = {
      'ReadOnlyAdmin': {
        '/dashboard': true,
        '/admin/users': true,
        '/admin/suppliers': true,
        '/reports': true
      },
      'WarehouseStaff': {
        '/dashboard': true,
        '/warehouse/raw-materials': true,
        '/warehouse/raw-materials/request': true,
        '/warehouse/raw-materials/requests': true,
        '/warehouse/packing-materials': true,
        '/warehouse/packing-materials/request': true,
        '/warehouse/packing-materials/requests': true,
        '/warehouse/purchase-orders': true,
        '/warehouse/goods-receipts': true,
        '/warehouse/invoices': true,
        '/warehouse/purchase-preparation': true,
        '/warehouse/qc/grn-list': true,
        '/warehouse/production-requests': true,
        '/approvals/history': true
      },
      'ProductionManager': {
        '/dashboard': true,
        '/production/store': true,
        '/production/batches': true,
        '/production/monitor': true,
        '/production/raw-material-requests': true,
        '/production/products/create': true,
        '/production/create-batch': true,
        '/production/handover': true,
        '/production/qc-records': true,
        '/production/reports': true,
        '/production/batch-table': true,
        '/production/products': true,
        '/production/products-table': true
      },
      'PackingMaterialsStoreManager': {
        '/dashboard': true,
        '/packing-materials/stock': true,
        '/packing-materials/requests/internal': true,
        '/packing-materials/send': true,
        '/packing-materials/request-from-warehouse': true,
        '/packing-materials/requests/history': true,
        '/packing-materials/dispatches': true,
        '/approvals/history': true
      },
      'PackingAreaManager': {
        '/dashboard': true,
        '/packing-area/stock': true,
        '/packing-area/send-to-fg': true,
        '/packing-area/package-products': true,
        '/packing-area/variants': true,
        '/packing-area/dispatch-history': true,
        '/packing-area/request-materials': true,
        '/packing-area/request-products': true
      },
      'FinishedGoodsStoreManager': {
        '/dashboard': true,
        '/finished-goods/inventory': true,
        '/finished-goods/storage-locations': true,
        '/finished-goods/claim-dispatches': true,
        '/finished-goods/direct-shop-requests': true,
        '/finished-goods/pricing': true,
        '/finished-goods/external-dispatches': true,
        '/finished-goods/price-history': true,
        '/finished-goods/dispatch-tracking': true,
        '/finished-goods/recipient-analytics': true,
        '/finished-goods/approved-sales': true,
        '/finished-goods/mobile-requests': true,
        '/finished-goods/stock-movements': true,
        '/finished-goods/expiry-management': true,
        '/finished-goods/quality-control': true,
        '/finished-goods/batch-tracking': true,
        '/finished-goods/location-management': true,
        '/finished-goods/dispatch-reports': true
      },
      'HeadOfOperations': {
        '/dashboard': true,
        '/approvals': true,
        '/approvals/history': true,
        '/approvals/supplier-monitoring': true,
        '/approvals/direct-shop-requests': true,
        '/warehouse/production-requests': true,
        '/reports': true,
        '/admin/reports/packing-material-requests': true,
        '/production/products': true
      },
      'MainDirector': {
        '/dashboard': true,
        '/approvals': true,
        '/approvals/history': true,
        '/direct-shop-requests': true,
        '/reports': true,
        '/admin/reports/supplier-performance': true,
        '/admin/reports/packing-material-requests': true
      },
      'DataEntry': {
        '/dashboard': true,
        '/data-entry': true,
        '/data-entry/add-product': true,
        '/data-entry/add-material': true,
        '/data-entry/material-types': true
      }
    };

    // Return role-specific permissions or dashboard-only as fallback
    // This provides a secure default while allowing PCS to override
    return rolePermissions[role] || { '/dashboard': true };
  },

  // Initialize user permissions with role defaults
  async initializeUserPermissions(userId, role) {
    try {
      const currentUser = auth.currentUser;
      
      // Initialize with role-specific permissions
      // Admin can later modify these through PCS
      const defaultPermissions = role === 'Admin' 
        ? this.getDefaultRolePermissions(role)
        : this.getDefaultRolePermissions(role);
      
      // Convert page paths to Firebase-safe keys
      const firebasePages = {};
      Object.entries(defaultPermissions).forEach(([pagePath, value]) => {
        const firebaseKey = formatPathForFirebase(pagePath);
        firebasePages[firebaseKey] = value;
      });
      
      const permissionData = {
        pages: firebasePages,
        initializedAt: Date.now(),
        initializedBy: currentUser?.uid || 'system',
        role: role,
        note: role === 'Admin' ? 'Full access granted' : 'Role-based default permissions - Admin can modify via PCS'
      };
      
      await setData(`pcs/${userId}`, permissionData);
      return permissionData;
    } catch (error) {
      throw new Error(`Failed to initialize user permissions: ${error.message}`);
    }
  },

  // Ensure PCS entry exists for user
  async ensurePCSEntry(userId, role) {
    try {
      const existingPermissions = await getData(`pcs/${userId}`);
      
      if (!existingPermissions) {
        // Create initial PCS entry
        await this.initializeUserPermissions(userId, role);
        const newData = await getData(`pcs/${userId}`);
        // Convert Firebase keys back to page paths for return
        if (newData?.pages) {
          newData.pages = this.convertFirebaseKeysToPermissions(newData.pages);
        }
        return newData;
      }
      
      // Convert Firebase keys back to page paths
      if (existingPermissions?.pages) {
        existingPermissions.pages = this.convertFirebaseKeysToPermissions(existingPermissions.pages);
      }
      return existingPermissions;
    } catch (error) {
      console.error('Failed to ensure PCS entry:', error);
      // Create minimal entry as fallback
      const fallbackData = {
        pages: { '/dashboard': true },
        initializedAt: Date.now(),
        role: role,
        note: 'Fallback initialization'
      };
      
      try {
        // Convert to Firebase-safe keys before saving
        const firebasePages = {};
        Object.entries(fallbackData.pages).forEach(([pagePath, value]) => {
          const firebaseKey = formatPathForFirebase(pagePath);
          firebasePages[firebaseKey] = value;
        });
        
        await setData(`pcs/${userId}`, {
          ...fallbackData,
          pages: firebasePages
        });
        return fallbackData;
      } catch (fallbackError) {
        console.error('Failed to create fallback PCS entry:', fallbackError);
        return { pages: { '/dashboard': true } };
      }
    }
  },

  // Bulk update permissions for multiple users
  async bulkUpdatePermissions(updates) {
    try {
      const currentUser = auth.currentUser;
      const timestamp = Date.now();
      
      // Process updates one by one to ensure proper Firebase handling
      for (const { userId, permissions } of updates) {
        // Convert page paths to Firebase-safe keys
        const firebasePages = {};
        const finalPermissions = { '/dashboard': true, ...permissions };
        Object.entries(finalPermissions).forEach(([pagePath, value]) => {
          const firebaseKey = formatPathForFirebase(pagePath);
          firebasePages[firebaseKey] = value;
        });
        
        const permissionData = {
          pages: firebasePages,
          updatedAt: timestamp,
          updatedBy: currentUser?.uid
        };
        
        await updateData(`pcs/${userId}`, permissionData);
      }
      
      return true;
    } catch (error) {
      throw new Error(`Failed to bulk update permissions: ${error.message}`);
    }
  }
};