import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Package, 
  TruckIcon, 
  Calendar, 
  User, 
  DollarSign,
  Warehouse,
  AlertTriangle,
  CheckCircle,
  Clock,
  Archive
} from 'lucide-react';
import { purchasePreparationService } from '../../../services/purchasePreparationService';
import { materialService } from '../../../services/materialService';
import { inventoryService } from '../../../services/inventoryService';
import LoadingSpinner from '../../../components/Common/LoadingSpinner';
import ErrorMessage from '../../../components/Common/ErrorMessage';

const PurchasePreparationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [preparation, setPreparation] = useState(null);
  const [currentStock, setCurrentStock] = useState(null);
  const [projectedStock, setProjectedStock] = useState(null);
  const [stockMovements, setStockMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load preparation data
      const prep = await purchasePreparationService.getById(id);
      setPreparation(prep);

      // Load current stock for the material
      await loadStockData(prep);

    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load preparation details: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStockData = async (prep) => {
    try {
      const materialType = prep.requestType === 'material' ? 'raw' : 'packing';
      
      // Get current stock from materials
      let materials = [];
      if (materialType === 'raw') {
        materials = await materialService.getRawMaterials();
      } else {
        materials = await materialService.getPackingMaterials();
      }
      
      const material = materials.find(m => m.id === prep.materialId);
      if (material) {
        setCurrentStock({
          current: material.currentStock || 0,
          reorderLevel: material.reorderLevel || 0,
          maxLevel: material.maxLevel || material.maxStockLevel || 0,
          unit: material.unit,
          location: material.location || 'Warehouse',
          lastUpdated: material.lastUpdated || material.updatedAt
        });

        // Calculate projected stock after delivery
        const projectedQuantity = (material.currentStock || 0) + (prep.requiredQuantity || 0);
        setProjectedStock({
          projected: projectedQuantity,
          unit: material.unit,
          percentageIncrease: material.currentStock > 0 ? 
            ((projectedQuantity - material.currentStock) / material.currentStock * 100) : 100
        });
      }

      // Load recent stock movements
      try {
        const movements = await inventoryService.getQCRecords({ materialId: prep.materialId });
        setStockMovements(movements.slice(0, 5)); // Show last 5 movements
      } catch (movementError) {
        console.warn('Could not load stock movements:', movementError.message);
        setStockMovements([]);
      }

    } catch (error) {
      console.error('Error loading stock data:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending_supplier_assignment':
        return 'bg-yellow-100 text-yellow-800';
      case 'supplier_assigned':
        return 'bg-blue-100 text-blue-800';
      case 'delivered_pending_qc':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'qc_failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending_supplier_assignment':
        return 'Pending Supplier Assignment';
      case 'supplier_assigned':
        return 'Supplier Assigned';
      case 'delivered_pending_qc':
        return 'Delivered - Pending QC';
      case 'completed':
        return 'Completed';
      case 'qc_failed':
        return 'QC Failed';
      default:
        return status?.replace('_', ' ').toUpperCase() || 'Unknown';
    }
  };

  const getStockStatus = (current, reorder, max) => {
    if (current <= reorder) {
      return { status: 'Low', color: 'text-red-600', bgColor: 'bg-red-50', icon: AlertTriangle };
    } else if (current <= reorder * 2) {
      return { status: 'Medium', color: 'text-yellow-600', bgColor: 'bg-yellow-50', icon: Clock };
    } else if (current >= max * 0.9) {
      return { status: 'High', color: 'text-blue-600', bgColor: 'bg-blue-50', icon: Package };
    }
    return { status: 'Good', color: 'text-green-600', bgColor: 'bg-green-50', icon: CheckCircle };
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString();
  };

  if (loading) {
    return <LoadingSpinner text="Loading preparation details..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadData} />;
  }

  if (!preparation) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Preparation not found</h3>
          <button
            onClick={() => navigate('/warehouse/purchase-preparation')}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Back to Purchase Preparation
          </button>
        </div>
      </div>
    );
  }

  const stockStatus = currentStock ? getStockStatus(currentStock.current, currentStock.reorderLevel, currentStock.maxLevel) : null;

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/warehouse/purchase-preparation')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Package className="h-8 w-8 mr-3 text-blue-600" />
              Purchase Preparation Details
            </h1>
            <p className="text-gray-600 mt-2">View preparation details and warehouse stock impact</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Preparation Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Preparation Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Material</p>
                  <p className="font-medium text-gray-900">{preparation.materialName}</p>
                  <p className="text-sm text-gray-500">
                    {preparation.requestType === 'material' ? 'Raw Material' : 'Packing Material'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Required Quantity</p>
                  <p className="font-medium text-gray-900">{preparation.requiredQuantity} {preparation.unit}</p>
                </div>
              </div>

              {preparation.supplierId && (
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <TruckIcon className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Assigned Supplier</p>
                    <p className="font-medium text-gray-900">{preparation.supplierName}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Expected Delivery</p>
                  <p className="font-medium text-gray-900">
                    {preparation.expectedDeliveryDate ? formatDate(preparation.expectedDeliveryDate) : 'Not set'}
                  </p>
                </div>
              </div>

              {preparation.unitPrice && (
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Unit Price</p>
                    <p className="font-medium text-gray-900">LKR {preparation.unitPrice.toFixed(2)}</p>
                  </div>
                </div>
              )}

              {preparation.totalCost && (
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <DollarSign className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Cost</p>
                    <p className="font-medium text-gray-900">LKR {preparation.totalCost.toFixed(2)}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <User className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(preparation.status)}`}>
                    {getStatusLabel(preparation.status)}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">MD Approved</p>
                  <p className="font-medium text-gray-900">{formatDate(preparation.mdApprovedAt)}</p>
                </div>
              </div>
            </div>

            {preparation.notes && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                <p className="text-gray-700">{preparation.notes}</p>
              </div>
            )}
          </div>

          {/* Stock Movements History */}
          {stockMovements.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Quality Control History</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Grade
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Supplier
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stockMovements.map((movement, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(movement.qcDate)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            movement.overallGrade === 'A' ? 'bg-green-100 text-green-800' :
                            movement.overallGrade === 'B' ? 'bg-blue-100 text-blue-800' :
                            movement.overallGrade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            Grade {movement.overallGrade}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {movement.supplier || 'N/A'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            movement.acceptanceStatus === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {movement.acceptanceStatus === 'accepted' ? 'Accepted' : 'Rejected'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Warehouse Stock Information */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Warehouse className="h-5 w-5 mr-2 text-blue-600" />
              Current Warehouse Stock
            </h3>
            
            {currentStock ? (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${stockStatus?.bgColor || 'bg-gray-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Current Level</span>
                    <div className="flex items-center space-x-2">
                      {stockStatus?.icon && <stockStatus.icon className={`h-4 w-4 ${stockStatus.color}`} />}
                      <span className={`text-sm font-medium ${stockStatus?.color || 'text-gray-600'}`}>
                        {stockStatus?.status || 'Unknown'}
                      </span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {currentStock.current} {currentStock.unit}
                  </div>
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          currentStock.current <= currentStock.reorderLevel ? 'bg-red-500' :
                          currentStock.current <= currentStock.reorderLevel * 2 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{
                          width: `${Math.min((currentStock.current / currentStock.maxLevel) * 100, 100)}%`
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0</span>
                      <span>Reorder: {currentStock.reorderLevel}</span>
                      <span>Max: {currentStock.maxLevel}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Location:</span>
                    <span className="text-sm font-medium text-gray-900">{currentStock.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Reorder Level:</span>
                    <span className="text-sm font-medium text-gray-900">{currentStock.reorderLevel} {currentStock.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Maximum Level:</span>
                    <span className="text-sm font-medium text-gray-900">{currentStock.maxLevel} {currentStock.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Last Updated:</span>
                    <span className="text-sm font-medium text-gray-900">{formatDate(currentStock.lastUpdated)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Archive className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No stock data available</p>
              </div>
            )}
          </div>

          {/* Projected Stock After Delivery */}
          {projectedStock && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <TruckIcon className="h-5 w-5 mr-2 text-green-600" />
                Projected Stock After Delivery
              </h3>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {projectedStock.projected} {projectedStock.unit}
                  </div>
                  <div className="text-sm text-green-700">
                    +{preparation.requiredQuantity} {preparation.unit} from delivery
                  </div>
                  <div className="text-sm text-green-600 mt-1">
                    ({projectedStock.percentageIncrease.toFixed(1)}% increase)
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Current Stock:</span>
                  <span className="font-medium">{currentStock?.current || 0} {preparation.unit}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Incoming Delivery:</span>
                  <span className="font-medium text-green-600">+{preparation.requiredQuantity} {preparation.unit}</span>
                </div>
                <div className="border-t border-gray-200 pt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-900 font-medium">Projected Total:</span>
                    <span className="font-bold text-green-600">{projectedStock.projected} {preparation.unit}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Request Timeline */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Timeline</h3>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Request Created</p>
                  <p className="text-xs text-gray-500">{formatDate(preparation.createdAt)}</p>
                </div>
              </div>
              
              {preparation.mdApprovedAt && (
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">MD Approved</p>
                    <p className="text-xs text-gray-500">{formatDate(preparation.mdApprovedAt)}</p>
                  </div>
                </div>
              )}
              
              {preparation.assignedAt && (
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Supplier Assigned</p>
                    <p className="text-xs text-gray-500">{formatDate(preparation.assignedAt)}</p>
                  </div>
                </div>
              )}
              
              {preparation.deliveredAt && (
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Delivered</p>
                    <p className="text-xs text-gray-500">{formatDate(preparation.deliveredAt)}</p>
                  </div>
                </div>
              )}
              
              {preparation.qcCompletedAt && (
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    preparation.status === 'completed' ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">QC Completed</p>
                    <p className="text-xs text-gray-500">{formatDate(preparation.qcCompletedAt)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stock Impact Analysis */}
      {currentStock && projectedStock && (
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock Impact Analysis</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{currentStock.current}</div>
              <div className="text-sm text-blue-700">Current Stock</div>
              <div className="text-xs text-gray-500 mt-1">{currentStock.unit}</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">+{preparation.requiredQuantity}</div>
              <div className="text-sm text-green-700">Incoming Delivery</div>
              <div className="text-xs text-gray-500 mt-1">{preparation.unit}</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{projectedStock.projected}</div>
              <div className="text-sm text-purple-700">Projected Total</div>
              <div className="text-xs text-gray-500 mt-1">{projectedStock.unit}</div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Stock Level Assessment</h4>
                <p className="text-sm text-gray-600 mt-1">
                  After delivery, stock will be at {Math.round((projectedStock.projected / currentStock.maxLevel) * 100)}% of maximum capacity
                </p>
              </div>
              <div className="text-right">
                {projectedStock.projected > currentStock.maxLevel ? (
                  <div className="flex items-center text-red-600">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    <span className="text-sm font-medium">Exceeds Maximum</span>
                  </div>
                ) : projectedStock.projected > currentStock.reorderLevel * 3 ? (
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    <span className="text-sm font-medium">Optimal Level</span>
                  </div>
                ) : (
                  <div className="flex items-center text-yellow-600">
                    <Clock className="h-4 w-4 mr-1" />
                    <span className="text-sm font-medium">Adequate Level</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchasePreparationDetail;