import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, 
  Search, 
  Filter, 
  Eye, 
  MapPin, 
  Calendar, 
  Star, 
  RefreshCw,
  Layers,
  Box,
  AlertTriangle,
  CheckCircle,
  Move,
  Split,
  Plus,
  Trash2,
  Save,
  X
} from 'lucide-react';
import { fgStoreService } from '../../services/fgStoreService';
import { getData, setData, updateData, removeData, pushData } from '../../firebase/db';
import { auth } from '../../firebase/auth';
import { formatDate } from '../../utils/formatDate';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const FGInventory = () => {
  const navigate = useNavigate();
  const [bulkInventory, setBulkInventory] = useState([]);
  const [packagedInventory, setPackagedInventory] = useState([]);
  const [combinedInventory, setCombinedInventory] = useState([]);
  const [availableLocations, setAvailableLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'bulk', 'units'
  
  // Location management state
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [moveData, setMoveData] = useState({
    newLocation: '',
    notes: ''
  });
  const [splitData, setSplitData] = useState({
    splits: [{ location: '', quantity: '', notes: '' }]
  });

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const [bulkData, packagedData, locationsData] = await Promise.all([
        fgStoreService.getInventory(),
        fgStoreService.getPackagedInventory(),
        loadLocations()
      ]);
      
      setBulkInventory(bulkData);
      setPackagedInventory(packagedData);
      setAvailableLocations(locationsData);
      
      // Combine inventories for unified view
      const combined = [
        ...bulkData.map(item => ({ ...item, type: 'bulk' })),
        ...packagedData.map(item => ({ ...item, type: 'units' }))
      ].sort((a, b) => b.createdAt - a.createdAt);
      
      setCombinedInventory(combined);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = async () => {
    try {
      const locationsData = await getData('fgStorageLocations');
      if (locationsData) {
        const locationsList = Object.entries(locationsData)
          .map(([id, location]) => ({ id, ...location }))
          .filter(location => location.status === 'active');
        return locationsList;
      }
      return [
        { id: 'default1', code: 'FG-A1', name: 'Main Storage Area' },
        { id: 'default2', code: 'FG-A2', name: 'Secondary Storage' },
        { id: 'default3', code: 'FG-B1', name: 'Cold Storage' },
        { id: 'default4', code: 'FG-B2', name: 'Dry Storage' }
      ];
    } catch (error) {
      console.error('Failed to load locations:', error);
      return [
        { id: 'default1', code: 'FG-A1', name: 'Main Storage Area' },
        { id: 'default2', code: 'FG-A2', name: 'Secondary Storage' }
      ];
    }
  };

  // Product Location Management Functions
  const handleMoveProduct = (product) => {
    setSelectedProduct(product);
    setMoveData({
      newLocation: '',
      notes: ''
    });
    setShowMoveModal(true);
  };

  const handleSplitProduct = (product) => {
    setSelectedProduct(product);
    setSplitData({
      splits: [
        { 
          location: product.location, 
          quantity: product.type === 'bulk' ? product.quantity : product.unitsInStock, 
          notes: 'Original location' 
        },
        { location: '', quantity: '', notes: '' }
      ]
    });
    setShowSplitModal(true);
  };

  const confirmMove = async () => {
    try {
      const currentUser = auth.currentUser;
      
      if (selectedProduct.type === 'bulk') {
        await updateData(`finishedGoodsInventory/${selectedProduct.id}`, {
          location: moveData.newLocation,
          locationUpdatedAt: Date.now(),
          locationUpdatedBy: currentUser?.uid,
          updatedAt: Date.now()
        });
      } else {
        await updateData(`finishedGoodsPackagedInventory/${selectedProduct.id}`, {
          location: moveData.newLocation,
          locationUpdatedAt: Date.now(),
          locationUpdatedBy: currentUser?.uid,
          updatedAt: Date.now()
        });
      }

      // Record movement
      await fgStoreService.recordInventoryMovement({
        productId: selectedProduct.productId,
        batchNumber: selectedProduct.batchNumber,
        type: 'location_change',
        quantity: 0,
        reason: `Moved to ${moveData.newLocation}. ${moveData.notes}`,
        location: moveData.newLocation,
        previousLocation: selectedProduct.location
      });

      setShowMoveModal(false);
      setSelectedProduct(null);
      await loadInventory();
      setSuccess('Product moved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.message);
    }
  };

  const addSplitLocation = () => {
    setSplitData(prev => ({
      ...prev,
      splits: [...prev.splits, { location: '', quantity: '', notes: '' }]
    }));
  };

  const removeSplitLocation = (index) => {
    if (splitData.splits.length > 2) {
      setSplitData(prev => ({
        ...prev,
        splits: prev.splits.filter((_, i) => i !== index)
      }));
    }
  };

  const updateSplitLocation = (index, field, value) => {
    setSplitData(prev => ({
      ...prev,
      splits: prev.splits.map((split, i) => 
        i === index ? { ...split, [field]: value } : split
      )
    }));
  };

  const confirmSplit = async () => {
    try {
      const currentUser = auth.currentUser;
      const totalSplitQuantity = splitData.splits.reduce((sum, split) => sum + (parseFloat(split.quantity) || 0), 0);
      const originalQuantity = selectedProduct.type === 'bulk' ? selectedProduct.quantity : selectedProduct.unitsInStock;
      
      if (Math.abs(totalSplitQuantity - originalQuantity) > 0.01) {
        setError('Total split quantities must equal the original quantity');
        return;
      }

      // Remove original entry
      if (selectedProduct.type === 'bulk') {
        await removeData(`finishedGoodsInventory/${selectedProduct.id}`);
      } else {
        await removeData(`finishedGoodsPackagedInventory/${selectedProduct.id}`);
      }

      // Create new entries for each split
      for (let i = 0; i < splitData.splits.length; i++) {
        const split = splitData.splits[i];
        if (parseFloat(split.quantity) > 0) {
          const splitEntry = {
            ...selectedProduct,
            location: split.location,
            [selectedProduct.type === 'bulk' ? 'quantity' : 'unitsInStock']: parseFloat(split.quantity),
            splitFrom: selectedProduct.id,
            splitIndex: i + 1,
            splitNotes: split.notes,
            createdAt: Date.now(),
            createdBy: currentUser?.uid
          };
          
          delete splitEntry.id; // Remove old ID
          
          if (selectedProduct.type === 'bulk') {
            await pushData('finishedGoodsInventory', splitEntry);
          } else {
            await pushData('finishedGoodsPackagedInventory', splitEntry);
          }

          // Record movement
          await fgStoreService.recordInventoryMovement({
            productId: selectedProduct.productId,
            batchNumber: selectedProduct.batchNumber,
            type: 'split',
            quantity: parseFloat(split.quantity),
            reason: `Split ${i + 1}/${splitData.splits.length} to ${split.location}. ${split.notes}`,
            location: split.location,
            originalLocation: selectedProduct.location
          });
        }
      }

      setShowSplitModal(false);
      setSelectedProduct(null);
      await loadInventory();
      setSuccess('Product split successfully across locations');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.message);
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

  const filteredInventory = combinedInventory.filter(item => {
    const matchesSearch = item.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.batchNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.releaseCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.variantName && item.variantName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesLocation = !filterLocation || item.location === filterLocation;
    const matchesGrade = !filterGrade || item.qualityGrade === filterGrade;
    const matchesType = filterType === 'all' || item.type === filterType;
    
    return matchesSearch && matchesLocation && matchesGrade && matchesType;
  });

  const locations = [...new Set(combinedInventory.map(item => item.location))].filter(Boolean);

  const getInventorySummary = () => {
    const total = filteredInventory.length;
    const bulk = filteredInventory.filter(item => item.type === 'bulk').length;
    const units = filteredInventory.filter(item => item.type === 'units').length;
    const totalBulkQuantity = filteredInventory
      .filter(item => item.type === 'bulk')
      .reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalUnits = filteredInventory
      .filter(item => item.type === 'units')
      .reduce((sum, item) => sum + (item.unitsInStock || 0), 0);

    return { total, bulk, units, totalBulkQuantity, totalUnits };
  };

  const summary = getInventorySummary();

  if (loading) {
    return <LoadingSpinner text="Loading FG inventory..." />;
  }

  return (
    <div className="p-6">
      {/* Move Product Modal */}
      {showMoveModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Move Product to New Location
            </h3>
            
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1">
                {getTypeIcon(selectedProduct.type)}
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(selectedProduct.type)}`}>
                  {selectedProduct.type === 'bulk' ? 'Bulk' : 'Units'}
                </span>
                {selectedProduct.splitFrom && (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                    <Split className="h-3 w-3 mr-1" />
                    Split {selectedProduct.splitIndex}
                  </span>
                )}
              </div>
              <h4 className="font-medium text-blue-900">{selectedProduct.productName}</h4>
              {selectedProduct.variantName && (
                <p className="text-blue-700 text-sm">Variant: {selectedProduct.variantName}</p>
              )}
              <p className="text-blue-700 text-sm">Batch: {selectedProduct.batchNumber}</p>
              <p className="text-blue-700 text-sm">
                Current Location: {selectedProduct.location}
              </p>
              <p className="text-blue-700 text-sm">
                Quantity: {selectedProduct.type === 'bulk' ? 
                  `${selectedProduct.quantity} ${selectedProduct.unit}` :
                  `${selectedProduct.unitsInStock} units`
                }
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Location *
                </label>
                <select
                  value={moveData.newLocation}
                  onChange={(e) => setMoveData(prev => ({ ...prev, newLocation: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select new location</option>
                  {availableLocations
                    .filter(loc => loc.code !== selectedProduct.location)
                    .map(location => (
                      <option key={location.id} value={location.code}>
                        {location.code} - {location.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Move Notes
                </label>
                <textarea
                  rows={3}
                  value={moveData.notes}
                  onChange={(e) => setMoveData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Reason for move..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowMoveModal(false);
                  setSelectedProduct(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmMove}
                disabled={!moveData.newLocation}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Move Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Split Product Modal */}
      {showSplitModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Split Product Across Locations
            </h3>
            
            <div className="mb-4 bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1">
                {getTypeIcon(selectedProduct.type)}
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(selectedProduct.type)}`}>
                  {selectedProduct.type === 'bulk' ? 'Bulk' : 'Units'}
                </span>
                {selectedProduct.splitFrom && (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                    <Split className="h-3 w-3 mr-1" />
                    Split {selectedProduct.splitIndex}
                  </span>
                )}
              </div>
              <h4 className="font-medium text-orange-900">{selectedProduct.productName}</h4>
              {selectedProduct.variantName && (
                <p className="text-orange-700 text-sm">Variant: {selectedProduct.variantName}</p>
              )}
              <p className="text-orange-700 text-sm">Batch: {selectedProduct.batchNumber}</p>
              <p className="text-orange-700 text-sm">
                Total to Split: {selectedProduct.type === 'bulk' ? 
                  `${selectedProduct.quantity} ${selectedProduct.unit}` :
                  `${selectedProduct.unitsInStock} units`
                }
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Split Locations</h4>
                <button
                  type="button"
                  onClick={addSplitLocation}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center space-x-1"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Location</span>
                </button>
              </div>

              {splitData.splits.map((split, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium text-gray-900">Location {index + 1}</h5>
                    {splitData.splits.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeSplitLocation(index)}
                        className="text-red-600 hover:text-red-800 p-1 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Location *
                      </label>
                      <select
                        value={split.location}
                        onChange={(e) => updateSplitLocation(index, 'location', e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select location</option>
                        {availableLocations.map(location => (
                          <option key={location.id} value={location.code}>
                            {location.code} - {location.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity *
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={split.quantity}
                          onChange={(e) => updateSplitLocation(index, 'quantity', e.target.value)}
                          required
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter quantity"
                        />
                        <span className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-600">
                          {selectedProduct.type === 'bulk' ? selectedProduct.unit : 'units'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notes
                      </label>
                      <input
                        type="text"
                        value={split.notes}
                        onChange={(e) => updateSplitLocation(index, 'notes', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Split reason"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Split Quantity:</span>
                  <span className="font-medium text-gray-900">
                    {splitData.splits.reduce((sum, split) => sum + (parseFloat(split.quantity) || 0), 0).toFixed(2)} 
                    {selectedProduct.type === 'bulk' ? ` ${selectedProduct.unit}` : ' units'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Original Quantity:</span>
                  <span className="font-medium text-gray-900">
                    {selectedProduct.type === 'bulk' ? 
                      `${selectedProduct.quantity} ${selectedProduct.unit}` :
                      `${selectedProduct.unitsInStock} units`
                    }
                  </span>
                </div>
                {Math.abs(splitData.splits.reduce((sum, split) => sum + (parseFloat(split.quantity) || 0), 0) - 
                  (selectedProduct.type === 'bulk' ? selectedProduct.quantity : selectedProduct.unitsInStock)) > 0.01 && (
                  <div className="flex items-center text-red-600 text-sm mt-2">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    <span>Split quantities must equal original quantity</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowSplitModal(false);
                  setSelectedProduct(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmSplit}
                disabled={Math.abs(splitData.splits.reduce((sum, split) => sum + (parseFloat(split.quantity) || 0), 0) - 
                  (selectedProduct.type === 'bulk' ? selectedProduct.quantity : selectedProduct.unitsInStock)) > 0.01}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Split Product
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
              Finished Goods Inventory
            </h1>
            <p className="text-gray-600">Manage finished product stock and locations</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/finished-goods/claim-dispatches')}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Claim Dispatches</span>
            </button>
            <button
              onClick={() => navigate('/finished-goods/storage-locations')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <MapPin className="h-4 w-4" />
              <span>Manage Locations</span>
            </button>
            <button
              onClick={loadInventory}
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

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
            </div>
            <Package className="h-8 w-8 text-gray-600" />
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Bulk Items</p>
              <p className="text-2xl font-bold text-blue-900">{summary.bulk}</p>
              <p className="text-xs text-blue-700">{summary.totalBulkQuantity} total qty</p>
            </div>
            <Layers className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Packaged Items</p>
              <p className="text-2xl font-bold text-green-900">{summary.units}</p>
              <p className="text-xs text-green-700">{summary.totalUnits} units</p>
            </div>
            <Box className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-purple-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Unique Batches</p>
              <p className="text-2xl font-bold text-purple-900">
                {new Set(combinedInventory.map(item => item.batchNumber)).size}
              </p>
            </div>
            <Star className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        <div className="bg-orange-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Storage Locations</p>
              <p className="text-2xl font-bold text-orange-900">{locations.length}</p>
            </div>
            <MapPin className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search products, batches, variants, or release codes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Types</option>
                <option value="bulk">Bulk Only</option>
                <option value="units">Units Only</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Locations</option>
                {locations.map(location => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={filterGrade}
                onChange={(e) => setFilterGrade(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Grades</option>
                <option value="A">Grade A</option>
                <option value="B">Grade B</option>
                <option value="C">Grade C</option>
                <option value="D">Grade D</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product & Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Batch & Release Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity/Units
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quality Grade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Split Status
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
              {filteredInventory.map((item) => {
                const expiryStatus = getExpiryStatus(item.expiryDate);
                
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getTypeIcon(item.type)}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                          {item.type === 'units' && item.variantName && (
                            <div className="text-sm text-gray-500">Variant: {item.variantName}</div>
                          )}
                          <div className="flex items-center space-x-1 mt-1">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(item.type)}`}>
                              {item.type === 'bulk' ? 'Bulk' : 'Units'}
                            </span>
                            {item.splitFrom && (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                                <Split className="h-3 w-3 mr-1" />
                                Split {item.splitIndex}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-gray-900">Batch: {item.batchNumber}</div>
                        <div className="text-sm font-mono text-blue-600">{item.releaseCode}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {item.type === 'bulk' ? (
                          <span>{item.quantity} {item.unit}</span>
                        ) : (
                          <div>
                            <div>{item.unitsInStock} units</div>
                            <div className="text-xs text-gray-500">
                              {item.variantSize} {item.variantUnit} each
                            </div>
                          </div>
                        )}
                      </div>
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
                      {item.splitFrom ? (
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                            <Split className="h-3 w-3 mr-1" />
                            Split {item.splitIndex}
                          </span>
                          {item.splitNotes && (
                            <span className="text-xs text-gray-500" title={item.splitNotes}>
                              📝
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          Original
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}
                      </div>
                      {expiryStatus && (
                        <span className={`text-xs font-medium ${expiryStatus.color}`}>
                          ({expiryStatus.status})
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleMoveProduct(item)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="Move to Different Location"
                        >
                          <Move className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleSplitProduct(item)}
                          className="text-orange-600 hover:text-orange-900 p-1 rounded"
                          title="Split Across Multiple Locations"
                        >
                          <Split className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            // Show item details
                            const details = `${item.type === 'bulk' ? 'Bulk' : 'Packaged'} Product Details:\n\n` +
                              `Product: ${item.productName}\n` +
                              `${item.variantName ? `Variant: ${item.variantName}\n` : ''}` +
                              `Batch: ${item.batchNumber}\n` +
                              `Release Code: ${item.releaseCode}\n` +
                              `${item.type === 'bulk' ? 
                                `Quantity: ${item.quantity} ${item.unit}` : 
                                `Units: ${item.unitsInStock} (${item.variantSize} ${item.variantUnit} each)`
                              }\n` +
                              `Quality: Grade ${item.qualityGrade}\n` +
                              `Location: ${item.location}\n` +
                              `${item.splitFrom ? `Split Status: Split ${item.splitIndex} (from original)\n` : ''}` +
                              `Expiry: ${item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}\n` +
                              `Received: ${formatDate(item.createdAt)}`;
                            alert(details);
                          }}
                          className="text-gray-600 hover:text-gray-900 p-1 rounded"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredInventory.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No inventory found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {combinedInventory.length === 0 
                ? 'Inventory will appear here after claiming dispatches from Packing Area.'
                : 'Try adjusting your search criteria.'
              }
            </p>
            {combinedInventory.length === 0 && (
              <button
                onClick={() => navigate('/finished-goods/claim-dispatches')}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 mx-auto"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Claim Dispatches</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FGInventory;