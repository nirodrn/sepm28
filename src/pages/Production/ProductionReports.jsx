import React, { useState, useEffect } from 'react';
import { BarChart3, Calendar, Download, Filter, TrendingUp, Factory, Package, Clock } from 'lucide-react';
import { productionService } from '../../services/productionService';
import { formatDate } from '../../utils/formatDate';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const ProductionReports = () => {
  const [dateRange, setDateRange] = useState('month');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [reportType, setReportType] = useState('efficiency');
  const [batches, setBatches] = useState([]);
  const [qcRecords, setQCRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadReportData();
  }, [dateRange]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      const batchData = await productionService.getBatches();
      setBatches(batchData);
      
      // Collect QC records
      const allQCRecords = [];
      for (const batch of batchData) {
        try {
          const batchQCRecords = await productionService.getQCRecords(batch.id);
          allQCRecords.push(...batchQCRecords.map(record => ({
            ...record,
            batchId: batch.id,
            batchNumber: batch.batchNumber,
            productName: batch.productName
          })));
        } catch (error) {
          console.warn(`Failed to load QC records for batch ${batch.id}`);
        }
      }
      setQCRecords(allQCRecords);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getProductionEfficiency = () => {
    const completedBatches = batches.filter(b => b.status === 'completed');
    if (completedBatches.length === 0) return [];

    const productEfficiency = {};
    
    completedBatches.forEach(batch => {
      if (!productEfficiency[batch.productName]) {
        productEfficiency[batch.productName] = {
          productName: batch.productName,
          totalBatches: 0,
          totalTarget: 0,
          totalOutput: 0,
          avgCycleTime: 0,
          qcPassRate: 0
        };
      }
      
      const product = productEfficiency[batch.productName];
      product.totalBatches += 1;
      product.totalTarget += batch.targetQuantity || 0;
      product.totalOutput += batch.outputQuantity || batch.targetQuantity || 0;
      
      // Calculate cycle time (mock calculation)
      const cycleTime = batch.completedAt && batch.createdAt ? 
        Math.round((batch.completedAt - batch.createdAt) / (24 * 60 * 60 * 1000)) : 7;
      product.avgCycleTime += cycleTime;
    });

    // Calculate averages and QC pass rates
    Object.values(productEfficiency).forEach(product => {
      product.avgCycleTime = Math.round(product.avgCycleTime / product.totalBatches);
      product.efficiency = product.totalTarget > 0 ? 
        ((product.totalOutput / product.totalTarget) * 100).toFixed(1) : 0;
      
      // Calculate QC pass rate
      const productQCRecords = qcRecords.filter(qc => qc.productName === product.productName);
      product.qcPassRate = productQCRecords.length > 0 ? 
        ((productQCRecords.filter(qc => qc.passed).length / productQCRecords.length) * 100).toFixed(1) : 0;
    });

    return Object.values(productEfficiency);
  };

  const getBatchAnalysis = () => {
    const filteredBatches = selectedProduct ? 
      batches.filter(b => b.productName === selectedProduct) : batches;

    return filteredBatches.map(batch => {
      const batchQCRecords = qcRecords.filter(qc => qc.batchId === batch.id);
      const qcPassRate = batchQCRecords.length > 0 ? 
        ((batchQCRecords.filter(qc => qc.passed).length / batchQCRecords.length) * 100).toFixed(1) : 0;
      
      const cycleTime = batch.completedAt && batch.createdAt ? 
        Math.round((batch.completedAt - batch.createdAt) / (24 * 60 * 60 * 1000)) : null;
      
      const efficiency = batch.targetQuantity > 0 ? 
        (((batch.outputQuantity || batch.targetQuantity) / batch.targetQuantity) * 100).toFixed(1) : 0;

      return {
        ...batch,
        qcPassRate,
        cycleTime,
        efficiency
      };
    });
  };

  const renderEfficiencyReport = () => {
    const efficiencyData = getProductionEfficiency();
    
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Batches
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Efficiency
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Avg Cycle Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                QC Pass Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Output
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {efficiencyData.map((product, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {product.productName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {product.totalBatches}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`text-sm font-medium ${
                    product.efficiency >= 95 ? 'text-green-600' :
                    product.efficiency >= 85 ? 'text-blue-600' :
                    product.efficiency >= 75 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {product.efficiency}%
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {product.avgCycleTime} days
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`text-sm font-medium ${
                    product.qcPassRate >= 95 ? 'text-green-600' :
                    product.qcPassRate >= 85 ? 'text-blue-600' :
                    product.qcPassRate >= 75 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {product.qcPassRate}%
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {product.totalOutput.toLocaleString()} kg
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderBatchAnalysis = () => {
    const batchData = getBatchAnalysis();
    
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Batch Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Efficiency
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cycle Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                QC Pass Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {batchData.map((batch) => (
              <tr key={batch.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {batch.batchNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {batch.productName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    batch.status === 'completed' ? 'bg-green-100 text-green-800' :
                    batch.status === 'mixing' ? 'bg-yellow-100 text-yellow-800' :
                    batch.status === 'heating' ? 'bg-orange-100 text-orange-800' :
                    batch.status === 'cooling' ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {batch.status?.replace('_', ' ').toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {batch.efficiency}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {batch.cycleTime ? `${batch.cycleTime} days` : 'In Progress'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {batch.qcPassRate}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(batch.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const products = [...new Set(batches.map(b => b.productName))];

  if (loading) {
    return <LoadingSpinner text="Loading production reports..." />;
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <BarChart3 className="h-8 w-8 mr-3 text-purple-600" />
              Production Reports
            </h1>
            <p className="text-gray-600 mt-2">Analyze production efficiency and batch performance</p>
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            <Download className="h-4 w-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="efficiency">Production Efficiency</option>
                <option value="batches">Batch Analysis</option>
              </select>
            </div>
            {reportType === 'batches' && (
              <div className="flex items-center space-x-2">
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">All Products</option>
                  {products.map(product => (
                    <option key={product} value={product}>{product}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="p-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Batches</p>
                  <p className="text-2xl font-bold text-blue-900">{batches.length}</p>
                </div>
                <Factory className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Completed</p>
                  <p className="text-2xl font-bold text-green-900">
                    {batches.filter(b => b.status === 'completed').length}
                  </p>
                </div>
                <Package className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-600">In Progress</p>
                  <p className="text-2xl font-bold text-yellow-900">
                    {batches.filter(b => !['completed', 'handed_over'].includes(b.status)).length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">QC Pass Rate</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {qcRecords.length > 0 ? 
                      ((qcRecords.filter(qc => qc.passed).length / qcRecords.length) * 100).toFixed(1) : 0
                    }%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Report Content */}
          {reportType === 'efficiency' ? renderEfficiencyReport() : renderBatchAnalysis()}
        </div>
      </div>
    </div>
  );
};

export default ProductionReports;