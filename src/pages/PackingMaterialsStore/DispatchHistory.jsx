import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Search, Filter, Calendar, Eye, Package, TruckIcon } from 'lucide-react';
import { packingMaterialsService } from '../../services/packingMaterialsService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const DispatchHistory = () => {
  const navigate = useNavigate();
  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDestination, setFilterDestination] = useState('');
  const [dateRange, setDateRange] = useState('month');

  useEffect(() => {
    loadDispatchHistory();
  }, [dateRange]);

  const loadDispatchHistory = async () => {
    try {
      setLoading(true);
      const dispatchData = await packingMaterialsService.getDispatches();
      setDispatches(dispatchData);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getDestinationColor = (destination) => {
    const colors = {
      'line1': 'bg-blue-100 text-blue-800',
      'line2': 'bg-green-100 text-green-800',
      'line3': 'bg-purple-100 text-purple-800',
      'line4': 'bg-orange-100 text-orange-800',
      'general': 'bg-gray-100 text-gray-800'
    };
    return colors[destination] || 'bg-gray-100 text-gray-800';
  };

  const getDestinationName = (destination) => {
    const names = {
      'line1': 'Packing Line 1',
      'line2': 'Packing Line 2',
      'line3': 'Packing Line 3',
      'line4': 'Packing Line 4',
      'general': 'General Packing Area'
    };
    return names[destination] || destination;
  };

  const filteredDispatches = dispatches.filter(dispatch => {
    const matchesSearch = dispatch.items?.some(item => 
      item.materialName?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || dispatch.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDestination = !filterDestination || dispatch.destination === filterDestination;
    
    return matchesSearch && matchesDestination;
  });

  const calculateTotalItems = (items) => {
    return items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
  };

  const calculateTotalValue = (items) => {
    return items?.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0) || 0;
  };

  if (loading) {
    return <LoadingSpinner text="Loading dispatch history..." />;
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Send className="h-8 w-8 mr-3 text-blue-600" />
          Dispatch History
        </h1>
        <p className="text-gray-600">Track all materials sent to Packing Area</p>
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
              <p className="text-sm font-medium text-gray-600">Total Dispatches</p>
              <p className="text-2xl font-bold text-gray-900">{filteredDispatches.length}</p>
            </div>
            <Send className="h-8 w-8 text-gray-600" />
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Items</p>
              <p className="text-2xl font-bold text-blue-900">
                {filteredDispatches.reduce((sum, dispatch) => sum + calculateTotalItems(dispatch.items), 0)}
              </p>
            </div>
            <Package className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">This Week</p>
              <p className="text-2xl font-bold text-green-900">
                {filteredDispatches.filter(d => {
                  const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
                  return d.dispatchedAt >= weekAgo;
                }).length}
              </p>
            </div>
            <TruckIcon className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-purple-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Total Value</p>
              <p className="text-2xl font-bold text-purple-900">
                ${filteredDispatches.reduce((sum, dispatch) => sum + calculateTotalValue(dispatch.items), 0).toFixed(0)}
              </p>
            </div>
            <div className="h-8 w-8 bg-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">$</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search dispatches..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filterDestination}
                onChange={(e) => setFilterDestination(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Destinations</option>
                <option value="line1">Packing Line 1</option>
                <option value="line2">Packing Line 2</option>
                <option value="line3">Packing Line 3</option>
                <option value="line4">Packing Line 4</option>
                <option value="general">General Packing Area</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
            </div>
          </div>
        </div>

        {/* Dispatch List */}
        <div className="divide-y divide-gray-200">
          {filteredDispatches.map((dispatch) => (
            <div key={dispatch.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="p-2 rounded-lg bg-green-100">
                    <Send className="h-5 w-5 text-green-600" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-medium text-gray-900">
                        Dispatch #{dispatch.id.slice(-6)}
                      </h4>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDestinationColor(dispatch.destination)}`}>
                        {getDestinationName(dispatch.destination)}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-6 mb-3 text-sm text-gray-500">
                      <span>{dispatch.items?.length || 0} items</span>
                      <span>{calculateTotalItems(dispatch.items)} total units</span>
                      <span>{new Date(dispatch.dispatchedAt).toLocaleDateString()}</span>
                      <span>Value: ${calculateTotalValue(dispatch.items).toFixed(2)}</span>
                    </div>
                    
                    <div className="space-y-1">
                      {dispatch.items?.slice(0, 3).map((item, index) => (
                        <div key={index} className="text-sm text-gray-600">
                          • {item.materialName}: {item.quantity} {item.unit}
                          {item.batchNumber && <span className="text-gray-400"> (Batch: {item.batchNumber})</span>}
                        </div>
                      ))}
                      {dispatch.items?.length > 3 && (
                        <div className="text-sm text-gray-500">
                          ... and {dispatch.items.length - 3} more items
                        </div>
                      )}
                    </div>
                    
                    {dispatch.notes && (
                      <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                        Notes: {dispatch.notes}
                      </p>
                    )}

                    {dispatch.requestId && (
                      <div className="mt-2">
                        <span className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                          Linked to Request: {dispatch.requestId.slice(-6)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/packing-materials/dispatches/${dispatch.id}`)}
                  className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                  title="View Details"
                >
                  <Eye className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredDispatches.length === 0 && (
          <div className="text-center py-12">
            <Send className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No dispatches found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {(searchTerm || filterDestination) ? 'Try adjusting your search criteria.' : 'No dispatches in the selected time period.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DispatchHistory;