import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, Package, ShoppingCart, Archive, AlertCircle, ArrowRight, Eye } from 'lucide-react';
import { requestService } from '../../services/requestService';
import { packingMaterialRequestService } from '../../services/packingMaterialRequestService';
import { subscribeToData } from '../../firebase/db';
import { useRole } from '../../hooks/useRole';
import { useAuth } from '../../hooks/useAuth';
import { auth } from '../../firebase/auth';
import { 
  getDistributorRequests, 
  approveRequest, 
  rejectRequest 
} from '../../services/distributorRequestService';
import { formatDate } from '../../utils/formatDate';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const ApprovalQueue = () => {
  const navigate = useNavigate();
  const { userRole, hasRole } = useRole();
  const { user } = useAuth();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [selectedRequestType, setSelectedRequestType] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [activeTab, setActiveTab] = useState('material');
  const [materialRequests, setMaterialRequests] = useState([]);
  const [packingMaterialRequests, setPackingMaterialRequests] = useState([]);
  const [distributorRequests, setDistributorRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPendingRequests();
    
    // Set up real-time listeners
    const unsubscribeMaterial = subscribeToData('materialRequests', () => {
      loadPendingRequests();
    });
    
    const unsubscribePacking = subscribeToData('packingMaterialRequests', () => {
      loadPendingRequests();
    });

    return () => {
      unsubscribeMaterial();
      unsubscribePacking();
    };
  }, [userRole]);

  const loadPendingRequests = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (hasRole('MainDirector')) {
        // MD sees requests forwarded for final approval
        const [materials, packingMaterials, distributors] = await Promise.all([
          requestService.getMaterialRequests({ status: 'forwarded_to_md' }),
          packingMaterialRequestService.getPackingMaterialRequests({ status: 'forwarded_to_md' }),
          getDistributorRequests()
        ]);
        
        setMaterialRequests(materials);
        setPackingMaterialRequests(packingMaterials);
        setDistributorRequests(distributors.filter(req => req.status === 'pending'));
      } else if (hasRole('HeadOfOperations')) {
        // HO sees requests pending initial approval
        const [materials, packingMaterials, distributors] = await Promise.all([
          requestService.getMaterialRequests({ status: 'pending_ho' }),
          packingMaterialRequestService.getPackingMaterialRequests({ status: 'pending_ho' }),
          getDistributorRequests()
        ]);
        
        setMaterialRequests(materials);
        setPackingMaterialRequests(packingMaterials);
        setDistributorRequests(distributors.filter(req => req.status === 'pending'));
      }
    } catch (err) {
      setError('Failed to load pending requests');
      console.error('Error loading requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveMaterialRequest = async (requestId) => {
    try {
      if (hasRole('MainDirector')) {
        // MD final approval
        await requestService.mdApproveRequest(requestId, { 
          comments: 'Approved by Main Director' 
        });
        // Create purchase preparation after MD approval
        await requestService.createPurchasePreparationAfterApproval(requestId);
      } else if (hasRole('HeadOfOperations')) {
        // HO approves and forwards to MD
        await requestService.hoApproveAndForward(requestId, { 
          comments: 'Approved by Head of Operations and forwarded to MD' 
        });
      }
      
      await loadPendingRequests();
    } catch (err) {
      setError(`Failed to approve material request: ${err.message}`);
      console.error('Error approving request:', err);
    }
  };

  const handleQuickApproval = async (requestId, action, requestType) => {
    try {
      if (requestType === 'material') {
        if (action === 'approve') {
          await handleApproveMaterialRequest(requestId);
        } else {
          const reason = prompt('Reason for rejection:');
          if (reason) {
            await handleRejectMaterialRequest(requestId, reason);
          }
        }
      } else if (requestType === 'packing') {
        if (action === 'approve') {
          await handleApprovePackingMaterialRequest(requestId);
        } else {
          const reason = prompt('Reason for rejection:');
          if (reason) {
            await handleRejectPackingMaterialRequest(requestId, reason);
          }
        }
      }

      // Reload data after action
      await loadPendingRequests();
    } catch (err) {
      console.error('Error processing quick approval:', err);
      if (err.message.includes('Permission denied')) {
        setError('Permission denied. Please check your access rights or contact an administrator.');
      } else {
        setError('Failed to process approval. Please try again.');
      }
    }
  };

  const handleRejectMaterialRequest = async (requestId, reason) => {
    try {
      if (hasRole('MainDirector')) {
        await requestService.mdRejectRequest(requestId, { reason });
      } else if (hasRole('HeadOfOperations')) {
        await requestService.hoRejectRequest(requestId, { reason });
      }
      
      await loadPendingRequests();
    } catch (err) {
      setError(`Failed to reject material request: ${err.message}`);
      console.error('Error rejecting request:', err);
    }
  };

  const handleApprovePackingMaterialRequest = async (requestId) => {
    try {
      if (hasRole('MainDirector')) {
        // MD final approval
        await packingMaterialRequestService.mdApproveRequest(requestId, { 
          notes: 'Approved by Main Director' 
        });
        // Create purchase preparation after MD approval
        await packingMaterialRequestService.createPurchasePreparationAfterApproval(requestId);
      } else if (hasRole('HeadOfOperations')) {
        // HO approves and forwards to MD
        await packingMaterialRequestService.hoApproveAndForward(requestId, { 
          notes: 'Approved by Head of Operations' 
        });
      }
      
      await loadPendingRequests();
    } catch (err) {
      setError(`Failed to approve packing material request: ${err.message}`);
      console.error('Error approving packing material request:', err);
    }
  };

  const handleRejectPackingMaterialRequest = async (requestId, reason) => {
    try {
      if (hasRole('MainDirector')) {
        await packingMaterialRequestService.mdRejectRequest(requestId, { reason });
      } else if (hasRole('HeadOfOperations')) {
        await packingMaterialRequestService.hoRejectRequest(requestId, { reason });
      }
      await loadPendingRequests();
    } catch (err) {
      setError(`Failed to reject packing material request: ${err.message}`);
      console.error('Error rejecting packing material request:', err);
    }
  };

  const confirmReject = () => {
    if (selectedRequestId && rejectionReason.trim()) {
      if (selectedRequestType === 'material') {
        handleRejectMaterialRequest(selectedRequestId, rejectionReason);
      } else if (selectedRequestType === 'packing') {
        handleRejectPackingMaterialRequest(selectedRequestId, rejectionReason);
      }
      setShowRejectModal(false);
      setSelectedRequestId(null);
      setSelectedRequestType('');
      setRejectionReason('');
    }
  };

  const getPageTitle = () => {
    if (hasRole('MainDirector')) {
      return 'Final Approval Queue';
    }
    return 'Approval Queue';
  };

  const getPageDescription = () => {
    if (hasRole('MainDirector')) {
      return 'Review and provide final approval for requests forwarded by Head of Operations';
    }
    return 'Review and approve pending requests';
  };

  const getApproveButtonText = () => {
    if (hasRole('MainDirector')) {
      return 'MD Approve';
    }
    return 'HO Approve';
  };

  const getRejectButtonText = () => {
    if (hasRole('MainDirector')) {
      return 'MD Reject';
    }
    return 'HO Reject';
  };

  const handleApproveRequest = async (request) => {
    try {
      // Add approver information to the request
      const requestWithApprover = {
        ...request,
        approvedBy: user?.uid || auth.currentUser?.uid,
        approverName: userRole?.name || user?.displayName || user?.email || auth.currentUser?.displayName || auth.currentUser?.email,
        approverRole: hasRole('MainDirector') ? 'Main Director' : 'Head of Operations'
      };
      
      await approveRequest(request.id, requestWithApprover);
      await loadPendingRequests();
    } catch (err) {
      setError(`Failed to approve ${request.requestType === 'direct_representative' ? 'DR' : 'distributor'} request: ${err.message}`);
      console.error('Error approving request:', err);
    }
  };

  const handleRejectRequest = async (request) => {
    try {
      await rejectRequest(request.id, request);
      await loadPendingRequests();
    } catch (err) {
      setError(`Failed to reject ${request.requestedByRole === 'DirectRepresentative' ? 'DR' : 'distributor'} request: ${err.message}`);
      console.error('Error rejecting request:', err);
    }
  };

  const tabs = [
    { id: 'material', label: 'Material Requests', icon: Package, count: materialRequests.length },
    { id: 'packing', label: 'Packing Material', icon: Archive, count: packingMaterialRequests.length },
    { id: 'distributor', label: 'Sales Requests', icon: ShoppingCart, count: distributorRequests.length }
  ];

  if (loading) {
    return <LoadingSpinner text="Loading pending requests..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
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
                  onClick={confirmReject}
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
          <h1 className="text-3xl font-bold text-gray-900">
            {getPageTitle()}
          </h1>
          <p className="mt-2 text-gray-600">
            {getPageDescription()}
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{tab.label}</span>
                    {tab.count > 0 && (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        activeTab === tab.id
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm">
          {activeTab === 'material' && (
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Material Requests</h2>
              {materialRequests.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No material requests pending approval</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {materialRequests.map((request) => (
                    <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <Package className="h-5 w-5 text-blue-600" />
                            <span className="font-medium text-gray-900">Request #{request.id}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-500">
                              {formatDate(request.createdAt)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => navigate(`/warehouse/raw-materials/request/${request.id}`)}
                            className="inline-flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-700"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </button>
                          <button
                            onClick={() => handleApproveMaterialRequest(request.id)}
                            className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {getApproveButtonText()}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRequestId(request.id);
                              setSelectedRequestType('material');
                              setShowRejectModal(true);
                            }}
                            className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            {getRejectButtonText()}
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Requested by:</span>
                          <p className="font-medium">{request.requestedBy}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Priority:</span>
                          <p className="font-medium capitalize">{request.priority}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Items:</span>
                          <p className="font-medium">{request.items?.length || 0} items</p>
                        </div>
                      </div>
                      
                      {request.comments && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm text-gray-500">Comments:</span>
                          <p className="text-sm text-gray-700 mt-1">{request.comments}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'distributor' && (
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Sales Requests</h2>
              {distributorRequests.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No sales requests pending approval</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {distributorRequests.map((request) => (
                    <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <ShoppingCart className={`h-5 w-5 ${
                              request.requestType === 'direct_representative' ? 'text-purple-600' : 
                              request.requestType === 'direct_shop' ? 'text-blue-600' : 
                              'text-green-600'
                            }`} />
                            <span className="font-medium text-gray-900">
                              {request.requestType === 'direct_representative' ? 'DR' : 
                               request.requestType === 'direct_shop' ? 'Direct Shop' : 
                               'Distributor'} Request #{request.id}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-500">
                              {formatDate(request.createdAt)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleApproveRequest(request)}
                            className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectRequest(request)}
                            className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Requested By:</span>
                          <p className="font-medium">{request.requestedByName}</p>
                          <p className="text-sm text-gray-500">{request.requestedByRole}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Priority:</span>
                          <p className={`font-medium capitalize ${
                            request.priority === 'urgent' ? 'text-red-600' : ''
                          }`}>
                            {request.priority}
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <span className="text-gray-500">Items:</span>
                          <div className="mt-1 space-y-1">
                            {Object.entries(request.items).map(([id, item]) => (
                              <div key={id} className="flex items-center justify-between bg-gray-50 px-3 py-1 rounded">
                                <span>{item.name}</span>
                                <span className="font-medium">Qty: {item.qty}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      {request.notes && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm text-gray-500">Notes:</span>
                          <p className="text-sm text-gray-700 mt-1">{request.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'packing' && (
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Packing Material Requests</h2>
              {packingMaterialRequests.length === 0 ? (
                <div className="text-center py-8">
                  <Archive className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No packing material requests pending approval</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {packingMaterialRequests.map((request) => (
                    <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <Archive className="h-5 w-5 text-purple-600" />
                            <span className="font-medium text-gray-900">Request #{request.id}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-500">
                              {formatDate(request.createdAt)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => navigate(`/warehouse/packing-materials/request/${request.id}`)}
                            className="inline-flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-700"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </button>
                          <button
                            onClick={() => handleApprovePackingMaterialRequest(request.id)}
                            className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {getApproveButtonText()}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRequestId(request.id);
                              setSelectedRequestType('packing');
                              setShowRejectModal(true);
                            }}
                            className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            {getRejectButtonText()}
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Requested by:</span>
                          <p className="font-medium">{request.requestedBy}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Priority:</span>
                          <p className="font-medium capitalize">{request.priority}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Items:</span>
                          <p className="font-medium">{request.materials?.length || request.items?.length || 0} items</p>
                        </div>
                      </div>
                      
                      {request.notes && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm text-gray-500">Notes:</span>
                          <p className="text-sm text-gray-700 mt-1">{request.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApprovalQueue;
                  