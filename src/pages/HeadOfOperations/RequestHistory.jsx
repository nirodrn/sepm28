import React, { useState, useEffect } from 'react';
import { Clock, Search, Filter, FileText, Package, ShoppingCart, CheckCircle, XCircle, AlertCircle, Eye } from 'lucide-react';
import { auth } from '../../firebase/auth';
import { requestService } from '../../services/requestService';
import { packingMaterialRequestService } from '../../services/packingMaterialRequestService';
import { subscribeToData } from '../../firebase/db';
import { formatDate } from '../../utils/formatDate';
import { useRole } from '../../hooks/useRole';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const RequestHistory = () => {
  const { userRole, hasRole } = useRole();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    loadRequestHistory();
    
    // Set up real-time listeners
    const unsubscribeMaterial = subscribeToData('materialRequests', () => {
      loadRequestHistory();
    });
    
    const unsubscribePacking = subscribeToData('packingMaterialRequests', () => {
      loadRequestHistory();
    });

    return () => {
      unsubscribeMaterial();
      unsubscribePacking();
    };
  }, [userRole]);

  const loadRequestHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const [materialRequests, packingMaterialRequests] = await Promise.all([
        requestService.getMaterialRequests(),
        packingMaterialRequestService.getPackingMaterialRequests().catch(() => [])
      ]);

      // Combine all requests with type identification
      let allRequests = [
        ...materialRequests.map(req => ({ ...req, type: 'material' })),
        ...packingMaterialRequests.map(req => ({ ...req, type: 'packing_material' }))
      ];

      // Filter based on user role
      const currentUserId = auth.currentUser?.uid;
      
      if (hasRole('WarehouseStaff')) {
        // Warehouse staff see their own material and packing material requests
        allRequests = allRequests.filter(req => 
          (req.type === 'material' || req.type === 'packing_material') && req.requestedBy === currentUserId
        );
      } else if (hasRole('PackingMaterialsStoreManager')) {
      } else if (hasRole('PackingAreaManager')) {
        // Packing store manager sees their own purchase requests (different from warehouse staff requests)
        allRequests = allRequests.filter(req => 
          req.type === 'packing_purchase' && req.requestedBy === currentUserId
        );
      }
      // HO and MD see all requests (no filtering needed)

      // Sort by date (newest first)
      allRequests.sort((a, b) => {
        const aDate = new Date(a.createdAt);
        const bDate = new Date(b.createdAt);
        return bDate - aDate;
      });

      setRequests(allRequests);
    } catch (err) {
      console.error('Error loading request history:', err);
      setError('Failed to load request history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'md_approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'ho_rejected':
      case 'md_rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'forwarded_to_md':
        return <AlertCircle className="w-5 h-5 text-blue-500" />;
      case 'pending_ho':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'material':
        return <Package className="w-5 h-5 text-blue-500" />;
      case 'packing_material':
        return <ShoppingCart className="w-5 h-5 text-purple-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'material':
        return 'Material Request';
      case 'packing_material':
        return 'Packing Material Request';
      default:
        return 'Unknown';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending_ho':
        return 'Pending HO Approval';
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

  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.items?.some(item => 
        item.materialName?.toLowerCase().includes(searchTerm.toLowerCase())
      ) ||
      request.requestedByName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesType = typeFilter === 'all' || request.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const getPageTitle = () => {
    if (hasRole(['HeadOfOperations', 'MainDirector'])) {
      return 'Request History';
    }
    return 'My Request History';
  };

  const getPageDescription = () => {
    if (hasRole(['HeadOfOperations', 'MainDirector'])) {
      return 'View and track all material and packing material requests';
    }
    return 'View and track your submitted requests and their approval status';
  };

  if (loading) {
    return <LoadingSpinner text="Loading request history..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {getPageTitle()}
          </h1>
          <p className="text-gray-600">
            {getPageDescription()}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <XCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="all">All Status</option>
                <option value="pending_ho">Pending HO</option>
                <option value="forwarded_to_md">Forwarded to MD</option>
                <option value="md_approved">MD Approved</option>
                <option value="ho_rejected">HO Rejected</option>
                <option value="md_rejected">MD Rejected</option>
              </select>
            </div>

            {/* Type Filter */}
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="all">All Types</option>
                <option value="material">Material Requests</option>
                <option value="packing_material">Packing Material</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-6">
          <p className="text-gray-600">
            Showing {filteredRequests.length} of {requests.length} requests
          </p>
        </div>

        {/* Request List */}
        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {requests.length === 0 ? 'No requests found' : 'No matching requests'}
            </h3>
            <p className="text-gray-500">
              {requests.length === 0 
                ? 'No requests have been submitted yet.'
                : 'Try adjusting your search criteria or filters.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <div key={`${request.type}-${request.id}`} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    {getTypeIcon(request.type)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {getTypeLabel(request.type)}
                        </h3>
                        <span className="text-sm text-gray-500">#{request.id.slice(-8)}</span>
                      </div>
                      
                      {/* Request Details */}
                      <div className="space-y-2">
                        {request.items && request.items.length > 0 && (
                          <div>
                            <p className="text-gray-700">
                              <span className="font-medium">Items:</span> {(request.materials || request.items)?.length || 0} item(s)
                            </p>
                            <div className="ml-4 space-y-1">
                              {(request.materials || request.items)?.slice(0, 3).map((item, index) => (
                                <p key={index} className="text-sm text-gray-600">
                                  • {item.materialName}: {item.requestedQuantity || item.quantity} {item.unit}
                                </p>
                              ))}
                              {(request.materials || request.items)?.length > 3 && (
                                <p className="text-sm text-gray-500">
                                  ... and {(request.materials || request.items).length - 3} more items
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <p className="text-gray-700">
                          <span className="font-medium">Requested by:</span> {request.requestedByName}
                        </p>
                        <p className="text-gray-700">
                          <span className="font-medium">Date:</span> {formatDate(request.createdAt)}
                        </p>
                        
                        {request.budgetEstimate && (
                          <p className="text-gray-700">
                            <span className="font-medium">Budget:</span> ${request.budgetEstimate.toFixed(2)}
                          </p>
                        )}
                        
                        {request.justification && (
                          <p className="text-gray-700">
                            <span className="font-medium">Justification:</span> {request.justification}
                          </p>
                        )}

                        {/* Workflow Timeline */}
                        <div className="mt-4 space-y-2">
                          {request.workflow?.submitted && (
                            <div className="flex items-center text-sm text-gray-600">
                              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                              <span>Submitted: {formatDate(request.workflow.submitted.at)}</span>
                            </div>
                          )}
                          {request.workflow?.hoApproved && (
                            <div className="flex items-center text-sm text-green-600">
                              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                              <span>HO Approved: {formatDate(request.workflow.hoApproved.at)}</span>
                            </div>
                          )}
                          {request.workflow?.forwardedToMD && (
                            <div className="flex items-center text-sm text-blue-600">
                              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                              <span>Forwarded to MD: {formatDate(request.workflow.forwardedToMD.at)}</span>
                            </div>
                          )}
                          {request.workflow?.mdApproved && (
                            <div className="flex items-center text-sm text-green-600">
                              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                              <span>MD Approved: {formatDate(request.workflow.mdApproved.at)}</span>
                            </div>
                          )}
                          {request.workflow?.hoRejected && (
                            <div className="flex items-center text-sm text-red-600">
                              <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                              <span>HO Rejected: {formatDate(request.workflow.hoRejected.at)}</span>
                            </div>
                          )}
                          {request.workflow?.mdRejected && (
                            <div className="flex items-center text-sm text-red-600">
                              <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                              <span>MD Rejected: {formatDate(request.workflow.mdRejected.at)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(request.status)}
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
                      {getStatusLabel(request.status)}
                    </span>
                  </div>
                </div>
                
                {/* Rejection Reason */}
                {(request.status === 'ho_rejected' || request.status === 'md_rejected') && request.rejectionReason && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
                      <p className="text-sm text-red-700 mt-1">{request.rejectionReason}</p>
                    </div>
                  </div>
                )}

                {/* Approval Comments */}
                {(request.hoApprovalComments || request.mdApprovalComments) && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    {request.hoApprovalComments && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-2">
                        <p className="text-sm font-medium text-green-800">HO Comments:</p>
                        <p className="text-sm text-green-700 mt-1">{request.hoApprovalComments}</p>
                      </div>
                    )}
                    {request.mdApprovalComments && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm font-medium text-blue-800">MD Comments:</p>
                        <p className="text-sm text-blue-700 mt-1">{request.mdApprovalComments}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestHistory;