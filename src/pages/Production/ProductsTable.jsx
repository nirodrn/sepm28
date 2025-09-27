import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Download, Search, Filter, Eye, Edit, Trash2, Factory, Plus, FileSpreadsheet } from 'lucide-react';
import { productionService } from '../../services/productionService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import * as XLSX from 'xlsx';

const ProductsTable = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const categories = [
    'Finished Product',
    'Semi-Finished Product',
    'By-Product',
    'Specialty Product'
  ];

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const productData = await productionService.getProductionProducts();
      setProducts(productData);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (filteredProducts.length === 0) return;

    // Prepare data for Excel
    const excelData = [
      ['Production Products Report'],
      ['Generated on: ' + new Date().toLocaleString()],
      [''],
      ['Product Name', 'Product Code', 'Category', 'Unit', 'Shelf Life (days)', 'Status', 'Material Requirements Count', 'Created Date', 'Created By', 'Description']
    ];

    const productRows = filteredProducts.map(product => [
      product.name,
      product.code,
      product.category,
      product.unit,
      product.shelfLife || 'N/A',
      product.status?.toUpperCase(),
      product.materialRequirements?.length || 0,
      product.createdAt ? new Date(product.createdAt).toLocaleDateString() : 'N/A',
      product.createdByName || 'N/A',
      product.description || 'N/A'
    ]);

    const ws = XLSX.utils.aoa_to_sheet([...excelData, ...productRows]);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, // Product Name
      { wch: 15 }, // Product Code
      { wch: 20 }, // Category
      { wch: 8 },  // Unit
      { wch: 15 }, // Shelf Life
      { wch: 12 }, // Status
      { wch: 20 }, // Material Requirements
      { wch: 12 }, // Created Date
      { wch: 15 }, // Created By
      { wch: 40 }  // Description
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Production Products');

    // Add material requirements sheet if any products have requirements
    const productsWithRequirements = filteredProducts.filter(p => p.materialRequirements?.length > 0);
    if (productsWithRequirements.length > 0) {
      const materialData = [
        ['Material Requirements by Product'],
        [''],
        ['Product Name', 'Product Code', 'Material Name', 'Quantity per Unit', 'Unit', 'Notes']
      ];

      const materialRows = [];
      productsWithRequirements.forEach(product => {
        product.materialRequirements.forEach(req => {
          materialRows.push([
            product.name,
            product.code,
            req.materialName,
            req.quantityPerUnit,
            req.unit,
            req.notes || 'N/A'
          ]);
        });
      });

      const materialWS = XLSX.utils.aoa_to_sheet([...materialData, ...materialRows]);
      XLSX.utils.book_append_sheet(wb, materialWS, 'Material Requirements');
    }

    XLSX.writeFile(wb, `production-products-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDeleteProduct = async (productId, productName) => {
    if (window.confirm(`Are you sure you want to delete product "${productName}"? This action cannot be undone.`)) {
      try {
        await productionService.deleteProductionProduct(productId);
        await loadProducts();
      } catch (error) {
        setError(`Failed to delete product: ${error.message}`);
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'discontinued':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.code?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !filterCategory || product.category === filterCategory;
    const matchesStatus = !filterStatus || product.status === filterStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getProductSummary = () => {
    const total = filteredProducts.length;
    const active = filteredProducts.filter(p => p.status === 'active').length;
    const withRequirements = filteredProducts.filter(p => p.materialRequirements?.length > 0).length;
    const totalMaterials = filteredProducts.reduce((sum, p) => sum + (p.materialRequirements?.length || 0), 0);

    return { total, active, withRequirements, totalMaterials };
  };

  const summary = getProductSummary();

  if (loading) {
    return <LoadingSpinner text="Loading products..." />;
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Package className="h-8 w-8 mr-3 text-blue-600" />
              Production Products Table
            </h1>
            <p className="text-gray-600 mt-2">Comprehensive view of all production products and their requirements</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={exportToExcel}
              disabled={filteredProducts.length === 0}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Export to Excel</span>
            </button>
            <button
              onClick={() => navigate('/production/products/create')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create Product</span>
            </button>
          </div>
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
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
            </div>
            <Package className="h-8 w-8 text-gray-600" />
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Active Products</p>
              <p className="text-2xl font-bold text-green-900">{summary.active}</p>
            </div>
            <div className="h-8 w-8 bg-green-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">✓</span>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">With Requirements</p>
              <p className="text-2xl font-bold text-blue-900">{summary.withRequirements}</p>
            </div>
            <Factory className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-purple-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Total Materials</p>
              <p className="text-2xl font-bold text-purple-900">{summary.totalMaterials}</p>
            </div>
            <div className="h-8 w-8 bg-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">#</span>
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
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="discontinued">Discontinued</option>
              </select>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Material Requirements
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Shelf Life
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created By
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      <div className="text-sm text-gray-500">{product.code}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.unit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {product.materialRequirements?.length || 0} materials
                    </div>
                    {product.materialRequirements?.length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        {product.materialRequirements.slice(0, 2).map(req => req.materialName).join(', ')}
                        {product.materialRequirements.length > 2 && '...'}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.shelfLife ? `${product.shelfLife} days` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(product.status)}`}>
                      {product.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.createdAt ? new Date(product.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.createdByName || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => navigate(`/production/products/${product.id}`)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => navigate('/production/create-batch', { state: { selectedProduct: product } })}
                        className="text-green-600 hover:text-green-900 p-1 rounded"
                        title="Create Batch"
                      >
                        <Factory className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => navigate(`/production/products/${product.id}/edit`)}
                        className="text-indigo-600 hover:text-indigo-900 p-1 rounded"
                        title="Edit Product"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id, product.name)}
                        className="text-red-600 hover:text-red-900 p-1 rounded"
                        title="Delete Product"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {(searchTerm || filterCategory || filterStatus) ? 'Try adjusting your search criteria.' : 'Get started by creating a new product.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductsTable;