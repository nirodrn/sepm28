import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Receipt, 
  ArrowLeft, 
  Download, 
  CreditCard, 
  Eye, 
  Package,
  Calendar,
  User,
  DollarSign,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { invoiceService } from '../../../services/invoiceService';
import { paymentService } from '../../../services/paymentService';
import { supplierService } from '../../../services/supplierService';
import { getData } from '../../../firebase/db';
import LoadingSpinner from '../../../components/Common/LoadingSpinner';
import ErrorMessage from '../../../components/Common/ErrorMessage';
import jsPDF from 'jspdf';

const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [invoice, setInvoice] = useState(null);
  const [supplier, setSupplier] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      loadInvoiceData();
    }
  }, [id]);

  const loadInvoiceData = async () => {
    try {
      setLoading(true);
      const [invoiceData, supplierData, paymentData] = await Promise.all([
        invoiceService.getInvoiceById(id),
        supplierService.getSuppliers(),
        paymentService.getPaymentsByInvoice(id)
      ]);
      
      setInvoice(invoiceData);
      setPayments(paymentData);
      
      const supplierInfo = supplierData.find(s => s.id === invoiceData.supplierId);
      setSupplier(supplierInfo);
      
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateInvoicePDF = () => {
    if (!invoice || !supplier) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;
    
    // Company Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Sewanagala Ayurvedic Drugs Manufacture Pvt Ltd', pageWidth / 2, 30, { align: 'center' });
    
    // Invoice Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('SUPPLIER INVOICE', pageWidth / 2, 45, { align: 'center' });
    
    // Invoice Details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice Number: ${invoice.invoiceNumber}`, margin, 65);
    doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, margin, 73);
    doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, margin, 81);
    
    // Supplier Details
    doc.text(`Supplier: ${supplier.name}`, margin, 95);
    doc.text(`Contact: ${supplier.email}`, margin, 103);
    doc.text(`Phone: ${supplier.phone}`, margin, 111);
    
    // GRN Details
    if (invoice.grnNumber) {
      doc.text(`GRN Number: ${invoice.grnNumber}`, pageWidth - 80, 65);
      doc.text(`PO Number: ${invoice.poNumber}`, pageWidth - 80, 73);
    }
    
    // Items Table
    let yPosition = 125;
    doc.setFont('helvetica', 'bold');
    doc.text('ITEMS', margin, yPosition);
    yPosition += 10;
    
    // Table headers
    doc.setFontSize(10);
    doc.text('Description', margin, yPosition);
    doc.text('Qty', margin + 80, yPosition);
    doc.text('Unit Price', margin + 110, yPosition);
    doc.text('Total', margin + 150, yPosition);
    
    doc.line(margin, yPosition + 2, pageWidth - margin, yPosition + 2);
    yPosition += 10;
    
    // Items
    doc.setFont('helvetica', 'normal');
    invoice.items?.forEach(item => {
      doc.text(item.materialName, margin, yPosition);
      doc.text(`${item.quantity} ${item.unit}`, margin + 80, yPosition);
      doc.text(`LKR ${item.unitPrice.toFixed(2)}`, margin + 110, yPosition);
      doc.text(`LKR ${item.total.toFixed(2)}`, margin + 150, yPosition);
      yPosition += 8;
    });
    
    // Totals
    yPosition += 10;
    doc.line(margin + 100, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;
    
    doc.setFont('helvetica', 'bold');
    doc.text(`Subtotal: LKR ${invoice.subtotal?.toFixed(2) || '0.00'}`, margin + 110, yPosition);
    yPosition += 8;
    doc.text(`Tax: LKR ${invoice.tax?.toFixed(2) || '0.00'}`, margin + 110, yPosition);
    yPosition += 8;
    doc.text(`TOTAL: LKR ${invoice.total?.toFixed(2) || '0.00'}`, margin + 110, yPosition);
    
    // Payment Status
    yPosition += 20;
    doc.setFont('helvetica', 'normal');
    doc.text(`Payment Status: ${invoice.paymentStatus?.toUpperCase() || 'PENDING'}`, margin, yPosition);
    doc.text(`Amount Paid: LKR ${(invoice.totalPaid || 0).toFixed(2)}`, margin, yPosition + 8);
    doc.text(`Amount Due: LKR ${(invoice.remainingAmount || invoice.total || 0).toFixed(2)}`, margin, yPosition + 16);
    
    // Footer
    doc.setFontSize(9);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, 280);
    
    // Save PDF
    doc.save(`invoice-${invoice.invoiceNumber}.pdf`);
  };

  const getPaymentStatusColor = (paymentStatus, remainingAmount) => {
    if (paymentStatus === 'paid' || remainingAmount <= 0) {
      return 'bg-green-100 text-green-800';
    } else if (paymentStatus === 'partially_paid') {
      return 'bg-yellow-100 text-yellow-800';
    }
    return 'bg-red-100 text-red-800';
  };

  const getPaymentStatusLabel = (paymentStatus, remainingAmount) => {
    if (paymentStatus === 'paid' || remainingAmount <= 0) {
      return 'Fully Paid';
    } else if (paymentStatus === 'partially_paid') {
      return 'Partially Paid';
    }
    return 'To Be Paid';
  };

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'card':
      case 'credit':
      case 'debit':
        return <CreditCard className="h-4 w-4" />;
      case 'cash':
        return <DollarSign className="h-4 w-4" />;
      case 'bank_transfer':
      case 'cheque':
        return <Package className="h-4 w-4" />;
      default:
        return <Receipt className="h-4 w-4" />;
    }
  };

  const getPaymentMethodLabel = (method) => {
    switch (method) {
      case 'card':
        return 'Card Payment';
      case 'credit':
        return 'Credit Card';
      case 'debit':
        return 'Debit Card';
      case 'cash':
        return 'Cash Payment';
      case 'bank_transfer':
        return 'Bank Transfer';
      case 'cheque':
        return 'Cheque Payment';
      default:
        return method?.replace('_', ' ').toUpperCase() || 'Unknown';
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading invoice details..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadInvoiceData} />;
  }

  if (!invoice) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Invoice not found</h3>
          <button
            onClick={() => navigate('/warehouse/invoices')}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Back to Invoices
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
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
                Invoice Details
              </h1>
              <p className="text-gray-600 mt-2">Invoice #{invoice.invoiceNumber}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={generateInvoicePDF}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Download PDF</span>
            </button>
            {invoice.paymentStatus !== 'paid' && invoice.remainingAmount > 0 && (
              <button
                onClick={() => navigate(`/warehouse/invoices/${invoice.id}/payment`)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <CreditCard className="h-4 w-4" />
                <span>Record Payment</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice Information */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Invoice Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Receipt className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Invoice Number</p>
                  <p className="font-medium text-gray-900">{invoice.invoiceNumber}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">GRN Number</p>
                  <p className="font-medium text-gray-900">{invoice.grnNumber || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <User className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Supplier</p>
                  <p className="font-medium text-gray-900">{supplier?.name || 'Unknown Supplier'}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Invoice Date</p>
                  <p className="font-medium text-gray-900">{new Date(invoice.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Due Date</p>
                  <p className="font-medium text-gray-900">{new Date(invoice.dueDate).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Currency</p>
                  <p className="font-medium text-gray-900">{invoice.currency || 'LKR'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Items */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Items</h3>
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
                      Total
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quality Grade
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoice.items?.map((item, index) => (
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
                        {item.quantity} {item.unit}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        LKR {item.unitPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        LKR {item.total.toFixed(2)}
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
                  ))}
                </tbody>
              </table>
            </div>

            {/* Invoice Totals */}
            <div className="mt-6 border-t border-gray-200 pt-4">
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">LKR {(invoice.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax:</span>
                    <span className="font-medium">LKR {(invoice.tax || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-2">
                    <span className="text-lg font-semibold text-gray-900">Total:</span>
                    <span className="text-lg font-bold text-purple-600">LKR {(invoice.total || 0).toFixed(2)}</span>
                  </div>
                </div>
                
                {invoice.lastPaymentDate && (
                  <div className="pt-4 border-t border-gray-200">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Last Payment:</span>
                        <span className="font-medium text-gray-900">
                          {new Date(invoice.lastPaymentDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Method:</span>
                        <span className="font-medium text-gray-900">
                          {getPaymentMethodLabel(invoice.lastPaymentMethod)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Amount:</span>
                        <span className="font-medium text-gray-900">
                          LKR {(invoice.lastPaymentAmount || 0).toFixed(2)}
                        </span>
                      </div>
                      {invoice.lastPaymentNotes && (
                        <div className="mt-2">
                          <span className="text-gray-600">Notes:</span>
                          <p className="text-gray-900 text-sm mt-1">{invoice.lastPaymentNotes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Payment History */}
          {payments.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h3>
              <div className="space-y-4">
                {payments.map((payment) => (
                  <div key={payment.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          {getPaymentMethodIcon(payment.method)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            Payment #{payment.paymentNumber}
                          </p>
                          <p className="text-sm text-gray-500">
                            {getPaymentMethodLabel(payment.method)} • {new Date(payment.paymentDate || payment.createdAt).toLocaleDateString()}
                          </p>
                          {payment.referenceNumber && (
                            <p className="text-sm text-gray-500">Ref: {payment.referenceNumber}</p>
                          )}
                          {payment.cardLast4 && (
                            <p className="text-sm text-gray-500">Card ending in: ****{payment.cardLast4}</p>
                          )}
                          {payment.chequeNumber && (
                            <p className="text-sm text-gray-500">Cheque #: {payment.chequeNumber}</p>
                          )}
                          {payment.bankName && (
                            <p className="text-sm text-gray-500">Bank: {payment.bankName}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">
                          LKR {payment.amount.toFixed(2)}
                        </p>
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Posted
                        </span>
                      </div>
                    </div>
                    {payment.notes && (
                      <div className="mt-3 bg-gray-50 rounded p-2">
                        <p className="text-sm text-gray-700">{payment.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Payment Summary Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Summary</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Invoice Total:</span>
                <span className="text-lg font-bold text-gray-900">
                  LKR {(invoice.total || 0).toFixed(2)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Paid:</span>
                <span className="text-lg font-semibold text-green-600">
                  LKR {(invoice.totalPaid || 0).toFixed(2)}
                </span>
              </div>
              
              <div className="flex justify-between items-center border-t border-gray-200 pt-4">
                <span className="text-gray-600">Remaining:</span>
                <span className={`text-lg font-bold ${
                  (invoice.remainingAmount || 0) <= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  LKR {(invoice.remainingAmount || 0).toFixed(2)}
                </span>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium">Payment Status:</span>
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getPaymentStatusColor(invoice.paymentStatus, invoice.remainingAmount)}`}>
                    {getPaymentStatusLabel(invoice.paymentStatus, invoice.remainingAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Progress Bar */}
            <div className="mt-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Payment Progress</span>
                <span>{Math.round(((invoice.totalPaid || 0) / (invoice.total || 1)) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-green-500 h-3 rounded-full transition-all duration-300" 
                  style={{width: `${Math.min(((invoice.totalPaid || 0) / (invoice.total || 1)) * 100, 100)}%`}}
                ></div>
              </div>
            </div>
          </div>

          {/* Supplier Information */}
          {supplier && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Supplier Information</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-500">Company:</span>
                  <p className="font-medium text-gray-900">{supplier.name}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Contact Person:</span>
                  <p className="font-medium text-gray-900">{supplier.contactPerson}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Email:</span>
                  <p className="font-medium text-gray-900">{supplier.email}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Phone:</span>
                  <p className="font-medium text-gray-900">{supplier.phone}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Address:</span>
                  <p className="font-medium text-gray-900">{supplier.address}</p>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={generateInvoicePDF}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Invoice PDF
              </button>
              
              {invoice.grnNumber && (
                <button
                  onClick={() => navigate(`/warehouse/goods-receipts/${invoice.grnId}`)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Related GRN
                </button>
              )}
              
              {invoice.poNumber && (
                <button
                  onClick={() => navigate(`/warehouse/purchase-orders/${invoice.poId}`)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Related PO
                </button>
              )}
              
              {invoice.paymentStatus !== 'paid' && invoice.remainingAmount > 0 && (
                <button
                  onClick={() => navigate(`/warehouse/invoices/${invoice.id}/payment`)}
                  className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors flex items-center"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Record Payment
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetail;