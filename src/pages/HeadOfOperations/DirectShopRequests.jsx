import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Smartphone, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  Store,
  Package,
  User,
  Calendar,
  MapPin,
  Send
} from 'lucide-react';
import { directShopService } from '../../services/directShopService';
import { formatDate } from '../../utils/formatDate';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const DirectShopRequests = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const requestData = await directShopService.getDirectShopRequests({ 
        status: 'md_approved_forwarded_to_ho' 
      });
      setRequests(requestData);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAndForwardToFG = async (requestId) => {
    try {
      setProcessing(requestId);
      setError('');
      
      await directShopService.hoApproveAndForwardToFG(requestId, {
        comments: 'Approved by Head of Operations - Forwarded to FG Store for dispatch'
      });
      
      await loadRequests();
    } catch (error) {
      setError(error.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectRequest = async () => {
    if (!selectedRequestId || !rejectionReason.trim()) return;
    
    try {
      setProcessing(selectedRequestId);
      setError('');
      
      await directShopService.rejectRequest(selectedRequestId, {
        reason: rejectionReason
      }, 'HO');
      
      setShowRejectModal(false);
      setSelectedRequestId(null);
      setRejectionReason('');
      await loadRequests();
    } catch (error) {
      setError(error.message);
    } finally {
      setProcessing(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'md_approved_forwarded_to_ho':
        return 'bg-blue-100 text-blue-800';
      case 'ho_approved_forwarded_to_fg':
        return 'bg-green-100 text-green-800';
      case 'ho_rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateTotalValue = (items) => {
    return items?.reduce((sum, item) => {
      return sum + ((item.quantity || 0) * (item.unitPrice || 0));
    }, 0) || 0;
  };

  if (loading) {
    return <LoadingSpinner text="Loading direct shop requests..." />;
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
                  setRejectionReason('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectRequest}
                disabled={!rejectionReason.trim() || processing}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {processing ? 'Rejecting...' : 'HO Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Smartphone className="h-8 w-8 mr-3 text-green-600" />
          Direct Shop Requests - HO Approval
        </h1>
        <p className="text-gray-600">Final approval for MD-approved direct shop requests</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            MD Approved - Awaiting HO Final Approval ({requests.length})
          </h2>
        </div>

        <div className="divide-y divide-gray-200">
          {requests.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No requests pending HO approval</h3>
              <p className="mt-1 text-sm text-gray-500">
                MD-approved requests will appear here for final approval
              </p>
            </div>
          ) : (
            requests.map((request) => (
              <div key={request.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="p-2 rounded-lg bg-green-100">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-medium text-gray-900">
                          Request #{request.id.slice(-6)}
                        </h4>
                        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          MD Approved
                        </span>
                        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending HO
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <Store className="h-4 w-4 text-gray-400" />
                          <div>
                            <span className="font-medium">Shop:</span>
                            <span className="ml-1">{request.shopName}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <div>
                            <span className="font-medium">MD Approved:</span>
                            <span className="ml-1">{formatDate(request.mdApprovedAt)}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Package className="h-4 w-4 text-gray-400" />
                          <div>
                            <span className="font-medium">Items:</span>
                            <span className="ml-1">{request.items?.length || 0}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="h-4 w-4 bg-green-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">₨</span>
                          </div>
                          <div>
                            <span className="font-medium">Value:</span>
                            <span className="ml-1">LKR {calculateTotalValue(request.items).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      {request.mdApprovalComments && (
                        <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-sm text-green-800">
                            <span className="font-medium">MD Comments:</span> {request.mdApprovalComments}
                          </p>
                        </div>
                      )}
                      
                      <div className="space-y-2 mt-4">
                        <h5 className="font-medium text-gray-700">Items Summary:</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {request.items?.map((item, index) => (
                            <div key={index} className="text-sm text-gray-600 bg-gray-50 rounded p-2">
                              • {item.productName}: {item.quantity} {item.unit} @ LKR {(item.unitPrice || 0).toFixed(2)}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleApproveAndForwardToFG(request.id)}
                      disabled={processing === request.id}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="h-4 w-4" />
                      <span>{processing === request.id ? 'Processing...' : 'HO Approve & Send to FG'}</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedRequestId(request.id);
                        setShowRejectModal(true);
                      }}
                      disabled={processing === request.id}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <XCircle className="h-4 w-4" />
                      <span>HO Reject</span>
                    </button>
                    <button
                      onClick={() => navigate(`/direct-shop-requests/${request.id}`)}
                      className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                      title="View Details"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DirectShopRequests;