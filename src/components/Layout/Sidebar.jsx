import React from 'react';
import { NavLink } from 'react-router-dom';
import { useRole } from '../../hooks/useRole';
import { usePermissions } from '../../hooks/usePermissions';
import {
  Home, Users, Package, TruckIcon, FileText, BarChart3,
  Settings, ShoppingCart, Clipboard, Archive, Factory, Package2, Send,
  Eye, Database, Receipt, CheckCircle, Clock, TrendingUp, Crown, ClipboardCheck, Plus, Warehouse, MapPin, Shield, Smartphone, DollarSign, AlertTriangle
} from 'lucide-react';

const Sidebar = () => {
  const { userRole, hasRole } = useRole();
  const { hasPagePermission, getAccessiblePages, loading } = usePermissions();

  const getMenuItems = () => {
    if (!userRole) return [];

    const baseItems = [
      {
        title: 'Dashboard',
        icon: Home,
        path: '/dashboard',
        roles: ['all']
      }
    ];

    // Admin gets full access to everything
    if (hasRole('Admin')) {
      return [
        ...baseItems,
        {
          title: 'User Management',
          icon: Users,
          path: '/admin/users',
          roles: ['Admin']
        },
        {
          title: 'Permission Control',
          icon: Shield,
          path: '/admin/pcs',
          roles: ['Admin']
        },
        {
          title: 'Supplier Management',
          icon: TruckIcon,
          path: '/admin/suppliers',
          roles: ['Admin']
        },
        {
          title: 'Product Management',
          icon: Package,
          path: '/admin/products',
          roles: ['Admin']
        },
        {
          title: 'Material Management',
          icon: Package2,
          path: '/admin/materials',
          roles: ['Admin']
        },
        {
          title: 'Data Entry',
          icon: FileText,
          path: '/admin/data-entry',
          roles: ['Admin']
        },
        {
          title: 'Admin Reports',
          icon: BarChart3,
          path: '/admin/reports/supplier-performance',
          roles: ['Admin']
        },
        {
          title: 'Packing Material Status',
          icon: ShoppingCart,
          path: '/admin/reports/packing-material-requests',
          roles: ['Admin']
        },
        {
          title: 'System Override',
          icon: Settings,
          path: '/admin/system/data-override',
          roles: ['Admin']
        }
      ];
    }

    // For non-Admin users, use PCS-based permissions exclusively
    if (loading) {
      // Show only dashboard while loading
      return baseItems;
    }

    // Get accessible pages from PCS
    const accessiblePages = getAccessiblePages();
    
    // If no accessible pages or only dashboard, show only dashboard
    const nonDashboardPages = accessiblePages.filter(page => page.path !== '/dashboard');
    if (nonDashboardPages.length === 0) {
      return baseItems;
    }

    // Map page paths to appropriate icons
    const iconMap = {
      '/dashboard': Home,
      '/admin/users': Users,
      '/admin/pcs': Shield,
      '/admin/pcs/sales-history': ClipboardCheck,
      '/admin/suppliers': TruckIcon,
      '/admin/products': Package,
      '/admin/materials': Package2,
      '/admin/data-entry': FileText,
      '/admin/reports/supplier-performance': BarChart3,
      '/admin/reports/stock-analysis': BarChart3,
      '/admin/reports/sales-performance': BarChart3,
      '/admin/reports/packing-material-requests': ShoppingCart,
      '/admin/system/data-override': Settings,
      '/warehouse/raw-materials': Package,
      '/warehouse/packing-materials': Archive,
      '/warehouse/purchase-orders': FileText,
      '/warehouse/goods-receipts': Package,
      '/warehouse/invoices': Receipt,
      '/warehouse/purchase-preparation': ShoppingCart,
      '/warehouse/qc/grn-list': ClipboardCheck,
      '/warehouse/production-requests': Factory,
      '/production/store': Warehouse,
      '/production/batches': Factory,
      '/production/monitor': Clock,
      '/production/products/create': Plus,
      '/production/create-batch': Factory,
      '/production/handover': Send,
      '/production/qc-records': ClipboardCheck,
      '/production/reports': BarChart3,
      '/production/batch-table': FileText,
      '/production/products': Eye,
      '/production/products-table': FileText,
      '/packing-area/stock': Package,
      '/packing-area/send-to-fg': Send,
      '/packing-area/package-products': Package2,
      '/packing-area/variants': Settings,
      '/packing-area/dispatch-history': Clock,
      '/packing-area/request-materials': Archive,
      '/packing-area/request-products': Factory,
      '/finished-goods/inventory': Package,
      '/finished-goods/storage-locations': MapPin,
      '/finished-goods/claim-dispatches': Send,
      '/finished-goods/direct-shop-requests': Smartphone,
      '/finished-goods/pricing': DollarSign,
      '/finished-goods/external-dispatches': Send,
      '/finished-goods/price-history': Clock,
      '/finished-goods/dispatch-tracking': TrendingUp,
      '/finished-goods/recipient-analytics': BarChart3,
      '/finished-goods/mobile-requests': Smartphone,
      '/finished-goods/stock-movements': TrendingUp,
      '/finished-goods/expiry-management': AlertTriangle,
      '/finished-goods/quality-control': ClipboardCheck,
      '/finished-goods/batch-tracking': Package,
      '/finished-goods/location-management': MapPin,
      '/finished-goods/dispatch-reports': FileText,
      '/packing-materials/stock': Archive,
      '/packing-materials/send': Send,
      '/packing-materials/request-from-warehouse': ShoppingCart,
      '/packing-materials/requests/internal': Package,
      '/packing-materials/requests/history': Clock,
      '/packing-materials/dispatches': Send,
      '/approvals': CheckCircle,
      '/approvals/history': Clock,
      '/approvals/supplier-monitoring': TrendingUp,
      '/approvals/direct-shop-requests': Smartphone,
      '/reports': BarChart3,
      '/direct-shop-requests': Smartphone,
      '/data-entry': FileText,
      '/data-entry/add-product': Plus,
      '/data-entry/add-material': Plus,
      '/data-entry/material-types': Database
    };
    
    // Convert accessible pages to menu items format
    const menuItems = accessiblePages.map(page => ({
      title: page.name,
      icon: iconMap[page.path] || Package,
      path: page.path,
      roles: ['all'] // PCS-controlled pages are accessible regardless of role
    }));
    
    return menuItems;
  };

  const menuItems = getMenuItems();
  
  // Menu items are already filtered appropriately:
  // - Admin users get all admin menu items
  // - Non-Admin users get PCS-filtered menu items
  const filteredMenuItems = menuItems;

  return (
    <aside className="bg-gray-900 text-white w-64 min-h-screen">
      <div className="p-6">
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold">{userRole?.department}</h2>
          <p className="text-gray-400 text-sm">{userRole?.role}</p>
        </div>
        
        <nav>
          <ul className="space-y-2">
            {filteredMenuItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`
                  }
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.title}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        
        {/* PCS Status info for non-Admin users */}
        {!hasRole('Admin') && (
          <div className="mt-8 p-3 bg-gray-800 rounded-lg">
            <p className="text-xs text-gray-400 mb-2">PCS Status:</p>
            <p className="text-xs text-gray-300">
              {loading ? 'Loading permissions...' : `${filteredMenuItems.length} pages accessible`}
            </p>
            {!loading && filteredMenuItems.length === 1 && (
              <p className="text-xs text-yellow-300 mt-1">
                Dashboard only - Admin can grant additional access
              </p>
            )}
            {!loading && filteredMenuItems.length > 1 && (
              <p className="text-xs text-green-300 mt-1">
                Cross-role access granted by Admin
              </p>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;