import React, { useState, useEffect } from 'react';
import { ShoppingCart, Calendar, Download, Filter, Eye, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { packingMaterialRequestService } from '../../../services/packingMaterialRequestService';
import { formatDate } from '../../../utils/formatDate';
import LoadingSpinner from '../../../components/Common/LoadingSpinner';

const PackingMaterialRequestStatus = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState('month');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');

  useEffect(() => {
    loadRequestData();
  }, [dateRange]);

  const loadRequestData = async () => {
    try {
      setLoading(true);
      const requestData = await packingMaterialRequestService.getPackingMaterialRequests();
      setRequests(requestData);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending_ho':
        return 'bg-yellow-100 text-yellow-800';
      case 'forwarded_to_md':
        return 'bg-blue-100 text-blue-800';
      case 'md_approved':
        return 'bg-green-100 text-green-800';
      case 'ho_rejected':
      case 'md_rejected':
        return 'bg-red-100 text-red-800';
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
      case 'pending_ho':
      case 'forwarded_to_md':
        return <Clock className="h-4 w-4" />;
      case 'ho_rejected':
      case 'md_rejected':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <ShoppingCart className="h-4 w-4" />;
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesStatus = !filterStatus || request.status === filterStatus;
    const matchesDepartment = !filterDepartment || request.requestedByRole === filterDepartment;
    
    return matchesStatus && matchesDepartment;
  });

  const getRequestSummary = () => {
    const total = filteredRequests.length;
    const pending = filteredRequests.filter(r => ['pending_ho', 'forwarded_to_md'].includes(r.status)).length;
    const approved = filteredRequests.filter(r => ['md_approved', 'allocated', 'received', 'added_to_store'].includes(r.status)).length;
    const rejected = filteredRequests.filter(r => ['ho_rejected', 'md_rejected'].includes(r.status)).length;
    const completed = filteredRequests.filter(r => r.status === 'added_to_store').length;

    return { total, pending, approved, rejected, completed };
  };

  const summary = getRequestSummary();

  if (loading) {
    return <LoadingSpinner text="Loading request status data..." />;
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <ShoppingCart className="h-8 w-8 mr-3 text-blue-600" />
              Packing Material Request Status
            </h1>
            <p className="text-gray-600 mt-2">Monitor all packing material requests and their progress</p>
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Download className="h-4 w-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Requests</p>
              <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
            </div>
            <ShoppingCart className="h-8 w-8 text-gray-600" />
          </div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-900">{summary.pending}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Approved</p>
              <p className="text-2xl font-bold text-green-900">{summary.approved}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-red-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Rejected</p>
              <p className="text-2xl font-bold text-red-900">{summary.rejected}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <div className="bg-emerald-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-600">Completed</p>
              <p className="text-2xl font-bold text-emerald-900">{summary.completed}</p>
            </div>
            <div className="h-8 w-8 bg-emerald-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">✓</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
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
            <div className="flex items-center space-x-2">
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Departments</option>
                <option value="WarehouseStaff">Warehouse Operations</option>
                <option value="PackingMaterialsStoreManager">Packing Materials Store</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Request ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requested By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Materials Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Budget
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRequests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-blue-600">#{request.id.slice(-8)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{request.requestedByName}</div>
                      <div className="text-sm text-gray-500">{request.requestedByRole}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(request.materials || request.items)?.length || 0} items
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {request.budgetEstimate ? `LKR ${request.budgetEstimate.toFixed(2)}` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                      {getStatusIcon(request.status)}
                      <span className="ml-1">{getStatusLabel(request.status)}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(request.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(request.updatedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => navigate(`/admin/reports/packing-material-requests/${request.id}`)}
                      className="text-blue-600 hover:text-blue-900 p-1 rounded"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRequests.length === 0 && (
          <div className="text-center py-12">
            <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No requests found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {(filterStatus || filterDepartment) ? 'Try adjusting your filter criteria.' : 'No requests in the selected time period.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PackingMaterialRequestStatus;