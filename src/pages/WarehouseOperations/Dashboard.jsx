import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, CheckCircle, Clock, FileText, Receipt, TruckIcon, CreditCard, Send, Archive } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { subscribeToData } from '../../firebase/db';
import { requestService } from '../../services/requestService';
import { materialService } from '../../services/materialService';
import { auth } from '../../firebase/auth';
import { formatDate } from '../../utils/formatDate';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const WarehouseOperationsDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
    
    // Set up real-time listener for material requests
    const unsubscribe = subscribeToData('materialRequests', () => {
      loadDashboardData();
    });
    
    return () => unsubscribe();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        setError('User not authenticated');
        return;
      }

      // Get user's own requests
      const userRequests = await requestService.getMaterialRequests({ 
        requestedBy: currentUser.uid 
      });

      // Calculate material totals
      const [rawMaterials, packingMaterials] = await Promise.all([
        materialService.getRawMaterials(),
        materialService.getPackingMaterials()
      ]);

      const totalRawMaterialsValue = rawMaterials.reduce((sum, material) => {
        const stock = material.currentStock || 0;
        const price = material.pricePerUnit || 0;
        return sum + (stock * price);
      }, 0);

      const totalPackingMaterialsValue = packingMaterials.reduce((sum, material) => {
        const stock = material.currentStock || 0;
        const price = material.pricePerUnit || 0;
        return sum + (stock * price);
      }, 0);

      // Calculate stats
      const pendingRequests = userRequests.filter(req => req.status === 'pending_ho').length;
      const approvedRequests = userRequests.filter(req => 
        ['forwarded_to_md', 'md_approved'].includes(req.status)
      ).length;
      const rejectedRequests = userRequests.filter(req => 
        ['ho_rejected', 'md_rejected'].includes(req.status)
      ).length;

      setStats([
        {
          name: 'My Pending Requests',
          value: pendingRequests.toString(),
          change: 'Awaiting HO approval',
          changeType: 'neutral',
          icon: Clock,
          color: 'yellow'
        },
        {
          name: 'Approved Requests',
          value: approvedRequests.toString(),
          change: 'HO/MD approved',
          changeType: 'positive',
          icon: CheckCircle,
          color: 'green'
        },
        {
          name: 'Raw Materials Value',
          value: `$${totalRawMaterialsValue.toLocaleString()}`,
          change: 'Total inventory value',
          changeType: 'neutral',
          icon: Package,
          color: 'blue'
        },
        {
          name: 'Packing Materials Value',
          value: `$${totalPackingMaterialsValue.toLocaleString()}`,
          change: 'Total inventory value',
          changeType: 'neutral',
          icon: Archive,
          color: 'blue'
        }
      ]);

      setMyRequests(userRequests.slice(0, 5)); // Show latest 5 requests
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const colorClasses = {
    yellow: 'bg-yellow-100 text-yellow-600',
    red: 'bg-red-100 text-red-600',
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600'
  };

  const quickActions = [
    {
      title: 'Request Raw Materials',
      description: 'Submit new material request',
      icon: Package,
      color: 'bg-blue-600 hover:bg-blue-700',
      path: '/warehouse/raw-materials/request'
    },
    {
      title: 'View Raw Materials',
      description: 'Browse material inventory',
      icon: Package,
      color: 'bg-green-600 hover:bg-green-700',
      path: '/warehouse/raw-materials'
    },
    {
      title: 'My Request History',
      description: 'Track request status',
      icon: Clock,
      color: 'bg-purple-600 hover:bg-purple-700',
      path: '/approvals/history'
    },
    {
      title: 'Purchase Orders',
      description: 'Manage purchase orders',
      icon: FileText,
      color: 'bg-orange-600 hover:bg-orange-700',
      path: '/warehouse/purchase-orders'
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'md_approved':
        return 'bg-green-100 text-green-800';
      case 'ho_rejected':
      case 'md_rejected':
        return 'bg-red-100 text-red-800';
      case 'forwarded_to_md':
        return 'bg-blue-100 text-blue-800';
      case 'pending_ho':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending_ho':
        return 'Pending HO';
      case 'forwarded_to_md':
        return 'Forwarded to MD';
      case 'md_approved':
        return 'MD Approved';
      case 'ho_rejected':
        return 'HO Rejected';
      case 'md_rejected':
        return 'MD Rejected';
      default:
        return status?.replace('_', ' ').toUpperCase() || 'Unknown';
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading dashboard..." />;
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Warehouse Operations</h1>
        <p className="text-gray-600">Manage materials, suppliers, and warehouse operations.</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${colorClasses[stat.color]}`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm font-medium text-gray-600">{stat.change}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
          <div className="space-y-4">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => navigate(action.path)}
                className={`w-full p-4 rounded-lg text-white text-left transition-colors ${action.color}`}
              >
                <div className="flex items-center space-x-3">
                  <action.icon className="h-6 w-6" />
                  <div>
                    <h4 className="font-medium">{action.title}</h4>
                    <p className="text-sm opacity-90">{action.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">My Recent Requests</h3>
            <button
              onClick={() => navigate('/approvals/history')}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              View All
            </button>
          </div>
          <div className="space-y-4">
            {myRequests.length === 0 ? (
              <div className="text-center py-8">
                <Package className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No requests submitted yet</p>
              </div>
            ) : (
              myRequests.map((request) => (
                <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {request.items?.[0]?.materialName || 'Material Request'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {request.items?.length || 0} items • {formatDate(request.createdAt)}
                      </p>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                      {getStatusLabel(request.status)}
                    </span>
                  </div>
                  
                  {request.rejectionReason && (
                    <div className="mt-2 bg-red-50 border border-red-200 rounded p-2">
                      <p className="text-xs text-red-800">
                        <span className="font-medium">Rejected:</span> {request.rejectionReason}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarehouseOperationsDashboard;