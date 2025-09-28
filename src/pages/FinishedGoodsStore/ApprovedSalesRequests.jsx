import React, { useState, useEffect } from 'react';
import { fgDispatchService } from '../../services/fgDispatchService.js';
import { fgDispatchToExternalService } from '../../services/fgDispatchToExternalService';
import { fgPricingService } from '../../services/fgPricingService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import { formatDate } from '../../utils/formatDate';
import { Package, Search, Truck, Send, CheckCircle, Clock, Eye, DollarSign, User, Store, Truck as TruckIcon } from 'lucide-react';

const ApprovedSalesRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendData, setSendData] = useState({
    notes: '',
    expectedDeliveryDate: ''
  });

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const approvedRequests = await fgDispatchService.getApprovedSalesRequests();
      
      // For each approved request, fetch its dispatch history
      const requestsWithDispatchStatus = await Promise.all(
        approvedRequests.map(async (request) => {
          const dispatches = await fgDispatchService.getSalesRequestDispatches(request.id);
          
          let totalDispatchedQty = {};
          dispatches.forEach(dispatch => {
            Object.entries(dispatch.items).forEach(([itemId, item]) => {
              totalDispatchedQty[itemId] = (totalDispatchedQty[itemId] || 0) + item.qty;
            });
          });

          let isFullyDispatched = true;
          let isSent = false;

          if (request.isDispatched) {
            // Check if all items are fully dispatched based on approved quantities
            Object.entries(request.items).forEach(([itemId, item]) => {
              const approvedQty = item.qty;
              const dispatched = totalDispatchedQty[itemId] || 0;
              if (dispatched < approvedQty) {
                isFullyDispatched = false;
              }
            });

            // Check if any dispatch for this request has been marked as 'Sent'
            isSent = dispatches.some(dispatch => dispatch.status === 'Sent');
          }

          return { 
            ...request, 
            dispatches,
            isFullyDispatched,
            isSent
          };
        })
      );

      setRequests(requestsWithDispatchStatus);
      setError('');
    } catch (error) {
      setError('Failed to load approved requests');
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendToRecipient = (request) => {
    setSelectedRequest(request);
    setSendData({
      notes: `Dispatch to ${request.requesterName} (${getRequestTypeLabel(request.requestType)})`,
      expectedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 2 days from now
    });
    setShowSendModal(true);
  };

  const confirmSend = async () => {
    if (!selectedRequest) return;
    
    try {
      setSending(true);
      setError('');
      
      // Get product pricing for the items
      const itemsWithPricing = await Promise.all(
        Object.entries(selectedRequest.items).map(async ([itemId, item]) => {
          let pricing = await fgPricingService.getProductPricingForDispatch(item.name);
          
          if (!pricing) {
            // Set default pricing if not exists
            pricing = await fgPricingService.setDefaultProductPricing(item.name, 100);
          }
          
          return {
            productId: item.name,
            productName: item.name,
            quantity: item.qty,
            unit: 'units',
            unitPrice: pricing.currentPrice || 100,
            type: 'units',
            totalPrice: item.qty * (pricing.currentPrice || 100)
          };
        })
      );

      // Create external dispatch
      const dispatchPayload = {
        requestId: selectedRequest.id,
        fromSalesRequest: true,
        salesRequestId: selectedRequest.id,
        recipientType: selectedRequest.requestType,
        recipientId: selectedRequest.requesterId,
        recipientName: selectedRequest.requesterName,
        recipientRole: selectedRequest.requesterRole,
        recipientLocation: getRecipientLocation(selectedRequest.requestType),
        shopName: selectedRequest.shopName || selectedRequest.requesterName,
        items: itemsWithPricing,
        notes: sendData.notes,
        expectedDeliveryDate: sendData.expectedDeliveryDate,
        priority: selectedRequest.priority || 'normal'
      };
      
      const dispatch = await fgDispatchToExternalService.dispatchToExternal(dispatchPayload);
      
      // Mark the sales approval history as sent (this is now handled in dispatchToExternal)
      
      setShowSendModal(false);
      setSelectedRequest(null);
      setSuccess('Request sent successfully to recipient!');
      setTimeout(() => setSuccess(''), 3000);
      await fetchRequests();
    } catch (error) {
      setError(error.message);
    } finally {
      setSending(false);
    }
  };

  const getRequestTypeLabel = (requestType) => {
    switch (requestType) {
      case 'direct_shop':
        return 'Direct Shop';
      case 'direct_representative':
        return 'Direct Representative';
      case 'distributor':
        return 'Distributor';
      default:
        return requestType;
    }
  };

  const getRequestTypeColor = (requestType) => {
    switch (requestType) {
      case 'direct_shop':
        return 'bg-blue-100 text-blue-800';
      case 'direct_representative':
        return 'bg-purple-100 text-purple-800';
      case 'distributor':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRequestTypeIcon = (requestType) => {
    switch (requestType) {
      case 'direct_shop':
        return Store;
      case 'direct_representative':
        return User;
      case 'distributor':
        return TruckIcon;
      default:
        return Package;
    }
  };

  const getRecipientLocation = (requestType) => {
    switch (requestType) {
      case 'direct_shop':
        return 'Direct Shop Location';
      case 'direct_representative':
        return 'DR Territory';
      case 'distributor':
        return 'Distributor Warehouse';
      default:
        return 'Unknown Location';
    }
  };

  const calculateRequestValue = (items) => {
    return Object.values(items).reduce((sum, item) => {
      return sum + (item.qty * 100); // Using default price of 100 per unit
    }, 0);
  };

  const filteredRequests = requests.filter(request =>
    searchTerm === '' ||
    request.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    Object.values(request.items).some(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  if (loading) return <LoadingSpinner text="Loading approved sales requests..." />;

  return (
    <div className="p-6">
      {/* Send Modal */}
      {showSendModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Send Products to {selectedRequest.requesterName}
            </h3>
            
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                {React.createElement(getRequestTypeIcon(selectedRequest.requestType), { className: "h-5 w-5 text-blue-600" })}
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRequestTypeColor(selectedRequest.requestType)}`}>
                  {getRequestTypeLabel(selectedRequest.requestType)}
                </span>
              </div>
              <h4 className="font-medium text-blue-900">Request Details</h4>
              <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                <div>
                  <span className="text-blue-700">Requester:</span>
                  <span className="font-medium text-blue-900 ml-2">{selectedRequest.requesterName}</span>
                </div>
                <div>
                  <span className="text-blue-700">Role:</span>
                  <span className="font-medium text-blue-900 ml-2">{selectedRequest.requesterRole}</span>
                </div>
                <div>
                  <span className="text-blue-700">Request Type:</span>
                  <span className="font-medium text-blue-900 ml-2">{getRequestTypeLabel(selectedRequest.requestType)}</span>
                </div>
                <div>
                  <span className="text-blue-700">Priority:</span>
                  <span className="font-medium text-blue-900 ml-2">{selectedRequest.priority}</span>
                </div>
                <div>
                  <span className="text-blue-700">Total Items:</span>
                  <span className="font-medium text-blue-900 ml-2">{Object.keys(selectedRequest.items).length}</span>
                </div>
                <div>
                  <span className="text-blue-700">Est. Value:</span>
                  <span className="font-medium text-blue-900 ml-2">
                    LKR {calculateRequestValue(selectedRequest.items).toLocaleString()}
                  </span>
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
                  value={sendData.expectedDeliveryDate}
                  onChange={(e) => setSendData(prev => ({ ...prev, expectedDeliveryDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dispatch Notes
                </label>
                <textarea
                  rows={3}
                  value={sendData.notes}
                  onChange={(e) => setSendData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add dispatch notes..."
                />
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-3">Items to send:</h4>
                <div className="space-y-2">
                  {Object.entries(selectedRequest.items).map(([itemId, item]) => (
                    <div key={itemId} className="bg-white rounded-lg p-3 border border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{item.name}</p>
                          <p className="text-sm text-gray-600">
                            Quantity: {item.qty} units
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">
                            LKR {(item.qty * 100).toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-500">
                            @ LKR 100/unit
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowSendModal(false);
                  setSelectedRequest(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmSend}
                disabled={sending}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? 'Sending...' : 'Send to Recipient'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Package className="h-8 w-8 mr-3 text-blue-600" />
              Approved Sales Requests
            </h1>
            <p className="text-gray-600">Send approved products to distributors, representatives, and direct shops</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/finished-goods/external-dispatches')}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Send className="h-4 w-4" />
              <span>View Dispatch History</span>
            </button>
            <button
              onClick={() => navigate('/finished-goods/pricing')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <DollarSign className="h-4 w-4" />
              <span>Manage Pricing</span>
            </button>
            <button
              onClick={() => navigate('/finished-goods/dispatch-tracking')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <BarChart3 className="h-4 w-4" />
              <span>Dispatch Tracking</span>
            </button>
          </div>
        </div>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Approved</p>
              <p className="text-2xl font-bold text-gray-900">{requests.length}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-gray-600" />
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Ready to Send</p>
              <p className="text-2xl font-bold text-blue-900">
                {requests.filter(r => r.isFullyDispatched && !r.isSent).length}
              </p>
            </div>
            <Clock className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Sent</p>
              <p className="text-2xl font-bold text-green-900">
                {requests.filter(r => r.isSent).length}
              </p>
            </div>
            <Send className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">Pending Dispatch</p>
              <p className="text-2xl font-bold text-yellow-900">
                {requests.filter(r => !r.isFullyDispatched).length}
              </p>
            </div>
            <Truck className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search by requester name or item..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="text-sm text-gray-600">
              Showing {filteredRequests.length} of {requests.length} requests
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No approved requests found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Approved sales requests will appear here for dispatch
              </p>
            </div>
          ) : (
            filteredRequests.map((request) => {
              const RequestTypeIcon = getRequestTypeIcon(request.requestType);
              
              return (
                <div key={request.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="p-2 rounded-lg bg-blue-100">
                        <RequestTypeIcon className="h-5 w-5 text-blue-600" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-medium text-gray-900">
                            {request.requesterName}
                          </h4>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRequestTypeColor(request.requestType)}`}>
                            {getRequestTypeLabel(request.requestType)}
                          </span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            request.isSent ? 'bg-green-100 text-green-800' :
                            request.isFullyDispatched ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {request.isSent ? 'Sent' :
                             request.isFullyDispatched ? 'Ready to Send' :
                             'Approved'}
                          </span>
                          {request.priority === 'urgent' && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              URGENT
                            </span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Requester Role:</span>
                            <span className="ml-1">{request.requesterRole}</span>
                          </div>
                          <div>
                            <span className="font-medium">Approved:</span>
                            <span className="ml-1">{formatDate(request.approvedAt)}</span>
                          </div>
                          <div>
                            <span className="font-medium">Items:</span>
                            <span className="ml-1">{Object.keys(request.items).length}</span>
                          </div>
                          <div>
                            <span className="font-medium">Est. Value:</span>
                            <span className="ml-1">LKR {calculateRequestValue(request.items).toLocaleString()}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <h5 className="font-medium text-gray-700">Items:</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {Object.entries(request.items).map(([id, item]) => (
                              <div key={id} className="text-sm text-gray-600 bg-gray-50 rounded p-2">
                                • {item.name}: {item.qty} units @ LKR 100 = LKR {(item.qty * 100).toLocaleString()}
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {request.notes && (
                          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-sm text-blue-800">
                              <span className="font-medium">Notes:</span> {request.notes}
                            </p>
                          </div>
                        )}

                        {/* Dispatch Status */}
                        {request.dispatches && request.dispatches.length > 0 && (
                          <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <p className="text-sm font-medium text-gray-700 mb-2">Dispatch History:</p>
                            {request.dispatches.map((dispatch, index) => (
                              <div key={index} className="text-sm text-gray-600">
                                • Dispatched: {formatDate(dispatch.dispatchedAt)} by {dispatch.dispatchedByName}
                                {dispatch.status === 'Sent' && (
                                  <span className="ml-2 text-green-600 font-medium">(Sent)</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      {!request.isSent && request.isFullyDispatched ? (
                        <button
                          onClick={() => handleSendToRecipient(request)}
                          disabled={sending}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Send className="h-4 w-4" />
                          <span>Send to Recipient</span>
                        </button>
                      ) : request.isSent ? (
                        <span className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-lg">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Sent
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg">
                          <Clock className="h-4 w-4 mr-2" />
                          Pending Dispatch
                        </span>
                      )}
                      
                      <button
                        onClick={() => {
                          const details = `Request Details:\n\n` +
                            `Requester: ${request.requesterName}\n` +
                            `Role: ${request.requesterRole}\n` +
                            `Type: ${getRequestTypeLabel(request.requestType)}\n` +
                            `Priority: ${request.priority}\n` +
                            `Approved: ${formatDate(request.approvedAt)}\n` +
                            `Status: ${request.isSent ? 'Sent' : request.isFullyDispatched ? 'Ready to Send' : 'Pending Dispatch'}\n\n` +
                            `Items:\n` +
                            Object.entries(request.items).map(([id, item]) => 
                              `• ${item.name}: ${item.qty} units`
                            ).join('\n') +
                            `\n\nTotal Value: LKR ${calculateRequestValue(request.items).toLocaleString()}`;
                          alert(details);
                        }}
                        className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ApprovedSalesRequests;