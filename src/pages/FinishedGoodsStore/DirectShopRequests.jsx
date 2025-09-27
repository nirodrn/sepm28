import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Smartphone, 
  Send, 
  Clock, 
  Eye, 
  Store,
  Package,
  User,
  Calendar,
  MapPin,
  CheckCircle,
  DollarSign,
  Edit
} from 'lucide-react';
import { directShopService } from '../../services/directShopService';
import { fgDispatchToExternalService } from '../../services/fgDispatchToExternalService';
import { fgPricingService } from '../../services/fgPricingService';
import { formatDate } from '../../utils/formatDate';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const DirectShopRequests = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dispatching, setDispatching] = useState(null);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [dispatchData, setDispatchData] = useState({
    notes: '',
    expectedDeliveryDate: ''
  });

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const requestData = await directShopService.getDirectShopRequests({ 
        status: 'ho_approved_forwarded_to_fg' 
      });
      setRequests(requestData);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDispatchRequest = (request) => {
    setSelectedRequest(request);
    setDispatchData({
      notes: `Dispatch to ${request.requestedByName}`,
      expectedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 2 days from now
    });
    setShowDispatchModal(true);
  };

  const confirmDispatch = async () => {
    if (!selectedRequest) return;
    
    try {
      setDispatching(selectedRequest.id);
      setError('');
      
      // Use the enhanced dispatch method for dsreqs
      await fgDispatchToExternalService.dispatchDirectShopRequest(selectedRequest.id, {
        notes: dispatchData.notes,
        expectedDeliveryDate: dispatchData.expectedDeliveryDate,
        unitPrice: 100 // Default price, will use existing pricing if available
      });
      
      setShowDispatchModal(false);
      setSelectedRequest(null);
      await loadRequests();
    } catch (error) {
      setError(error.message);
    } finally {
      setDispatching(null);
    }
  };

  const calculateRequestValue = (request) => {
    // Try to get actual pricing or use estimated price
    const estimatedPrice = 100; // Default price per unit
    return (request.quantity || 0) * estimatedPrice;
  };

  if (loading) {
    return <LoadingSpinner text="Loading approved requests..." />;
  }

  return (
    <div className="p-6">
      {/* Dispatch Modal */}
      {showDispatchModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Dispatch to {selectedRequest.requestedByName}
            </h3>
            
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Requested by:</span>
                  <span className="font-medium text-blue-900 ml-2">{selectedRequest.requestedByName}</span>
                </div>
                <div>
                  <span className="text-blue-700">Shop Name:</span>
                  <span className="font-medium text-blue-900 ml-2">{selectedRequest.shopName || selectedRequest.requestedByName}</span>
                </div>
                <div>
                  <span className="text-blue-700">Product:</span>
                  <span className="font-medium text-blue-900 ml-2">{selectedRequest.product}</span>
                </div>
                <div>
                  <span className="text-blue-700">Quantity:</span>
                  <span className="font-medium text-blue-900 ml-2">{selectedRequest.quantity}</span>
                </div>
                <div>
                  <span className="text-blue-700">Est. Value:</span>
                  <span className="font-medium text-blue-900 ml-2">
                    LKR {calculateRequestValue(selectedRequest).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700">Request ID:</span>
                  <span className="font-medium text-blue-900 ml-2">{selectedRequest.id}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Delivery Date
                </label>
                <input
                  type="date"
                  value={dispatchData.expectedDeliveryDate}
                  onChange={(e) => setDispatchData(prev => ({ ...prev, expectedDeliveryDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dispatch Notes
                </label>
                <textarea
                  rows={3}
                  value={dispatchData.notes}
                  onChange={(e) => setDispatchData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add dispatch notes..."
                />
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-3">Request to dispatch:</h4>
                <div className="bg-white rounded-lg p-3 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{selectedRequest.product}</p>
                      <p className="text-sm text-gray-600">
                        Quantity: {selectedRequest.quantity} units
                      </p>
                      <p className="text-sm text-gray-600">
                        Shop: {selectedRequest.shopName || selectedRequest.requestedByName}
                      </p>
                      {selectedRequest.urgent && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 mt-1">
                          URGENT REQUEST
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        LKR {calculateRequestValue(selectedRequest).toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        @ LKR 100/unit (estimated)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowDispatchModal(false);
                  setSelectedRequest(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDispatch}
                disabled={dispatching}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {dispatching ? 'Dispatching...' : 'Confirm Dispatch'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Smartphone className="h-8 w-8 mr-3 text-blue-600" />
              Direct Shop Requests - Ready for Dispatch
            </h1>
            <p className="text-gray-600">Dispatch approved requests to direct shops</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/finished-goods/pricing')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <DollarSign className="h-4 w-4" />
              <span>Manage Pricing</span>
            </button>
            <button
              onClick={() => navigate('/finished-goods/external-dispatches')}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Send className="h-4 w-4" />
              <span>Dispatch History</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Approved Requests - Ready for Dispatch ({requests.length})
          </h2>
        </div>

        <div className="divide-y divide-gray-200">
          {requests.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No requests ready for dispatch</h3>
              <p className="mt-1 text-sm text-gray-500">
                Approved requests will appear here for dispatch
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
                          Request from {request.requestedByName}
                        </h4>
                        {request.shopName && request.shopName !== request.requestedByName && (
                          <span className="text-sm text-gray-500">({request.shopName})</span>
                        )}
                        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Fully Approved
                        </span>
                        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          <Clock className="h-3 w-3 mr-1" />
                          Ready for Dispatch
                        </span>
                        {request.urgent && (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            URGENT
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3 text-sm text-gray-600">
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
                            <span className="font-medium">HO Approved:</span>
                            <span className="ml-1">{formatDate(request.hoApprovedAt)}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <div>
                            <span className="font-medium">Request Date:</span>
                            <span className="ml-1">{request.date ? new Date(request.date).toLocaleDateString() : 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-green-800 font-medium">Request Details</p>
                            <p className="text-green-700 text-sm">
                              Product: {request.product} • Quantity: {request.quantity}
                            </p>
                            <p className="text-green-700 text-sm">
                              Request ID: {request.id}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-green-900">
                              LKR {calculateRequestValue(request).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {request.notes && (
                        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-sm text-blue-800">
                            <span className="font-medium">Request Notes:</span> {request.notes}
                          </p>
                        </div>
                      )}
                      
                      {request.hoApprovalComments && (
                        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-sm text-blue-800">
                            <span className="font-medium">HO Comments:</span> {request.hoApprovalComments}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleDispatchRequest(request)}
                      disabled={dispatching === request.id}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="h-4 w-4" />
                      <span>{dispatching === request.id ? 'Dispatching...' : 'Dispatch'}</span>
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