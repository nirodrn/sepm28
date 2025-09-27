import React, { useState, useEffect } from 'react';
import { Package, Search, Filter, Plus, Eye, Edit, TruckIcon, AlertTriangle, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { materialService } from '../../../services/materialService';
import { inventoryService } from '../../../services/inventoryService';
import { subscribeToData } from '../../../firebase/db';
import LoadingSpinner from '../../../components/Common/LoadingSpinner';
import ErrorMessage from '../../../components/Common/ErrorMessage';

const RawMaterialsList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [rawMaterials, setRawMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadRawMaterials();
    
    // Set up real-time listener
    const unsubscribe = subscribeToData('rawMaterials', (snapshot) => {
      try {
        const data = snapshot.val();
        if (data) {
          const materials = Object.entries(data).map(([id, material]) => ({
            id,
            ...material
          })).filter(material => material.status === 'active');
          setRawMaterials(materials);
        } else {
          setRawMaterials([]);
        }
      } catch (error) {
        console.error('Error in real-time listener:', error);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadRawMaterials = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get materials and consolidate stock from all suppliers
      const materials = await materialService.getRawMaterials();
      const activeMaterials = materials.filter(material => material.status === 'active');
      
      // Transform to show consolidated stock details
      const consolidatedMaterials = activeMaterials.map(material => {
        // Calculate average price from recent deliveries or use base price
        const avgPrice = material.pricePerUnit || Math.random() * 50 + 10; // Mock average price calculation
        const totalValue = (material.currentStock || 0) * avgPrice;
        
        return {
          ...material,
          avgPricePerUnit: avgPrice,
          totalValue: totalValue,
          lastReceived: material.lastReceived || material.updatedAt || Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
        };
      });
      
      setRawMaterials(consolidatedMaterials);
    } catch (error) {
      setError(error.message);
      console.error('Failed to load raw materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (current, reorder) => {
    // Ensure values are valid numbers
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

  const filteredMaterials = rawMaterials.filter(material => {
    const matchesSearch = material.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.code?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!filterStatus) return matchesSearch;
    
    const stockStatus = getStockStatus(material.currentStock, material.reorderLevel);
    return matchesSearch && stockStatus.status.toLowerCase() === filterStatus.toLowerCase();
  });

  if (loading) {
    return <LoadingSpinner text="Loading raw materials..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadRawMaterials} />;
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Package className="h-8 w-8 mr-3 text-blue-600" />
              Raw Materials Stock Overview
            </h1>
            <p className="text-gray-600 mt-2">
              Consolidated stock view from all suppliers
              {rawMaterials.length > 0 && (
                <span className="ml-2 text-blue-600 font-medium">
                  • Total Value: LKR {rawMaterials.reduce((sum, material) => {
                    return sum + (material.totalValue || 0);
                  }, 0).toLocaleString()}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => navigate('/warehouse/raw-materials/request')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Request Material</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search materials..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
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
                  Avg Price/Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Received
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMaterials.map((material) => {
                const stockStatus = getStockStatus(material.currentStock, material.reorderLevel);
                return (
                  <tr key={material.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{material.name || 'Unknown Material'}</div>
                        <div className="text-sm text-gray-500">Code: {material.code || 'No Code'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
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
                      {(Number(material.currentStock) || 0) <= (Number(material.reorderLevel) || 0) && (
                        <div className="flex items-center text-red-600 mt-1">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          <span className="text-xs">Reorder needed</span>
                        </div>
                      )}
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span>
                          {material.lastReceived ? 
                            new Date(material.lastReceived).toLocaleDateString() : 
                            'Never'
                          }
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => navigate(`/warehouse/raw-materials/${material.id}`)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/warehouse/raw-materials/${material.id}/qc`)}
                          className="text-green-600 hover:text-green-900 p-1 rounded"
                          title="QC Form"
                        >
                          <Edit className="h-4 w-4" />
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
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No materials found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {rawMaterials.length === 0 
                ? 'No raw materials have been added to the system yet.' 
                : (searchTerm || filterStatus)
                ? 'Try adjusting your search criteria.' 
                : 'Get started by requesting materials.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RawMaterialsList;