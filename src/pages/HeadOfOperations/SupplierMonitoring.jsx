import React, { useState, useEffect } from 'react';
import { supplierService } from '../../services/supplierService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import ErrorMessage from '../../components/Common/ErrorMessage';
import { TrendingUp, TrendingDown, Package, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import SupplierGradeDisplay from '../../components/Common/SupplierGradeDisplay';

const SupplierMonitoring = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [performanceData, setPerformanceData] = useState({});

  useEffect(() => {
    loadSupplierData();
  }, []);

  const loadSupplierData = async () => {
    try {
      setLoading(true);
      const suppliersData = await supplierService.getSuppliers();
      setSuppliers(suppliersData);
      
      // Load performance data for each supplier
      const performancePromises = suppliersData.map(async (supplier) => {
        try {
          const performance = await supplierService.getSupplierPerformance(supplier.id);
          return { [supplier.id]: performance };
        } catch (err) {
          return { [supplier.id]: null };
        }
      });
      
      const performanceResults = await Promise.all(performancePromises);
      const performanceMap = performanceResults.reduce((acc, curr) => ({ ...acc, ...curr }), {});
      setPerformanceData(performanceMap);
    } catch (err) {
      setError('Failed to load supplier data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceColor = (score) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 75) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'inactive': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Supplier Monitoring</h1>
        <p className="text-gray-600">Monitor supplier performance and delivery metrics</p>
      </div>

      {suppliers.length === 0 ? (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No suppliers found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Supplier data is currently not available in the database.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Suppliers List */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Supplier Overview</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Supplier
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Performance
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Order
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {suppliers.map((supplier) => {
                        const performance = performanceData[supplier.id];
                        return (
                          <tr key={supplier.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {supplier.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {supplier.email}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(supplier.status)}`}>
                                {supplier.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <SupplierGradeDisplay
                                grade={supplier.currentGrade}
                                averagePoints={supplier.averageGradePoints}
                                totalDeliveries={supplier.totalDeliveries}
                                lastDeliveryGrade={supplier.lastDeliveryGrade}
                                size="sm"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {supplier.lastOrderDate ? 
                                new Date(supplier.lastOrderDate).toLocaleDateString() : 
                                'No orders'
                              }
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => setSelectedSupplier(supplier)}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Summary */}
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Summary</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      <span className="text-sm text-gray-600">Active Suppliers</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {suppliers.filter(s => s.status === 'active').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-yellow-500 mr-2" />
                      <span className="text-sm text-gray-600">Pending Suppliers</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {suppliers.filter(s => s.status === 'pending').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                      <span className="text-sm text-gray-600">Inactive Suppliers</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {suppliers.filter(s => s.status === 'inactive').length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {selectedSupplier && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {selectedSupplier.name} Details
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Contact:</span>
                      <p className="text-sm text-gray-900">{selectedSupplier.email}</p>
                      <p className="text-sm text-gray-900">{selectedSupplier.phone}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Address:</span>
                      <p className="text-sm text-gray-900">{selectedSupplier.address}</p>
                    </div>
                    {performanceData[selectedSupplier.id] && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">Performance Metrics:</span>
                        <div className="mt-2 space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Delivery Rate:</span>
                            <span className="text-sm font-medium">
                              {performanceData[selectedSupplier.id].deliveryRate}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Quality Score:</span>
                            <span className="text-sm font-medium">
                              {performanceData[selectedSupplier.id].qualityScore}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Total Orders:</span>
                            <span className="text-sm font-medium">
                              {performanceData[selectedSupplier.id].totalOrders}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierMonitoring;