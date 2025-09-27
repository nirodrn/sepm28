import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Factory, 
  ArrowLeft, 
  PlayCircle, 
  PauseCircle, 
  CheckCircle, 
  Clock,
  Package,
  Send,
  ClipboardCheck,
  AlertTriangle,
  Edit
} from 'lucide-react';
import { productionService } from '../../services/productionService';
import { formatDate } from '../../utils/formatDate';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const BatchDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [batch, setBatch] = useState(null);
  const [qcRecords, setQCRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showQCModal, setShowQCModal] = useState(false);
  const [selectedStage, setSelectedStage] = useState('');
  const [qcFormData, setQCFormData] = useState({
    temperature: '',
    ph: '',
    viscosity: '',
    color: '',
    odor: '',
    texture: '',
    remarks: '',
    passed: true
  });

  useEffect(() => {
    if (id) {
      loadBatchData();
    }
  }, [id]);

  const loadBatchData = async () => {
    try {
      setLoading(true);
      const [batches, qcData] = await Promise.all([
        productionService.getBatches(),
        productionService.getQCRecords(id)
      ]);
      
      const batchData = batches.find(b => b.id === id);
      if (!batchData) {
        setError('Batch not found');
        return;
      }
      
      setBatch(batchData);
      setQCRecords(qcData);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStageUpdate = async (newStage) => {
    try {
      await productionService.updateBatchStage(id, newStage);
      await loadBatchData();
    } catch (error) {
      setError(error.message);
    }
  };

  const handleQCSubmit = async (e) => {
    e.preventDefault();
    try {
      await productionService.recordQCData(id, selectedStage, qcFormData);
      setShowQCModal(false);
      setSelectedStage('');
      setQCFormData({
        temperature: '',
        ph: '',
        viscosity: '',
        color: '',
        odor: '',
        texture: '',
        remarks: '',
        passed: true
      });
      await loadBatchData();
    } catch (error) {
      setError(error.message);
    }
  };

  const handleHandoverToPacking = async () => {
    try {
      await productionService.handoverBatchToPacking(id, {
        quantity: batch.outputQuantity || batch.targetQuantity,
        unit: batch.unit,
        qualityGrade: 'A',
        expiryDate: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year from now
        storageInstructions: 'Store in cool, dry place',
        notes: 'Batch completed and ready for packing'
      });
      
      navigate('/production/handover');
    } catch (error) {
      setError(error.message);
    }
  };

  const getHandoverStatusColor = (receivedByPacking) => {
    return receivedByPacking ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
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

  const getStageIcon = (stage) => {
    switch (stage) {
      case 'completed':
        return <CheckCircle className="h-5 w-5" />;
      case 'mixing':
      case 'heating':
      case 'cooling':
        return <PlayCircle className="h-5 w-5" />;
      case 'on_hold':
        return <PauseCircle className="h-5 w-5" />;
      default:
        return <Clock className="h-5 w-5" />;
    }
  };

  const getNextStage = (currentStage) => {
    const stages = ['created', 'mixing', 'heating', 'cooling', 'qc_final', 'completed'];
    const currentIndex = stages.indexOf(currentStage);
    return currentIndex < stages.length - 1 ? stages[currentIndex + 1] : null;
  };

  const openQCModal = (stage) => {
    setSelectedStage(stage);
    setShowQCModal(true);
  };

  if (loading) {
    return <LoadingSpinner text="Loading batch details..." />;
  }

  if (!batch) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Batch not found</h3>
          <button
            onClick={() => navigate('/production/batches')}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Back to Batches
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* QC Modal */}
      {showQCModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              QC Check - {selectedStage.charAt(0).toUpperCase() + selectedStage.slice(1)} Stage
            </h3>
            
            <form onSubmit={handleQCSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Temperature (°C)
                  </label>
                  <input
                    type="number"
                    value={qcFormData.temperature}
                    onChange={(e) => setQCFormData(prev => ({ ...prev, temperature: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter temperature"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    pH Level
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={qcFormData.ph}
                    onChange={(e) => setQCFormData(prev => ({ ...prev, ph: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter pH"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Viscosity
                  </label>
                  <input
                    type="text"
                    value={qcFormData.viscosity}
                    onChange={(e) => setQCFormData(prev => ({ ...prev, viscosity: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter viscosity"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color
                  </label>
                  <input
                    type="text"
                    value={qcFormData.color}
                    onChange={(e) => setQCFormData(prev => ({ ...prev, color: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe color"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Odor
                  </label>
                  <input
                    type="text"
                    value={qcFormData.odor}
                    onChange={(e) => setQCFormData(prev => ({ ...prev, odor: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe odor"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Texture
                  </label>
                  <input
                    type="text"
                    value={qcFormData.texture}
                    onChange={(e) => setQCFormData(prev => ({ ...prev, texture: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe texture"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    QC Remarks
                  </label>
                  <textarea
                    rows={3}
                    value={qcFormData.remarks}
                    onChange={(e) => setQCFormData(prev => ({ ...prev, remarks: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Add QC observations..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    QC Result
                  </label>
                  <select
                    value={qcFormData.passed}
                    onChange={(e) => setQCFormData(prev => ({ ...prev, passed: e.target.value === 'true' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="true">Passed</option>
                    <option value="false">Failed</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowQCModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  Save QC Results
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/production/batches')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Factory className="h-8 w-8 mr-3 text-blue-600" />
              {batch.batchNumber}
            </h1>
            <p className="text-gray-600 mt-2">
              Product: {batch.productName} • Target: {batch.targetQuantity} {batch.unit}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(batch.status)}`}>
              {getStageIcon(batch.status)}
              <span className="ml-2">{batch.status?.replace('_', ' ').toUpperCase()}</span>
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Batch Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Batch Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500">Batch Number</p>
                <p className="font-medium text-gray-900">{batch.batchNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Product</p>
                <p className="font-medium text-gray-900">{batch.productName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Target Quantity</p>
                <p className="font-medium text-gray-900">{batch.targetQuantity} {batch.unit}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Current Stage</p>
                <p className="font-medium text-gray-900 capitalize">{batch.stage}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Progress</p>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                      style={{width: `${batch.progress || 0}%`}}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600">{batch.progress || 0}%</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Created</p>
                <p className="font-medium text-gray-900">{formatDate(batch.createdAt)}</p>
              </div>
            </div>

            {batch.notes && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Batch Notes</h4>
                <p className="text-gray-700">{batch.notes}</p>
              </div>
            )}
          </div>

          {/* Raw Materials Used */}
          {batch.rawMaterials && batch.rawMaterials.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Raw Materials Used</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Material
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {batch.rawMaterials.map((material, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {material.materialName}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {material.quantity} {material.unit}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {material.notes || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* QC Records */}
          {qcRecords.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quality Control Records</h3>
              <div className="space-y-4">
                {qcRecords.map((record) => (
                  <div key={record.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 capitalize">{record.stage} Stage QC</h4>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        record.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {record.passed ? 'Passed' : 'Failed'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Temperature:</span>
                        <span className="ml-1 font-medium">{record.temperature}°C</span>
                      </div>
                      <div>
                        <span className="text-gray-500">pH:</span>
                        <span className="ml-1 font-medium">{record.ph}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Viscosity:</span>
                        <span className="ml-1 font-medium">{record.viscosity}</span>
                      </div>
                    </div>
                    {record.remarks && (
                      <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                        {record.remarks}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      By: {record.qcOfficerName} • {formatDate(record.timestamp)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Batch Actions</h3>
            <div className="space-y-3">
              {!['completed', 'handed_over'].includes(batch.status) && getNextStage(batch.stage) && (
                <button
                  onClick={() => handleStageUpdate(getNextStage(batch.stage))}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                >
                  <PlayCircle className="h-4 w-4" />
                  <span>Move to {getNextStage(batch.stage)?.replace('_', ' ').toUpperCase()}</span>
                </button>
              )}

              {['mixing', 'heating', 'cooling'].includes(batch.stage) && (
                <button
                  onClick={() => openQCModal(batch.stage)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                >
                  <ClipboardCheck className="h-4 w-4" />
                  <span>Record QC</span>
                </button>
              )}

              {batch.status === 'completed' && (
                <button
                  onClick={handleHandoverToPacking}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                >
                  <Send className="h-4 w-4" />
                  <span>Handover to Packing</span>
                </button>
              )}
            </div>
          </div>

          {/* Stage Progress */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Production Stages</h3>
            <div className="space-y-3">
              {['created', 'mixing', 'heating', 'cooling', 'qc_final', 'completed'].map((stage, index) => {
                const isCompleted = batch.qcStages?.[stage]?.completed || 
                  ['created', 'mixing', 'heating', 'cooling', 'qc_final', 'completed'].indexOf(batch.stage) > index;
                const isCurrent = batch.stage === stage;
                
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
                    {batch.qcStages?.[stage]?.completedAt && (
                      <span className="text-xs text-gray-500">
                        {formatDate(batch.qcStages[stage].completedAt)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Batch Timeline */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Batch Timeline</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Batch Created</p>
                  <p className="text-xs text-gray-500">{formatDate(batch.createdAt)}</p>
                </div>
              </div>
              
              {Object.entries(batch.qcStages || {}).map(([stage, data]) => (
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
              
              {batch.completedAt && (
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Batch Completed</p>
                    <p className="text-xs text-gray-500">{formatDate(batch.completedAt)}</p>
                  </div>
                </div>
              )}
              
              {batch.handedOverAt && (
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Handed Over to Packing</p>
                    <p className="text-xs text-gray-500">{formatDate(batch.handedOverAt)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchDetail;