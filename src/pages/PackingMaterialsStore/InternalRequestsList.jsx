import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Search, Filter, Eye, CheckCircle, Clock, Send, AlertTriangle } from 'lucide-react';
import { packingMaterialsService } from '../../services/packingMaterialsService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const InternalRequestsList = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const requestData = await packingMaterialsService.getInternalRequests();
      setRequests(requestData);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'fulfilled':
        return 'bg-green-100 text-green-800';
      case 'partially_fulfilled':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'fulfilled':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'cancelled':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const handleFulfillRequest = (requestId) => {
    navigate('/packing-materials/send', { state: { requestId } });
  };

  const handleCancelRequest = async (requestId) => {
    if (window.confirm('Are you sure you want to cancel this request?')) {
      try {
        await packingMaterialsService.updateInternalRequestStatus(requestId, 'cancelled', 'Cancelled by Store Manager');
        await loadRequests();
      } catch (error) {
        setError(error.message);
      }
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.items?.some(item => 
      item.materialName?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || request.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !filterStatus || request.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <LoadingSpinner text="Loading internal requests..." />;
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Package className="h-8 w-8 mr-3 text-blue-600" />
          Internal Requests
        </h1>
        <p className="text-gray-600">Manage requests from Packing Area for materials</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="fulfilled">Fulfilled</option>
                <option value="partially_fulfilled">Partially Fulfilled</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <button
              onClick={() => navigate('/packing-materials/request-from-warehouse')}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Request from Warehouse
            </button>
          </div>
        </div>

        {/* Request List */}
        <div className="divide-y divide-gray-200">
          {filteredRequests.map((request) => (
            <div key={request.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-medium text-gray-900">
                        Request from Packing Area
                      </h4>
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                        {getStatusIcon(request.status)}
                        <span className="ml-1">{request.status?.replace('_', ' ').toUpperCase()}</span>
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-6 mb-3 text-sm text-gray-500">
                      <span>ID: {request.id.slice(-8)}</span>
                      <span>{request.items?.length || 0} items</span>
                      <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                      {request.fulfilledAt && (
                        <span>Fulfilled: {new Date(request.fulfilledAt).toLocaleDateString()}</span>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      {(request.materials || request.items)?.map((item, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                          <div>
                            <p className="font-medium text-gray-900">{item.materialName}</p>
                            <p className="text-sm text-gray-500">
                              Line: {item.productionLine?.replace('line', 'Line ') || 'General'} • 
                              Reason: {item.reason}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">{item.requestedQuantity || item.quantity} {item.unit}</p>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getUrgencyColor(item.urgency)}`}>
                              {item.urgency?.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {request.notes && (
                      <p className="text-sm text-gray-600 mt-3 bg-gray-50 p-2 rounded">
                        Notes: {request.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  {request.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleFulfillRequest(request.id)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        Fulfill
                      </button>
                      <button
                        onClick={() => handleCancelRequest(request.id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => navigate(`/packing-materials/requests/${request.id}`)}
                    className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                    title="View Details"
                  >
                    <Eye className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredRequests.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No requests found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {(searchTerm || filterStatus) ? 'Try adjusting your search criteria.' : 'No requests in the selected time period.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InternalRequestsList;