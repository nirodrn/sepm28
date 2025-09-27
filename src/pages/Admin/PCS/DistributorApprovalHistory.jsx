import React, { useState, useEffect } from 'react';
import { getApprovalHistory } from '../../services/distributorRequestService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const DistributorApprovalHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const data = await getApprovalHistory();
      setHistory(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching approval history:', error);
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Distributor Sales Approval History</h2>
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2">Approval Date</th>
                <th className="px-4 py-2">Distributor</th>
                <th className="px-4 py-2">Items</th>
                <th className="px-4 py-2">Priority</th>
                <th className="px-4 py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {history.map((record) => (
                <tr key={record.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2">
                    {new Date(record.approvedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2">{record.distributorName}</td>
                  <td className="px-4 py-2">
                    {Object.entries(record.items).map(([id, item]) => (
                      <div key={id}>
                        {item.name} - {item.qty}
                      </div>
                    ))}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded-full text-sm ${
                      record.priority === 'urgent' 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {record.priority}
                    </span>
                  </td>
                  <td className="px-4 py-2">{record.notes || '-'}</td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-4 py-4 text-center text-gray-500">
                    No approval history found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DistributorApprovalHistory;