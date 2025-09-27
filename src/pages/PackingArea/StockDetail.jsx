import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Package, 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Star, 
  Clock,
  Send,
  Edit,
  AlertTriangle,
  CheckCircle,
  Factory,
  Package2
} from 'lucide-react';
import { packingAreaStockService } from '../../services/packingAreaStockService';
import { formatDate } from '../../utils/formatDate';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const PackingAreaStockDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [stockItem, setStockItem] = useState(null);
  const [stockMovements, setStockMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueData, setIssueData] = useState({
    quantity: '',
    packingLine: 'line1',
    reason: '',
    issuedTo: 'Packing Operations'
  });

  useEffect(() => {
    if (id) {
      loadStockData();
    }
  }, [id]);

  const loadStockData = async () => {
    try {
      setLoading(true);
      const [stock, movements] = await Promise.all([
        packingAreaStockService.getPackingStock(),
        packingAreaStockService.getStockMovements({ stockId: id })
      ]);
      
      const stockData = stock.find(item => item.id === id);
      if (!stockData) {
        setError('Stock item not found');
        return;
      }
      
      setStockItem(stockData);
      setStockMovements(movements);
      
      // Set default issue quantity to current stock
      setIssueData(prev => ({
        ...prev,
        quantity: stockData.quantity?.toString() || ''
      }));
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleIssueStock = async () => {
    try {
      await packingAreaStockService.issueStockForPacking(id, {
        ...issueData,
        quantity: parseInt(issueData.quantity)
      });
      
      setShowIssueModal(false);
      await loadStockData();
    } catch (error) {
      setError(error.message);
    }
  };

  const handleUpdateLocation = async (newLocation) => {
    try {
      await packingAreaStockService.updateStockLocation(id, newLocation);
      await loadStockData();
    } catch (error) {
      setError(error.message);
    }
  };

  const handleUpdateStatus = async (newStatus, notes = '') => {
    try {
      await packingAreaStockService.updateStockStatus(id, newStatus, notes);
      await loadStockData();
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

  const getMovementTypeColor = (type) => {
    switch (type) {
      case 'in': return 'bg-green-100 text-green-800';
      case 'out': return 'bg-red-100 text-red-800';
      case 'location_change': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getExpiryStatus = () => {
    if (!stockItem?.expiryDate) return null;
    
    const daysToExpiry = Math.ceil((new Date(stockItem.expiryDate) - new Date()) / (24 * 60 * 60 * 1000));
    
    if (daysToExpiry <= 0) return { status: 'Expired', color: 'text-red-600', bgColor: 'bg-red-50' };
    if (daysToExpiry <= 7) return { status: 'Critical', color: 'text-red-600', bgColor: 'bg-red-50' };
    if (daysToExpiry <= 14) return { status: 'Warning', color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
    if (daysToExpiry <= 30) return { status: 'Caution', color: 'text-orange-600', bgColor: 'bg-orange-50' };
    return { status: 'Good', color: 'text-green-600', bgColor: 'bg-green-50' };
  };

  const expiryStatus = getExpiryStatus();

  if (loading) {
    return <LoadingSpinner text="Loading stock details..." />;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Error loading stock item</h3>
          <p className="text-red-500 mt-2">{error}</p>
          <button
            onClick={() => navigate('/packing-area/stock')}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Back to Stock List
          </button>
        </div>
      </div>
    );
  }

  if (!stockItem) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Stock item not found</h3>
          <button
            onClick={() => navigate('/packing-area/stock')}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Back to Stock List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Issue Stock Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Issue Stock for Packing
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity to Issue *
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    min="1"
                    max={stockItem.quantity}
                    value={issueData.quantity}
                    onChange={(e) => setIssueData(prev => ({ ...prev, quantity: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter quantity"
                  />
                  <span className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-600">
                    {stockItem.unit}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Available: {stockItem.quantity} {stockItem.unit}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Packing Line
                </label>
                <select
                  value={issueData.packingLine}
                  onChange={(e) => setIssueData(prev => ({ ...prev, packingLine: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="line1">Packing Line 1</option>
                  <option value="line2">Packing Line 2</option>
                  <option value="line3">Packing Line 3</option>
                  <option value="line4">Packing Line 4</option>
                  <option value="general">General Packing Area</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Issued To
                </label>
                <input
                  type="text"
                  value={issueData.issuedTo}
                  onChange={(e) => setIssueData(prev => ({ ...prev, issuedTo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Department or person"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Issue *
                </label>
                <textarea
                  rows={3}
                  value={issueData.reason}
                  onChange={(e) => setIssueData(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Explain why this stock is being issued..."
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowIssueModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleIssueStock}
                disabled={!issueData.quantity || !issueData.reason}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Issue Stock
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/packing-area/stock')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Package className="h-8 w-8 mr-3 text-blue-600" />
                Stock Details
              </h1>
              <p className="text-gray-600 mt-2">{stockItem.productName} - {stockItem.batchNumber}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {stockItem.status === 'available' && stockItem.quantity > 0 && (
              <button
                onClick={() => setShowIssueModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <Send className="h-4 w-4" />
                <span>Issue for Packing</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stock Information */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Stock Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Product Name</p>
                  <p className="font-medium text-gray-900">{stockItem.productName}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Factory className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Batch Number</p>
                  <p className="font-medium text-gray-900">{stockItem.batchNumber}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Package className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Current Quantity</p>
                  <p className="font-medium text-gray-900">{stockItem.quantity} {stockItem.unit}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Star className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Quality Grade</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getQualityGradeColor(stockItem.qualityGrade)}`}>
                    Grade {stockItem.qualityGrade}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <MapPin className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-medium text-gray-900">{stockItem.location}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Clock className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(stockItem.status)}`}>
                    {stockItem.status?.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Received Date</p>
                  <p className="font-medium text-gray-900">{formatDate(stockItem.receivedAt)}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Expiry Date</p>
                  <p className="font-medium text-gray-900">
                    {stockItem.expiryDate ? new Date(stockItem.expiryDate).toLocaleDateString() : 'N/A'}
                  </p>
                  {expiryStatus && (
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${
                      expiryStatus.status === 'Expired' || expiryStatus.status === 'Critical' ? 'bg-red-100 text-red-800' :
                      expiryStatus.status === 'Warning' ? 'bg-yellow-100 text-yellow-800' :
                      expiryStatus.status === 'Caution' ? 'bg-orange-100 text-orange-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {expiryStatus.status}
                    </span>
                  )}
                  
                  <button
                    onClick={() => navigate('/packing-area/package-products')}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg flex items-center space-x-2 transition-colors"
                  >
                    <Package2 className="h-4 w-4" />
                    <span>Package to Units</span>
                  </button>
                </div>
              </div>
            </div>

            {stockItem.storageInstructions && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Storage Instructions</h4>
                <p className="text-gray-700">{stockItem.storageInstructions}</p>
              </div>
            )}
          </div>

          {/* Stock Movements */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock Movement History</h3>
            
            {stockMovements.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No movements recorded yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reason
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        By
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stockMovements.map((movement) => (
                      <tr key={movement.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(movement.createdAt)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getMovementTypeColor(movement.type)}`}>
                            {movement.type === 'in' ? 'Stock In' : 
                             movement.type === 'out' ? 'Stock Out' : 
                             'Location Change'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {movement.type === 'location_change' ? 'N/A' : 
                           `${movement.type === 'in' ? '+' : '-'}${movement.quantity} ${stockItem.unit}`}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {movement.reason}
                          {movement.packingLine && (
                            <div className="text-xs text-gray-500">Line: {movement.packingLine}</div>
                          )}
                          {movement.location && movement.type === 'location_change' && (
                            <div className="text-xs text-gray-500">New location: {movement.location}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {movement.createdByName}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              {stockItem.status === 'available' && stockItem.quantity > 0 && (
                <button
                  onClick={() => setShowIssueModal(true)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg flex items-center space-x-2 transition-colors"
                >
                  <Send className="h-4 w-4" />
                  <span>Issue for Packing</span>
                </button>
              )}
              
              <button
                onClick={() => {
                  const newLocation = prompt('Enter new location:', stockItem.location);
                  if (newLocation && newLocation !== stockItem.location) {
                    handleUpdateLocation(newLocation);
                  }
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <MapPin className="h-4 w-4" />
                <span>Update Location</span>
              </button>
              
              {stockItem.status === 'available' && (
                <button
                  onClick={() => handleUpdateStatus('on_hold', 'Put on hold for quality review')}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-lg flex items-center space-x-2 transition-colors"
                >
                  <Clock className="h-4 w-4" />
                  <span>Put on Hold</span>
                </button>
              )}
              
              {stockItem.status === 'on_hold' && (
                <button
                  onClick={() => handleUpdateStatus('available', 'Released from hold')}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg flex items-center space-x-2 transition-colors"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Release from Hold</span>
                </button>
              )}
            </div>
          </div>

          {/* Expiry Information */}
          {stockItem.expiryDate && (
            <div className={`rounded-lg shadow-sm border border-gray-200 p-6 ${expiryStatus?.bgColor || 'bg-white'}`}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Expiry Information
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Expiry Date:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(stockItem.expiryDate).toLocaleDateString()}
                  </span>
                </div>
                
                {expiryStatus && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Days Remaining:</span>
                      <span className={`font-medium ${expiryStatus.color}`}>
                        {Math.ceil((new Date(stockItem.expiryDate) - new Date()) / (24 * 60 * 60 * 1000))} days
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`font-medium ${expiryStatus.color}`}>
                        {expiryStatus.status}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {expiryStatus && (expiryStatus.status === 'Expired' || expiryStatus.status === 'Critical') && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                    <p className="text-red-800 text-sm font-medium">
                      {expiryStatus.status === 'Expired' ? 'This batch has expired!' : 'This batch expires very soon!'}
                    </p>
                  </div>
                  <p className="text-red-700 text-sm mt-1">
                    Consider prioritizing this batch for immediate use or disposal.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Batch Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Batch Information</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Received From:</span>
                <span className="font-medium text-gray-900 capitalize">{stockItem.receivedFrom}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Received By:</span>
                <span className="font-medium text-gray-900">{stockItem.receivedByName}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Handover ID:</span>
                <span className="font-medium text-gray-900">{stockItem.handoverId}</span>
              </div>
              
              {stockItem.statusNotes && (
                <div className="pt-3 border-t border-gray-200">
                  <span className="text-gray-600">Status Notes:</span>
                  <p className="text-gray-900 mt-1">{stockItem.statusNotes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackingAreaStockDetail;