import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Grid3X3, 
  Download, 
  Filter, 
  Search, 
  CheckCircle, 
  XCircle,
  ArrowLeft,
  Users,
  Shield
} from 'lucide-react';
import { pcsService } from '../../../services/pcsService';
import LoadingSpinner from '../../../components/Common/LoadingSpinner';
import * as XLSX from 'xlsx';

const UserPermissionMatrix = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [allPages, setAllPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, pages] = await Promise.all([
        pcsService.getAllUsersWithPermissions(),
        Promise.resolve(pcsService.getAllAvailablePages())
      ]);
      
      setUsers(usersData.filter(user => user.status === 'active'));
      setAllPages(pages);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getPermissionStatus = (user, pagePath) => {
    // Admin always has access
    if (user.role === 'Admin') return 'admin';
    
    // Check if permission is explicitly set
    if (user.permissions && user.permissions.hasOwnProperty(pagePath)) {
      return user.permissions[pagePath] ? 'granted' : 'denied';
    }
    
    // Check role-based default
    const rolePermissions = {
      'ReadOnlyAdmin': ['/dashboard', '/admin/users', '/admin/suppliers', '/reports'],
      'WarehouseStaff': ['/dashboard', '/warehouse/raw-materials', '/warehouse/packing-materials', '/warehouse/purchase-orders', '/warehouse/goods-receipts', '/warehouse/invoices', '/warehouse/purchase-preparation', '/warehouse/qc/grn-list', '/warehouse/production-requests', '/approvals/history'],
      'ProductionManager': ['/dashboard', '/production/store', '/production/batches', '/production/monitor', '/production/raw-material-requests', '/production/products/create', '/production/create-batch', '/production/handover', '/production/qc-records', '/production/reports', '/production/batch-table', '/production/products', '/production/products-table'],
      'PackingMaterialsStoreManager': ['/dashboard', '/packing-materials/stock', '/packing-materials/requests/internal', '/packing-materials/send', '/packing-materials/request-from-warehouse', '/packing-materials/requests/history', '/packing-materials/dispatches', '/approvals/history'],
      'PackingAreaManager': ['/dashboard', '/packing-area/stock', '/packing-area/send-to-fg', '/packing-area/package-products', '/packing-area/variants', '/packing-area/dispatch-history', '/packing-area/request-materials', '/packing-area/request-products'],
      'FinishedGoodsStoreManager': ['/dashboard', '/finished-goods/inventory', '/finished-goods/storage-locations', '/finished-goods/claim-dispatches'],
      'HeadOfOperations': ['/dashboard', '/approvals', '/approvals/history', '/approvals/supplier-monitoring', '/warehouse/production-requests', '/reports', '/admin/reports/packing-material-requests', '/production/products'],
      'MainDirector': ['/dashboard', '/approvals', '/approvals/history', '/reports', '/admin/reports/supplier-performance', '/admin/reports/packing-material-requests'],
      'DataEntry': ['/dashboard', '/data-entry', '/data-entry/add-product', '/data-entry/add-material', '/data-entry/material-types']
    };
    
    const userRolePages = rolePermissions[user.role] || [];
    return userRolePages.includes(pagePath) ? 'role_default' : 'role_denied';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'admin':
        return <Shield className="h-4 w-4 text-purple-600" />;
      case 'granted':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'denied':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'role_default':
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case 'role_denied':
        return <XCircle className="h-4 w-4 text-gray-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'admin':
        return 'bg-purple-100';
      case 'granted':
        return 'bg-green-100';
      case 'denied':
        return 'bg-red-100';
      case 'role_default':
        return 'bg-blue-100';
      case 'role_denied':
        return 'bg-gray-100';
      default:
        return 'bg-white';
    }
  };

  const exportToExcel = () => {
    const matrixData = [];
    
    // Header row
    const headerRow = ['User', 'Role', 'Department', ...allPages.map(page => page.name)];
    matrixData.push(headerRow);
    
    // Data rows
    filteredUsers.forEach(user => {
      const row = [
        user.name,
        user.role,
        user.department,
        ...allPages.map(page => {
          const status = getPermissionStatus(user, page.path);
          switch (status) {
            case 'admin': return 'ADMIN';
            case 'granted': return 'GRANTED';
            case 'denied': return 'DENIED';
            case 'role_default': return 'ROLE_DEFAULT';
            case 'role_denied': return 'ROLE_DENIED';
            default: return 'UNKNOWN';
          }
        })
      ];
      matrixData.push(row);
    });
    
    const worksheet = XLSX.utils.aoa_to_sheet(matrixData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'User Permissions');
    
    XLSX.writeFile(workbook, `user-permissions-matrix-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !filterRole || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const filteredPages = allPages.filter(page => {
    const matchesCategory = !filterCategory || page.category === filterCategory;
    return matchesCategory;
  });

  const categories = [...new Set(allPages.map(page => page.category))];
  const roles = [...new Set(users.map(user => user.role))];

  if (loading) {
    return <LoadingSpinner text="Loading permission matrix..." />;
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/admin/pcs')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Grid3X3 className="h-8 w-8 mr-3 text-blue-600" />
              User Permission Matrix
            </h1>
            <p className="text-gray-600 mt-2">Overview of all user permissions across the system</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Filters and Export */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Roles</option>
                {roles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
            
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          
          <button
            onClick={exportToExcel}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export to Excel</span>
          </button>
        </div>
      </div>

      {/* Permission Matrix */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="sticky left-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                  User
                </th>
                {filteredPages.map((page) => (
                  <th
                    key={page.path}
                    className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] border-r border-gray-200"
                    title={page.description}
                  >
                    <div className="transform -rotate-45 origin-center whitespace-nowrap">
                      {page.name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.uid} className="hover:bg-gray-50">
                  <td className="sticky left-0 bg-white px-6 py-4 border-r border-gray-200">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${
                        user.role === 'Admin' ? 'bg-red-100 text-red-800' :
                        user.role === 'HeadOfOperations' ? 'bg-purple-100 text-purple-800' :
                        user.role === 'MainDirector' ? 'bg-indigo-100 text-indigo-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role}
                      </span>
                    </div>
                  </td>
                  {filteredPages.map((page) => {
                    const status = getPermissionStatus(user, page.path);
                    return (
                      <td
                        key={page.path}
                        className={`px-3 py-4 text-center border-r border-gray-200 ${getStatusColor(status)}`}
                        title={`${page.name}: ${status.replace('_', ' ').toUpperCase()}`}
                      >
                        {getStatusIcon(status)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search criteria.
            </p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Permission Status Legend</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4 text-purple-600" />
            <span className="text-sm text-gray-700">Admin - Full Access</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm text-gray-700">Custom: Granted</span>
          </div>
          <div className="flex items-center space-x-2">
            <XCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-gray-700">Custom: Denied</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-gray-700">Role: Default Access</span>
          </div>
          <div className="flex items-center space-x-2">
            <XCircle className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-700">Role: No Access</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserPermissionMatrix;