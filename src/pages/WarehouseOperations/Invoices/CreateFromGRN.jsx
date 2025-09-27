import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, Save, ArrowLeft, Package, CheckCircle, AlertTriangle } from 'lucide-react';
import { grnService } from '../../../services/grnService';
import { invoiceService } from '../../../services/invoiceService';
import { supplierService } from '../../../services/supplierService';
import LoadingSpinner from '../../../components/Common/LoadingSpinner';

const CreateFromGRN = () => {
  const navigate = useNavigate();
  const [availableGRNs, setAvailableGRNs] = useState([]);
  const [selectedGRN, setSelectedGRN] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [formData, setFormData] = useState({
    taxRate: 10,
    discount: 0,
    paymentTerms: 'Net 30',
    currency: 'LKR',
    notes: ''
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [grnData, supplierData] = await Promise.all([
        grnService.getGRNs({ status: 'qc_passed' }),
        supplierService.getSuppliers()
      ]);
      
      // Filter GRNs that don't have invoices yet
      const grnsWithoutInvoices = grnData.filter(grn => !grn.invoiceId);
      setAvailableGRNs(grnsWithoutInvoices);
      setSuppliers(supplierData);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGRNSelection = (grn) => {
    setSelectedGRN(grn);
    setFormData(prev => ({
      ...prev,
      notes: `Invoice generated from GRN ${grn.grnNumber}`
    }));
  };

  const calculateSubtotal = () => {
    if (!selectedGRN?.items) return 0;
    return selectedGRN.items.reduce((sum, item) => {
      const quantity = Number(item.deliveredQty || item.deliveredQuantity || 0);
      const unitPrice = Number(item.unitPrice || 0);
      return sum + (quantity * unitPrice);
    }, 0);
  };

  const calculateTax = () => {
    const subtotal = calculateSubtotal();
    return subtotal * (formData.taxRate / 100);
  };

  const calculateDiscount = () => {
    const subtotal = calculateSubtotal();
    return subtotal * (formData.discount / 100);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = calculateTax();
    const discount = calculateDiscount();
    return subtotal + tax - discount;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedGRN) {
      setError('Please select a GRN');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const subtotal = calculateSubtotal();
      const tax = calculateTax();
      const discount = calculateDiscount();
      const total = calculateTotal();

      const invoiceData = {
        grnId: selectedGRN.id,
        grnNumber: selectedGRN.grnNumber,
        supplierId: selectedGRN.supplierId,
        supplierName: selectedGRN.supplierName,
        poId: selectedGRN.poId,
        poNumber: selectedGRN.poNumber,
        invoiceDate: Date.now(),
        dueDate: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days from now
        items: selectedGRN.items.map((item) => ({
          materialId: item.materialId,
          materialName: item.materialName,
          materialType: item.materialType,
          quantity: Number(item.deliveredQty || item.deliveredQuantity || 0),
          unit: item.unit,
          unitPrice: Number(item.unitPrice || 0),
          total: (Number(item.deliveredQty || item.deliveredQuantity || 0)) * (Number(item.unitPrice || 0)),
          qualityGrade: item.qualityGrade || 'A',
          batchNumber: item.batchNumber || selectedGRN.grnNumber
        })),
        subtotal: subtotal,
        tax: tax,
        discount: discount,
        total: total,
        currency: formData.currency,
        paymentTerms: formData.paymentTerms,
        paymentStatus: 'pending',
        totalPaid: 0,
        remainingAmount: total,
        notes: formData.notes
      };

      const newInvoice = await invoiceService.createInvoice(invoiceData);
      
      // Update stock levels for packing materials after invoice creation
      for (const item of selectedGRN.items) {
        const quantity = Number(item.deliveredQty || item.deliveredQuantity || 0);
        
        if (quantity > 0 && item.materialType === 'packing_material') {
          try {
            // Update packing material stock
            const { packingMaterialsService } = await import('../../../services/packingMaterialsService');
            await packingMaterialsService.updateStock(item.materialId, quantity, 'add');
            
            // Record stock movement
            await packingMaterialsService.recordStockMovement({
              materialId: item.materialId,
              type: 'in',
              quantity: quantity,
              reason: `Invoice ${newInvoice.invoiceNumber} - GRN ${selectedGRN.grnNumber}`,
              batchNumber: item.batchNumber || selectedGRN.grnNumber,
              supplierId: selectedGRN.supplierId,
              unitPrice: Number(item.unitPrice || 0),
              qualityGrade: item.qualityGrade || 'A'
            });
          } catch (stockError) {
            console.error('Failed to update packing material stock:', stockError);
          }
        }
      }
      
      // Update GRN with invoice reference
      await grnService.updateGRNStatus(selectedGRN.id, 'invoiced', {
        invoiceId: newInvoice.id,
        invoiceNumber: newInvoice.invoiceNumber,
        invoicedAt: Date.now()
      });

      navigate('/warehouse/invoices');
    } catch (error) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getSupplierName = (supplierId) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier ? supplier.name : 'Unknown Supplier';
  };

  if (loading) {
    return <LoadingSpinner text="Loading GRNs..." />;
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/warehouse/invoices')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Receipt className="h-8 w-8 mr-3 text-purple-600" />
              Create Invoice from GRN
            </h1>
            <p className="text-gray-600 mt-2">Generate supplier invoice from approved goods receipt</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-6xl">
        {/* GRN Selection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Select Goods Receipt Note</h2>
          
          {availableGRNs.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No GRNs available</h3>
              <p className="mt-1 text-sm text-gray-500">
                No approved GRNs are available for invoice creation.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {availableGRNs.map((grn) => (
                <div
                  key={grn.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedGRN?.id === grn.id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => handleGRNSelection(grn)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <input
                        type="radio"
                        checked={selectedGRN?.id === grn.id}
                        onChange={() => handleGRNSelection(grn)}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500"
                      />
                      <div>
                        <div className="flex items-center space-x-3">
                          <span className="font-medium text-gray-900">
                            GRN #{grn.grnNumber}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            QC Passed
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-gray-600">
                          <span className="font-medium">PO:</span> {grn.poNumber} • 
                          <span className="font-medium ml-2">Supplier:</span> {getSupplierName(grn.supplierId)}
                        </div>
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Delivery Date:</span> {new Date(grn.deliveryDate).toLocaleDateString()} • 
                          <span className="font-medium ml-2">Items:</span> {grn.items?.length || 0}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        LKR {(grn.totalAmount || 0).toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {grn.items?.reduce((sum, item) => sum + (item.deliveredQty || 0), 0)} total units
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invoice Configuration */}
        {selectedGRN && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Invoice Configuration</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.taxRate}
                  onChange={(e) => setFormData(prev => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discount (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.discount}
                  onChange={(e) => setFormData(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Terms
                </label>
                <select
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="Net 15">Net 15 days</option>
                  <option value="Net 30">Net 30 days</option>
                  <option value="Net 60">Net 60 days</option>
                  <option value="COD">Cash on Delivery</option>
                  <option value="Advance">Advance Payment</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="LKR">LKR - Sri Lankan Rupee</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice Notes
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Additional notes for the invoice..."
                />
              </div>
            </div>
          </div>
        )}

        {/* Invoice Preview */}
        {selectedGRN && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Invoice Preview</h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Material
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Line Total
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quality Grade
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedGRN.items?.map((item, index) => {
                    const quantity = Number(item.deliveredQty || item.deliveredQuantity || 0);
                    const unitPrice = Number(item.unitPrice || 0);
                    const lineTotal = quantity * unitPrice;
                    
                    return (
                      <tr key={index}>
                        <td className="px-4 py-3">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.materialName}</div>
                            {item.batchNumber && (
                              <div className="text-sm text-gray-500">Batch: {item.batchNumber}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {quantity} {item.unit}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {formData.currency} {unitPrice.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {formData.currency} {lineTotal.toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            item.qualityGrade === 'A' ? 'bg-green-100 text-green-800' :
                            item.qualityGrade === 'B' ? 'bg-blue-100 text-blue-800' :
                            item.qualityGrade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            Grade {item.qualityGrade}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Invoice Totals */}
            <div className="mt-6 border-t border-gray-200 pt-4">
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">{formData.currency} {calculateSubtotal().toFixed(2)}</span>
                  </div>
                  {formData.discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Discount ({formData.discount}%):</span>
                      <span className="font-medium text-green-600">-{formData.currency} {calculateDiscount().toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax ({formData.taxRate}%):</span>
                    <span className="font-medium">{formData.currency} {calculateTax().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-2">
                    <span className="text-lg font-semibold text-gray-900">Total:</span>
                    <span className="text-lg font-bold text-purple-600">{formData.currency} {calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/warehouse/invoices')}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !selectedGRN}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>{submitting ? 'Creating...' : 'Create Invoice'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateFromGRN;