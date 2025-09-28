import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Search, Filter, Eye, Store, User, Truck as TruckIcon, Package, Calendar, MapPin, BarChart3, Download, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { fgDispatchToExternalService } from '../../services/fgDispatchToExternalService';
import { getData, updateData } from '../../firebase/db';
import { auth } from '../../firebase/auth';
import { formatDate } from '../../utils/formatDate';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import * as XLSX from 'xlsx';

const ExternalDispatches = () => {
  const navigate = useNavigate();
  const [dispatches, setDispatches] = useState([]);
  const [salesRequests, setSalesRequests] = useState([]);
  const [directShopRequests, setDirectShopRequests] = useState([]);
  const [drRequests, setDrRequests] = useState([]);
  const [distributorRequests, setDistributorRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRecipientType, setFilterRecipientType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [activeTab, setActiveTab] = useState('approved_requests');
  const [dispatching, setDispatching] = useState(null);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [dispatchData, setDispatchData] = useState({
    notes: '',
    expectedDeliveryDate: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [
        dispatchData, 
        salesApprovalHistory,
        dsreqs,
        drreqs,
        distributorReqs
      ] = await Promise.all([
        fgDispatchToExternalService.getExternalDispatches(),
        getData('salesApprovalHistory'),
        getData('dsreqs'),
        getData('drreqs'),
        getData('distributorReqs')
      ]);
      
      setDispatches(dispatchData);
      
      // Convert sales history to array
      const salesHistoryArray = salesApprovalHistory ? 
        Object.entries(salesApprovalHistory).map(([id, request]) => ({
          id,
          ...request
        })) : [];
      setSalesRequests(salesHistoryArray);

      // Convert direct shop requests
      const dsArray = dsreqs ? 
        Object.entries(dsreqs).map(([id, request]) => ({
          id,
          ...request,
          requestType: 'direct_shop',
          items: [{
            productName: request.product,
            quantity: request.quantity,
            unitPrice: 100 // Default price
          }]
        })) : [];
      setDirectShopRequests(dsArray);

      // Convert DR requests
      const drArray = drreqs ? 
        Object.entries(drreqs).map(([id, request]) => ({
          id,
          ...request,
          requestType: 'direct_representative',
          items: Object.values(request.items || {}).map(item => ({
            productName: item.name,
            quantity: item.qty,
            unitPrice: 100 // Default price
          }))
        })) : [];
      setDrRequests(drArray);

      // Convert distributor requests
      const distArray = distributorReqs ? 
        Object.entries(distributorReqs).map(([id, request]) => ({
          id,
          ...request,
          requestType: 'distributor',
          items: Object.values(request.items || {}).map(item => ({
            productName: item.name,
            quantity: item.qty,
            unitPrice: 100 // Default price
          }))
        })) : [];
      setDistributorRequests(distArray);

    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDispatchRequest = (request) => {
    setSelectedRequest(request);
    setDispatchData({
      notes: `Dispatch to ${request.requestedByName || request.requesterName}`,
      expectedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
    setShowDispatchModal(true);
  };

  const confirmDispatch = async () => {
    if (!selectedRequest) return;
    
    try {
      setDispatching(selectedRequest.id);
      setError('');
      
      const currentUser = auth.currentUser;
      
      // Determine the correct Firebase path based on request type
      let requestPath = '';
      if (selectedRequest.requestType === 'direct_shop') {
        requestPath = `dsreqs/${selectedRequest.id}`;
      } else if (selectedRequest.requestType === 'direct_representative') {
        requestPath = `drreqs/${selectedRequest.id}`;
      } else if (selectedRequest.requestType === 'distributor') {
        requestPath = `distributorReqs/${selectedRequest.id}`;
      } else {
        // For sales approval history
        requestPath = `salesApprovalHistory/${selectedRequest.id}`;
      }

      // Update the request status to "sent"
      await updateData(requestPath, {
        status: 'sent',
        sentAt: Date.now(),
        sentBy: currentUser?.uid,
        sentByName: currentUser?.displayName || currentUser?.email || 'FG Store Manager',
        dispatchNotes: dispatchData.notes,
        expectedDeliveryDate: dispatchData.expectedDeliveryDate,
        updatedAt: Date.now()
      });

      // If it's a sales approval history item, also mark as completed by FG
      if (selectedRequest.requestType === 'sales_request') {
        await updateData(`salesApprovalHistory/${selectedRequest.id}`, {
          isCompletedByFG: true,
          completedByFGAt: Date.now()
        });
      }

      setShowDispatchModal(false);
      setSelectedRequest(null);
      setSuccess('Request dispatched successfully!');
      setTimeout(() => setSuccess(''), 3000);
      await loadData();
    } catch (error) {
      setError(error.message);
    } finally {
      setDispatching(null);
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
      case 'sales_request':
        return 'bg-orange-100 text-orange-800';
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
      case 'sales_request':
        return 'Sales Request';
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
      case 'sales_request':
        return Package;
      default:
        return Package;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'dispatched':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Approved':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4" />;
      case 'dispatched':
        return <Send className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'Approved':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const calculateRequestValue = (items) => {
    if (Array.isArray(items)) {
      return items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 100)), 0);
    }
    if (typeof items === 'object') {
      return Object.values(items).reduce((sum, item) => sum + ((item.qty || 0) * 100), 0);
    }
    return 0;
  };

  const getAllRequests = () => {
    const allRequests = [
      ...salesRequests.filter(r => r.status === 'Approved').map(r => ({ ...r, requestType: 'sales_request' })),
      ...directShopRequests.filter(r => r.status === 'pending' || r.status === 'sent'),
      ...drRequests.filter(r => r.status === 'pending' || r.status === 'sent'),
      ...distributorRequests.filter(r => r.status === 'pending' || r.status === 'sent')
    ];
    
    return allRequests.sort((a, b) => {
      const aDate = a.createdAt || (a.date ? new Date(a.date).getTime() : 0);
      const bDate = b.createdAt || (b.date ? new Date(b.date).getTime() : 0);
      return bDate - aDate;
    });
  };

  const allRequests = getAllRequests();

  const filteredRequests = allRequests.filter(request => {
    const matchesSearch = (request.requestedByName || request.requesterName || '')
      .toLowerCase().includes(searchTerm.toLowerCase()) ||
      (request.product || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (request.items && Array.isArray(request.items) ? 
        request.items.some(item => item.productName?.toLowerCase().includes(searchTerm.toLowerCase())) :
        Object.values(request.items || {}).some(item => item.name?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    
    const matchesType = !filterRecipientType || request.requestType === filterRecipientType;
    const matchesStatus = !filterStatus || request.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const filteredDispatches = dispatches.filter(dispatch => {
    const matchesSearch = dispatch.recipientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         dispatch.releaseCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         dispatch.items?.some(item => item.productName?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRecipientType = !filterRecipientType || dispatch.recipientType === filterRecipientType;
    const matchesStatus = !filterStatus || dispatch.status === filterStatus;
    
    return matchesSearch && matchesRecipientType && matchesStatus;
  });

  const calculateSummaryStats = () => {
    const totalRequests = allRequests.length;
    const pendingRequests = allRequests.filter(r => r.status === 'pending' || r.status === 'Approved').length;
    const sentRequests = allRequests.filter(r => r.status === 'sent').length;
    const totalValue = allRequests.reduce((sum, request) => sum + calculateRequestValue(request.items), 0);

    return { totalRequests, pendingRequests, sentRequests, totalValue };
  };

  const stats = calculateSummaryStats();

  const exportToExcel = () => {
    const exportData = filteredRequests.map(request => ({
      'Request ID': request.id,
      'Date': request.createdAt ? new Date(request.createdAt).toLocaleDateString() : 
              request.date ? new Date(request.date).toLocaleDateString() : 'N/A',
      'Requester': request.requestedByName || request.requesterName,
      'Role': request.requestedByRole || request.requesterRole,
      'Type': getRecipientTypeLabel(request.requestType),
      'Items': Array.isArray(request.items) ? 
        request.items.map(item => `${item.productName}: ${item.quantity}`).join(', ') :
        request.product ? `${request.product}: ${request.quantity}` :
        Object.values(request.items || {}).map(item => `${item.name}: ${item.qty}`).join(', '),
      'Total Quantity': Array.isArray(request.items) ? 
        request.items.reduce((sum, item) => sum + (item.quantity || 0), 0) :
        request.quantity || Object.values(request.items || {}).reduce((sum, item) => sum + (item.qty || 0), 0),
      'Priority': request.priority || (request.urgent ? 'urgent' : 'normal'),
      'Status': request.status,
      'Sent Date': request.sentAt ? new Date(request.sentAt).toLocaleDateString() : 'Not sent',
      'Sent By': request.sentByName || 'Not sent'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'External Dispatches');
    
    XLSX.writeFile(workbook, `external-dispatches-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const tabs = [
    { id: 'approved_requests', label: 'Approved Requests', icon: CheckCircle, count: allRequests.filter(r => r.status === 'pending' || r.status === 'Approved').length },
    { id: 'dispatch_history', label: 'Dispatch History', icon: Send, count: dispatches.length }
  ];

  if (loading) {
    return <LoadingSpinner text="Loading external dispatches..." />;
  }

  return (
    <div className="p-6">
      {/* Dispatch Modal */}
      {showDispatchModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Dispatch to {selectedRequest.requestedByName || selectedRequest.requesterName}
            </h3>
            
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                {React.createElement(getRecipientTypeIcon(selectedRequest.requestType), { className: "h-5 w-5 text-blue-600" })}
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRecipientTypeColor(selectedRequest.requestType)}`}>
                  {getRecipientTypeLabel(selectedRequest.requestType)}
                </span>
              </div>
              <h4 className="font-medium text-blue-900">Request Details</h4>
              <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                <div>
                  <span className="text-blue-700">Requester:</span>
                  <span className="font-medium text-blue-900 ml-2">{selectedRequest.requestedByName || selectedRequest.requesterName}</span>
                </div>
                <div>
                  <span className="text-blue-700">Type:</span>
                  <span className="font-medium text-blue-900 ml-2">{getRecipientTypeLabel(selectedRequest.requestType)}</span>
                </div>
                <div>
                  <span className="text-blue-700">Priority:</span>
                  <span className="font-medium text-blue-900 ml-2">
                    {selectedRequest.priority || (selectedRequest.urgent ? 'urgent' : 'normal')}
                  </span>
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
                <h4 className="font-medium text-green-900 mb-3">Items to dispatch:</h4>
                <div className="space-y-2">
                  {Array.isArray(selectedRequest.items) ? (
                    selectedRequest.items.map((item, index) => (
                      <div key={index} className="bg-white rounded-lg p-3 border border-green-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{item.productName}</p>
                            <p className="text-sm text-gray-600">Quantity: {item.quantity} units</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">
                              LKR {((item.quantity || 0) * (item.unitPrice || 100)).toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-500">@ LKR {item.unitPrice || 100}/unit</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : selectedRequest.product ? (
                    <div className="bg-white rounded-lg p-3 border border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{selectedRequest.product}</p>
                          <p className="text-sm text-gray-600">Quantity: {selectedRequest.quantity} units</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">
                            LKR {((selectedRequest.quantity || 0) * 100).toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-500">@ LKR 100/unit</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    Object.entries(selectedRequest.items || {}).map(([id, item]) => (
                      <div key={id} className="bg-white rounded-lg p-3 border border-green-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{item.name}</p>
                            <p className="text-sm text-gray-600">Quantity: {item.qty} units</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">
                              LKR {((item.qty || 0) * 100).toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-500">@ LKR 100/unit</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
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
              <Send className="h-8 w-8 mr-3 text-blue-600" />
              External Dispatch Management
            </h1>
            <p className="text-gray-600">Manage dispatches to shops, distributors, and representatives</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={exportToExcel}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export Report</span>
            </button>
            <button
              onClick={() => navigate('/finished-goods/dispatch-tracking')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
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
              <p className="text-sm font-medium text-gray-600">Total Requests</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalRequests}</p>
            </div>
            <Package className="h-8 w-8 text-gray-600" />
          </div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">Pending Dispatch</p>
              <p className="text-2xl font-bold text-yellow-900">{stats.pendingRequests}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Sent</p>
              <p className="text-2xl font-bold text-green-900">{stats.sentRequests}</p>
            </div>
            <Send className="h-8 w-8 text-green-600" />
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
        {activeTab === 'approved_requests' && (
          <div>
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
                    value={filterRecipientType}
                    onChange={(e) => setFilterRecipientType(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Types</option>
                    <option value="direct_shop">Direct Shops</option>
                    <option value="distributor">Distributors</option>
                    <option value="direct_representative">Direct Representatives</option>
                    <option value="sales_request">Sales Requests</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="sent">Sent</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {filteredRequests.map((request) => {
                const RequestTypeIcon = getRecipientTypeIcon(request.requestType);
                
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
                              {request.requestedByName || request.requesterName}
                            </h4>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRecipientTypeColor(request.requestType)}`}>
                              {getRecipientTypeLabel(request.requestType)}
                            </span>
                            <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                              {getStatusIcon(request.status)}
                              <span className="ml-1">{request.status}</span>
                            </span>
                            {(request.priority === 'urgent' || request.urgent) && (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                URGENT
                              </span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3 text-sm text-gray-600">
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <div>
                                <span className="font-medium">Date:</span>
                                <span className="ml-1">
                                  {request.createdAt ? formatDate(request.createdAt) : 
                                   request.date ? new Date(request.date).toLocaleDateString() : 'N/A'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Package className="h-4 w-4 text-gray-400" />
                              <div>
                                <span className="font-medium">Items:</span>
                                <span className="ml-1">
                                  {Array.isArray(request.items) ? request.items.length :
                                   request.product ? 1 :
                                   Object.keys(request.items || {}).length}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="h-4 w-4 bg-green-600 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-bold">₨</span>
                              </div>
                              <div>
                                <span className="font-medium">Value:</span>
                                <span className="ml-1">LKR {calculateRequestValue(request.items).toLocaleString()}</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <div>
                                <span className="font-medium">Role:</span>
                                <span className="ml-1">{request.requestedByRole || request.requesterRole}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <h5 className="font-medium text-gray-700">Items:</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {Array.isArray(request.items) ? (
                                request.items.map((item, index) => (
                                  <div key={index} className="text-sm text-gray-600 bg-gray-50 rounded p-2">
                                    • {item.productName}: {item.quantity} units
                                  </div>
                                ))
                              ) : request.product ? (
                                <div className="text-sm text-gray-600 bg-gray-50 rounded p-2">
                                  • {request.product}: {request.quantity} units
                                </div>
                              ) : (
                                Object.entries(request.items || {}).map(([id, item]) => (
                                  <div key={id} className="text-sm text-gray-600 bg-gray-50 rounded p-2">
                                    • {item.name}: {item.qty} units
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                          
                          {request.notes && (
                            <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <p className="text-sm text-blue-800">
                                <span className="font-medium">Notes:</span> {request.notes}
                              </p>
                            </div>
                          )}

                          {request.sentAt && (
                            <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                              <p className="text-sm text-green-800">
                                <span className="font-medium">Sent:</span> {formatDate(request.sentAt)} by {request.sentByName}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        {request.status === 'sent' ? (
                          <span className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-lg">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Sent
                          </span>
                        ) : (
                          <button
                            onClick={() => handleDispatchRequest(request)}
                            disabled={dispatching === request.id}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <Send className="h-4 w-4" />
                            <span>{dispatching === request.id ? 'Dispatching...' : 'Dispatch'}</span>
                          </button>
                        )}
                        
                        <button
                          onClick={() => {
                            const details = `Request Details:\n\n` +
                              `ID: ${request.id}\n` +
                              `Requester: ${request.requestedByName || request.requesterName}\n` +
                              `Role: ${request.requestedByRole || request.requesterRole}\n` +
                              `Type: ${getRecipientTypeLabel(request.requestType)}\n` +
                              `Priority: ${request.priority || (request.urgent ? 'urgent' : 'normal')}\n` +
                              `Status: ${request.status}\n` +
                              `Date: ${request.createdAt ? formatDate(request.createdAt) : 
                                      request.date ? new Date(request.date).toLocaleDateString() : 'N/A'}\n` +
                              `${request.sentAt ? `Sent: ${formatDate(request.sentAt)} by ${request.sentByName}\n` : ''}` +
                              `\nItems:\n` +
                              (Array.isArray(request.items) ? 
                                request.items.map(item => `• ${item.productName}: ${item.quantity} units`).join('\n') :
                                request.product ? `• ${request.product}: ${request.quantity} units` :
                                Object.entries(request.items || {}).map(([id, item]) => `• ${item.name}: ${item.qty} units`).join('\n')
                              ) +
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
              })}
            </div>

            {filteredRequests.length === 0 && (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No requests found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {(searchTerm || filterRecipientType || filterStatus) ? 'Try adjusting your search criteria.' : 'No approved requests available for dispatch.'}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'dispatch_history' && (
          <div>
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search dispatch history..."
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
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {filteredDispatches.map((dispatch) => {
                const RecipientIcon = getRecipientTypeIcon(dispatch.recipientType);
                
                return (
                  <div key={dispatch.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="p-2 rounded-lg bg-blue-100">
                          <RecipientIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-medium text-gray-900">
                              {dispatch.recipientName}
                            </h4>
                            {dispatch.shopName && dispatch.shopName !== dispatch.recipientName && (
                              <span className="text-sm text-gray-500">({dispatch.shopName})</span>
                            )}
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRecipientTypeColor(dispatch.recipientType)}`}>
                              {getRecipientTypeLabel(dispatch.recipientType)}
                            </span>
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              {dispatch.status?.toUpperCase()}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3 text-sm text-gray-600">
                            <div className="flex items-center space-x-2">
                              <Package className="h-4 w-4 text-gray-400" />
                              <div>
                                <span className="font-medium">Release Code:</span>
                                <span className="ml-1 font-mono text-blue-600">{dispatch.releaseCode}</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <div>
                                <span className="font-medium">Dispatched:</span>
                                <span className="ml-1">{formatDate(dispatch.dispatchedAt)}</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              <div>
                                <span className="font-medium">Location:</span>
                                <span className="ml-1">{dispatch.recipientLocation}</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="h-4 w-4 bg-green-600 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-bold">₨</span>
                              </div>
                              <div>
                                <span className="font-medium">Value:</span>
                                <span className="ml-1">LKR {(dispatch.totalValue || 0).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <h5 className="font-medium text-gray-700">
                              Items ({dispatch.totalItems || 0}):
                            </h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                              {dispatch.items?.slice(0, 4).map((item, index) => (
                                <div key={index} className="text-sm text-gray-600 bg-gray-50 rounded p-2">
                                  • {item.productName}: {item.quantity} {item.unit}
                                  {item.variantName && <span> ({item.variantName})</span>}
                                  <div className="text-xs text-gray-500 mt-1">
                                    @ LKR {(item.unitPrice || 0).toFixed(2)} = LKR {(item.totalPrice || 0).toFixed(2)}
                                  </div>
                                </div>
                              ))}
                              {dispatch.items?.length > 4 && (
                                <div className="text-sm text-gray-500 text-center py-2">
                                  ... and {dispatch.items.length - 4} more items
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {dispatch.notes && (
                            <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <p className="text-sm text-blue-800">
                                <span className="font-medium">Notes:</span> {dispatch.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          const details = `Dispatch Details:\n\n` +
                            `Release Code: ${dispatch.releaseCode}\n` +
                            `Recipient: ${dispatch.recipientName}\n` +
                            `Type: ${getRecipientTypeLabel(dispatch.recipientType)}\n` +
                            `Location: ${dispatch.recipientLocation}\n` +
                            `Dispatched: ${formatDate(dispatch.dispatchedAt)}\n` +
                            `By: ${dispatch.dispatchedByName}\n` +
                            `Status: ${dispatch.status}\n` +
                            `Total Items: ${dispatch.totalItems || 0}\n` +
                            `Total Value: LKR ${(dispatch.totalValue || 0).toLocaleString()}\n\n` +
                            `Items:\n` +
                            (dispatch.items?.map(item => 
                              `• ${item.productName}: ${item.quantity} ${item.unit} @ LKR ${item.unitPrice || 0}`
                            ).join('\n') || 'No items');
                          alert(details);
                        }}
                        className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredDispatches.length === 0 && (
              <div className="text-center py-12">
                <Send className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No dispatch history found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {(searchTerm || filterRecipientType) ? 'Try adjusting your search criteria.' : 'No external dispatches have been made yet.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExternalDispatches;