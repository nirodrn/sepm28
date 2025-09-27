import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, BarChart3, TrendingUp, Users, CheckCircle, AlertTriangle, FileText, Package, Smartphone } from 'lucide-react';
import { subscribeToData } from '../../firebase/db';
import { requestService } from '../../services/requestService';
import { packingMaterialRequestService } from '../../services/packingMaterialRequestService';
import { formatDate } from '../../utils/formatDate';
import { directShopService } from '../../services/directShopService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const MainDirectorDashboard = () => {
  const navigate = useNavigate();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [selectedRequestType, setSelectedRequestType] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [stats, setStats] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [recentDecisions, setRecentDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingDirectShopRequests, setPendingDirectShopRequests] = useState(0);

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
      
      // Load direct shop requests
      const directShopRequests = await directShopService.getDirectShopRequests({ 
        status: 'pending_md' 
      }).catch(() => []);
      
      setPendingDirectShopRequests(directShopRequests.length);
      
      setError('');

      const [allMaterialRequests, allPackingMaterialRequests] = await Promise.all([
        requestService.getMaterialRequests(),
        packingMaterialRequestService.getPackingMaterialRequests().catch(() => [])
      ]);

      // Calculate stats
      const pendingMDMaterial = allMaterialRequests.filter(req => req.status === 'forwarded_to_md').length;
      const pendingMDPacking = allPackingMaterialRequests.filter(req => req.status === 'forwarded_to_md').length;
      const totalPendingMD = pendingMDMaterial + pendingMDPacking;
      
      const approvedToday = allMaterialRequests.filter(req => 
        req.status === 'md_approved' && 
        new Date(req.mdApprovedAt).toDateString() === new Date().toDateString()
      ).length + allPackingMaterialRequests.filter(req => 
        req.status === 'md_approved' && 
        new Date(req.mdApprovedAt).toDateString() === new Date().toDateString()
      ).length;

      const totalRequests = allMaterialRequests.length + allPackingMaterialRequests.length;
      const totalApproved = allMaterialRequests.filter(req => req.status === 'md_approved').length +
                           allPackingMaterialRequests.filter(req => req.status === 'md_approved').length;

      setStats([
        {
          name: 'Pending MD Approval',
          value: totalPendingMD.toString(),
          change: 'Final approval required',
          changeType: 'neutral',
          icon: Clock,
          color: 'yellow'
        },
        {
          name: 'Approved Today',
          value: approvedToday.toString(),
          change: 'Decisions made',
          changeType: 'positive',
          icon: CheckCircle,
          color: 'green'
        },
        {
          name: 'Total Requests',
          value: totalRequests.toString(),
          change: 'All time',
          changeType: 'neutral',
          icon: BarChart3,
          color: 'blue'
        },
        {
          name: 'Total Approved',
          value: totalApproved.toString(),
          change: 'Final approvals',
          changeType: 'positive',
          icon: TrendingUp,
          color: 'purple'
        },
        {
          title: 'Direct Shop Requests',
          description: `${pendingDirectShopRequests} pending approval`,
          icon: Smartphone,
          color: 'bg-blue-600 hover:bg-blue-700',
          path: '/direct-shop-requests'
        }
      ]);

      // Get pending requests for MD approval
      const pendingMDRequests = [
        ...allMaterialRequests.filter(req => req.status === 'forwarded_to_md').map(req => ({ ...req, type: 'material' })),
        ...allPackingMaterialRequests.filter(req => req.status === 'forwarded_to_md').map(req => ({ ...req, type: 'packing_material' }))
      ].slice(0, 5);

      setPendingApprovals(pendingMDRequests);

      // Generate recent decisions
      const recentMDDecisions = [
        ...allMaterialRequests.filter(req => 
          ['md_approved', 'md_rejected'].includes(req.status)
        ).map(req => ({
          action: req.status === 'md_approved' ? 'Approved material request' : 'Rejected material request',
          details: `${req.items?.[0]?.materialName || 'Multiple items'} by ${req.requestedByName}`,
          decision: req.status === 'md_approved' ? 'approved' : 'rejected',
          time: formatDate(req.mdApprovedAt || req.rejectedAt),
          timestamp: req.mdApprovedAt || req.rejectedAt
        })),
        ...allPackingMaterialRequests.filter(req => 
          ['md_approved', 'ho_rejected', 'md_rejected'].includes(req.status)
        ).map(req => ({
          action: req.status === 'md_approved' ? 'Approved packing material request' : 'Rejected packing material request',
          details: `${req.items?.length || 0} items by ${req.requestedByName}`,
          decision: req.status === 'md_approved' ? 'approved' : 'rejected',
          time: formatDate(req.mdApprovedAt || req.rejectedAt),
          timestamp: req.mdApprovedAt || req.rejectedAt
        }))
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5);

      setRecentDecisions(recentMDDecisions);
    } catch (error) {
      setError(error.message);
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMDApprove = async (requestId, requestType) => {
    try {
      if (requestType === 'material') {
        await requestService.mdApproveRequest(requestId, { 
          comments: 'Approved by Main Director' 
        });
      } else if (requestType === 'packing_material') {
        await packingMaterialRequestService.mdApproveRequest(requestId, { 
          notes: 'Approved by Main Director' 
        });
      }
      await loadDashboardData();
    } catch (error) {
      setError(error.message);
    }
  };

  const handleMDReject = async () => {
    try {
      if (selectedRequestType === 'material') {
        await requestService.mdRejectRequest(selectedRequestId, { 
          reason: rejectionReason 
        });
      } else if (selectedRequestType === 'packing_material') {
        await packingMaterialRequestService.mdRejectRequest(selectedRequestId, { 
          reason: rejectionReason 
        });
      }
      
      setShowRejectModal(false);
      setSelectedRequestId(null);
      setSelectedRequestType('');
      setRejectionReason('');
      await loadDashboardData();
    } catch (error) {
      setError(error.message);
    }
  };

  const colorClasses = {
    yellow: 'bg-yellow-100 text-yellow-600',
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600'
  };

  if (loading) {
    return <LoadingSpinner text="Loading dashboard..." />;
  }

  return (
    <div className="p-6">
      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject Request</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for rejection *
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Please provide a detailed reason for rejection..."
              />
            </div>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedRequestId(null);
                  setSelectedRequestType('');
                  setRejectionReason('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleMDReject}
                disabled={!rejectionReason.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Reject Request
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Crown className="h-8 w-8 mr-3 text-purple-600" />
          Main Director Dashboard
        </h1>
        <p className="text-gray-600">Strategic oversight and final approval authority.</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center">
          <AlertCircle className="h-4 w-4 mr-2" />
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Final Approvals Required</h3>
            <button
              onClick={() => navigate('/approvals')}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              View All
            </button>
          </div>
          
          <div className="space-y-4">
            {pendingApprovals.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="mx-auto h-8 w-8 text-green-400" />
                <p className="text-gray-500 mt-2">No pending final approvals</p>
              </div>
            ) : (
              pendingApprovals.map((request) => (
                <div key={`${request.type}-${request.id}`} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium text-gray-900">
                        {request.type === 'material' ? 'Material Request' : 'Packing Material Request'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {request.type === 'material' 
                          ? `${request.items?.[0]?.materialName} - ${request.items?.[0]?.quantity} ${request.items?.[0]?.unit}`
                          : `${(request.materials || request.items)?.length || 0} items - $${(request.budgetEstimate || 0).toFixed(2)}`
                        }
                      </p>
                      <p className="text-xs text-gray-400">
                        HO Approved: {formatDate(request.hoApprovedAt)} by {request.hoApprovedByName}
                      </p>
                    </div>
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                      Pending MD
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleMDApprove(request.id, request.type)}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors flex items-center space-x-1"
                    >
                      <CheckCircle className="h-3 w-3" />
                      <span>MD Approve</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedRequestId(request.id);
                        setSelectedRequestType(request.type);
                        setShowRejectModal(true);
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors flex items-center space-x-1"
                    >
                      <X className="h-3 w-3" />
                      <span>MD Reject</span>
                    </button>
                    <button
                      onClick={() => navigate(`/approvals/requests/${request.id}`)}
                      className="text-blue-600 hover:text-blue-800 p-1 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Decisions</h3>
          <div className="space-y-4">
            {recentDecisions.length === 0 ? (
              <div className="text-center py-8">
                <Crown className="mx-auto h-8 w-8 text-gray-400" />
                <p className="text-gray-500 mt-2">No recent decisions</p>
              </div>
            ) : (
              recentDecisions.map((decision, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`p-2 rounded-full ${
                    decision.decision === 'approved' ? 'bg-green-100' :
                    decision.decision === 'rejected' ? 'bg-red-100' :
                    'bg-blue-100'
                  }`}>
                    {decision.decision === 'approved' && <CheckCircle className="h-4 w-4 text-green-600" />}
                    {decision.decision === 'rejected' && <X className="h-4 w-4 text-red-600" />}
                    {decision.decision === 'pending' && <Clock className="h-4 w-4 text-blue-600" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{decision.action}</p>
                    <p className="text-xs text-gray-500">{decision.details}</p>
                    <p className="text-xs text-gray-500">{decision.time}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <button 
          onClick={() => navigate('/approvals')}
          className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg flex items-center justify-center space-x-2 transition-colors"
        >
          <CheckCircle className="h-5 w-5" />
          <span>Final Approval Queue ({pendingApprovals.length})</span>
        </button>
        <button 
          onClick={() => navigate('/approvals/history')}
          className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg flex items-center justify-center space-x-2 transition-colors"
        >
          <BarChart3 className="h-5 w-5" />
          <span>Request History</span>
        </button>
        <button 
          onClick={() => navigate('/reports/supplier-performance')}
          className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg flex items-center justify-center space-x-2 transition-colors"
        >
          <TrendingUp className="h-5 w-5" />
          <span>Strategic Reports</span>
        </button>
      </div>
    </div>
  );
};

export default MainDirectorDashboard;