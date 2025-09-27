import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, 
  Search, 
  Filter, 
  MapPin, 
  Calendar, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Eye,
  Edit,
  Send,
  RefreshCw,
  Star,
  Settings,
  Package2
} from 'lucide-react';
import { packingAreaStockService } from '../../services/packingAreaStockService';
import { productionService } from '../../services/productionService';
import { formatDate } from '../../utils/formatDate';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import LocationManagementModal from '../../components/PackingArea/LocationManagementModal';

const PackingAreaStockList = () => {
  const navigate = useNavigate();
  const [stock, setStock] = useState([]);
  const [pendingHandovers, setPendingHandovers] = useState([]);
  const [stockSummary, setStockSummary] = useState({});
  const [expiryAlerts, setExpiryAlerts] = useState([]);
  const [availableLocations, setAvailableLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedHandover, setSelectedHandover] = useState(null);
  const [receiptData, setReceiptData] = useState({
    location: 'PACK-A1',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [stockData, pendingData, summaryData, expiryData, locationsData] = await Promise.all([
        packingAreaStockService.getPackingStock(),
        packingAreaStockService.getPendingHandovers(),
        packingAreaStockService.getStockSummary(),
        packingAreaStockService.getExpiryAlerts(),
        loadLocations()
      ]);
      
      setStock(stockData);
      setPendingHandovers(pendingData);
      setStockSummary(summaryData);
      setExpiryAlerts(expiryData);
      setAvailableLocations(locationsData);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = async () => {
    try {
      const { getData } = await import('../../firebase/db');
      const locationsData = await getData('packingAreaLocations');
      if (locationsData) {
        const locationsList = Object.entries(locationsData)
          .map(([id, location]) => ({ id, ...location }))
          .filter(location => location.status === 'active');
        return locationsList;
      }
      return [];
    } catch (error) {
      console.error('Failed to load locations:', error);
      return [];
    }
  };

  const handleLocationUpdate = async () => {
    // Reload locations when they are updated
    const updatedLocations = await loadLocations();
    setAvailableLocations(updatedLocations);
  };

  const handleReceiveHandover = (handover) => {
    setSelectedHandover(handover);
    setReceiptData({
      location: availableLocations.length > 0 ? availableLocations[0].code : 'PACK-A1',
      notes: ''
    });
    setShowReceiveModal(true);
  };

  const confirmReceiveHandover = async () => {
    try {
      await packingAreaStockService.receiveProductBatch(selectedHandover.id, receiptData);
      setShowReceiveModal(false);
      setSelectedHandover(null);
      await loadData();
    } catch (error) {
      setError(error.message);
    }
  };

  const handleUpdateLocation = async (stockId, newLocation) => {
    try {
      await packingAreaStockService.updateStockLocation(stockId, newLocation);
      await loadData();
    } catch (error) {
      setError(error.message);
    }
  };

  const handleUpdateStatus = async (stockId, newStatus, notes = '') => {
    try {
      await packingAreaStockService.updateStockStatus(stockId, newStatus, notes);
      await loadData();
    } catch (error) {
      setError(error.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'in_use':
        return 'bg-blue-100 text-blue-800';
      case 'depleted':
        return 'bg-gray-100 text-gray-800';
      case 'on_hold':
        return 'bg-yellow-100 text-yellow-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  const getExpiryAlertColor = (alertLevel) => {
    switch (alertLevel) {
      case 'expired': return 'bg-red-100 text-red-800';
      case 'critical': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'caution': return 'bg-orange-100 text-orange-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  const filteredStock = stock.filter(item => {
    const matchesSearch = item.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.batchNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !filterStatus || item.status === filterStatus;
    const matchesLocation = !filterLocation || item.location === filterLocation;
    
    return matchesSearch && matchesStatus && matchesLocation;
  });

  const locations = [...new Set(stock.map(item => item.location))].filter(Boolean);

  if (loading) {
    return <LoadingSpinner text="Loading packing area stock..." />;
  }

  return (
    <div className="p-6">
      {/* Receive Handover Modal */}
      {showReceiveModal && selectedHandover && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Receive Product Batch
            </h3>
            
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="font-medium text-blue-900">{selectedHandover.productName}</h4>
              <p className="text-blue-700 text-sm">Batch: {selectedHandover.batchNumber}</p>
              <p className="text-blue-700 text-sm">Quantity: {selectedHandover.quantity} {selectedHandover.unit}</p>
              <p className="text-blue-700 text-sm">Quality: Grade {selectedHandover.qualityGrade}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Storage Location *
                </label>
                <select
                  value={receiptData.location}
                  onChange={(e) => setReceiptData(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {availableLocations.length > 0 ? (
                    availableLocations.map(location => (
                      <option key={location.id} value={location.code}>
                        {location.code} - {location.name}
                      </option>
                    ))
                  ) : (
                    <option value="PACK-A1">PACK-A1 - Default Location</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Receipt Notes
                </label>
                <textarea
                  rows={3}
                  value={receiptData.notes}
                  onChange={(e) => setReceiptData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add any notes about the received batch..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowReceiveModal(false);
                  setSelectedHandover(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmReceiveHandover}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                Receive Batch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Location Management Modal */}
      <LocationManagementModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onLocationUpdate={handleLocationUpdate}
      />

      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Package className="h-8 w-8 mr-3 text-blue-600" />
              Packing Area Stock
            </h1>
            <p className="text-gray-600">Manage product batches received from production</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowLocationModal(true)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Settings className="h-4 w-4" />
              <span>Manage Locations</span>
            </button>
            <button
              onClick={loadData}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>
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
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{stockSummary.totalItems || 0}</p>
            </div>
            <Package className="h-8 w-8 text-gray-600" />
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Available</p>
              <p className="text-2xl font-bold text-green-900">{stockSummary.availableItems || 0}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">In Use</p>
              <p className="text-2xl font-bold text-blue-900">{stockSummary.inUseItems || 0}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-orange-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Expiring Soon</p>
              <p className="text-2xl font-bold text-orange-900">{stockSummary.expiringItems || 0}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-600" />
          </div>
        </div>
        <div className="bg-purple-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Total Quantity</p>
              <p className="text-2xl font-bold text-purple-900">{stockSummary.totalQuantity || 0}</p>
            </div>
            <div className="h-8 w-8 bg-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">#</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Handovers */}
      {pendingHandovers.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Pending Handovers from Production</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {pendingHandovers.map((handover) => (
                <div key={handover.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{handover.productName}</h4>
                      <p className="text-sm text-gray-500">Batch: {handover.batchNumber}</p>
                      <p className="text-sm text-gray-500">
                        Quantity: {handover.quantity} {handover.unit}
                      </p>
                      <p className="text-sm text-gray-500">
                        Quality: <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getQualityGradeColor(handover.qualityGrade)}`}>
                          Grade {handover.qualityGrade}
                        </span>
                      </p>
                      <p className="text-sm text-gray-500">
                        Handed Over: {formatDate(handover.handoverDate)}
                      </p>
                      {handover.expiryDate && (
                        <p className="text-sm text-gray-500">
                          Expiry: {new Date(handover.expiryDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleReceiveHandover(handover)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Receive</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Expiry Alerts */}
      {expiryAlerts.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
              Expiry Alerts
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {expiryAlerts.slice(0, 3).map((item) => (
                <div key={item.id} className={`border rounded-lg p-3 ${
                  item.alertLevel === 'expired' || item.alertLevel === 'critical' ? 'border-red-300 bg-red-50' :
                  item.alertLevel === 'warning' ? 'border-yellow-300 bg-yellow-50' :
                  'border-orange-300 bg-orange-50'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{item.productName}</p>
                      <p className="text-sm text-gray-600">Batch: {item.batchNumber}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getExpiryAlertColor(item.alertLevel)}`}>
                        {item.daysToExpiry <= 0 ? 'Expired' : `${item.daysToExpiry} days left`}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {expiryAlerts.length > 3 && (
                <p className="text-sm text-gray-500 text-center">
                  ... and {expiryAlerts.length - 3} more items expiring soon
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stock Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search products or batches..."
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
                <option value="available">Available</option>
                <option value="in_use">In Use</option>
                <option value="depleted">Depleted</option>
                <option value="on_hold">On Hold</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-gray-400" />
              <select
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Locations</option>
                {availableLocations.map(location => (
                  <option key={location.id} value={location.code}>
                    {location.code} - {location.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product & Batch
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quality Grade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expiry Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Received Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStock.map((item) => {
                const expiryAlert = expiryAlerts.find(alert => alert.id === item.id);
                
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                        <div className="text-sm text-gray-500">Batch: {item.batchNumber}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{item.quantity} {item.unit}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getQualityGradeColor(item.qualityGrade)}`}>
                        <Star className="h-3 w-3 mr-1" />
                        Grade {item.qualityGrade}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="text-sm text-gray-900">{item.location}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                        {item.status?.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}
                      </div>
                      {expiryAlert && (
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${getExpiryAlertColor(expiryAlert.alertLevel)}`}>
                          {expiryAlert.daysToExpiry <= 0 ? 'Expired' : `${expiryAlert.daysToExpiry} days`}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(item.receivedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => navigate(`/packing-area/stock/${item.id}`)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            const locationCode = prompt('Enter new location code:', item.location);
                            if (locationCode && locationCode !== item.location) {
                              handleUpdateLocation(item.id, locationCode);
                            }
                          }}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded"
                          title="Update Location"
                        >
                          <MapPin className="h-4 w-4" />
                        </button>
                        {item.status === 'available' && (
                          <button
                            onClick={() => handleUpdateStatus(item.id, 'in_use', 'Moved to packing line')}
                            className="text-green-600 hover:text-green-900 p-1 rounded"
                            title="Mark as In Use"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => navigate('/packing-area/send-to-fg')}
                          className="text-purple-600 hover:text-purple-900 p-1 rounded"
                          title="Send to FG Store"
                        >
                          <Package className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => navigate('/packing-area/package-products')}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded"
                          title="Convert to Units"
                        >
                          <Package2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => navigate('/packing-area/dispatch-history')}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded"
                          title="View Dispatch History"
                        >
                          <Clock className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredStock.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No stock items found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {stock.length === 0 
                ? 'Stock items will appear here after receiving batches from production.'
                : 'Try adjusting your search criteria.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PackingAreaStockList;