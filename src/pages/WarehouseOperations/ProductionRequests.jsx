import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Factory, Package, CheckCircle, XCircle, Clock, Send, AlertTriangle, Eye } from 'lucide-react';
import { productionWarehouseService } from '../../services/productionWarehouseService';
import { materialService } from '../../services/materialService';
import { formatDate } from '../../utils/formatDate';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

function ProductionRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingRequest, setProcessingRequest] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [requestData, materialData] = await Promise.all([
        productionWarehouseService.getRequestsForWarehouse(),
        materialService.getRawMaterials()
      ]);
      
      setRequests(requestData);
      setMaterials(materialData);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAndDispatch = async (requestId) => {
    try {
      setProcessingRequest(requestId);
      setError('');
      
      const result = await productionWarehouseService.approveAndDispatchMaterials(requestId, {
        notes: 'Materials dispatched to Production'
      });
      
      if (result.status === 'stock_shortage') {
        setError('Stock shortage detected for some materials. HO has been notified for escalation.');
      }
      
      await loadData();
    } catch (error) {
      setError(error.message);
    } finally {
      setProcessingRequest(null);
    }
  };

  const getMaterialName = (materialId) => {
    const material = materials.find(m => m.id === materialId);
    return material ? material.name : 'Unknown Material';
  };

  const getMaterialStock = (materialId) => {
    const material = materials.find(m => m.id === materialId);
    return material ? (material.currentStock || 0) : 0;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending_warehouse':
        return 'bg-yellow-100 text-yellow-800';
      case 'dispatched':
        return 'bg-blue-100 text-blue-800';
      case 'received':
        return 'bg-green-100 text-green-800';
      case 'stock_shortage':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'received':
        return <CheckCircle className="h-4 w-4" />;
      case 'dispatched':
        return <Send className="h-4 w-4" />;
      case 'stock_shortage':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading production requests..." />;
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Factory className="h-8 w-8 mr-3 text-blue-600" />
          Production Raw Material Requests
        </h1>
        <p className="text-gray-600">Process direct requests from Production Manager</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Pending Requests ({requests.length})
            </h2>
            <p className="text-sm text-gray-500 mt-2">
              Direct requests from Production • HO is notified for monitoring
            </p>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {requests.length === 0 ? (
            <div className="text-center py-12">
              <Factory className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No pending requests</h3>
              <p className="mt-1 text-sm text-gray-500">
                Production requests will appear here when submitted
              </p>
            </div>
          ) : (
            requests.map((request) => (
              <div key={request.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <Factory className="h-5 w-5 text-blue-600" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-medium text-gray-900">
                          Request #{request.id.slice(-6)}
                        </h4>
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                          {getStatusIcon(request.status)}
                          <span className="ml-1">{request.status?.replace('_', ' ').toUpperCase()}</span>
                        </span>
                        {request.priority === 'urgent' && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            URGENT
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-6 mb-3 text-sm text-gray-500">
                        <span>From: {request.requestedByName}</span>
                        <span>{request.items?.length || 0} materials</span>
                        <span>{formatDate(request.createdAt)}</span>
                        {request.batchReference && (
                          <span>Batch: {request.batchReference}</span>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <h5 className="font-medium text-gray-700">Materials Requested:</h5>
                        {request.items?.map((item, index) => {
                          const currentStock = getMaterialStock(item.materialId);
                          const isAvailable = currentStock >= item.quantity;
                          
                          return (
                            <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                              <div>
                                <p className="font-medium text-gray-900">{item.materialName}</p>
                                <p className="text-sm text-gray-500">
                                  Requested: {item.quantity} {item.unit}
                                  {item.reason && <span> • {item.reason}</span>}
                                </p>
                                {item.batchReference && (
                                  <p className="text-sm text-gray-500">Batch Ref: {item.batchReference}</p>
                                )}
                                {item.quantityPerUnit && (
                                  <p className="text-sm text-gray-400">
                                    Formula: {item.quantityPerUnit} {item.unit} per production unit
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <div className={`text-sm font-medium ${isAvailable ? 'text-green-600' : 'text-red-600'}`}>
                                  Stock: {currentStock} {item.unit}
                                </div>
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {isAvailable ? 'Available' : 'Insufficient'}
                                </span>
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ml-1 ${getUrgencyColor(item.urgency)}`}>
                                  {item.urgency?.toUpperCase()}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {request.notes && (
                        <p className="text-sm text-gray-600 mt-3 bg-gray-50 p-2 rounded">
                          Notes: {request.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    {request.status === 'pending_warehouse' && (
                      <button
                        onClick={() => handleApproveAndDispatch(request.id)}
                        disabled={processingRequest === request.id}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Send className="h-4 w-4" />
                        <span>{processingRequest === request.id ? 'Processing...' : 'Approve & Dispatch'}</span>
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/warehouse/production-requests/${request.id}`)}
                      className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                      title="View Details"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductionRequests;