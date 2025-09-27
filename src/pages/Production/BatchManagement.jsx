import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Factory, Plus, Eye, PlayCircle, PauseCircle, CheckCircle, Clock, Package, Send, Edit, AlertTriangle, Percent } from 'lucide-react';
import { productionService } from '../../services/productionService';
import { formatDate } from '../../utils/formatDate';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import { BatchCard, BatchStatusBadge, BatchProgressBar } from '../../components/Production';

const BatchManagement = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('active');
  const [batches, setBatches] = useState([]);
  const [products, setProducts] = useState([]);
  const [handovers, setHandovers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingBatch, setProcessingBatch] = useState(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [progressData, setProgressData] = useState({
    progress: '',
    outputQuantity: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [batchData, productData, handoverData] = await Promise.all([
        productionService.getBatches(),
        productionService.getProductionProducts(),
        productionService.getBatchHandovers()
      ]);
      
      setBatches(batchData);
      setProducts(productData.filter(p => p.status === 'active'));
      setHandovers(handoverData);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProgress = async (batchId) => {
    const batch = batches.find(b => b.id === batchId);
    if (batch) {
      setSelectedBatch(batch);
      setProgressData({
        progress: batch.progress?.toString() || '0',
        outputQuantity: batch.outputQuantity?.toString() || '',
        notes: ''
      });
      setShowProgressModal(true);
    }
  };

  const handleSaveProgress = async () => {
    try {
      setProcessingBatch(selectedBatch.id);
      await productionService.updateBatchProgress(selectedBatch.id, {
        progress: parseInt(progressData.progress),
        outputQuantity: progressData.outputQuantity ? parseInt(progressData.outputQuantity) : null,
        notes: progressData.notes
      });
      await loadData();
      setShowProgressModal(false);
      setSelectedBatch(null);
    } catch (error) {
      setError(error.message);
    } finally {
      setProcessingBatch(null);
    }
  };

  const handleCompleteBatch = async (batchId) => {
    try {
      setProcessingBatch(batchId);
      await productionService.updateBatchProgress(batchId, {
        progress: 100,
        status: 'completed',
        completedAt: Date.now()
      });
      await loadData();
    } catch (error) {
      setError(error.message);
    } finally {
      setProcessingBatch(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'created':
        return 'bg-blue-100 text-blue-800';
      case 'mixing':
        return 'bg-yellow-100 text-yellow-800';
      case 'heating':
        return 'bg-orange-100 text-orange-800';
      case 'cooling':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'handed_over':
        return 'bg-gray-100 text-gray-800';
      case 'on_hold':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
      case 'handed_over':
        return <CheckCircle className="h-4 w-4" />;
      case 'mixing':
      case 'heating':
      case 'cooling':
        return <PlayCircle className="h-4 w-4" />;
      case 'on_hold':
        return <PauseCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getNextStage = (currentStage) => {
    const stages = ['created', 'mixing', 'heating', 'cooling', 'qc_final', 'completed'];
    const currentIndex = stages.indexOf(currentStage);
    return currentIndex < stages.length - 1 ? stages[currentIndex + 1] : null;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
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

  const getEfficiencyColor = (efficiency) => {
    if (efficiency >= 95) return 'text-green-600';
    if (efficiency >= 85) return 'text-blue-600';
    if (efficiency >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const calculateEfficiency = (batch) => {
    if (!batch.outputQuantity || !batch.targetQuantity) return 0;
    return ((batch.outputQuantity / batch.targetQuantity) * 100).toFixed(1);
  };

  const calculateCycleTime = (batch) => {
    if (!batch.completedAt || !batch.createdAt) return null;
    return Math.round((batch.completedAt - batch.createdAt) / (24 * 60 * 60 * 1000));
  };

  const filteredBatches = batches.filter(batch => {
    switch (activeTab) {
      case 'active':
        return !['completed', 'handed_over'].includes(batch.status) && (batch.progress || 0) < 100;
      case 'completed':
        return batch.status === 'completed' || (batch.progress || 0) >= 100;
      case 'handed_over':
        return batch.status === 'handed_over';
      default:
        return true;
    }
  });

  const tabs = [
    { 
      id: 'active', 
      label: 'Active Batches', 
      count: batches.filter(b => !['completed', 'handed_over'].includes(b.status) && (b.progress || 0) < 100).length,
      icon: PlayCircle
    },
    { 
      id: 'completed', 
      label: 'Completed', 
      count: batches.filter(b => b.status === 'completed' || (b.progress || 0) >= 100).length,
      icon: CheckCircle
    },
    { 
      id: 'handed_over', 
      label: 'Handed Over', 
      count: batches.filter(b => b.status === 'handed_over').length,
      icon: Send
    }
  ];

  if (loading) {
    return <LoadingSpinner text="Loading batch data..." />;
  }

  return (
    <div className="p-6">
      {/* Progress Update Modal */}
      {showProgressModal && selectedBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Update Progress - {selectedBatch.batchNumber}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Progress Percentage (0-100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={progressData.progress}
                  onChange={(e) => setProgressData(prev => ({ ...prev, progress: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter progress percentage"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Output Quantity (Optional)
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    min="0"
                    value={progressData.outputQuantity}
                    onChange={(e) => setProgressData(prev => ({ ...prev, outputQuantity: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter output quantity"
                  />
                  <span className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-600">
                    {selectedBatch.unit}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={progressData.notes}
                  onChange={(e) => setProgressData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add any notes about the progress..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowProgressModal(false);
                  setSelectedBatch(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProgress}
                disabled={!progressData.progress}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Update Progress
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Factory className="h-8 w-8 mr-3 text-blue-600" />
              Batch Management
            </h1>
            <p className="text-gray-600">Create and track production batches through all stages</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/production/batch-table')}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Package className="h-4 w-4" />
              <span>Table View</span>
            </button>
            <button
              onClick={() => navigate('/production/create-batch')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create Batch</span>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Batches</p>
              <p className="text-2xl font-bold text-gray-900">{batches.length}</p>
            </div>
            <Factory className="h-8 w-8 text-gray-600" />
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Active Batches</p>
              <p className="text-2xl font-bold text-blue-900">
                {batches.filter(b => !['completed', 'handed_over'].includes(b.status) && (b.progress || 0) < 100).length}
              </p>
            </div>
            <PlayCircle className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Completed Today</p>
              <p className="text-2xl font-bold text-green-900">
                {batches.filter(b => 
                  (b.status === 'completed' || (b.progress || 0) >= 100) && 
                  new Date(b.completedAt).toDateString() === new Date().toDateString()
                ).length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-purple-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Avg Efficiency</p>
              <p className="text-2xl font-bold text-purple-900">
                {batches.filter(b => b.status === 'completed' || (b.progress || 0) >= 100).length > 0 ? 
                  (batches.filter(b => b.status === 'completed' || (b.progress || 0) >= 100).reduce((sum, b) => 
                    sum + parseFloat(calculateEfficiency(b)), 0
                  ) / batches.filter(b => b.status === 'completed' || (b.progress || 0) >= 100).length).toFixed(1) : 0
                }%
              </p>
            </div>
            <div className="h-8 w-8 bg-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">%</span>
            </div>
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

      {/* Batch List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {activeTab === 'active' ? (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBatches.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <Factory className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No active batches</h3>
                  <p className="mt-1 text-sm text-gray-500">Create a new batch to get started</p>
                  <button
                    onClick={() => navigate('/production/create-batch')}
                    className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 mx-auto"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create First Batch</span>
                  </button>
                </div>
              ) : (
                filteredBatches.map((batch) => (
                  <BatchCard
                    key={batch.id}
                    batch={batch}
                    onUpdateProgress={handleUpdateProgress}
                    onComplete={handleCompleteBatch}
                    onViewDetails={(id) => navigate(`/production/batches/${id}`)}
                    onEdit={(id) => navigate(`/production/batches/${id}`, { state: { editMode: true } })}
                    processing={processingBatch === batch.id}
                  />
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
          {filteredBatches.length === 0 ? (
            <div className="text-center py-12">
              <Factory className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {activeTab === 'active' ? 'No active batches' : 
                 activeTab === 'completed' ? 'No completed batches' : 
                 'No handed over batches'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {activeTab === 'active' ? 'Create a new batch to get started' : 
                 `No ${activeTab.replace('_', ' ')} batches found`}
              </p>
              {activeTab === 'active' && (
                <button
                  onClick={() => navigate('/production/create-batch')}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 mx-auto"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create First Batch</span>
                </button>
              )}
            </div>
          ) : (
            filteredBatches.map((batch) => {
              const efficiency = calculateEfficiency(batch);
              const cycleTime = calculateCycleTime(batch);
              const nextStage = getNextStage(batch.stage);
              const handover = handovers.find(h => h.batchId === batch.id);
              
              return (
                <div key={batch.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="p-2 rounded-lg bg-blue-100">
                        {getStatusIcon(batch.status)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-medium text-gray-900">
                            {batch.batchNumber}
                          </h4>
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(batch.status)}`}>
                            {getStatusIcon(batch.status)}
                            <span className="ml-1">{batch.status?.replace('_', ' ').toUpperCase()}</span>
                          </span>
                          {batch.priority && batch.priority !== 'normal' && (
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(batch.priority)}`}>
                              {batch.priority?.toUpperCase()}
                            </span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-3 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Product:</span>
                            <span className="ml-1">{batch.productName}</span>
                          </div>
                          <div>
                            <span className="font-medium">Target:</span>
                            <span className="ml-1">{batch.targetQuantity} {batch.unit}</span>
                          </div>
                          <div>
                            <span className="font-medium">Output:</span>
                            <span className="ml-1">
                              {batch.outputQuantity ? `${batch.outputQuantity} ${batch.unit}` : 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">Stage:</span>
                            <span className="ml-1 capitalize">{batch.stage?.replace('_', ' ')}</span>
                          </div>
                          <div>
                            <span className="font-medium">Created:</span>
                            <span className="ml-1">{formatDate(batch.createdAt)}</span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="flex items-center space-x-4 mb-3">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                              style={{width: `${batch.progress || 0}%`}}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600 min-w-[3rem]">{batch.progress || 0}%</span>
                        </div>

                        {/* Performance Metrics for Completed/Handed Over Batches */}
                        {['completed', 'handed_over'].includes(batch.status) && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3 text-sm">
                            <div className="bg-gray-50 rounded-lg p-3">
                              <span className="text-gray-600">Efficiency:</span>
                              <span className={`ml-2 font-medium ${getEfficiencyColor(efficiency)}`}>
                                {efficiency}%
                              </span>
                            </div>
                            {cycleTime && (
                              <div className="bg-gray-50 rounded-lg p-3">
                                <span className="text-gray-600">Cycle Time:</span>
                                <span className="ml-2 font-medium text-gray-900">{cycleTime} days</span>
                              </div>
                            )}
                            {batch.completedAt && (
                              <div className="bg-gray-50 rounded-lg p-3">
                                <span className="text-gray-600">Completed:</span>
                                <span className="ml-2 font-medium text-gray-900">{formatDate(batch.completedAt)}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Handover Information */}
                        {batch.status === 'handed_over' && handover && (
                          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-purple-900">Handed Over to Packing</p>
                                <p className="text-sm text-purple-700">
                                  {handover.quantity} {handover.unit} • Quality: Grade {handover.qualityGrade}
                                </p>
                                <p className="text-sm text-purple-700">
                                  Date: {formatDate(handover.handoverDate)}
                                </p>
                              </div>
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                handover.receivedByPacking ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {handover.receivedByPacking ? 'Received by Packing' : 'Awaiting Receipt'}
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {batch.notes && (
                          <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                            Notes: {batch.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2 ml-4">
                      {/* Active Batch Actions */}
                      {activeTab === 'active' && (
                        <>
                          <button
                            onClick={() => handleUpdateProgress(batch.id)}
                            disabled={processingBatch === batch.id}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors disabled:opacity-50 flex items-center space-x-1"
                          >
                            <Percent className="h-3 w-3" />
                            <span>{processingBatch === batch.id ? 'Processing...' : 'Update Progress'}</span>
                          </button>
                          
                          {batch.progress < 100 && (
                            <button
                              onClick={() => handleCompleteBatch(batch.id)}
                              disabled={processingBatch === batch.id}
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors disabled:opacity-50 flex items-center space-x-1"
                            >
                              <CheckCircle className="h-3 w-3" />
                              <span>{processingBatch === batch.id ? 'Processing...' : 'Complete Batch'}</span>
                            </button>
                          )}
                        </>
                      )}

                      {/* Universal Actions */}
                      <button
                        onClick={() => navigate(`/production/batches/${batch.id}`)}
                        className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      
                      {activeTab === 'active' && (
                        <button
                          onClick={() => navigate(`/production/batches/${batch.id}`, { state: { editMode: true } })}
                          className="text-indigo-600 hover:text-indigo-800 p-2 rounded-lg hover:bg-indigo-50 transition-colors"
                          title="Edit Batch"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        )}
      </div>

      {/* Quick Actions for Active Tab */}
      {activeTab === 'active' && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-blue-900">Quick Actions</h3>
              <p className="text-blue-700 text-sm">Manage your production batches efficiently</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/production/qc-records')}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <CheckCircle className="h-4 w-4" />
                <span>QC Records</span>
              </button>
              <button
                onClick={() => navigate('/production/reports')}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <Package className="h-4 w-4" />
                <span>Production Reports</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchManagement;