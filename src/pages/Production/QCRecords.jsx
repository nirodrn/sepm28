import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, Search, Filter, Eye, CheckCircle, XCircle, Calendar, Star, AlertTriangle } from 'lucide-react';
import { productionService } from '../../services/productionService';
import { formatDate } from '../../utils/formatDate';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const QCRecords = () => {
  const navigate = useNavigate();
  const [completedBatches, setCompletedBatches] = useState([]);
  const [qcRecords, setQCRecords] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterResult, setFilterResult] = useState('');
  const [dateRange, setDateRange] = useState('month');
  const [showQCModal, setShowQCModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [qcFormData, setQCFormData] = useState({
    overallGrade: 'A',
    appearance: '',
    color: '',
    odor: '',
    texture: '',
    remarks: '',
    passed: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const batchData = await Promise.all([
        productionService.getBatches()
      ]);
      
      setBatches(batchData[0]);
      
      // Get completed batches that need QC
      const completed = batchData[0].filter(b => b.status === 'completed' && !b.qcCompleted);
      setCompletedBatches(completed);
      
      // Collect all QC records from all batches
      const allQCRecords = [];
      for (const batch of batchData[0]) {
        try {
          const batchQCRecords = await productionService.getQCRecords(batch.id);
          const recordsWithBatchInfo = batchQCRecords.map(record => ({
            ...record,
            batchId: batch.id,
            batchNumber: batch.batchNumber,
            productName: batch.productName
          }));
          allQCRecords.push(...recordsWithBatchInfo);
        } catch (error) {
          console.warn(`Failed to load QC records for batch ${batch.id}:`, error);
        }
      }
      
      setQCRecords(allQCRecords);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQCBatch = (batch) => {
    setSelectedBatch(batch);
    setQCFormData({
      overallGrade: 'A',
      appearance: '',
      color: '',
      odor: '',
      texture: '',
      remarks: '',
      passed: true
    });
    setShowQCModal(true);
  };

  const handleQCSubmit = async () => {
    try {
      // Record QC data
      await productionService.recordQCData(selectedBatch.id, 'final_qc', qcFormData);
      
      // Update batch status based on QC result
      const newStatus = qcFormData.passed ? 'qc_passed' : 'qc_failed';
      await productionService.updateBatchProgress(selectedBatch.id, {
        status: newStatus,
        qcCompleted: true,
        qcCompletedAt: Date.now(),
        qcGrade: qcFormData.overallGrade
      });
      
      setShowQCModal(false);
      setSelectedBatch(null);
      await loadData();
    } catch (error) {
      setError(error.message);
    }
  };

  const handlePassBatch = async (batchId) => {
    try {
      await productionService.updateBatchProgress(batchId, {
        status: 'qc_passed',
        qcCompleted: true,
        qcCompletedAt: Date.now(),
        qcGrade: 'A'
      });
      await loadData();
    } catch (error) {
      setError(error.message);
    }
  };

  const getResultColor = (passed) => {
    return passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getStageColor = (stage) => {
    switch (stage) {
      case 'mixing':
        return 'bg-yellow-100 text-yellow-800';
      case 'heating':
        return 'bg-orange-100 text-orange-800';
      case 'cooling':
        return 'bg-purple-100 text-purple-800';
      case 'final':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredRecords = qcRecords.filter(record => {
    const matchesSearch = record.batchNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.productName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStage = !filterStage || record.stage === filterStage;
    const matchesResult = !filterResult || record.passed.toString() === filterResult;
    
    return matchesSearch && matchesStage && matchesResult;
  });

  const getQCSummary = () => {
    const total = filteredRecords.length;
    const passed = filteredRecords.filter(r => r.passed).length;
    const failed = filteredRecords.filter(r => !r.passed).length;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

    return { total, passed, failed, passRate };
  };

  const summary = getQCSummary();

  if (loading) {
    return <LoadingSpinner text="Loading QC records..." />;
  }

  return (
    <div className="p-6">
      {/* QC Modal */}
      {showQCModal && selectedBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Quality Control - {selectedBatch.batchNumber}
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Overall Grade
                  </label>
                  <select
                    value={qcFormData.overallGrade}
                    onChange={(e) => setQCFormData(prev => ({ ...prev, overallGrade: e.target.value }))}
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Appearance
                  </label>
                  <input
                    type="text"
                    value={qcFormData.appearance}
                    onChange={(e) => setQCFormData(prev => ({ ...prev, appearance: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe appearance"
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
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowQCModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleQCSubmit}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                Save QC Results
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <ClipboardCheck className="h-8 w-8 mr-3 text-green-600" />
          Production QC Records
        </h1>
        <p className="text-gray-600">View quality control history for all production batches</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Completed Batches Awaiting QC */}
      {completedBatches.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Completed Batches Awaiting QC</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {completedBatches.map((batch) => (
                <div key={batch.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{batch.batchNumber}</h4>
                      <p className="text-sm text-gray-500">{batch.productName}</p>
                      <p className="text-sm text-gray-500">
                        Output: {batch.outputQuantity || batch.targetQuantity} {batch.unit}
                      </p>
                      <p className="text-sm text-gray-500">
                        Completed: {formatDate(batch.completedAt)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePassBatch(batch.id)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Pass</span>
                      </button>
                      <button
                        onClick={() => handleQCBatch(batch)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                      >
                        <ClipboardCheck className="h-4 w-4" />
                        <span>Grade & QC</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total QC Checks</p>
              <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
            </div>
            <ClipboardCheck className="h-8 w-8 text-gray-600" />
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Passed</p>
              <p className="text-2xl font-bold text-green-900">{summary.passed}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-red-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Failed</p>
              <p className="text-2xl font-bold text-red-900">{summary.failed}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Pass Rate</p>
              <p className="text-2xl font-bold text-blue-900">{summary.passRate}%</p>
            </div>
            <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">%</span>
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
                placeholder="Search batch number or product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">All Stages</option>
                <option value="mixing">Mixing</option>
                <option value="heating">Heating</option>
                <option value="cooling">Cooling</option>
                <option value="final">Final QC</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={filterResult}
                onChange={(e) => setFilterResult(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">All Results</option>
                <option value="true">Passed</option>
                <option value="false">Failed</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Batch
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Temperature
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  pH
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Result
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  QC Officer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{record.batchNumber}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{record.productName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStageColor(record.stage)}`}>
                      {record.stage?.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.temperature ? `${record.temperature}°C` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.ph || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getResultColor(record.passed)}`}>
                      {record.passed ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Passed
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 mr-1" />
                          Failed
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.qcOfficerName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(record.timestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => navigate(`/production/batches/${record.batchId}`)}
                      className="text-blue-600 hover:text-blue-900 p-1 rounded"
                      title="View Batch"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRecords.length === 0 && (
          <div className="text-center py-12">
            <ClipboardCheck className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No QC records found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filterStage || filterResult ? 'Try adjusting your search criteria.' : 'QC records will appear here after quality checks are performed.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QCRecords;