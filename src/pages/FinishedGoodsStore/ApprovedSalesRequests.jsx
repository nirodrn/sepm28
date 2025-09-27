import React, { useState, useEffect } from 'react';
import { fgDispatchService } from '../../services/fgDispatchService.js';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import { formatDate } from '../../utils/formatDate';
import { Package, Search, Truck } from 'lucide-react';
import DispatchModal from './DispatchModal';

const ApprovedSalesRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDispatchModal, setShowDispatchModal] = useState(false);

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

  const handleDispatchClick = (request) => {
    setSelectedRequest(request);
    setShowDispatchModal(true);
  };

  const handleDispatchComplete = () => {
    setShowDispatchModal(false);
    setSelectedRequest(null);
    fetchRequests(); // Refresh the list
  };

  const handleMarkAsSent = async (dispatchId, requestId) => {
    try {
      setLoading(true);
      await fgDispatchService.markRequestAsSent(dispatchId, requestId);
      fetchRequests(); // Refresh the list
    } catch (error) {
      setError(`Failed to mark as sent: ${error.message}`);
      console.error('Error marking as sent:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter(request =>
    searchTerm === '' ||
    request.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    Object.values(request.items).some(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Approved Sales Requests</h1>
        <p className="mt-2 text-gray-600">Manage and dispatch approved sales requests</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="pl-10 w-full rounded-md border border-gray-300 p-2"
            placeholder="Search by requester name or item..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Request Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Items
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Request Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Priority
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  No approved requests found
                </td>
              </tr>
            ) : (
              filteredRequests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{request.requesterName}</div>
                    <div className="text-sm text-gray-500">{request.requesterRole}</div>
                    <div className="text-xs text-gray-500">{formatDate(request.approvedAt)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {Object.entries(request.items).map(([id, item]) => (
                        <div key={id} className="text-sm">
                          <span className="font-medium">{item.name}</span>
                          <span className="text-gray-500"> - {item.qty} units</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      request.requestType === 'direct_shop' ? 'bg-purple-100 text-purple-800' :
                      request.requestType === 'direct_representative' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {request.requestType === 'direct_shop' ? 'DS' :
                       request.requestType === 'direct_representative' ? 'DR' :
                       'Distributor'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      request.priority === 'urgent' 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {request.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {request.isSent ? (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Sent
                      </span>
                    ) : request.isFullyDispatched ? (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        Dispatched
                      </span>
                    ) : (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        Approved
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {!request.isFullyDispatched ? (
                      <button
                        onClick={() => handleDispatchClick(request)}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Truck className="h-4 w-4 mr-2" />
                        Dispatch
                      </button>
                    ) : !request.isSent ? (
                      <button
                        onClick={() => handleMarkAsSent(request.dispatches[0].id, request.id)} // Assuming one dispatch per request for simplicity
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <Package className="h-4 w-4 mr-2" />
                        Mark as Sent
                      </button>
                    ) : (
                      <span className="text-sm text-gray-500">Completed</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showDispatchModal && selectedRequest && (
        <DispatchModal
          request={selectedRequest}
          onClose={() => setShowDispatchModal(false)}
          onDispatchComplete={handleDispatchComplete}
        />
      )}
    </div>
  );
};

export default ApprovedSalesRequests;