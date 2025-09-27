import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Factory, Download, Search, Filter, Eye, FileSpreadsheet, Calendar, Package, CheckCircle, Clock } from 'lucide-react';
import { productionService } from '../../services/productionService';
import { formatDate } from '../../utils/formatDate';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import * as XLSX from 'xlsx';

const BatchTable = () => {
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [dateRange, setDateRange] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [batchData, productData] = await Promise.all([
        productionService.getBatches(),
        productionService.getProductionProducts()
      ]);
      
      setBatches(batchData);
      setProducts(productData);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (filteredBatches.length === 0) return;

    // Prepare data for Excel
    const excelData = [
      ['Production Batches Report'],
      ['Generated on: ' + new Date().toLocaleString()],
      [''],
      ['Batch Number', 'Product Name', 'Product Code', 'Status', 'Stage', 'Target Quantity', 'Output Quantity', 'Progress (%)', 'Priority', 'Created Date', 'Completed Date', 'Created By', 'Notes']
    ];

    const batchRows = filteredBatches.map(batch => [
      batch.batchNumber,
      batch.productName,
      batch.productCode || 'N/A',
      batch.status?.toUpperCase(),
      batch.stage?.replace('_', ' ').toUpperCase(),
      `${batch.targetQuantity} ${batch.unit}`,
      batch.outputQuantity ? `${batch.outputQuantity} ${batch.unit}` : 'N/A',
      `${batch.progress || 0}%`,
      batch.priority?.toUpperCase() || 'NORMAL',
      batch.createdAt ? new Date(batch.createdAt).toLocaleDateString() : 'N/A',
      batch.completedAt ? new Date(batch.completedAt).toLocaleDateString() : 'N/A',
      batch.createdByName || 'N/A',
      batch.notes || 'N/A'
    ]);

    const ws = XLSX.utils.aoa_to_sheet([...excelData, ...batchRows]);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // Batch Number
      { wch: 20 }, // Product Name
      { wch: 12 }, // Product Code
      { wch: 12 }, // Status
      { wch: 12 }, // Stage
      { wch: 15 }, // Target Quantity
      { wch: 15 }, // Output Quantity
      { wch: 10 }, // Progress
      { wch: 10 }, // Priority
      { wch: 12 }, // Created Date
      { wch: 12 }, // Completed Date
      { wch: 15 }, // Created By
      { wch: 30 }  // Notes
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Production Batches');
    XLSX.writeFile(wb, `production-batches-${new Date().toISOString().split('T')[0]}.xlsx`);
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

  const filteredBatches = batches.filter(batch => {
    const matchesSearch = batch.batchNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         batch.productName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !filterStatus || batch.status === filterStatus;
    const matchesProduct = !filterProduct || batch.productId === filterProduct;
    
    let matchesDate = true;
    if (dateRange !== 'all') {
      const batchDate = new Date(batch.createdAt);
      const now = new Date();
      
      switch (dateRange) {
        case 'week':
          matchesDate = (now - batchDate) <= (7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          matchesDate = (now - batchDate) <= (30 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          matchesDate = (now - batchDate) <= (90 * 24 * 60 * 60 * 1000);
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesProduct && matchesDate;
  });

  const getBatchSummary = () => {
    const total = filteredBatches.length;
    const active = filteredBatches.filter(b => !['completed', 'handed_over'].includes(b.status)).length;
    const completed = filteredBatches.filter(b => b.status === 'completed').length;
    const handedOver = filteredBatches.filter(b => b.status === 'handed_over').length;

    return { total, active, completed, handedOver };
  };

  const summary = getBatchSummary();

  if (loading) {
    return <LoadingSpinner text="Loading batch data..." />;
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Factory className="h-8 w-8 mr-3 text-blue-600" />
              Production Batch Table
            </h1>
            <p className="text-gray-600 mt-2">Comprehensive view of all production batches</p>
          </div>
          <button
            onClick={exportToExcel}
            disabled={filteredBatches.length === 0}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Export to Excel</span>
          </button>
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
              <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
            </div>
            <Factory className="h-8 w-8 text-gray-600" />
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Active Batches</p>
              <p className="text-2xl font-bold text-blue-900">{summary.active}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Completed</p>
              <p className="text-2xl font-bold text-green-900">{summary.completed}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-purple-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Handed Over</p>
              <p className="text-2xl font-bold text-purple-900">{summary.handedOver}</p>
            </div>
            <Package className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search batches or products..."
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                <option value="created">Created</option>
                <option value="mixing">Mixing</option>
                <option value="heating">Heating</option>
                <option value="cooling">Cooling</option>
                <option value="completed">Completed</option>
                <option value="handed_over">Handed Over</option>
                <option value="on_hold">On Hold</option>
              </select>
            </div>
            <div className="relative">
              <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <select
                value={filterProduct}
                onChange={(e) => setFilterProduct(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Products</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Time</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
              </select>
            </div>
          </div>
        </div>

        {/* Batch Table */}
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
                  Stage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Target Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Output Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completed Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cycle Time
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBatches.map((batch) => {
                const cycleTime = batch.completedAt && batch.createdAt ? 
                  Math.round((batch.completedAt - batch.createdAt) / (24 * 60 * 60 * 1000)) : null;
                
                return (
                  <tr key={batch.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      {batch.batchNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{batch.productName}</div>
                        <div className="text-sm text-gray-500">{batch.productCode || 'N/A'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(batch.status)}`}>
                        {batch.status?.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {batch.stage?.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {batch.targetQuantity} {batch.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {batch.outputQuantity ? `${batch.outputQuantity} ${batch.unit}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                            style={{width: `${batch.progress || 0}%`}}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">{batch.progress || 0}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(batch.priority)}`}>
                        {batch.priority?.toUpperCase() || 'NORMAL'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(batch.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {batch.completedAt ? formatDate(batch.completedAt) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {batch.createdByName || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {cycleTime ? `${cycleTime} days` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => navigate(`/production/batches/${batch.id}`)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredBatches.length === 0 && (
          <div className="text-center py-12">
            <Factory className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No batches found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {(searchTerm || filterStatus || filterProduct || dateRange !== 'all') 
                ? 'Try adjusting your search criteria.' 
                : 'No production batches have been created yet.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchTable;