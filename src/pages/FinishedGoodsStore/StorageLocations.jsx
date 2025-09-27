import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Package, 
  ArrowLeft,
  Search,
  Filter,
  Move,
  Split,
  CheckCircle,
  AlertTriangle,
  Layers,
  Box
} from 'lucide-react';
import { getData, setData, updateData, removeData, pushData } from '../../firebase/db';
import { fgStoreService } from '../../services/fgStoreService';
import { auth } from '../../firebase/auth';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const StorageLocations = () => {
  const navigate = useNavigate();
  const [locations, setLocations] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('locations');
  
  // Location management state
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [locationForm, setLocationForm] = useState({
    code: '',
    name: '',
    description: '',
    capacity: '',
    temperature: 'ambient',
    humidity: '',
    status: 'active'
  });

  // Product location management state
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLocation, setFilterLocation] = useState('');

  const temperatureOptions = [
    { value: 'ambient', label: 'Ambient (15-25°C)' },
    { value: 'cool', label: 'Cool (2-8°C)' },
    { value: 'frozen', label: 'Frozen (-18°C)' },
    { value: 'controlled', label: 'Controlled Environment' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [locationsData, bulkInventory, packagedInventory] = await Promise.all([
        getData('fgStorageLocations'),
        fgStoreService.getInventory(),
        fgStoreService.getPackagedInventory()
      ]);
      
      // Load locations
      if (locationsData) {
        const locationsList = Object.entries(locationsData).map(([id, location]) => ({
          id,
          ...location
        }));
        setLocations(locationsList);
      } else {
        setLocations([]);
      }

      // Combine inventory
      const combined = [
        ...bulkInventory.map(item => ({ ...item, type: 'bulk' })),
        ...packagedInventory.map(item => ({ ...item, type: 'units' }))
      ];
      setInventory(combined);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Location Management Functions
  const resetLocationForm = () => {
    setLocationForm({
      code: '',
      name: '',
      description: '',
      capacity: '',
      temperature: 'ambient',
      humidity: '',
      status: 'active'
    });
    setEditingLocation(null);
    setShowLocationModal(false);
    setError('');
  };

  const handleEditLocation = (location) => {
    setLocationForm({
      code: location.code || '',
      name: location.name || '',
      description: location.description || '',
      capacity: location.capacity?.toString() || '',
      temperature: location.temperature || 'ambient',
      humidity: location.humidity?.toString() || '',
      status: location.status || 'active'
    });
    setEditingLocation(location.id);
    setShowLocationModal(true);
  };

  const handleLocationSubmit = async (e) => {
    e.preventDefault();
    try {
      const currentUser = auth.currentUser;
      const locationData = {
        code: locationForm.code,
        name: locationForm.name,
        description: locationForm.description,
        capacity: locationForm.capacity ? parseInt(locationForm.capacity) : null,
        temperature: locationForm.temperature,
        humidity: locationForm.humidity ? parseFloat(locationForm.humidity) : null,
        status: locationForm.status,
        updatedAt: Date.now(),
        updatedBy: currentUser?.uid
      };

      if (editingLocation) {
        await updateData(`fgStorageLocations/${editingLocation}`, locationData);
        setSuccess('Location updated successfully');
      } else {
        locationData.createdAt = Date.now();
        locationData.createdBy = currentUser?.uid;
        await pushData('fgStorageLocations', locationData);
        setSuccess('Location created successfully');
      }

      await loadData();
      resetLocationForm();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleDeleteLocation = async (locationId, locationName) => {
    // Check if location is in use
    const itemsInLocation = inventory.filter(item => item.location === locationName);
    
    if (itemsInLocation.length > 0) {
      setError(`Cannot delete location "${locationName}" - it contains ${itemsInLocation.length} items. Move items first.`);
      return;
    }

    if (window.confirm(`Are you sure you want to delete location "${locationName}"?`)) {
      try {
        await removeData(`fgStorageLocations/${locationId}`);
        await loadData();
        setSuccess('Location deleted successfully');
        setTimeout(() => setSuccess(''), 3000);
      } catch (error) {
        setError('Failed to delete location');
      }
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
      await loadData();
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
      await loadData();
      setSuccess('Product split successfully across locations');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'full':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTemperatureColor = (temp) => {
    switch (temp) {
      case 'frozen':
        return 'bg-blue-100 text-blue-800';
      case 'cool':
        return 'bg-cyan-100 text-cyan-800';
      case 'controlled':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type) => {
    return type === 'bulk' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
  };

  const getTypeIcon = (type) => {
    return type === 'bulk' ? <Layers className="h-4 w-4" /> : <Box className="h-4 w-4" />;
  };

  const getLocationUsage = (locationCode) => {
    const itemsInLocation = inventory.filter(item => item.location === locationCode);
    const location = locations.find(loc => loc.code === locationCode);
    
    return {
      itemCount: itemsInLocation.length,
      capacity: location?.capacity || null,
      utilizationPercent: location?.capacity ? 
        Math.round((itemsInLocation.length / location.capacity) * 100) : null
    };
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.batchNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.variantName && item.variantName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesLocation = !filterLocation || item.location === filterLocation;
    
    return matchesSearch && matchesLocation;
  });

  const availableLocations = locations.filter(loc => loc.status === 'active');
  const usedLocations = [...new Set(inventory.map(item => item.location))].filter(Boolean);

  const tabs = [
    { id: 'locations', label: 'Storage Locations', icon: MapPin, count: locations.length },
    { id: 'products', label: 'Product Locations', icon: Package, count: inventory.length }
  ];

  if (loading) {
    return <LoadingSpinner text="Loading storage locations..." />;
  }

  return (
    <div className="p-6">
      {/* Location Add/Edit Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingLocation ? 'Edit Storage Location' : 'Add New Storage Location'}
              </h3>
              <button onClick={resetLocationForm} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleLocationSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={locationForm.code}
                    onChange={(e) => setLocationForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., FG-A1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={locationForm.name}
                    onChange={(e) => setLocationForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Main Storage Area"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Capacity (items)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={locationForm.capacity}
                    onChange={(e) => setLocationForm(prev => ({ ...prev, capacity: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Maximum items (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Temperature Control
                  </label>
                  <select
                    value={locationForm.temperature}
                    onChange={(e) => setLocationForm(prev => ({ ...prev, temperature: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {temperatureOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Humidity (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={locationForm.humidity}
                    onChange={(e) => setLocationForm(prev => ({ ...prev, humidity: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Humidity level (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={locationForm.status}
                    onChange={(e) => setLocationForm(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="maintenance">Under Maintenance</option>
                    <option value="full">Full</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={locationForm.description}
                    onChange={(e) => setLocationForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Location description, special requirements, etc."
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetLocationForm}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {editingLocation ? 'Update Location' : 'Create Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/finished-goods/inventory')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <MapPin className="h-8 w-8 mr-3 text-blue-600" />
              Storage Location Management
            </h1>
            <p className="text-gray-600">Manage storage locations and product placements</p>
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
        {activeTab === 'locations' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Storage Locations</h2>
              <button
                onClick={() => setShowLocationModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Location</span>
              </button>
            </div>

            {locations.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No storage locations</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by adding your first storage location</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Temperature
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Capacity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Current Usage
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {locations.map((location) => {
                      const usage = getLocationUsage(location.code);
                      
                      return (
                        <tr key={location.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{location.code}</div>
                              <div className="text-sm text-gray-500">{location.name}</div>
                              {location.description && (
                                <div className="text-xs text-gray-400 max-w-xs truncate">
                                  {location.description}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTemperatureColor(location.temperature)}`}>
                              {temperatureOptions.find(opt => opt.value === location.temperature)?.label || location.temperature}
                            </span>
                            {location.humidity && (
                              <div className="text-xs text-gray-500 mt-1">
                                Humidity: {location.humidity}%
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {location.capacity ? `${location.capacity} items` : 'Unlimited'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{usage.itemCount} items</div>
                            {usage.utilizationPercent !== null && (
                              <div className="flex items-center space-x-2 mt-1">
                                <div className="w-16 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full ${
                                      usage.utilizationPercent >= 90 ? 'bg-red-500' :
                                      usage.utilizationPercent >= 75 ? 'bg-yellow-500' :
                                      'bg-green-500'
                                    }`}
                                    style={{width: `${Math.min(usage.utilizationPercent, 100)}%`}}
                                  ></div>
                                </div>
                                <span className="text-xs text-gray-500">{usage.utilizationPercent}%</span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(location.status)}`}>
                              {location.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleEditLocation(location)}
                                className="text-blue-600 hover:text-blue-900 p-1 rounded"
                                title="Edit Location"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteLocation(location.id, location.name)}
                                className="text-red-600 hover:text-red-900 p-1 rounded"
                                title="Delete Location"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'products' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Product Locations</h2>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <select
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Locations</option>
                    {usedLocations.map(location => (
                      <option key={location} value={location}>{location}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {filteredInventory.length === 0 ? (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {inventory.length === 0 
                    ? 'Products will appear here after claiming dispatches.'
                    : 'Try adjusting your search criteria.'
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product & Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Batch & Release
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity/Units
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Current Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Split Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredInventory.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {getTypeIcon(product.type)}
                            <div>
                              <div className="text-sm font-medium text-gray-900">{product.productName}</div>
                              {product.variantName && (
                                <div className="text-sm text-gray-500">Variant: {product.variantName}</div>
                              )}
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(product.type)}`}>
                                {product.type === 'bulk' ? 'Bulk' : 'Units'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm text-gray-900">Batch: {product.batchNumber}</div>
                            <div className="text-sm font-mono text-blue-600">{product.releaseCode}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {product.type === 'bulk' ? (
                              <span>{product.quantity} {product.unit}</span>
                            ) : (
                              <div>
                                <div>{product.unitsInStock} units</div>
                                <div className="text-xs text-gray-500">
                                  {product.variantSize} {product.variantUnit} each
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                            <span className="text-sm text-gray-900">{product.location}</span>
                          </div>
                          {locations.find(loc => loc.code === product.location) && (
                            <div className="text-xs text-gray-500 mt-1">
                              {locations.find(loc => loc.code === product.location).name}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {product.splitFrom ? (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                              <Split className="h-3 w-3 mr-1" />
                              Split {product.splitIndex}
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                              Original
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleMoveProduct(product)}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded"
                              title="Move to Different Location"
                            >
                              <Move className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleSplitProduct(product)}
                              className="text-orange-600 hover:text-orange-900 p-1 rounded"
                              title="Split Across Multiple Locations"
                            >
                              <Split className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StorageLocations;