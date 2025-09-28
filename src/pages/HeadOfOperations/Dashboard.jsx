import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardList, 
  Users, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  Package,
  ShoppingCart,
  FileText,
  Clock,
  Crown,
  Factory,
  Smartphone
} from 'lucide-react';
import { subscribeToData, getData } from '../../firebase/db';
import { requestService } from '../../services/requestService';
import { packingMaterialRequestService } from '../../services/packingMaterialRequestService';
import { directShopService } from '../../services/directShopService';
import { supplierService } from '../../services/supplierService';
import { formatDate } from '../../utils/formatDate';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import ErrorMessage from '../../components/Common/ErrorMessage';

const HeadOfOperationsDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    pendingMaterialRequests: 0,
    pendingPackingMaterialRequests: 0,
    pendingDirectShopRequests: 0,
    forwardedToMD: 0,
    totalApproved: 0,
    totalRejected: 0
  });
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    loadDashboardData();
    
    // Set up real-time listeners
    const unsubscribeMaterial = subscribeToData('materialRequests', () => {
      loadDashboardData();
    });
    
    const unsubscribePacking = subscribeToData('packingMaterialRequests', () => {
      loadDashboardData();
    });
    
    return () => {
      unsubscribeMaterial();
      unsubscribePacking();
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        allMaterialRequests,
        allPackingMaterialRequests,
        allDirectShopRequests,
        suppliers,
        salesApprovalHistory
      ] = await Promise.all([
        requestService.getMaterialRequests().catch((err) => {
          console.warn('Failed to load material requests:', err.message);
          return [];
        }),
        packingMaterialRequestService.getPackingMaterialRequests().catch((err) => {
          console.warn('Failed to load packing material requests:', err.message);
          return [];
        }),
        directShopService.getDirectShopRequests({ status: 'md_approved_forwarded_to_ho' }).catch((err) => {
          console.warn('Failed to load direct shop requests:', err.message);
          return [];
        }),
        supplierService.getSuppliers().catch(() => []),
        getData('salesApprovalHistory').catch(() => null)
      ]);

      // Calculate stats
      const pendingMaterialCount = allMaterialRequests.filter(req => req.status === 'pending_ho').length;
      const pendingPackingMaterialCount = allPackingMaterialRequests.filter(req => req.status === 'pending_ho').length;
      const pendingDirectShopCount = allDirectShopRequests.length;
      const forwardedToMDCount = allMaterialRequests.filter(req => req.status === 'forwarded_to_md').length + 
                                 allPackingMaterialRequests.filter(req => req.status === 'forwarded_to_md').length;
      const totalApproved = allMaterialRequests.filter(req => req.status === 'md_approved').length +
                           allPackingMaterialRequests.filter(req => req.status === 'md_approved').length;
      const totalRejected = allMaterialRequests.filter(req => 
        ['ho_rejected', 'md_rejected'].includes(req.status)
      ).length + allPackingMaterialRequests.filter(req => req.status === 'rejected').length;

      // Calculate sales completion stats
      const salesRequests = salesApprovalHistory ? Object.values(salesApprovalHistory) : [];
      const completedSalesRequests = salesRequests.filter(req => req.isCompletedByFG).length;
      const pendingSalesRequests = salesRequests.filter(req => req.status === 'Approved' && !req.isCompletedByFG).length;

      setDashboardData({
        pendingMaterialRequests: pendingMaterialCount,
        pendingPackingMaterialRequests: pendingPackingMaterialCount,
        pendingDirectShopRequests: pendingDirectShopCount,
        forwardedToMD: forwardedToMDCount,
        totalApproved,
        totalRejected,
        completedSalesRequests,
        pendingSalesRequests
      });

      // Get pending requests for quick approval
      const pendingMaterial = allMaterialRequests.filter(req => req.status === 'pending_ho').slice(0, 3);
      const pendingPacking = allPackingMaterialRequests.filter(req => req.status === 'pending_ho').slice(0, 2);
      
      setPendingApprovals([
        ...pendingMaterial.map(req => ({ ...req, type: 'material' })),
        ...pendingPacking.map(req => ({ ...req, type: 'packing_material' }))
      ]);

      // Generate recent activities
      const activities = [
        ...allMaterialRequests.slice(0, 3).map(req => ({
          type: 'material_request',
          message: `Material request ${req.status.replace('_', ' ')}`,
          details: `${req.items?.[0]?.materialName || 'Multiple items'} by ${req.requestedByName}`,
          timestamp: req.updatedAt || req.createdAt,
          status: req.status
        })),
        ...allPackingMaterialRequests.slice(0, 2).map(req => ({
          type: 'packing_material_request',
          message: `Packing material request ${req.status.replace('_', ' ')}`,
          details: `${(req.materials || req.items)?.length || 0} items by ${req.requestedByName}`,
          timestamp: req.updatedAt || req.createdAt,
          status: req.status
        }))
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5);

      setRecentActivities(activities);

    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Some dashboard data may be unavailable due to permissions. Core functionality should still work.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickApproval = async (requestId, action, requestType) => {
    try {
      if (requestType === 'material') {
        if (action === 'approve') {
          await requestService.hoApproveAndForward(requestId, {
            comments: 'Quick approved by HO'
          });
        } else {
          const reason = prompt('Reason for rejection:');
          if (reason) {
            await requestService.hoRejectRequest(requestId, { reason });
          }
        }
      } else if (requestType === 'packing_material') {
        if (action === 'approve') {
          await packingMaterialRequestService.hoApproveAndForward(requestId, {
            notes: 'Quick approved by HO'
          });
        } else {
          const reason = prompt('Reason for rejection:');
          if (reason) {
            await packingMaterialRequestService.hoRejectRequest(requestId, { reason });
          }
        }
      }

      // Reload data after action
      await loadDashboardData();
    } catch (err) {
      console.error('Error processing quick approval:', err);
      if (err.message.includes('Permission denied')) {
        setError('Permission denied. Please check your access rights or contact an administrator.');
      } else {
        setError('Failed to process approval. Please try again.');
      }
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'md_approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'ho_rejected':
      case 'md_rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'forwarded_to_md':
        return <Crown className="w-4 h-4 text-blue-600" />;
      case 'pending_ho':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading dashboard..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadDashboardData} />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Head of Operations Dashboard</h1>
        <p className="text-gray-600 mt-2">Monitor and manage all operational activities</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Material</p>
              <p className="text-2xl font-bold text-yellow-600">{dashboardData.pendingMaterialRequests}</p>
            </div>
            <Package className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Packing</p>
              <p className="text-2xl font-bold text-orange-600">{dashboardData.pendingPackingMaterialRequests}</p>
            </div>
            <ShoppingCart className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Forwarded to MD</p>
              <p className="text-2xl font-bold text-blue-600">{dashboardData.forwardedToMD}</p>
            </div>
            <Crown className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Approved</p>
              <p className="text-2xl font-bold text-green-600">{dashboardData.totalApproved}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Rejected</p>
              <p className="text-2xl font-bold text-red-600">{dashboardData.totalRejected}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending Approvals */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Pending Approvals</h3>
            <button
              onClick={() => navigate('/approvals')}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              View All
            </button>
          </div>
          {pendingApprovals.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="mx-auto h-8 w-8 text-green-400" />
              <p className="text-gray-500 mt-2">No pending approvals</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingApprovals.map((request) => (
                <div key={`${request.type}-${request.id}`} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {request.type === 'material' ? 'Material Request' : 'Packing Material Request'}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {request.type === 'material' 
                          ? request.items?.[0]?.materialName 
                          : `${request.items?.length || 0} items`
                        }
                      </p>
                      <p className="text-xs text-gray-500">
                        By: {request.requestedByName} • {formatDate(request.createdAt)}
                      </p>
                    </div>
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                      Pending
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleQuickApproval(request.id, 'approve', request.type)}
                      className="flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleQuickApproval(request.id, 'reject', request.type)}
                      className="flex items-center px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activities</h3>
          {recentActivities.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-8 w-8 text-gray-400" />
              <p className="text-gray-500 mt-2">No recent activities</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`p-1 rounded-full ${
                    activity.status === 'md_approved' ? 'bg-green-100' :
                    activity.status === 'ho_rejected' || activity.status === 'md_rejected' ? 'bg-red-100' :
                    activity.status === 'forwarded_to_md' ? 'bg-blue-100' :
                    'bg-yellow-100'
                  }`}>
                    {getStatusIcon(activity.status)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500">{activity.details}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <button
          onClick={() => navigate('/approvals')}
          className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <ClipboardList className="w-5 h-5 mr-2" />
          Approval Queue ({(dashboardData.pendingMaterialRequests || 0) + (dashboardData.pendingPackingMaterialRequests || 0)})
        </button>
        <button
          onClick={() => navigate('/approvals/history')}
          className="flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <FileText className="w-5 h-5 mr-2" />
          Request History
        </button>
        <button
          onClick={() => navigate('/warehouse/production-requests')}
          className="flex items-center justify-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Factory className="w-5 h-5 mr-2" />
          Production Monitoring ({dashboardData.monitoringProductionRequests || 0})
        </button>
        <button
          onClick={() => navigate('/production/products')}
          className="flex items-center justify-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Package className="w-5 h-5 mr-2" />
          Production Products
        </button>
        <button
          onClick={() => navigate('/approvals/direct-shop-requests')}
          className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Smartphone className="w-5 h-5 mr-2" />
          Direct Shop Requests ({dashboardData.pendingDirectShopRequests || 0})
        </button>
        <button
          onClick={() => navigate('/admin/pcs/sales-history')}
          className="flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <CheckCircle className="w-5 h-5 mr-2" />
          Sales Completion ({dashboardData.completedSalesRequests || 0} completed)
        </button>
      </div>
    </div>
  );
};

export default HeadOfOperationsDashboard;