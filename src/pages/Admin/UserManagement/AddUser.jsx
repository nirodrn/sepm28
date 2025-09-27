import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { UserPlus, Save, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { userService } from '../../../services/userService';
import { supplierService } from '../../../services/supplierService';
import LoadingSpinner from '../../../components/Common/LoadingSpinner';

const AddUser = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'DataEntry',
    department: 'DataEntry',
    distributorId: '',
    status: 'active'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [distributors, setDistributors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const roles = [
    { value: 'DataEntry', label: 'Data Entry', department: 'DataEntry' },
    { value: 'WarehouseStaff', label: 'Warehouse Staff', department: 'WarehouseOperations' },
    { value: 'ProductionManager', label: 'Production Manager', department: 'Production' },
    { value: 'PackingAreaManager', label: 'Packing Area Manager', department: 'PackingArea' },
    { value: 'FinishedGoodsStoreManager', label: 'Finished Goods Store Manager', department: 'FinishedGoodsStore' },
    { value: 'PackingMaterialsStoreManager', label: 'Packing Materials Store Manager', department: 'PackingMaterialsStore' },
    { value: 'HeadOfOperations', label: 'Head of Operations', department: 'HeadOfOperations' },
    { value: 'MainDirector', label: 'Main Director', department: 'MainDirector' },
    { value: 'ReadOnlyAdmin', label: 'Read Only Admin', department: 'Admin' },
    { value: 'Admin', label: 'System Administrator', department: 'Admin' },
    // Sales Roles
    { value: 'DirectRepresentative', label: 'Direct Representative (DR)', department: 'Sales' },
    { value: 'DirectShowroomManager', label: 'Direct Showroom (DS) Manager', department: 'Sales' },
    { value: 'DSStaff', label: 'DS Staff', department: 'Sales' },
    { value: 'Distributor', label: 'Distributor', department: 'Sales' },
    { value: 'DistributorRepresentative', label: 'Distributor Representative (Dis Rep)', department: 'Sales' }
  ];

  useEffect(() => {
    loadDistributors();
    if (isEdit) {
      loadUserData();
    }
  }, [id, isEdit]);

  const loadDistributors = async () => {
    try {
      // Load users with Distributor role
      const allUsers = await userService.getAllUsers();
      const distributorUsers = allUsers.filter(user => 
        user.role === 'Distributor' && user.status === 'active'
      );
      setDistributors(distributorUsers);
    } catch (error) {
      console.error('Failed to load distributors:', error);
    }
  };

  const loadUserData = async () => {
    try {
      setLoading(true);
      const userData = await userService.getUserById(id);
      setFormData({
        name: userData.name || '',
        email: userData.email || '',
        password: '', // Don't populate password for edit
        confirmPassword: '',
        role: userData.role || 'DataEntry',
        department: userData.department || 'DataEntry',
        distributorId: userData.distributorId || '',
        status: userData.status || 'active'
      });
    } catch (error) {
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'role') {
      const selectedRole = roles.find(role => role.value === value);
      setFormData(prev => ({
        ...prev,
        role: value,
        department: selectedRole.department
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validation
      if (!isEdit && formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (!isEdit && formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      const userData = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        department: formData.department,
        distributorId: formData.distributorId || null,
        status: formData.status
      };

      if (!isEdit) {
        userData.password = formData.password;
      }

      if (isEdit) {
        await userService.updateUserData(id, userData);
        setSuccess('User updated successfully!');
      } else {
        await userService.createNewUser(userData);
        setSuccess('User created successfully!');
      }

      setTimeout(() => {
        navigate('/admin/users');
      }, 2000);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getRoleDescription = (roleValue) => {
    const descriptions = {
      'DataEntry': 'Can add and edit product/material data',
      'WarehouseStaff': 'Manages raw materials, purchase orders, and inventory',
      'ProductionManager': 'Oversees production batches and quality control',
      'PackingAreaManager': 'Manages packing operations and material requests',
      'FinishedGoodsStoreManager': 'Manages finished goods inventory and dispatches',
      'PackingMaterialsStoreManager': 'Manages packing materials inventory',
      'HeadOfOperations': 'Approves material requests and monitors operations',
      'MainDirector': 'Final approval authority for high-value requests',
      'ReadOnlyAdmin': 'View-only access to reports and data',
      'Admin': 'Full system access and user management',
      'DirectRepresentative': 'Manages direct sales and customer relationships',
      'DirectShowroomManager': 'Oversees showroom operations and sales staff',
      'DSStaff': 'Handles showroom sales and customer service',
      'Distributor': 'Manages distribution network and wholesale operations',
      'DistributorRepresentative': 'Represents distributor interests and manages accounts'
    };
    return descriptions[roleValue] || '';
  };

  const getDepartmentColor = (department) => {
    const colors = {
      'DataEntry': 'bg-blue-100 text-blue-800',
      'WarehouseOperations': 'bg-green-100 text-green-800',
      'Production': 'bg-purple-100 text-purple-800',
      'PackingArea': 'bg-orange-100 text-orange-800',
      'FinishedGoodsStore': 'bg-indigo-100 text-indigo-800',
      'PackingMaterialsStore': 'bg-yellow-100 text-yellow-800',
      'HeadOfOperations': 'bg-red-100 text-red-800',
      'MainDirector': 'bg-gray-100 text-gray-800',
      'Admin': 'bg-pink-100 text-pink-800',
      'Sales': 'bg-emerald-100 text-emerald-800'
    };
    return colors[department] || 'bg-gray-100 text-gray-800';
  };

  if (loading && isEdit) {
    return <LoadingSpinner text="Loading user data..." />;
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/admin/users')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <UserPlus className="h-8 w-8 mr-3 text-blue-600" />
              {isEdit ? 'Edit User' : 'Add New User'}
            </h1>
            <p className="text-gray-600 mt-2">
              {isEdit ? 'Update user information and permissions' : 'Create a new user account with appropriate role and permissions'}
            </p>
          </div>
        </div>
      </div>

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-green-800 font-medium">{success}</p>
              <p className="text-green-600 text-sm">Redirecting to user list...</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-4xl">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">User Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter email address"
              />
            </div>

            {!isEdit && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      minLength="6"
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Minimum 6 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Confirm password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role *
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {roles.map(role => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              {formData.role && (
                <p className="text-sm text-gray-500 mt-1">
                  {getRoleDescription(formData.role)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                />
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDepartmentColor(formData.department)}`}>
                  {formData.department}
                </span>
              </div>
            </div>

            {/* Supplier Selection for Distributor roles */}
            {formData.role === 'DistributorRepresentative' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Associated Distributor *
                </label>
                <select
                  name="distributorId"
                  value={formData.distributorId}
                  onChange={handleChange}
                  required={formData.role === 'DistributorRepresentative'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select distributor</option>
                  {distributors.map(distributor => (
                    <option key={distributor.uid || distributor.id} value={distributor.uid || distributor.id}>
                      {distributor.name} - {distributor.email}
                    </option>
                  ))}
                </select>
                {distributors.length === 0 && (
                  <p className="text-sm text-yellow-600 mt-1">
                    No distributors found. Please create a user with 'Distributor' role first.
                  </p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  Required: Select the distributor this representative works for
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
        </div>

        {/* Role Information Card */}
        {formData.role && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Role Information</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">{roles.find(r => r.value === formData.role)?.label}</h4>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDepartmentColor(formData.department)}`}>
                    {formData.department}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                {getRoleDescription(formData.role)}
              </p>
              
              {/* Sales Role Specific Information */}
              {formData.department === 'Sales' && (
                <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <h5 className="font-medium text-emerald-900 mb-2">Sales Department Access</h5>
                  <ul className="text-sm text-emerald-800 space-y-1">
                    <li>• Access to customer management and sales tracking</li>
                    <li>• View product catalog and pricing information</li>
                    <li>• Generate sales reports and performance metrics</li>
                    {(formData.role === 'DirectShowroomManager' || formData.role === 'Distributor') && (
                      <li>• Manage team members and territory assignments</li>
                    )}
                    {formData.role === 'Distributor' && (
                      <li>• Access to distributor-specific pricing and inventory</li>
                    )}
                    {formData.role === 'DistributorRepresentative' && (
                      <li>• Represents specific distributor and manages their accounts</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/admin/users')}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>{loading ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update User' : 'Create User')}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddUser;