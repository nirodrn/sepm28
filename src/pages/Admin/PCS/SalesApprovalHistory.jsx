import React, { useState, useEffect } from 'react';
import { getApprovalHistory } from '../../../services/distributorRequestService';
import LoadingSpinner from '../../../components/Common/LoadingSpinner';
import { formatDate } from '../../../utils/formatDate';
import { Clock, Package, Search } from 'lucide-react';
import PCSLayout from '../../../components/Layout/PCSLayout';

const SalesApprovalHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await getApprovalHistory();
      setHistory(data);
      setError('');
    } catch (error) {
      setError('Failed to load approval history');
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter(record => {
    const matchesSearch = searchTerm === '' || 
      record.distributorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      Object.values(record.items).some(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesPriority = filterPriority === 'all' || record.priority === filterPriority;

    const matchesDate = (!dateRange.start || new Date(record.approvedAt) >= new Date(dateRange.start)) &&
      (!dateRange.end || new Date(record.approvedAt) <= new Date(dateRange.end));

    return matchesSearch && matchesPriority && matchesDate;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <PCSLayout>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Sales Approval History</h1>
          <p className="mt-2 text-gray-600">View history of approved distributor sales requests</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  className="pl-10 w-full rounded-md border border-gray-300 p-2"
                  placeholder="Search by name, item, or request type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                className="w-full rounded-md border border-gray-300 p-2"
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="normal">Normal</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                className="w-full rounded-md border border-gray-300 p-2"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                className="w-full rounded-md border border-gray-300 p-2"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Distributor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Approved By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    FG Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Completion Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredHistory.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-gray-400 mr-2" />
                        {formatDate(record.approvedAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{record.requesterName}</div>
                      <div className="text-sm text-gray-500">{record.requesterRole}</div>
                      <div className="text-xs px-2 py-1 mt-1 inline-block rounded-full bg-gray-100 text-gray-800">
                        {record.requestType === 'direct_shop' ? 'DS' :
                          record.requestType === 'direct_representative' ? 'DR' : 'Distributor'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {Object.entries(record.items).map(([id, item]) => (
                          <div key={id} className="text-sm text-gray-900">
                            {item.name} - {item.qty}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.totalQuantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        record.priority === 'urgent' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {record.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{record.approverName}</div>
                      <div className="text-sm text-gray-500">{record.approverRole}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {record.isCompletedByFG ? (
                        <div>
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Completed
                          </span>
                          <div className="text-xs text-gray-500 mt-1">
                            By: {record.sentByName}
                          </div>
                        </div>
                      ) : (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Pending FG
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.completedByFGAt ? formatDate(record.completedByFGAt) : 
                       record.sentAt ? formatDate(record.sentAt) : '-'}
                    </td>
                  </tr>
                ))}
                {filteredHistory.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      No approval history found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PCSLayout>
  );
};

export default SalesApprovalHistory;