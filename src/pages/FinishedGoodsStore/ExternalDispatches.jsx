import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Send, 
  Search, 
  Filter, 
  Eye, 
  Store, 
  User, 
  TruckIcon,
  Package,
  Calendar,
  MapPin,
  BarChart3,
  Download
} from 'lucide-react';
import { fgDispatchToExternalService } from '../../services/fgDispatchToExternalService';
import { fgDispatchService } from '../../services/fgDispatchService.js';
import { formatDate } from '../../utils/formatDate';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const ExternalDispatches = () => {
  const navigate = useNavigate();
  const [dispatches, setDispatches] = useState([]);
  const [recipientSummary, setRecipientSummary] = useState({
    direct_shop: [],
    distributor: [],
    direct_representative: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRecipientType, setFilterRecipientType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [activeTab, setActiveTab] = useState('dispatches');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dispatchData, directShopSummary, distributorSummary, drSummary] = await Promise.all([
        fgDispatchToExternalService.getExternalDispatches(),
        fgDispatchToExternalService.getRecipientSummary('direct_shop'),
        fgDispatchToExternalService.getRecipientSummary('distributor'),
        fgDispatchToExternalService.getRecipientSummary('direct_representative')
      ]);
      
      setDispatches(dispatchData);
      setRecipientSummary({
        direct_shop: directShopSummary,
        distributor: distributorSummary,
        direct_representative: drSummary
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewRecipientDetails = async (recipientId, recipientType) => {
    try {
      const analytics = await fgDispatchToExternalService.getRecipientDispatchAnalytics(recipientId, recipientType);
      
      // Show analytics in a modal or navigate to detailed view
      const details = `
Recipient Analytics for ${analytics.summary.recipientName}:

Total Dispatches: ${analytics.summary.totalDispatches || 0}
Total Items: ${analytics.summary.totalItemsReceived || 0}
Total Quantity: ${analytics.summary.totalQuantityReceived || 0}
Total Value: LKR ${(analytics.summary.totalValueReceived || 0).toLocaleString()}

Last Dispatch: ${analytics.summary.lastDispatchDate ? new Date(analytics.summary.lastDispatchDate).toLocaleDateString() : 'Never'}
Last Product: ${analytics.summary.lastProductDispatched || 'N/A'}
Last Release Code: ${analytics.summary.lastReleaseCode || 'N/A'}

Recent Dispatches: ${analytics.recentDispatches.length}
Top Products: ${analytics.topProducts.length}
      `;
      
      alert(details);
    } catch (error) {
      setError('Failed to load recipient details: ' + error.message);
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

  const filteredDispatches = dispatches.filter(dispatch => {
    const matchesSearch = dispatch.recipientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         dispatch.releaseCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         dispatch.items?.some(item => item.productName?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRecipientType = !filterRecipientType || dispatch.recipientType === filterRecipientType;
    const matchesStatus = !filterStatus || dispatch.status === filterStatus;
    
    return matchesSearch && matchesRecipientType && matchesStatus;
  });

  const calculateSummaryStats = () => {
    const totalDispatches = filteredDispatches.length;
    const totalValue = filteredDispatches.reduce((sum, dispatch) => sum + (dispatch.totalValue || 0), 0);
    const totalItems = filteredDispatches.reduce((sum, dispatch) => sum + (dispatch.totalItems || 0), 0);
    const uniqueRecipients = new Set(filteredDispatches.map(d => d.recipientId)).size;

    return { totalDispatches, totalValue, totalItems, uniqueRecipients };
  };

  const stats = calculateSummaryStats();

  const tabs = [
    { id: 'dispatches', label: 'Dispatch History', icon: Send, count: dispatches.length },
    { id: 'recipients', label: 'Recipient Summary', icon: BarChart3, count: Object.values(recipientSummary).flat().length }
  ];

  if (loading) {
    return <LoadingSpinner text="Loading external dispatches..." />;
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Send className="h-8 w-8 mr-3 text-blue-600" />
              External Dispatch Management
            </h1>
            <p className="text-gray-600">Track dispatches to shops, distributors, and representatives</p>
          </div>
          <button
            onClick={() => navigate('/finished-goods/inventory')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Package className="h-4 w-4" />
            <span>Back to Inventory</span>
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
              <p className="text-sm font-medium text-gray-600">Total Dispatches</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalDispatches}</p>
            </div>
            <Send className="h-8 w-8 text-gray-600" />
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Items</p>
              <p className="text-2xl font-bold text-blue-900">{stats.totalItems}</p>
            </div>
            <Package className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Total Value</p>
              <p className="text-2xl font-bold text-green-900">LKR {stats.totalValue.toLocaleString()}</p>
            </div>
            <div className="h-8 w-8 bg-green-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">₨</span>
            </div>
          </div>
        </div>
        <div className="bg-purple-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Recipients</p>
              <p className="text-2xl font-bold text-purple-900">{stats.uniqueRecipients}</p>
            </div>
            <User className="h-8 w-8 text-purple-600" />
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
        {activeTab === 'dispatches' && (
          <div>
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search dispatches..."
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
                    <option value="dispatched">Dispatched</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
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
                          
                          {dispatch.requestId && (
                            <div className="mt-2">
                              <span className="inline-flex px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                                Mobile App Request: {dispatch.requestId}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => navigate(`/finished-goods/external-dispatches/${dispatch.id}`)}
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
                <h3 className="mt-2 text-sm font-medium text-gray-900">No dispatches found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {(searchTerm || filterRecipientType || filterStatus) ? 'Try adjusting your search criteria.' : 'No external dispatches have been made yet.'}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'recipients' && (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Recipient Summary</h2>
            
            <div className="space-y-6">
              {Object.entries(recipientSummary).map(([type, recipients]) => {
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
                                <button
                                  onClick={() => handleViewRecipientDetails(recipient.recipientId, type)}
                                  className="mt-2 text-blue-600 hover:text-blue-800 text-xs underline"
                                >
                                  View Analytics
                                </button>
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
      </div>
    </div>
  );
};

export default ExternalDispatches;