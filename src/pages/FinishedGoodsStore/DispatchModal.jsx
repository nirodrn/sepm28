import React, { useState } from 'react';
import { X } from 'lucide-react';
import { fgDispatchService } from '../../services/fgDispatchService.js';
import { useAuth } from '../../hooks/useAuth';

const DispatchModal = ({ request, onClose, onDispatchComplete }) => {
  const { user } = useAuth();
  const [quantities, setQuantities] = useState(() => {
    // Initialize quantities with approved quantities
    const initial = {};
    Object.entries(request.items).forEach(([id, item]) => {
      initial[id] = { ...item, dispatchQty: item.qty }; // Default to full quantity
    });
    return initial;
  });
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleQuantityChange = (itemId, value) => {
    const newQty = Math.max(0, Math.min(quantities[itemId].qty, parseInt(value) || 0));
    setQuantities(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        dispatchQty: newQty
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Format dispatch items
      const dispatchItems = {};
      Object.entries(quantities).forEach(([id, item]) => {
        if (item.dispatchQty > 0) {
          dispatchItems[id] = {
            name: item.name,
            qty: item.dispatchQty
          };
        }
      });

      // Prepare dispatch data
      const dispatchData = {
        items: dispatchItems,
        dispatchedBy: user.uid,
        dispatchedByName: user.displayName,
        dispatchedByRole: user.role,
        notes: notes.trim()
      };

      await fgDispatchService.dispatchSalesRequest(request.id, dispatchData);
      onDispatchComplete();
    } catch (error) {
      setError(error.message || 'Failed to dispatch request');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Dispatch Items</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <span className="text-red-700">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Requester Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm">
                  <p><span className="font-medium">Requester:</span> {request.requesterName}</p>
                  <p><span className="font-medium">Role:</span> {request.requesterRole}</p>
                  <p><span className="font-medium">Request Type:</span> {
                    request.requestType === 'direct_shop' ? 'Direct Shop' :
                    request.requestType === 'direct_representative' ? 'Direct Representative' :
                    'Distributor'
                  }</p>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Items to Dispatch</h3>
                {Object.entries(quantities).map(([id, item]) => (
                  <div key={id} className="flex items-center space-x-4 bg-gray-50 p-4 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-500">Approved: {item.qty} units</p>
                    </div>
                    <div className="w-32">
                      <label className="text-sm text-gray-500 block">Dispatch Qty</label>
                      <input
                        type="number"
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        value={item.dispatchQty}
                        onChange={(e) => handleQuantityChange(id, e.target.value)}
                        max={item.qty}
                        min="0"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  rows="3"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this dispatch..."
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="mr-4 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    loading ? 'opacity-75 cursor-not-allowed' : ''
                  }`}
                >
                  {loading ? 'Dispatching...' : 'Confirm Dispatch'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DispatchModal;