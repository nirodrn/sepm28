import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Factory, 
  RefreshCw, 
  Play, 
  Pause, 
  SkipForward, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Thermometer,
  Beaker,
  Timer,
  Plus,
  Eye
} from 'lucide-react';
import { productionService } from '../../services/productionService';
import { formatDate } from '../../utils/formatDate';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const ActiveBatchMonitor = () => {
  const navigate = useNavigate();
  const [activeBatches, setActiveBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [processingBatch, setProcessingBatch] = useState(null);

  useEffect(() => {
    loadActiveBatches();
    
    // Auto-refresh every 30 seconds if enabled
    let interval;
    if (autoRefresh) {
      interval = setInterval(loadActiveBatches, 30000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadActiveBatches = async () => {
    try {
      if (!loading) setLoading(true); // Only show spinner on initial load
      
      const batches = await productionService.getBatches();
      const active = batches.filter(b => !['completed', 'handed_over'].includes(b.status));
      
      setActiveBatches(active);
      
      // Auto-select first batch if none selected
      if (!selectedBatch && active.length > 0) {
        setSelectedBatch(active[0]);
      } else if (selectedBatch) {
        // Update selected batch data
        const updatedBatch = active.find(b => b.id === selectedBatch.id);
        if (updatedBatch) {
          setSelectedBatch(updatedBatch);
        }
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStageUpdate = async (batchId, newStage) => {
    try {
      setProcessingBatch(batchId);
      await productionService.updateBatchStage(batchId, newStage);
      await loadActiveBatches();
    } catch (error) {
      setError(error.message);
    } finally {
      setProcessingBatch(null);
    }
  };

  const handleProgressUpdate = async (batchId, outputQuantity) => {
    try {
      setProcessingBatch(batchId);
      await productionService.updateBatchProgress(batchId, { outputQuantity });
      await loadActiveBatches();
    } catch (error) {
      setError(error.message);
    } finally {
      setProcessingBatch(null);
    }
  };

  const handleUpdateProgress = async (batchId) => {
    // Implementation for updating progress
    console.log('Update progress for batch:', batchId);
  };

  const handleCompleteBatch = async (batchId) => {
    // Implementation for completing batch
    console.log('Complete batch:', batchId);
  };

  const getStageActions = (batch) => {
    const actions = [];
    const nextStage = getNextStage(batch?.stage);
    
    if (nextStage) {
      actions.push({
        label: `Move to ${nextStage.replace('_', ' ').toUpperCase()}`,
        action: () => handleStageUpdate(batch.id, nextStage),
        icon: SkipForward,
        color: 'bg-green-600 hover:bg-green-700'
      });
    }
    
    if (batch?.stage && ['mixing', 'heating', 'cooling'].includes(batch.stage)) {
      actions.push({
        label: 'Record QC',
        action: () => navigate(`/production/batches/${batch?.id}`, { state: { openQC: batch?.stage } }),
        icon: CheckCircle,
        color: 'bg-blue-600 hover:bg-blue-700'
      });
    }
    
    if (batch?.stage === 'completed' && !batch?.outputQuantity) {
      actions.push({
        label: 'Set Output Quantity',
        action: () => {
          const output = prompt(`Enter output quantity for ${batch?.batchNumber}:`, batch?.targetQuantity);
          if (output && !isNaN(output)) {
            handleProgressUpdate(batch?.id, parseInt(output));
          }
        },
        icon: Beaker,
        color: 'bg-orange-600 hover:bg-orange-700'
      });
    }
    
    return actions;
  };

  const getNextStage = (currentStage) => {
    if (!currentStage) return null;
    const stages = ['created', 'mixing', 'heating', 'cooling', 'qc_final', 'completed'];
    const currentIndex = stages.indexOf(currentStage);
    return currentIndex < stages.length - 1 ? stages[currentIndex + 1] : null;
  };

  const getStageTemperature = (stage) => {
    switch (stage) {
      case 'heating': return '85°C';
      case 'cooling': return '25°C';
      default: return 'Ambient';
    }
  };

  const getStageDuration = (stage) => {
    switch (stage) {
      case 'mixing': return '2-3 hours';
      case 'heating': return '4-6 hours';
      case 'cooling': return '8-12 hours';
      default: return 'Variable';
    }
  };

  const BatchStatusBadge = ({ status, stage }) => {
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
        status === 'completed' ? 'bg-green-100 text-green-800' :
        status === 'mixing' ? 'bg-yellow-100 text-yellow-800' :
        status === 'heating' ? 'bg-orange-100 text-orange-800' :
        status === 'cooling' ? 'bg-purple-100 text-purple-800' :
        'bg-gray-100 text-gray-800'
      }`}>
        {status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
      </span>
    );
  };

  if (loading && activeBatches.length === 0) {
    return <LoadingSpinner text="Loading active batches..." />;
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Factory className="h-8 w-8 mr-3 text-blue-600" />
              Active Batch Monitor
            </h1>
            <p className="text-gray-600">Real-time monitoring of production batches</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                autoRefresh 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
              <span>Auto Refresh</span>
            </button>
            <button
              onClick={loadActiveBatches}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh Now</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Batch List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Active Batches ({activeBatches.length})
              </h2>
              <button
                onClick={() => navigate('/production/create-batch')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center space-x-1"
              >
                <Plus className="h-3 w-3" />
                <span>New Batch</span>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeBatches.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <Factory className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No active batches</h3>
                  <p className="mt-1 text-sm text-gray-500">All batches are completed or handed over</p>
                </div>
              ) : (
                activeBatches.map((batch) => (
                  <div
                    key={batch.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-blue-100">
                          <Factory className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{batch?.batchNumber || 'Unknown'}</h4>
                          <p className="text-sm text-gray-500">{batch?.productName || 'Unknown Product'}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                          batch?.status === 'completed' ? 'bg-green-100 text-green-800' :
                          batch?.status === 'mixing' ? 'bg-yellow-100 text-yellow-800' :
                          batch?.status === 'heating' ? 'bg-orange-100 text-orange-800' :
                          batch?.status === 'cooling' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {batch?.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Target:</span>
                        <span className="font-medium">{batch?.targetQuantity || 0} {batch?.unit || 'units'}</span>
                      </div>
                      {batch?.outputQuantity && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Output:</span>
                          <span className="font-medium">{batch.outputQuantity} {batch?.unit || 'units'}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Stage:</span>
                        <span className="font-medium capitalize">{batch?.stage?.replace('_', ' ') || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Created:</span>
                        <span className="font-medium">{batch?.createdAt ? formatDate(batch.createdAt) : 'Unknown'}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>{batch?.progress || 0}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                          style={{width: `${batch?.progress || 0}%`}}
                        ></div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => navigate(`/production/batches/${batch?.id}`)}
                        className="text-blue-600 hover:text-blue-800 p-1 rounded"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      
                      <div className="flex items-center space-x-1">
                        {(batch?.progress || 0) < 100 && (
                          <button
                            onClick={() => handleUpdateProgress(batch?.id)}
                            disabled={processingBatch === batch?.id}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs transition-colors disabled:opacity-50"
                          >
                            Update
                          </button>
                        )}
                        
                        {(batch?.progress || 0) < 100 && (
                          <button
                            onClick={() => handleCompleteBatch(batch?.id)}
                            disabled={processingBatch === batch?.id}
                            className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs transition-colors disabled:opacity-50"
                          >
                            Complete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Batch Details Panel */}
        <div className="space-y-6">
          {selectedBatch ? (
            <>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedBatch?.batchNumber || 'Unknown Batch'}
                  </h3>
                  <button
                    onClick={() => navigate(`/production/batches/${selectedBatch?.id}`)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    View Full Details
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <span className="text-sm text-gray-500">Product:</span>
                    <p className="font-medium text-gray-900">{selectedBatch?.productName || 'Unknown Product'}</p>
                  </div>
                  
                  <div>
                    <span className="text-sm text-gray-500">Current Stage:</span>
                    <p className="font-medium text-gray-900 capitalize">{selectedBatch?.stage?.replace('_', ' ') || 'Unknown'}</p>
                  </div>
                  
                  <div>
                    <span className="text-sm text-gray-500">Temperature:</span>
                    <p className="font-medium text-gray-900">{getStageTemperature(selectedBatch?.stage)}</p>
                  </div>
                  
                  <div>
                    <span className="text-sm text-gray-500">Expected Duration:</span>
                    <p className="font-medium text-gray-900">{getStageDuration(selectedBatch?.stage)}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Progress</span>
                      <span className="text-sm font-medium text-gray-900">{selectedBatch?.progress || 0}%</span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                        style={{width: `${Math.min(selectedBatch?.progress || 0, 100)}%`}}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        {selectedBatch?.outputQuantity ? `${selectedBatch.outputQuantity}/${selectedBatch?.targetQuantity} ${selectedBatch?.unit}` : `Target: ${selectedBatch?.targetQuantity} ${selectedBatch?.unit}`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stage Progress */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Production Stages</h3>
                <div className="space-y-3">
                  {['created', 'mixing', 'heating', 'cooling', 'qc_final', 'completed'].map((stage, index) => {
                    const isCompleted = selectedBatch?.qcStages?.[stage]?.completed || 
                      ['created', 'mixing', 'heating', 'cooling', 'qc_final', 'completed'].indexOf(selectedBatch?.stage) > index;
                    const isCurrent = selectedBatch?.stage === stage;
                    
                    return (
                      <div key={stage} className={`flex items-center space-x-3 p-3 rounded-lg ${
                        isCurrent ? 'bg-blue-50 border border-blue-200' :
                        isCompleted ? 'bg-green-50' : 'bg-gray-50'
                      }`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          isCompleted ? 'bg-green-500' :
                          isCurrent ? 'bg-blue-500' : 'bg-gray-300'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle className="h-4 w-4 text-white" />
                          ) : isCurrent ? (
                            <Clock className="h-4 w-4 text-white" />
                          ) : (
                            <span className="text-white text-xs">{index + 1}</span>
                          )}
                        </div>
                        <span className={`font-medium capitalize ${
                          isCurrent ? 'text-blue-900' :
                          isCompleted ? 'text-green-900' : 'text-gray-600'
                        }`}>
                          {stage.replace('_', ' ')}
                        </span>
                        {selectedBatch?.qcStages?.[stage]?.completedAt && (
                          <span className="text-xs text-gray-500">
                            {formatDate(selectedBatch.qcStages[stage].completedAt)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  {getStageActions(selectedBatch).map((action, index) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={index}
                        onClick={action.action}
                        disabled={processingBatch === selectedBatch?.id}
                        className={`w-full ${action.color} text-white py-2 px-4 rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{processingBatch === selectedBatch?.id ? 'Processing...' : action.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Batch Timeline */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Batch Created</p>
                      <p className="text-xs text-gray-500">{selectedBatch?.createdAt ? formatDate(selectedBatch.createdAt) : 'Unknown'}</p>
                    </div>
                  </div>
                  
                  {Object.entries(selectedBatch?.qcStages || {}).map(([stage, data]) => (
                    data.completedAt && (
                      <div key={stage} className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 capitalize">
                            {stage.replace('_', ' ')} Completed
                          </p>
                          <p className="text-xs text-gray-500">{formatDate(data.completedAt)}</p>
                        </div>
                      </div>
                    )
                  ))}
                  
                  {selectedBatch?.completedAt && (
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Batch Completed</p>
                        <p className="text-xs text-gray-500">{formatDate(selectedBatch?.completedAt)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <Factory className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Batch</h3>
              <p className="text-gray-500">Choose a batch from the list to view details and controls</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActiveBatchMonitor;