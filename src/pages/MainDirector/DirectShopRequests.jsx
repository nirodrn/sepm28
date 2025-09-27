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
  Send,
  AlertTriangle
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
      // Get all requests for MD to review
      const allRequests = await directShopService.getAllDirectShopRequests();
      
      // Filter for pending requests that need MD approval
      const pendingRequests = allRequests.filter(req => req.status === 'pending');
      setRequests(pendingRequests);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAndForwardToHO = async (requestId) => {
    try {
      setProcessing(requestId);
      setError('');
      
      await directShopService.mdApproveRequest(requestId, {
        comments: 'Approved by Main Director - Forwarded to Head of Operations for final approval'
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
      }, 'MD');
      
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

  const getUrgencyColor = (urgent) => {
    return urgent ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800';
  };

  const formatRequestDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
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
                {processing ? 'Rejecting...' : 'MD Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Smartphone className="h-8 w-8 mr-3 text-blue-600" />
          Direct Shop Requests - MD Review
        </h1>
        <p className="text-gray-600">Review and approve requests from mobile app users</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Pending MD Approval ({requests.length})
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Requests from mobile app awaiting Main Director approval
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {requests.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No requests pending approval</h3>
              <p className="mt-1 text-sm text-gray-500">
                Direct shop requests from mobile app will appear here for approval
              </p>
            </div>
          ) : (
            requests.map((request) => (
              <div key={request.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <Smartphone className="h-5 w-5 text-blue-600" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-medium text-gray-900">
                          Request from {request.requestedByName}
                        </h4>
                        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending MD Approval
                        </span>
                        {request.urgent && (
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getUrgencyColor(request.urgent)}`}>
                            URGENT REQUEST
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <Store className="h-4 w-4 text-gray-400" />
                          <div>
                            <span className="font-medium">Shop:</span>
                            <span className="ml-1">{request.shopName || request.requestedByName}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Package className="h-4 w-4 text-gray-400" />
                          <div>
                            <span className="font-medium">Product:</span>
                            <span className="ml-1">{request.product}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Package className="h-4 w-4 text-gray-400" />
                          <div>
                            <span className="font-medium">Quantity:</span>
                            <span className="ml-1">{request.quantity}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <div>
                            <span className="font-medium">Requested:</span>
                            <span className="ml-1">{formatRequestDate(request.date)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-blue-800 font-medium">Request Details</p>
                            <p className="text-blue-700 text-sm">
                              Product: {request.product} • Quantity: {request.quantity}
                            </p>
                            <p className="text-blue-700 text-sm">
                              Request ID: {request.id}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-blue-900">
                              Est. LKR {(request.quantity * 100).toLocaleString()}
                            </p>
                            <p className="text-blue-700 text-sm">@ LKR 100/unit (estimated)</p>
                          </div>
                        </div>
                      </div>
                      
                      {request.notes && (
                        <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                          <p className="text-sm text-gray-800">
                            <span className="font-medium">Request Notes:</span> {request.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleApproveAndForwardToHO(request.id)}
                      disabled={processing === request.id}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="h-4 w-4" />
                      <span>{processing === request.id ? 'Processing...' : 'MD Approve & Forward to HO'}</span>
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
                      <span>MD Reject</span>
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