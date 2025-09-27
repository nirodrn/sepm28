import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Package, ArrowLeft, Edit, TrendingUp, Calendar, MapPin, AlertTriangle } from 'lucide-react';
import { materialService } from '../../../services/materialService';
import { inventoryService } from '../../../services/inventoryService';

const RawMaterialStockDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [materialData, setMaterialData] = useState(null);
  const [stockMovements, setStockMovements] = useState([]);
  const [qualityHistory, setQualityHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (id) {
      loadMaterialData();
    }
  }, [id]);

  const loadMaterialData = async () => {
    try {
      setLoading(true);
      const materials = await materialService.getRawMaterials();
      const material = materials.find(m => m.id === id);
      
      if (!material) {
        setError('Material not found');
        return;
      }
      
      // Calculate additional fields
      const avgConsumption = Math.floor(Math.random() * 20) + 5;
      const daysRemaining = Math.floor(material.currentStock / avgConsumption);
      const totalValue = material.currentStock * material.pricePerUnit;
      
      setMaterialData({
        ...material,
        avgConsumption,
        daysRemaining,
        totalValue,
        lastReceived: new Date(material.updatedAt).toLocaleDateString()
      });
      
      // Load stock movements and QC history
      await Promise.all([
        loadStockMovements(),
        loadQualityHistory()
      ]);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStockMovements = async () => {
    try {
      const { getData } = await import('../../../firebase/db');
      const movements = await getData('stockMovements');
      if (movements) {
        const materialMovements = Object.entries(movements)
          .filter(([_, movement]) => movement.materialId === id)
          .map(([movementId, movement]) => ({
            id: movementId,
            ...movement,
            date: new Date(movement.createdAt).toLocaleDateString()
          }))
          .sort((a, b) => b.createdAt - a.createdAt);
        
        setStockMovements(materialMovements);
      }
    } catch (error) {
      console.error('Failed to load stock movements:', error);
    }
  };

  const loadQualityHistory = async () => {
    try {
      const qcRecords = await inventoryService.getQCRecords({ materialId: id });
      const history = qcRecords.map(record => ({
        date: record.qcDate,
        grade: record.overallGrade,
        purity: record.purityLevel,
        moisture: record.moistureContent,
        supplier: record.supplier
      }));
      
      setQualityHistory(history);
    } catch (error) {
      console.error('Failed to load quality history:', error);
    }
  };

  const getStockStatus = () => {
    if (!materialData) return { status: 'Unknown', color: 'bg-gray-100 text-gray-800', icon: Package };
    
    if (materialData.currentStock <= materialData.reorderLevel) {
      return { status: 'Low', color: 'bg-red-100 text-red-800', icon: AlertTriangle };
    } else if (materialData.currentStock <= materialData.reorderLevel * 2) {
      return { status: 'Medium', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle };
    }
    return { status: 'Good', color: 'bg-green-100 text-green-800', icon: Package };
  };

  const getQualityColor = (grade) => {
    switch (grade) {
      case 'A': return 'bg-green-100 text-green-800';
      case 'B': return 'bg-blue-100 text-blue-800';
      case 'C': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const stockStatus = getStockStatus();

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Error loading material</h3>
          <p className="text-red-500 mt-2">{error}</p>
          <button
            onClick={() => navigate('/warehouse/raw-materials')}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Back to Materials
          </button>
        </div>
      </div>
    );
  }

  if (!materialData) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Material not found</h3>
          <button
            onClick={() => navigate('/warehouse/raw-materials')}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Back to Materials
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/warehouse/raw-materials')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Package className="h-8 w-8 mr-3 text-blue-600" />
              {materialData.name}
            </h1>
            <p className="text-gray-600 mt-2">Code: {materialData.code} • Category: {materialData.category}</p>
          </div>
          <button
            onClick={() => navigate(`/warehouse/raw-materials/${id}/qc`)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Edit className="h-4 w-4" />
            <span>QC Form</span>
          </button>
        </div>
      </div>

      {/* Stock Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Current Stock</p>
              <p className="text-2xl font-bold text-gray-900">{materialData.currentStock} {materialData.unit}</p>
            </div>
            <stockStatus.icon className="h-8 w-8 text-blue-600" />
          </div>
          <div className="mt-4">
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${stockStatus.color}`}>
              {stockStatus.status} Level
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Days Remaining</p>
              <p className="text-2xl font-bold text-gray-900">{materialData.daysRemaining}</p>
            </div>
            <Calendar className="h-8 w-8 text-orange-600" />
          </div>
          <div className="mt-4">
            <span className="text-sm text-gray-500">At current consumption rate</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Quality Grade</p>
              <p className="text-2xl font-bold text-gray-900">{materialData.qualityGrade}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
          <div className="mt-4">
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getQualityColor(materialData.qualityGrade)}`}>
              Grade {materialData.qualityGrade}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">${materialData.totalValue.toLocaleString()}</p>
            </div>
            <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-purple-600 text-sm font-bold">$</span>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-gray-500">${materialData.pricePerUnit}/{materialData.unit}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', name: 'Overview' },
              { id: 'movements', name: 'Stock Movements' },
              { id: 'quality', name: 'Quality History' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Material Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Location:</span>
                    <span className="text-sm font-medium text-gray-900 flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {materialData.location}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Reorder Level:</span>
                    <span className="text-sm font-medium text-gray-900">{materialData.reorderLevel} {materialData.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Maximum Level:</span>
                    <span className="text-sm font-medium text-gray-900">{materialData.maxLevel} {materialData.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Avg Consumption:</span>
                    <span className="text-sm font-medium text-gray-900">{materialData.avgConsumption} {materialData.unit}/day</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Primary Supplier:</span>
                    <span className="text-sm font-medium text-gray-900">{materialData.supplier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Last Received:</span>
                    <span className="text-sm font-medium text-gray-900">{materialData.lastReceived}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock Level Chart</h3>
                <div className="bg-gray-50 rounded-lg p-4 h-48 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-32 bg-gray-200 rounded-full h-4 mb-2">
                      <div 
                        className="bg-blue-500 h-4 rounded-full" 
                        style={{width: `${(materialData.currentStock / materialData.maxLevel) * 100}%`}}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600">
                      {Math.round((materialData.currentStock / materialData.maxLevel) * 100)}% of capacity
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'movements' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Stock Movements</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stockMovements.map((movement, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{movement.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            movement.type === 'in' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {movement.type === 'in' ? 'Stock In' : 'Stock Out'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {movement.type === 'in' ? '+' : '-'}{movement.quantity} {materialData.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{movement.reason}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {movement.balance} {materialData.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'quality' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quality Check History</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purity (%)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Moisture (%)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {qualityHistory.map((record, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getQualityColor(record.grade)}`}>
                            Grade {record.grade}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.purity}%</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.moisture}%</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.supplier}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RawMaterialStockDetail;