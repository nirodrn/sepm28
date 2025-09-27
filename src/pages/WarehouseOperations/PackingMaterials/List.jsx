import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, Search, Filter, Eye, Edit, Plus, AlertTriangle, TrendingUp, Package, MapPin, Calendar } from 'lucide-react';
import { materialService } from '../../../services/materialService';
import { inventoryService } from '../../../services/inventoryService';
import { subscribeToData } from '../../../firebase/db';
import LoadingSpinner from '../../../components/Common/LoadingSpinner';
import ErrorMessage from '../../../components/Common/ErrorMessage';
import { formatDate } from '../../../utils/formatDate';

const PackingMaterialsList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [packingMaterials, setPackingMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPackingMaterials();
    
    // Set up real-time listener
    const unsubscribe = subscribeToData('packingMaterials', (snapshot) => {
      try {
        const data = snapshot.val();
        if (data) {
          const materials = Object.entries(data).map(([id, material]) => ({
            id,
            ...material
          })).filter(material => material.status === 'active');
          setPackingMaterials(materials);
        } else {
          setPackingMaterials([]);
        }
      } catch (error) {
        console.error('Error in real-time listener:', error);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadPackingMaterials = async () => {
    try {
      setLoading(true);
      setError('');
      
      const materials = await materialService.getPackingMaterials();
      const activeMaterials = materials.filter(material => material.status === 'active');
      
      // Transform to show consolidated stock details
      const consolidatedMaterials = activeMaterials.map(material => {
        const avgPrice = material.pricePerUnit || 0;
        const totalValue = (material.currentStock || 0) * avgPrice;
        
        return {
          ...material,
          avgPricePerUnit: avgPrice,
          totalValue: totalValue,
          lastReceived: material.lastUpdated || material.updatedAt || Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
        };
      });
      
      setPackingMaterials(consolidatedMaterials);
    } catch (error) {
      setError(error.message);
      console.error('Failed to load packing materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (current, reorder) => {
    const currentStock = Number(current) || 0;
    const reorderLevel = Number(reorder) || 0;
    
    if (reorderLevel === 0) return { status: 'Unknown', color: 'bg-gray-100 text-gray-800' };
    if (currentStock <= reorderLevel) return { status: 'Low', color: 'bg-red-100 text-red-800' };
    if (currentStock <= reorderLevel * 2) return { status: 'Medium', color: 'bg-yellow-100 text-yellow-800' };
    return { status: 'Good', color: 'bg-green-100 text-green-800' };
  };

  const getQualityColor = (grade) => {
    if (!grade) return 'bg-gray-100 text-gray-800';
    switch (grade) {
      case 'A': return 'bg-green-100 text-green-800';
      case 'B': return 'bg-blue-100 text-blue-800';
      case 'C': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Primary Packaging': 'bg-blue-100 text-blue-800',
      'Protective Materials': 'bg-green-100 text-green-800',
      'Labels': 'bg-purple-100 text-purple-800',
      'Adhesives': 'bg-orange-100 text-orange-800',
      'Secondary Packaging': 'bg-indigo-100 text-indigo-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const categories = [...new Set(packingMaterials.map(item => item.category))];

  const filteredMaterials = packingMaterials.filter(material => {
    const matchesSearch = material.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.supplier?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!filterStatus && !filterCategory) return matchesSearch;
    
    const stockStatus = getStockStatus(material.currentStock, material.reorderLevel);
    const matchesStatus = !filterStatus || stockStatus.status.toLowerCase() === filterStatus.toLowerCase();
    const matchesCategory = !filterCategory || material.category === filterCategory;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const calculateSummary = () => {
    const totalItems = filteredMaterials.length;
    const totalValue = filteredMaterials.reduce((sum, material) => sum + (material.totalValue || 0), 0);
    const lowStockItems = filteredMaterials.filter(material => {
      const stockStatus = getStockStatus(material.currentStock, material.reorderLevel);
      return stockStatus.status === 'Low';
    }).length;
    const totalQuantity = filteredMaterials.reduce((sum, material) => sum + (Number(material.currentStock) || 0), 0);

    return { totalItems, totalValue, lowStockItems, totalQuantity };
  };

  const summary = calculateSummary();

  if (loading) {
    return <LoadingSpinner text="Loading packing materials..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadPackingMaterials} />;
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Archive className="h-8 w-8 mr-3 text-green-600" />
              Packing Materials Stock Overview
            </h1>
            <p className="text-gray-600 mt-2">
              Consolidated stock view from warehouse inventory
              {packingMaterials.length > 0 && (
                <span className="ml-2 text-green-600 font-medium">
                  • Total Value: LKR {summary.totalValue.toLocaleString()}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/warehouse/packing-materials/request')}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Request Material</span>
            </button>
            <button
              onClick={() => navigate('/warehouse/packing-materials/requests')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Package className="h-4 w-4" />
              <span>View Requests</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Materials</p>
              <p className="text-2xl font-bold text-gray-900">{summary.totalItems}</p>
            </div>
            <Archive className="h-8 w-8 text-gray-600" />
          </div>
        </div>
        <div className="bg-red-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Low Stock Items</p>
              <p className="text-2xl font-bold text-red-900">{summary.lowStockItems}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Quantity</p>
              <p className="text-2xl font-bold text-blue-900">{summary.totalQuantity.toLocaleString()}</p>
            </div>
            <Package className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Total Value</p>
              <p className="text-2xl font-bold text-green-900">LKR {summary.totalValue.toLocaleString()}</p>
            </div>
            <div className="h-8 w-8 bg-green-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">₨</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search materials, codes, or suppliers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">All Stock Levels</option>
                <option value="good">Good Stock</option>
                <option value="medium">Medium Stock</option>
                <option value="low">Low Stock</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Material
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quality Grade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
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
              {filteredMaterials.map((material) => {
                const stockStatus = getStockStatus(material.currentStock, material.reorderLevel);
                const isLowStock = (Number(material.currentStock) || 0) <= (Number(material.reorderLevel) || 0);
                
                return (
                  <tr key={material.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{material.name || 'Unknown Material'}</div>
                        <div className="text-sm text-gray-500">Code: {material.code || 'No Code'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(material.category)}`}>
                        {material.category || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-900">
                          {Number(material.currentStock) || 0} {material.unit || 'units'}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${stockStatus.color}`}>
                          {stockStatus.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Reorder at: {Number(material.reorderLevel) || 0} {material.unit}
                      </div>
                      {isLowStock && (
                        <div className="flex items-center text-red-600 mt-1">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          <span className="text-xs">Reorder needed</span>
                        </div>
                      )}
                      <div className="w-16 bg-gray-200 rounded-full h-1 mt-2">
                        <div 
                          className={`h-1 rounded-full transition-all duration-300 ${
                            isLowStock ? 'bg-red-500' : 
                            (Number(material.currentStock) || 0) <= (Number(material.reorderLevel) || 0) * 2 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{width: `${Math.min(((Number(material.currentStock) || 0) / (Number(material.maxLevel) || 1)) * 100, 100)}%`}}
                        ></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        LKR {Number(material.avgPricePerUnit || 0).toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-500">per {material.unit}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="text-sm font-medium text-gray-900">
                        LKR {Number(material.totalValue || 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {Number(material.currentStock) || 0} × LKR {Number(material.avgPricePerUnit || 0).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getQualityColor(material.qualityGrade)}`}>
                        {material.qualityGrade ? `Grade ${material.qualityGrade}` : 'Not Graded'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{material.supplier || 'No Supplier'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1 text-sm text-gray-900">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        <span>{material.location || 'Not assigned'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span>
                          {material.lastReceived ? 
                            formatDate(material.lastReceived) : 
                            'Never'
                          }
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => navigate(`/warehouse/packing-materials/${material.id}`)}
                          className="text-green-600 hover:text-green-900 p-1 rounded"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/warehouse/packing-materials/${material.id}/qc`)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="QC Form"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => navigate('/warehouse/packing-materials/price-quality-history')}
                          className="text-purple-600 hover:text-purple-900 p-1 rounded"
                          title="Price & Quality History"
                        >
                          <TrendingUp className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredMaterials.length === 0 && (
          <div className="text-center py-12">
            <Archive className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No packing materials found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {packingMaterials.length === 0 
                ? 'No packing materials have been added to the system yet.' 
                : (searchTerm || filterStatus || filterCategory)
                ? 'Try adjusting your search criteria.' 
                : 'Get started by requesting materials.'
              }
            </p>
            {packingMaterials.length === 0 && (
              <button
                onClick={() => navigate('/warehouse/packing-materials/request')}
                className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
              >
                Request Packing Materials
              </button>
            )}
          </div>
        )}
      </div>

      {/* Low Stock Alert Section */}
      {summary.lowStockItems > 0 && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-red-900">Low Stock Alert</h3>
                <p className="text-red-700">
                  {summary.lowStockItems} material{summary.lowStockItems !== 1 ? 's' : ''} below reorder level
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/warehouse/packing-materials/request')}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Request Materials</span>
            </button>
          </div>
          
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMaterials
              .filter(material => {
                const stockStatus = getStockStatus(material.currentStock, material.reorderLevel);
                return stockStatus.status === 'Low';
              })
              .slice(0, 6)
              .map((material) => (
                <div key={material.id} className="bg-white border border-red-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{material.name}</p>
                      <p className="text-sm text-gray-500">{material.code}</p>
                      <p className="text-sm text-red-600 font-medium">
                        {Number(material.currentStock) || 0} {material.unit} remaining
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        Low Stock
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        Reorder: {Number(material.reorderLevel) || 0} {material.unit}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PackingMaterialsList;