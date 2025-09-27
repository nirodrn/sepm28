import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Send, 
  ArrowLeft, 
  Search, 
  Filter, 
  Calendar, 
  Package, 
  Box, 
  Layers,
  Eye,
  Download,
  CheckCircle,
  Clock,
  FileSpreadsheet
} from 'lucide-react';
import { fgDispatchService } from '../../services/fgDispatchService';
import { packingAreaProductService } from '../../services/packingAreaProductService';
import { formatDate } from '../../utils/formatDate';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import * as XLSX from 'xlsx';

const DispatchHistory = () => {
  const navigate = useNavigate();
  const [bulkDispatches, setBulkDispatches] = useState([]);
  const [unitDispatches, setUnitDispatches] = useState([]);
  const [combinedDispatches, setCombinedDispatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'bulk', 'units'
  const [filterStatus, setFilterStatus] = useState('');
  const [dateRange, setDateRange] = useState('all');

  useEffect(() => {
    loadDispatchHistory();
  }, []);

  const loadDispatchHistory = async () => {
    try {
      setLoading(true);
      const [bulkData, unitData] = await Promise.all([
        fgDispatchService.getFGDispatches(),
        packingAreaProductService.getFGUnitDispatches()
      ]);
      
      setBulkDispatches(bulkData);
      setUnitDispatches(unitData);
      
      // Combine and normalize dispatches
      const combined = [
        ...bulkData.map(dispatch => ({
          ...dispatch,
          type: 'bulk',
          dispatchDate: dispatch.dispatchedAt,
          releaseCode: dispatch.releaseCode,
          totalQuantity: dispatch.totalQuantity,
          totalItems: dispatch.totalItems,
          status: dispatch.claimedByFG ? 'claimed' : 'dispatched'
        })),
        ...unitData.map(dispatch => ({
          ...dispatch,
          type: 'units',
          dispatchDate: dispatch.dispatchedAt,
          releaseCode: dispatch.releaseCode,
          totalQuantity: dispatch.totalUnits,
          totalItems: dispatch.totalVariants,
          status: dispatch.claimedByFG ? 'claimed' : 'dispatched'
        }))
      ].sort((a, b) => b.dispatchDate - a.dispatchDate);
      
      setCombinedDispatches(combined);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (filteredDispatches.length === 0) return;

    // Prepare data for Excel
    const excelData = [
      ['Packing Area Dispatch History'],
      ['Generated on: ' + new Date().toLocaleString()],
      [''],
      ['Release Code', 'Type', 'Status', 'Total Items', 'Total Quantity/Units', 'Dispatched Date', 'Dispatched By', 'Claimed Date', 'Claimed By', 'Notes']
    ];

    const dispatchRows = filteredDispatches.map(dispatch => [
      dispatch.releaseCode,
      dispatch.type === 'bulk' ? 'Bulk Materials' : 'Packaged Units',
      dispatch.status === 'claimed' ? 'Claimed by FG Store' : 'Awaiting Claim',
      dispatch.totalItems,
      dispatch.type === 'bulk' ? `${dispatch.totalQuantity} (bulk)` : `${dispatch.totalQuantity} units`,
      new Date(dispatch.dispatchDate).toLocaleString(),
      dispatch.dispatchedByName || 'N/A',
      dispatch.claimedAt ? new Date(dispatch.claimedAt).toLocaleString() : 'Not claimed',
      dispatch.claimedByName || 'N/A',
      dispatch.notes || 'N/A'
    ]);

    const ws = XLSX.utils.aoa_to_sheet([...excelData, ...dispatchRows]);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // Release Code
      { wch: 15 }, // Type
      { wch: 15 }, // Status
      { wch: 12 }, // Total Items
      { wch: 20 }, // Total Quantity/Units
      { wch: 20 }, // Dispatched Date
      { wch: 20 }, // Dispatched By
      { wch: 20 }, // Claimed Date
      { wch: 20 }, // Claimed By
      { wch: 30 }  // Notes
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dispatch History');
    XLSX.writeFile(wb, `packing-area-dispatch-history-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getTypeColor = (type) => {
    return type === 'bulk' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
  };

  const getTypeIcon = (type) => {
    return type === 'bulk' ? <Layers className="h-4 w-4" /> : <Box className="h-4 w-4" />;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'claimed':
        return 'bg-green-100 text-green-800';
      case 'dispatched':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    return status === 'claimed' ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />;
  };

  const filteredDispatches = combinedDispatches.filter(dispatch => {
    const matchesSearch = dispatch.releaseCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         dispatch.dispatchedByName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         dispatch.items?.some(item => 
                           item.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.batchNumber?.toLowerCase().includes(searchTerm.toLowerCase())
                         );
    
    const matchesType = filterType === 'all' || dispatch.type === filterType;
    const matchesStatus = !filterStatus || dispatch.status === filterStatus;
    
    let matchesDate = true;
    if (dateRange !== 'all') {
      const dispatchDate = new Date(dispatch.dispatchDate);
      const now = new Date();
      
      switch (dateRange) {
        case 'week':
          matchesDate = (now - dispatchDate) <= (7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          matchesDate = (now - dispatchDate) <= (30 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          matchesDate = (now - dispatchDate) <= (90 * 24 * 60 * 60 * 1000);
          break;
      }
    }
    
    return matchesSearch && matchesType && matchesStatus && matchesDate;
  });

  const getDispatchSummary = () => {
    const total = filteredDispatches.length;
    const bulk = filteredDispatches.filter(d => d.type === 'bulk').length;
    const units = filteredDispatches.filter(d => d.type === 'units').length;
    const claimed = filteredDispatches.filter(d => d.status === 'claimed').length;
    const pending = filteredDispatches.filter(d => d.status === 'dispatched').length;

    return { total, bulk, units, claimed, pending };
  };

  const summary = getDispatchSummary();

  if (loading) {
    return <LoadingSpinner text="Loading dispatch history..." />;
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/packing-area/stock')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Send className="h-8 w-8 mr-3 text-purple-600" />
                Dispatch History
              </h1>
              <p className="text-gray-600 mt-2">Track all dispatches sent to Finished Goods Store</p>
            </div>
          </div>
          <button
            onClick={exportToExcel}
            disabled={filteredDispatches.length === 0}
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Dispatches</p>
              <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
            </div>
            <Send className="h-8 w-8 text-gray-600" />
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Bulk Dispatches</p>
              <p className="text-2xl font-bold text-blue-900">{summary.bulk}</p>
            </div>
            <Layers className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Unit Dispatches</p>
              <p className="text-2xl font-bold text-green-900">{summary.units}</p>
            </div>
            <Box className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-emerald-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-600">Claimed</p>
              <p className="text-2xl font-bold text-emerald-900">{summary.claimed}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-emerald-600" />
          </div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-900">{summary.pending}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search dispatches..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="all">All Types</option>
                <option value="bulk">Bulk Only</option>
                <option value="units">Units Only</option>
              </select>
            </div>
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">All Status</option>
                <option value="dispatched">Awaiting Claim</option>
                <option value="claimed">Claimed</option>
              </select>
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="all">All Time</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
              </select>
            </div>
          </div>
        </div>

        {/* Dispatch History Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Release Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Products
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity/Units
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dispatched
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Claimed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dispatched By
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDispatches.map((dispatch) => (
                <tr key={`${dispatch.type}-${dispatch.id}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{dispatch.releaseCode}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(dispatch.type)}`}>
                      {getTypeIcon(dispatch.type)}
                      <span className="ml-1">{dispatch.type === 'bulk' ? 'Bulk' : 'Units'}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {dispatch.items?.length > 0 ? (
                        <div>
                          <div className="font-medium">
                            {dispatch.items[0].productName}
                            {dispatch.type === 'units' && dispatch.items[0].variantName && 
                              ` - ${dispatch.items[0].variantName}`
                            }
                          </div>
                          {dispatch.items.length > 1 && (
                            <div className="text-xs text-gray-500">
                              +{dispatch.items.length - 1} more items
                            </div>
                          )}
                          <div className="text-xs text-gray-500">
                            Batch: {dispatch.items[0].batchNumber}
                          </div>
                        </div>
                      ) : (
                        'No items'
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {dispatch.type === 'bulk' ? (
                        <div>
                          <div className="font-medium">{dispatch.totalQuantity}</div>
                          <div className="text-xs text-gray-500">{dispatch.totalItems} items</div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-medium">{dispatch.totalQuantity} units</div>
                          <div className="text-xs text-gray-500">{dispatch.totalItems} variants</div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(dispatch.status)}`}>
                      {getStatusIcon(dispatch.status)}
                      <span className="ml-1">{dispatch.status === 'claimed' ? 'Claimed' : 'Pending'}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatDate(dispatch.dispatchDate)}</div>
                    <div className="text-xs text-gray-500">{dispatch.dispatchedByName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {dispatch.claimedAt ? formatDate(dispatch.claimedAt) : 'Not claimed'}
                    </div>
                    {dispatch.claimedByName && (
                      <div className="text-xs text-gray-500">{dispatch.claimedByName}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{dispatch.dispatchedByName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        // Show dispatch details in a modal or navigate to detail page
                        const details = `Dispatch Details:\n\nRelease Code: ${dispatch.releaseCode}\nType: ${dispatch.type}\nStatus: ${dispatch.status}\n\nItems:\n${dispatch.items?.map(item => 
                          dispatch.type === 'bulk' 
                            ? `• ${item.productName} (${item.batchNumber}): ${item.quantity} ${item.unit}`
                            : `• ${item.productName} - ${item.variantName} (${item.batchNumber}): ${item.unitsToExport || item.quantity} units`
                        ).join('\n') || 'No items'}\n\nNotes: ${dispatch.notes || 'None'}`;
                        alert(details);
                      }}
                      className="text-purple-600 hover:text-purple-900 p-1 rounded"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredDispatches.length === 0 && (
          <div className="text-center py-12">
            <Send className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No dispatches found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {combinedDispatches.length === 0 
                ? 'Dispatches will appear here after sending items to FG Store.'
                : 'Try adjusting your search criteria.'
              }
            </p>
            {combinedDispatches.length === 0 && (
              <button
                onClick={() => navigate('/packing-area/send-to-fg')}
                className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 mx-auto"
              >
                <Send className="h-4 w-4" />
                <span>Create First Dispatch</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DispatchHistory;