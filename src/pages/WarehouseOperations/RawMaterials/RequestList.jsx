import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Search, Filter, Eye, CheckCircle, TruckIcon, AlertTriangle, Clock } from 'lucide-react';
import { requestService } from '../../../services/requestService';
import { supplierService } from '../../../services/supplierService';
import LoadingSpinner from '../../../components/Common/LoadingSpinner';
import { formatDate } from '../../../utils/formatDate';

const RawMaterialRequestList = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [requestData, supplierData] = await Promise.all([
        requestService.getMaterialRequests(),
        supplierService.getSuppliers()
      ]);
      
      setRequests(requestData);
      setSuppliers(supplierData);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsReceived = async (requestId) => {
    try {
      await requestService.markAsReceived(requestId);
      await loadData();
    } catch (error) {
      setError(error.message);
    }
  };

  const handleAddToStore = async (requestId) => {
    try {
      await requestService.addToStore(requestId);
      await loadData();
    } catch (error) {
      setError(error.message);
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
      case 'allocated':
        return 'bg-purple-100 text-purple-800';
      case 'received':
        return 'bg-indigo-100 text-indigo-800';
      case 'added_to_store':
        return 'bg-emerald-100 text-emerald-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending_ho':
        return 'Pending HO';
      case 'forwarded_to_md':
        return 'Forwarded to MD';
      case 'md_approved':
        return 'MD Approved';
      case 'ho_rejected':
        return 'HO Rejected';
      case 'md_rejected':
        return 'MD Rejected';
      case 'allocated':
        return 'Supplier Allocated';
      case 'received':
        return 'Materials Received';
      case 'added_to_store':
        return 'Added to Store';
      default:
        return status?.replace('_', ' ').toUpperCase() || 'Unknown';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'md_approved':
      case 'added_to_store':
        return <CheckCircle className="h-4 w-4" />;
      case 'allocated':
        return <TruckIcon className="h-4 w-4" />;
      case 'received':
        return <Package className="h-4 w-4" />;
      case 'ho_rejected':
      case 'md_rejected':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
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
    return <LoadingSpinner text="Loading raw material requests..." />;
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Package className="h-8 w-8 mr-3 text-blue-600" />
          Raw Material Requests
        </h1>
        <p className="text-gray-600">Manage raw material purchase requests and deliveries</p>
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
                <option value="pending_ho">Pending HO</option>
                <option value="forwarded_to_md">Forwarded to MD</option>
                <option value="md_approved">MD Approved</option>
                <option value="allocated">Supplier Allocated</option>
                <option value="received">Materials Received</option>
                <option value="added_to_store">Added to Store</option>
                <option value="ho_rejected">HO Rejected</option>
                <option value="md_rejected">MD Rejected</option>
              </select>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredRequests.map((request) => (
            <div key={request.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="p-2 rounded-lg bg-blue-100">
                    {getStatusIcon(request.status)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-medium text-gray-900">
                        Request #{request.id.slice(-6)}
                      </h4>
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                        {getStatusIcon(request.status)}
                        <span className="ml-1">{getStatusLabel(request.status)}</span>
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-6 mb-3 text-sm text-gray-500">
                      <span>{request.items?.length || 0} materials</span>
                      <span>By: {request.requestedByName}</span>
                      <span>{formatDate(request.createdAt)}</span>
                      {request.hoApprovedAt && (
                        <span className="text-green-600">HO Approved: {formatDate(request.hoApprovedAt)}</span>
                      )}
                      {request.mdApprovedAt && (
                        <span className="text-blue-600">MD Approved: {formatDate(request.mdApprovedAt)}</span>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      {request.items?.slice(0, 3).map((item, index) => (
                        <div key={index} className="text-sm text-gray-600">
                          • {item.materialName}: {item.quantity} {item.unit}
                        </div>
                      ))}
                      {request.items?.length > 3 && (
                        <div className="text-sm text-gray-500">
                          ... and {request.items.length - 3} more materials
                        </div>
                      )}
                    </div>
                    
                    {request.notes && (
                      <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                        Notes: {request.notes}
                      </p>
                    )}

                    {request.rejectionReason && (
                      <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2">
                        <div className="flex items-center text-red-800">
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          <span className="text-sm font-medium">Rejection Reason:</span>
                        </div>
                        <p className="text-sm text-red-700 mt-1">{request.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  {request.status === 'md_approved' && (
                    <button
                      onClick={() => navigate(`/warehouse/raw-materials/requests/${request.id}/allocate`)}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      Allocate Supplier
                    </button>
                  )}
                  
                  {request.status === 'allocated' && (
                    <button
                      onClick={() => handleMarkAsReceived(request.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      Mark as Received
                    </button>
                  )}
                  
                  {request.status === 'received' && (
                    <button
                      onClick={() => handleAddToStore(request.id)}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      Add to Store
                    </button>
                  )}
                  
                  <button
                    onClick={() => navigate(`/warehouse/raw-materials/requests/${request.id}`)}
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
              {(searchTerm || filterStatus) ? 'Try adjusting your search criteria.' : 'No requests have been submitted yet.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RawMaterialRequestList;