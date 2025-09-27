import React, { useState, useEffect } from 'react';
import { Shield, Users, Save, RotateCcw, Eye, Edit, Check, X, Search, Filter } from 'lucide-react';
import { pcsService } from '../../../services/pcsService';
import { userService } from '../../../services/userService';
import { useAuth } from '../../../hooks/useAuth';
import LoadingSpinner from '../../../components/Common/LoadingSpinner';
import ErrorMessage from '../../../components/Common/ErrorMessage';

const PermissionControl = () => {
  const { userRole } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPermissions, setUserPermissions] = useState({});
  const [availablePages, setAvailablePages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load all users with their current permissions
      const [usersData, pages] = await Promise.all([
        pcsService.getAllUsersWithPermissions(),
        Promise.resolve(pcsService.getAllAvailablePages())
      ]);

      // Filter out Admin users (they have full access by default)
      const nonAdminUsers = usersData.filter(user => user.role !== 'Admin');
      setUsers(nonAdminUsers);
      setAvailablePages(pages);

    } catch (err) {
      console.error('Error loading PCS data:', err);
      setError('Failed to load permission data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = async (user) => {
    try {
      setSelectedUser(user);
      setError('');
      
      // Load user's current permissions from Firebase
      const permissions = await pcsService.getUserPermissions(user.uid);
      setUserPermissions(permissions);
      
    } catch (err) {
      console.error('Error loading user permissions:', err);
      setError('Failed to load user permissions: ' + err.message);
      setUserPermissions({});
    }
  };

  const handlePermissionToggle = (pagePath) => {
    setUserPermissions(prev => ({
      ...prev,
      [pagePath]: !prev[pagePath]
    }));
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // Always ensure dashboard is included for non-Admin users
      const finalPermissions = {
        '/dashboard': true,
        ...userPermissions
      };

      await pcsService.updateUserPermissions(selectedUser.uid, finalPermissions);
      
      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.uid === selectedUser.uid 
            ? { ...user, permissions: finalPermissions }
            : user
        )
      );

      setSuccess('Permissions updated successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      console.error('Error saving permissions:', err);
      setError('Failed to save permissions: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = async () => {
    if (!selectedUser) return;

    if (window.confirm(`Reset ${selectedUser.name}'s permissions to role defaults?`)) {
      try {
        setSaving(true);
        setError('');
        setSuccess('');

        await pcsService.resetUserPermissions(selectedUser.uid);
        
        // Reload user permissions
        const permissions = await pcsService.getUserPermissions(selectedUser.uid);
        setUserPermissions(permissions);
        
        // Update local state
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.uid === selectedUser.uid 
              ? { ...user, permissions: permissions }
              : user
          )
        );

        setSuccess('Permissions reset to defaults successfully!');
        setTimeout(() => setSuccess(''), 3000);

      } catch (err) {
        console.error('Error resetting permissions:', err);
        setError('Failed to reset permissions: ' + err.message);
      } finally {
        setSaving(false);
      }
    }
  };

  const getPermissionCount = (user) => {
    const permissions = user.permissions || {};
    return Object.values(permissions).filter(Boolean).length;
  };

  const getRoleColor = (role) => {
    const colors = {
      'ReadOnlyAdmin': 'bg-blue-100 text-blue-800',
      'WarehouseStaff': 'bg-green-100 text-green-800',
      'ProductionManager': 'bg-purple-100 text-purple-800',
      'PackingAreaManager': 'bg-orange-100 text-orange-800',
      'FinishedGoodsStoreManager': 'bg-indigo-100 text-indigo-800',
      'PackingMaterialsStoreManager': 'bg-pink-100 text-pink-800',
      'HeadOfOperations': 'bg-red-100 text-red-800',
      'MainDirector': 'bg-gray-100 text-gray-800',
      'DataEntry': 'bg-yellow-100 text-yellow-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const groupPagesByCategory = () => {
    const grouped = {};
    availablePages.forEach(page => {
      if (!grouped[page.category]) {
        grouped[page.category] = [];
      }
      grouped[page.category].push(page);
    });
    return grouped;
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !filterRole || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const uniqueRoles = [...new Set(users.map(user => user.role))];

  if (loading) {
    return <LoadingSpinner text="Loading permission control system..." />;
  }

  // Only allow Admin users to access PCS
  if (userRole?.role !== 'Admin') {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Shield className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Access Denied</h3>
          <p className="mt-1 text-sm text-gray-500">
            Only administrators can access the Permission Control System.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Shield className="h-8 w-8 mr-3 text-blue-600" />
          Permission Control System (PCS)
        </h1>
        <p className="text-gray-600 mt-2">
          Manage user access permissions for different pages and features
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Users className="h-5 w-5 mr-2 text-blue-600" />
                Users ({filteredUsers.length})
              </h2>
            </div>
            
            {/* Search and Filter */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Roles</option>
                  {uniqueRoles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="p-6 text-center">
                <Users className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No users found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <div
                    key={user.uid}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedUser?.uid === user.uid
                        ? 'bg-blue-50 border-r-4 border-blue-500'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleUserSelect(user)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{user.name}</h3>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                            {user.role}
                          </span>
                          <span className="text-xs text-gray-500">
                            {getPermissionCount(user)} pages
                          </span>
                        </div>
                      </div>
                      {selectedUser?.uid === user.uid && (
                        <div className="text-blue-600">
                          <Edit className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Permission Editor */}
        <div className="lg:col-span-2">
          {!selectedUser ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <Shield className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">Select a User</h3>
              <p className="mt-1 text-sm text-gray-500">
                Choose a user from the list to manage their permissions
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Permissions for {selectedUser.name}
                    </h2>
                    <div className="flex items-center space-x-3 mt-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(selectedUser.role)}`}>
                        {selectedUser.role}
                      </span>
                      <span className="text-sm text-gray-500">{selectedUser.email}</span>
                      <span className="text-sm text-gray-500">
                        {Object.values(userPermissions).filter(Boolean).length} pages accessible
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleResetToDefaults}
                      disabled={saving}
                      className="px-3 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center space-x-2 disabled:opacity-50 transition-colors"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>Reset to Defaults</span>
                    </button>
                    <button
                      onClick={handleSavePermissions}
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2 disabled:opacity-50 transition-colors"
                    >
                      <Save className="h-4 w-4" />
                      <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <Shield className="h-5 w-5 text-blue-600 mt-0.5 mr-2" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-800">Permission Guidelines</h4>
                      <ul className="text-sm text-blue-700 mt-1 space-y-1">
                        <li>• Dashboard access is always granted and cannot be removed</li>
                        <li>• Admin users have full access to all pages by default</li>
                        <li>• Changes take effect immediately after saving</li>
                        <li>• Users will see only the pages they have permission to access</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Permission Categories */}
                <div className="space-y-6">
                  {Object.entries(groupPagesByCategory()).map(([category, pages]) => (
                    <div key={category} className="border border-gray-200 rounded-lg">
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                        <h3 className="font-medium text-gray-900">{category}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {pages.filter(page => userPermissions[page.path]).length} of {pages.length} pages accessible
                        </p>
                      </div>
                      <div className="p-4">
                        <div className="grid grid-cols-1 gap-3">
                          {pages.map((page) => {
                            const isEnabled = userPermissions[page.path] === true;
                            const isDashboard = page.path === '/dashboard';
                            
                            return (
                              <div
                                key={page.path}
                                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                  isDashboard
                                    ? 'bg-blue-50 border-blue-200'
                                    : isEnabled
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                }`}
                              >
                                <div className="flex items-center space-x-3">
                                  <div className={`w-2 h-2 rounded-full ${
                                    isDashboard ? 'bg-blue-500' : isEnabled ? 'bg-green-500' : 'bg-gray-300'
                                  }`}></div>
                                  <div>
                                    <h4 className="font-medium text-gray-900">{page.name}</h4>
                                    <p className="text-sm text-gray-500">{page.description}</p>
                                    <p className="text-xs text-gray-400 font-mono">{page.path}</p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {isDashboard ? (
                                    <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                      <Check className="h-3 w-3 mr-1" />
                                      Always Enabled
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handlePermissionToggle(page.path)}
                                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                        isEnabled ? 'bg-green-600' : 'bg-gray-200'
                                      }`}
                                    >
                                      <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                          isEnabled ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                      />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Permission Summary */}
                <div className="mt-6 bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Permission Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Total Pages Available:</span>
                      <span className="font-medium text-gray-900 ml-2">{availablePages.length}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Pages Accessible:</span>
                      <span className="font-medium text-green-600 ml-2">
                        {Object.values(userPermissions).filter(Boolean).length}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Access Level:</span>
                      <span className="font-medium text-blue-600 ml-2">
                        {Math.round((Object.values(userPermissions).filter(Boolean).length / availablePages.length) * 100)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Role:</span>
                      <span className="font-medium text-gray-900 ml-2">{selectedUser.role}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Users Overview Table */}
      <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Users Overview</h2>
          <p className="text-sm text-gray-500 mt-1">Quick view of all users and their permission status</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pages Accessible
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Access Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => {
                const permissionCount = getPermissionCount(user);
                const accessPercentage = Math.round((permissionCount / availablePages.length) * 100);
                
                return (
                  <tr key={user.uid} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.department}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{permissionCount} pages</div>
                      <div className="text-xs text-gray-500">of {availablePages.length} total</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className={`h-2 rounded-full ${
                              accessPercentage >= 75 ? 'bg-green-500' :
                              accessPercentage >= 50 ? 'bg-yellow-500' :
                              accessPercentage >= 25 ? 'bg-orange-500' : 'bg-red-500'
                            }`}
                            style={{width: `${accessPercentage}%`}}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-900">{accessPercentage}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleUserSelect(user)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        title="Edit Permissions"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PermissionControl;