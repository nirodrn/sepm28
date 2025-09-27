import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, 
  CheckCircle, 
  Clock, 
  Eye, 
  MapPin, 
  Calendar, 
  Star, 
  RefreshCw,
  Layers,
  Box,
  AlertTriangle
} from 'lucide-react';
import { fgStoreService } from '../../services/fgStoreService';
import { formatDate } from '../../utils/formatDate';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const ClaimDispatches = () => {
  const navigate = useNavigate();
  const [pendingDispatches, setPendingDispatches] = useState([]);
  const [claimedDispatches, setClaimedDispatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedDispatch, setSelectedDispatch] = useState(null);
  const [claimData, setClaimData] = useState({
    location: 'FG-A1',
    notes: ''
  });

  useEffect(() => {
    loadDispatches();
  }, []);

  const loadDispatches = async () => {
    try {
      setLoading(true);
      const [pending, claimed] = await Promise.all([
        fgStoreService.getPendingDispatches(),
        fgStoreService.getClaimedDispatches()
      ]);
      
      setPendingDispatches(pending);
      setClaimedDispatches(claimed);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimDispatch = (dispatch) => {
    setSelectedDispatch(dispatch);
    setClaimData({
      location: 'FG-A1',
      notes: ''
    });
    setShowClaimModal(true);
  };

  const confirmClaim = async () => {
    try {
      setClaiming(true);
      setError('');
      
      if (selectedDispatch.type === 'bulk') {
        await fgStoreService.claimBulkDispatch(selectedDispatch.id, claimData);
      } else {
        await fgStoreService.claimUnitDispatch(selectedDispatch.id, claimData);
      }
      
      setShowClaimModal(false);
      setSelectedDispatch(null);
      await loadDispatches();
    } catch (error) {
      setError(error.message);
    } finally {
      setClaiming(false);
    }
  };

  const getQualityGradeColor = (grade) => {
    switch (grade) {
      case 'A': return 'bg-green-100 text-green-800';
      case 'B': return 'bg-blue-100 text-blue-800';
      case 'C': return 'bg-yellow-100 text-yellow-800';
      case 'D': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type) => {
    return type === 'bulk' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
  };

  const getTypeIcon = (type) => {
    return type === 'bulk' ? <Layers className="h-4 w-4" /> : <Box className="h-4 w-4" />;
  };

  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return null;
    
    const daysToExpiry = Math.ceil((new Date(expiryDate) - new Date()) / (24 * 60 * 60 * 1000));
    
    if (daysToExpiry <= 0) return { status: 'Expired', color: 'text-red-600' };
    if (daysToExpiry <= 7) return { status: 'Critical', color: 'text-red-600' };
    if (daysToExpiry <= 14) return { status: 'Warning', color: 'text-yellow-600' };
    if (daysToExpiry <= 30) return { status: 'Caution', color: 'text-orange-600' };
    return { status: 'Good', color: 'text-green-600' };
  };

  const renderDispatchItems = (dispatch) => {
    if (!dispatch.items || dispatch.items.length === 0) {
      return <p className="text-sm text-gray-500">No items in this dispatch</p>;
    }

    return dispatch.items.map((item, index) => {
      const expiryStatus = getExpiryStatus(item.expiryDate);
      
      return (
        <div key={index} className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">{item.productName}</p>
              {dispatch.type === 'units' && item.variantName && (
                <p className="text-sm text-gray-600">Variant: {item.variantName}</p>
              )}
              <p className="text-sm text-gray-600">
                Batch: {item.batchNumber} • 
                {dispatch.type === 'bulk' ? (
                  <span> Quantity: {item.quantity} {item.unit}</span>
                ) : (
                  <span> Units: {item.unitsToExport} ({item.variantSize} {item.variantUnit} each)</span>
                )}
              </p>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getQualityGradeColor(item.qualityGrade)}`}>
                  <Star className="h-3 w-3 mr-1" />
                  Grade {item.qualityGrade}
                </span>
                {item.expiryDate && (
                  <span className="text-xs text-gray-500">
                    Expiry: {new Date(item.expiryDate).toLocaleDateString()}
                    {expiryStatus && (
                      <span className={`ml-1 font-medium ${expiryStatus.color}`}>
                        ({expiryStatus.status})
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    });
  };

  const tabs = [
    { 
      id: 'pending', 
      label: 'Pending Claims', 
      count: pendingDispatches.length, 
      icon: Clock 
    },
    { 
      id: 'claimed', 
      label: 'Claimed', 
      count: claimedDispatches.length, 
      icon: CheckCircle 
    }
  ];

  if (loading) {
    return <LoadingSpinner text="Loading dispatches..." />;
  }

  return (
    <div className="p-6">
      {/* Claim Modal */}
      {showClaimModal && selectedDispatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Claim Dispatch - {selectedDispatch.releaseCode}
            </h3>
            
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                {getTypeIcon(selectedDispatch.type)}
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(selectedDispatch.type)}`}>
                  {selectedDispatch.type === 'bulk' ? 'Bulk Products' : 'Packaged Units'}
                </span>
              </div>
              <h4 className="font-medium text-blue-900">Dispatch Details</h4>
              <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                <div>
                  <span className="text-blue-700">Release Code:</span>
                  <span className="font-medium text-blue-900 ml-2">{selectedDispatch.releaseCode}</span>
                </div>
                <div>
                  <span className="text-blue-700">Type:</span>
                  <span className="font-medium text-blue-900 ml-2">
                    {selectedDispatch.type === 'bulk' ? 'Bulk Materials' : 'Packaged Units'}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700">Total Items:</span>
                  <span className="font-medium text-blue-900 ml-2">
                    {selectedDispatch.type === 'bulk' ? selectedDispatch.totalItems : selectedDispatch.totalVariants}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700">Total Quantity:</span>
                  <span className="font-medium text-blue-900 ml-2">
                    {selectedDispatch.type === 'bulk' ? 
                      selectedDispatch.totalQuantity : 
                      `${selectedDispatch.totalUnits} units`
                    }
                  </span>
                </div>
                <div>
                  <span className="text-blue-700">Dispatched:</span>
                  <span className="font-medium text-blue-900 ml-2">{formatDate(selectedDispatch.dispatchedAt)}</span>
                </div>
                <div>
                  <span className="text-blue-700">By:</span>
                  <span className="font-medium text-blue-900 ml-2">{selectedDispatch.dispatchedByName}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Storage Location *
                </label>
                <select
                  value={claimData.location}
                  onChange={(e) => setClaimData(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="FG-A1">FG-A1 - Main Storage Area</option>
                  <option value="FG-A2">FG-A2 - Secondary Storage</option>
                  <option value="FG-B1">FG-B1 - Cold Storage</option>
                  <option value="FG-B2">FG-B2 - Dry Storage</option>
                  <option value="FG-C1">FG-C1 - Quarantine Area</option>
                  <option value="FG-C2">FG-C2 - Expedite Area</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Claim Notes
                </label>
                <textarea
                  rows={3}
                  value={claimData.notes}
                  onChange={(e) => setClaimData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Add any notes about the received items..."
                />
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-3">Items to be claimed:</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {renderDispatchItems(selectedDispatch)}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowClaimModal(false);
                  setSelectedDispatch(null);
                  setError('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmClaim}
                disabled={claiming}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {claiming ? 'Claiming...' : 'Claim Dispatch'}
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
              Claim Dispatches
            </h1>
            <p className="text-gray-600">Claim products dispatched from Packing Area</p>
          </div>
          <button
            onClick={loadDispatches}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
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
              <p className="text-sm font-medium text-gray-600">Pending Claims</p>
              <p className="text-2xl font-bold text-gray-900">{pendingDispatches.length}</p>
            </div>
            <Clock className="h-8 w-8 text-gray-600" />
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Claimed Today</p>
              <p className="text-2xl font-bold text-green-900">
                {claimedDispatches.filter(d => 
                  new Date(d.claimedAt).toDateString() === new Date().toDateString()
                ).length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Bulk Dispatches</p>
              <p className="text-2xl font-bold text-blue-900">
                {pendingDispatches.filter(d => d.type === 'bulk').length}
              </p>
            </div>
            <Layers className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-purple-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Unit Dispatches</p>
              <p className="text-2xl font-bold text-purple-900">
                {pendingDispatches.filter(d => d.type === 'units').length}
              </p>
            </div>
            <Box className="h-8 w-8 text-purple-600" />
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
        {activeTab === 'pending' && (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Dispatches</h2>
            {pendingDispatches.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No pending dispatches</p>
                <p className="text-xs text-gray-400">Dispatches from Packing Area will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingDispatches.map((dispatch) => (
                  <div key={`${dispatch.type}-${dispatch.id}`} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-medium text-gray-900">
                            Release Code: {dispatch.releaseCode}
                          </h4>
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(dispatch.type)}`}>
                            {getTypeIcon(dispatch.type)}
                            <span className="ml-1">{dispatch.type === 'bulk' ? 'Bulk' : 'Units'}</span>
                          </span>
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending Claim
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Dispatched By:</span>
                            <span className="ml-1">{dispatch.dispatchedByName}</span>
                          </div>
                          <div>
                            <span className="font-medium">Date:</span>
                            <span className="ml-1">{formatDate(dispatch.dispatchedAt)}</span>
                          </div>
                          <div>
                            <span className="font-medium">Items:</span>
                            <span className="ml-1">
                              {dispatch.type === 'bulk' ? 
                                `${dispatch.totalItems} items` : 
                                `${dispatch.totalVariants} variants`
                              }
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">Quantity:</span>
                            <span className="ml-1">
                              {dispatch.type === 'bulk' ? 
                                dispatch.totalQuantity : 
                                `${dispatch.totalUnits} units`
                              }
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h5 className="font-medium text-gray-700">Items:</h5>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {renderDispatchItems(dispatch)}
                          </div>
                        </div>
                        
                        {dispatch.notes && (
                          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-2">
                            <p className="text-sm text-blue-800">
                              <span className="font-medium">Dispatch Notes:</span> {dispatch.notes}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={() => handleClaimDispatch(dispatch)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Claim</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'claimed' && (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Claimed Dispatches</h2>
            {claimedDispatches.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No claimed dispatches</p>
                <p className="text-xs text-gray-400">Claimed dispatches will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {claimedDispatches.map((dispatch) => (
                  <div key={`${dispatch.type}-${dispatch.id}`} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-medium text-gray-900">
                            Release Code: {dispatch.releaseCode}
                          </h4>
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(dispatch.type)}`}>
                            {getTypeIcon(dispatch.type)}
                            <span className="ml-1">{dispatch.type === 'bulk' ? 'Bulk' : 'Units'}</span>
                          </span>
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Claimed
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Dispatched:</span>
                            <span className="ml-1">{formatDate(dispatch.dispatchedAt)}</span>
                          </div>
                          <div>
                            <span className="font-medium">Claimed:</span>
                            <span className="ml-1">{formatDate(dispatch.claimedAt)}</span>
                          </div>
                          <div>
                            <span className="font-medium">Claimed By:</span>
                            <span className="ml-1">{dispatch.claimedByName}</span>
                          </div>
                          <div>
                            <span className="font-medium">Location:</span>
                            <span className="ml-1">{dispatch.storageLocation || 'Not specified'}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h5 className="font-medium text-gray-700">Items:</h5>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {renderDispatchItems(dispatch)}
                          </div>
                        </div>
                        
                        {dispatch.claimNotes && (
                          <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-2">
                            <p className="text-sm text-green-800">
                              <span className="font-medium">Claim Notes:</span> {dispatch.claimNotes}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => navigate('/finished-goods/inventory')}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="View in Inventory"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClaimDispatches;