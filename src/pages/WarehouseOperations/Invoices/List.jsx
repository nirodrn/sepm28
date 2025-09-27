import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, Plus, Search, Filter, Eye, Edit, CreditCard, Download, FileText } from 'lucide-react';
import { invoiceService } from '../../../services/invoiceService';
import { supplierService } from '../../../services/supplierService';
import { grnService } from '../../../services/grnService';
import LoadingSpinner from '../../../components/Common/LoadingSpinner';
import jsPDF from 'jspdf';

const InvoiceList = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [grns, setGRNs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [invoiceData, supplierData, grnData] = await Promise.all([
        invoiceService.getInvoices(),
        supplierService.getSuppliers(),
        grnService.getGRNs()
      ]);
      
      setInvoices(invoiceData);
      setSuppliers(supplierData);
      setGRNs(grnData);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const generatePrintableInvoice = (invoice) => {
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
    const supplier = suppliers.find(s => s.id === invoice.supplierId);
    doc.text(`Supplier: ${supplier?.name || 'Unknown Supplier'}`, margin, 95);
    doc.text(`Contact: ${supplier?.email || 'N/A'}`, margin, 103);
    
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
    if (paymentStatus === 'paid' || (remainingAmount !== undefined && remainingAmount <= 0)) {
      return 'Fully Paid';
    } else if (paymentStatus === 'partially_paid') {
      return 'Partially Paid';
    }
    return 'To Be Paid'; // Changed from 'Pending' to be more clear
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'verified':
        return 'bg-blue-100 text-blue-800';
      case 'closed':
        return 'bg-purple-100 text-purple-800';
      case 'variance_review':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSupplierName = (supplierId) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier ? supplier.name : 'Unknown Supplier';
  };

  const handleCreateInvoiceFromGRN = () => {
    navigate('/warehouse/invoices/create-from-grn');
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         getSupplierName(invoice.supplierId).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !filterStatus || invoice.paymentStatus === filterStatus;
    const matchesSupplier = !filterSupplier || invoice.supplierId === filterSupplier;
    
    return matchesSearch && matchesStatus && matchesSupplier;
  });

  if (loading) {
    return <LoadingSpinner text="Loading invoices..." />;
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Receipt className="h-8 w-8 mr-3 text-purple-600" />
              Invoices & Payments
            </h1>
            <p className="text-gray-600 mt-2">Manage supplier invoices and payment tracking</p>
          </div>
          <button
            onClick={() => navigate('/warehouse/invoices/create')}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Create Invoice</span>
          </button>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigate('/warehouse/invoices/create')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create Invoice</span>
            </button>
            <button
            onClick={handleCreateInvoiceFromGRN}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <FileText className="h-4 w-4" />
            <span>From GRN</span>
          </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search invoice number or supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <div className="relative">
              <select
                value={filterSupplier}
                onChange={(e) => setFilterSupplier(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">All Suppliers</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  GRN Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paid Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-purple-600">{invoice.invoiceNumber}</div>
                    <div className="text-sm text-gray-500">
                      {invoice.poNumber && <span>PO: {invoice.poNumber}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{invoice.grnNumber || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{getSupplierName(invoice.supplierId)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">LKR {(invoice.total || 0).toFixed(2)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">LKR {(invoice.totalPaid || 0).toFixed(2)}</div>
                    <div className="text-sm text-gray-500">
                      Remaining: LKR {(invoice.remainingAmount || invoice.total || 0).toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(invoice.paymentStatus, invoice.remainingAmount)}`}>
                      {getPaymentStatusLabel(invoice.paymentStatus, invoice.remainingAmount)}
                    </span>
                    {invoice.paymentStatus === 'partially_paid' && (
                      <div className="text-xs text-gray-500 mt-1">
                        {Math.round(((invoice.totalPaid || 0) / (invoice.total || 1)) * 100)}% paid
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                      {invoice.status?.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(invoice.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => navigate(`/warehouse/invoices/${invoice.id}`)}
                        className="text-purple-600 hover:text-purple-900 p-1 rounded"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => generatePrintableInvoice(invoice)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        title="Print Invoice"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      {invoice.paymentStatus !== 'paid' && invoice.remainingAmount > 0 && (
                        <button
                          onClick={() => navigate(`/warehouse/invoices/${invoice.id}/payment`)}
                          className="text-green-600 hover:text-green-900 p-1 rounded"
                          title="Record Payment"
                        >
                          <CreditCard className="h-4 w-4" />
                        </button>
                      )}
                      {(invoice.paymentStatus === 'paid' || invoice.remainingAmount <= 0) && (
                        <span className="text-green-600 text-xs px-2 py-1 bg-green-50 rounded">
                          Paid in Full
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredInvoices.length === 0 && (
          <div className="text-center py-12">
            <Receipt className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {(searchTerm || filterStatus || filterSupplier) ? 'Try adjusting your search criteria.' : 'Invoices will be automatically created from approved GRNs.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceList;