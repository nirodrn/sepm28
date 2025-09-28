import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Search, Filter, Eye, Store, User, Truck as TruckIcon, Package, Calendar, MapPin, BarChart3, Download, CheckCircle, Clock, Send, ArrowLeft } from 'lucide-react';
import { fgDispatchToExternalService } from '../../services/fgDispatchToExternalService';
import { getData } from '../../firebase/db';
import { formatDate } from '../../utils/formatDate';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import * as XLSX from 'xlsx';

const DispatchTracking = () => {
  const navigate = useNavigate();
  const [trackingData, setTrackingData] = useState({
    direct_shop: [],
    distributor: [],
    direct_representative: []
  });
  const [salesHistory, setSalesHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRecipientType, setFilterRecipientType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [activeTab, setActiveTab] = useState('tracking');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [directShopSummary, distributorSummary, drSummary, salesApprovalHistory] = await Promise.all([
        fgDispatchToExternalService.getRecipientSummary('direct_shop'),
        fgDispatchToExternalService.getRecipientSummary('distributor'),
        fgDispatchToExternalService.getRecipientSummary('direct_representative'),
        getData('salesApprovalHistory')
      ]);
      
      setTrackingData({
        direct_shop: directShopSummary,
        distributor: distributorSummary,
        direct_representative: drSummary
      });

      // Convert sales history to array and sort by completion date
      const salesHistoryArray = salesApprovalHistory ? 
        Object.entries(salesApprovalHistory).map(([id, request]) => ({
          id,
          ...request
        })).sort((a, b) => (b.sentAt || b.completedByFGAt || 0) - (a.sentAt || a.completedByFGAt || 0)) : [];
      
      setSalesHistory(salesHistoryArray);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getRecipientTypeColor = (type) => {
    switch (type) {
      case 'direct_shop':
        return 'bg-blue-100 text-blue-800';
      case 'distributor':
        return 'bg-green-100 text-green-800';
      case 'direct_representative':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRecipientTypeLabel = (type) => {
    switch (type) {
      case 'direct_shop':
        return 'Direct Shop';
      case 'distributor':
        return 'Distributor';
      case 'direct_representative':
        return 'Direct Representative';
      default:
        return type;
    }
  };

  const getRecipientTypeIcon = (type) => {
    switch (type) {
      case 'direct_shop':
        return Store;
      case 'distributor':
        return TruckIcon;
      case 'direct_representative':
        return User;
      default:
        return Package;
    }
  };

  const getStatusColor = (request) => {
    if (request.status === 'Sent' || request.isCompletedByFG) {
      return 'bg-green-100 text-green-800';
    } else if (request.status === 'Approved') {
      return 'bg-yellow-100 text-yellow-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (request) => {
    if (request.status === 'Sent' || request.isCompletedByFG) {
      return 'Sent';
    } else if (request.status === 'Approved') {
      return 'Pending FG';
    }
    return request.status || 'Unknown';
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

  const exportToExcel = () => {
    const exportData = filteredSalesHistory.map(request => ({
      'Request ID': request.id,
      'Date Approved': new Date(request.approvedAt).toLocaleDateString(),
      'Requester': request.requesterName,
      'Role': request.requesterRole,
      'Type': getRequestTypeLabel(request.requestType),
      'Items': Object.keys(request.items).length,
      'Total Quantity': request.totalQuantity || Object.values(request.items).reduce((sum, item) => sum + item.qty, 0),
      'Priority': request.priority,
      'Status': getStatusLabel(request),
      'Completed Date': request.completedByFGAt ? new Date(request.completedByFGAt).toLocaleDateString() : 
                       request.sentAt ? new Date(request.sentAt).toLocaleDateString() : 'Not completed',
      'Completed By': request.sentByName || 'Not completed',
      'Approver': request.approverName,
      'Approver Role': request.approverRole
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Dispatch Tracking');
    
    XLSX.writeFile(workbook, `sales-dispatch-tracking-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredSalesHistory = salesHistory.filter(request => {
    const matchesSearch = request.requesterName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         Object.values(request.items || {}).some(item => 
                           item.name?.toLowerCase().includes(searchTerm.toLowerCase())
                         );
    
    const matchesType = !filterRecipientType || request.requestType === filterRecipientType;
    
    let matchesStatus = true;
    if (filterStatus === 'completed') {
      matchesStatus = request.status === 'Sent' || request.isCompletedByFG;
    } else if (filterStatus === 'pending') {
      matchesStatus = request.status === 'Approved' && !request.isCompletedByFG;
    }
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const calculateSummaryStats = () => {
    const totalRequests = salesHistory.length;
    const completedRequests = salesHistory.filter(r => r.status === 'Sent' || r.isCompletedByFG).length;
    const pendingRequests = salesHistory.filter(r => r.status === 'Approved' && !r.isCompletedByFG).length;
    const totalValue = salesHistory.reduce((sum, request) => {
      return sum + (Object.values(request.items || {}).reduce((itemSum, item) => itemSum + (item.qty * 100), 0));
    }, 0);

    return { totalRequests, completedRequests, pendingRequests, totalValue };
  };

  const stats = calculateSummaryStats();

  const tabs = [
    { id: 'tracking', label: 'Recipient Tracking', icon: TrendingUp, count: Object.values(trackingData).flat().length },
    { id: 'completion', label: 'Sales Completion Status', icon: CheckCircle, count: salesHistory.length }
  ];

  if (loading) {
    return <LoadingSpinner text="Loading dispatch tracking..." />;
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/finished-goods/external-dispatches')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <TrendingUp className="h-8 w-8 mr-3 text-blue-600" />
                Dispatch Tracking & Sales Completion
              </h1>
              <p className="text-gray-600">Track all dispatches and monitor sales completion status</p>
            </div>
          </div>
          <button
            onClick={exportToExcel}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Sales Requests</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalRequests}</p>
            </div>
            <Package className="h-8 w-8 text-gray-600" />
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Completed</p>
              <p className="text-2xl font-bold text-green-900">{stats.completedRequests}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">Pending FG</p>
              <p className="text-2xl font-bold text-yellow-900">{stats.pendingRequests}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Value</p>
              <p className="text-2xl font-bold text-blue-900">LKR {stats.totalValue.toLocaleString()}</p>
            </div>
            <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">₨</span>
            </div>
          </div>
        </div>
      </div>

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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {activeTab === 'tracking' && (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Recipient Tracking Summary</h2>
            
            <div className="space-y-6">
              {Object.entries(trackingData).map(([type, recipients]) => {
                const TypeIcon = getRecipientTypeIcon(type);
                
                return (
                  <div key={type} className="border border-gray-200 rounded-lg">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <div className="flex items-center space-x-2">
                        <TypeIcon className="h-5 w-5 text-gray-600" />
                        <h3 className="font-medium text-gray-900">
                          {getRecipientTypeLabel(type)} ({recipients.length})
                        </h3>
                      </div>
                    </div>
                    
                    {recipients.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        <TypeIcon className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                        <p>No {getRecipientTypeLabel(type).toLowerCase()}s yet</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {recipients.map((recipient) => (
                          <div key={recipient.recipientId} className="p-4 hover:bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium text-gray-900">{recipient.recipientName}</h4>
                                {recipient.shopName && recipient.shopName !== recipient.recipientName && (
                                  <p className="text-sm text-gray-500">Shop: {recipient.shopName}</p>
                                )}
                                <p className="text-sm text-gray-500">
                                  Role: {recipient.recipientRole} • ID: {recipient.recipientId}
                                </p>
                                <p className="text-sm text-gray-500">
                                  Location: {recipient.recipientLocation || 'Not specified'}
                                </p>
                                <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                                  <span>Dispatches: {recipient.totalDispatches}</span>
                                  <span>Items: {recipient.totalItemsReceived}</span>
                                  <span>Quantity: {recipient.totalQuantityReceived}</span>
                                </div>
                                <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                                  <span>Last Product: {recipient.lastProductDispatched || 'N/A'}</span>
                                  <span>Last Qty: {recipient.lastQuantityDispatched || 0}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-gray-900">
                                  LKR {(recipient.totalValueReceived || 0).toLocaleString()}
                                </p>
                                <p className="text-sm text-gray-500">
                                  Last: {formatDate(recipient.lastDispatchDate)}
                                </p>
                                <p className="text-sm text-gray-500 font-mono">
                                  {recipient.lastReleaseCode}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'completion' && (
          <div>
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search sales requests..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <select
                    value={filterRecipientType}
                    onChange={(e) => setFilterRecipientType(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Types</option>
                    <option value="direct_shop">Direct Shops</option>
                    <option value="distributor">Distributors</option>
                    <option value="direct_representative">Direct Representatives</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending FG</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date Approved
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Requester
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Approved By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Completion Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sent Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSalesHistory.map((request) => {
                    const RequestTypeIcon = getRecipientTypeIcon(request.requestType);
                    
                    return (
                      <tr key={request.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 text-gray-400 mr-2" />
                            {formatDate(request.approvedAt)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <RequestTypeIcon className="h-4 w-4 text-gray-400" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">{request.requesterName}</div>
                              <div className="text-sm text-gray-500">{request.requesterRole}</div>
                              <div className="text-xs px-2 py-1 mt-1 inline-block rounded-full bg-gray-100 text-gray-800">
                                {getRecipientTypeLabel(request.requestType)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {Object.entries(request.items || {}).slice(0, 2).map(([id, item]) => (
                              <div key={id} className="text-sm text-gray-900">
                                {item.name} - {item.qty}
                              </div>
                            ))}
                            {Object.keys(request.items || {}).length > 2 && (
                              <div className="text-xs text-gray-500">
                                +{Object.keys(request.items).length - 2} more items
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {request.totalQuantity || Object.values(request.items || {}).reduce((sum, item) => sum + item.qty, 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            request.priority === 'urgent' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {request.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{request.approverName}</div>
                          <div className="text-sm text-gray-500">{request.approverRole}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request)}`}>
                            {(request.status === 'Sent' || request.isCompletedByFG) ? (
                              <CheckCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <Clock className="h-3 w-3 mr-1" />
                            )}
                            {getStatusLabel(request)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {request.sentAt ? formatDate(request.sentAt) : 
                           request.completedByFGAt ? formatDate(request.completedByFGAt) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => {
                              const details = `Sales Request Details:\n\n` +
                                `ID: ${request.id}\n` +
                                `Requester: ${request.requesterName}\n` +
                                `Role: ${request.requesterRole}\n` +
                                `Type: ${getRecipientTypeLabel(request.requestType)}\n` +
                                `Priority: ${request.priority}\n` +
                                `Approved: ${formatDate(request.approvedAt)}\n` +
                                `Approved By: ${request.approverName} (${request.approverRole})\n` +
                                `Status: ${getStatusLabel(request)}\n` +
                                `${request.sentAt ? `Sent: ${formatDate(request.sentAt)}\n` : ''}` +
                                `${request.sentByName ? `Sent By: ${request.sentByName}\n` : ''}` +
                                `\nItems:\n` +
                                Object.entries(request.items || {}).map(([id, item]) => 
                                  `• ${item.name}: ${item.qty} units`
                                ).join('\n') +
                                `\n\nTotal Value: LKR ${Object.values(request.items || {}).reduce((sum, item) => sum + (item.qty * 100), 0).toLocaleString()}`;
                              alert(details);
                            }}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredSalesHistory.length === 0 && (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No sales requests found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {(searchTerm || filterRecipientType || filterStatus) ? 'Try adjusting your search criteria.' : 'No sales requests have been processed yet.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DispatchTracking;