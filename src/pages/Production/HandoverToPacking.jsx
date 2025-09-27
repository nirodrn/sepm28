import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, ArrowLeft, Package, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { productionService } from '../../services/productionService';
import { formatDate } from '../../utils/formatDate';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const HandoverToPacking = () => {
  const navigate = useNavigate();
  const [qcPassedBatches, setQCPassedBatches] = useState([]);
  const [handovers, setHandovers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [handoverData, setHandoverData] = useState({
    quantity: '',
    qualityGrade: 'A',
    expiryDate: '',
    storageInstructions: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [batches, handoverData] = await Promise.all([
        productionService.getBatches(),
        productionService.getBatchHandovers()
      ]);
      
      // Get batches that have passed QC
      const qcPassed = batches.filter(b => b.status === 'qc_passed');
      setQCPassedBatches(qcPassed);
      setHandovers(handoverData);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchSelect = (batch) => {
    setSelectedBatch(batch);
    setHandoverData({
      quantity: batch.outputQuantity || batch.targetQuantity || '',
      qualityGrade: 'A',
      expiryDate: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0], // 1 year from now
      storageInstructions: 'Store in cool, dry place',
      notes: ''
    });
    setShowHandoverModal(true);
  };

  const handleHandoverSubmit = async (e) => {
    e.preventDefault();
    try {
      const handoverPayload = {
        ...handoverData,
        quantity: parseInt(handoverData.quantity),
        unit: selectedBatch.unit,
        expiryDate: new Date(handoverData.expiryDate).getTime()
      };
      
      await productionService.handoverBatchToPacking(selectedBatch.id, handoverPayload);
      setShowHandoverModal(false);
      setSelectedBatch(null);
      await loadData();
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

  if (loading) {
    return <LoadingSpinner text="Loading batch data..." />;
  }

  return (
    <div className="p-6">
      {/* Handover Modal */}
      {showHandoverModal && selectedBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Handover Batch to Packing Area
            </h3>
            
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900">Batch: {selectedBatch.batchNumber}</h4>
              <p className="text-blue-700 text-sm">Product: {selectedBatch.productName}</p>
              <p className="text-blue-700 text-sm">Target: {selectedBatch.targetQuantity} {selectedBatch.unit}</p>
            </div>
            
            <form onSubmit={handleHandoverSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Actual Quantity *
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      min="1"
                      value={handoverData.quantity}
                      onChange={(e) => setHandoverData(prev => ({ ...prev, quantity: e.target.value }))}
                      required
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter actual quantity"
                    />
                    <input
                      type="text"
                      value={selectedBatch.unit}
                      readOnly
                      className="w-16 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quality Grade *
                  </label>
                  <select
                    value={handoverData.qualityGrade}
                    onChange={(e) => setHandoverData(prev => ({ ...prev, qualityGrade: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="A">Grade A - Excellent</option>
                    <option value="B">Grade B - Good</option>
                    <option value="C">Grade C - Acceptable</option>
                    <option value="D">Grade D - Poor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiry Date *
                  </label>
                  <input
                    type="date"
                    value={handoverData.expiryDate}
                    onChange={(e) => setHandoverData(prev => ({ ...prev, expiryDate: e.target.value }))}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Storage Instructions
                  </label>
                  <input
                    type="text"
                    value={handoverData.storageInstructions}
                    onChange={(e) => setHandoverData(prev => ({ ...prev, storageInstructions: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Storage requirements"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Handover Notes
                  </label>
                  <textarea
                    rows={3}
                    value={handoverData.notes}
                    onChange={(e) => setHandoverData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Add any handover notes..."
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowHandoverModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  Handover to Packing
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
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Send className="h-8 w-8 mr-3 text-purple-600" />
              Handover to Packing Area
            </h1>
            <p className="text-gray-600 mt-2">Transfer completed batches to Packing Area Manager</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* QC Passed Batches Ready for Handover */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">QC Passed Batches</h2>
          
          {qcPassedBatches.length === 0 ? (
            <div className="text-center py-8">
              <Package className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">No QC passed batches ready for handover</p>
            </div>
          ) : (
            <div className="space-y-4">
              {qcPassedBatches.map((batch) => (
                <div key={batch.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{batch.batchNumber}</h4>
                      <p className="text-sm text-gray-500">{batch.productName}</p>
                      <p className="text-sm text-gray-500">
                        Output: {batch.outputQuantity || batch.targetQuantity} {batch.unit}
                      </p>
                      <p className="text-sm text-gray-500">
                        QC Passed: {formatDate(batch.qcCompletedAt)}
                      </p>
                      <p className="text-sm text-gray-500">
                        Grade: {batch.qcGrade || 'A'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleBatchSelect(batch)}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                    >
                      <Send className="h-4 w-4" />
                      <span>Handover</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Handover History */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Handover History</h2>
          
          {handovers.length === 0 ? (
            <div className="text-center py-8">
              <Send className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">No handovers recorded yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {handovers.map((handover) => (
                <div key={handover.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium text-gray-900">{handover.batchNumber}</h4>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getHandoverStatusColor(handover.receivedByPacking)}`}>
                          {handover.receivedByPacking ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Received
                            </>
                          ) : (
                            <>
                              <Clock className="h-3 w-3 mr-1" />
                              Pending Receipt
                            </>
                          )}
                        </span>
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600">
                        <p><span className="font-medium">Product:</span> {handover.productName}</p>
                        <p><span className="font-medium">Quantity:</span> {handover.quantity} {handover.unit}</p>
                        <p><span className="font-medium">Quality:</span> 
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ml-1 ${getQualityGradeColor(handover.qualityGrade)}`}>
                            Grade {handover.qualityGrade}
                          </span>
                        </p>
                        <p><span className="font-medium">Handed Over:</span> {formatDate(handover.handoverDate)}</p>
                        {handover.expiryDate && (
                          <p><span className="font-medium">Expiry:</span> {new Date(handover.expiryDate).toLocaleDateString()}</p>
                        )}
                      </div>
                      
                      {handover.notes && (
                        <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                          Notes: {handover.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HandoverToPacking;