import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Package, ArrowLeft, Edit, Download, FileSpreadsheet, Factory, Calendar } from 'lucide-react';
import { productionService } from '../../services/productionService';
import { materialService } from '../../services/materialService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import * as XLSX from 'xlsx';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [batches, setBatches] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      loadProductData();
    }
  }, [id]);

  const loadProductData = async () => {
    try {
      setLoading(true);
      const [productData, batchData, materialData] = await Promise.all([
        productionService.getProductionProducts(),
        productionService.getBatches({ productId: id }),
        materialService.getRawMaterials()
      ]);
      
      const productInfo = productData.find(p => p.id === id);
      if (!productInfo) {
        setError('Product not found');
        return;
      }
      
      setProduct(productInfo);
      setBatches(batchData);
      setMaterials(materialData);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!product) return;

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Product Information Sheet
    const productInfo = [
      ['Product Information'],
      [''],
      ['Product Name', product.name],
      ['Product Code', product.code],
      ['Category', product.category],
      ['Unit', product.unit],
      ['Shelf Life (days)', product.shelfLife || 'N/A'],
      ['Status', product.status],
      ['Description', product.description || 'N/A'],
      ['Storage Conditions', product.storageConditions || 'N/A'],
      ['Quality Parameters', product.qualityParameters || 'N/A'],
      ['Created Date', product.createdAt ? new Date(product.createdAt).toLocaleDateString() : 'N/A'],
      ['Created By', product.createdByName || 'N/A']
    ];

    const productWS = XLSX.utils.aoa_to_sheet(productInfo);
    XLSX.utils.book_append_sheet(wb, productWS, 'Product Info');

    // Material Requirements Sheet
    if (product.materialRequirements && product.materialRequirements.length > 0) {
      const materialHeaders = [
        ['Material Requirements'],
        [''],
        ['Material Name', 'Material Code', 'Quantity per Unit', 'Unit', 'Notes']
      ];

      const materialRows = product.materialRequirements.map(req => {
        const material = materials.find(m => m.id === req.materialId);
        return [
          req.materialName,
          material?.code || 'N/A',
          req.quantityPerUnit,
          req.unit,
          req.notes || 'N/A'
        ];
      });

      const materialData = [...materialHeaders, ...materialRows];
      const materialWS = XLSX.utils.aoa_to_sheet(materialData);
      XLSX.utils.book_append_sheet(wb, materialWS, 'Material Requirements');
    }

    // Production Batches Sheet
    if (batches.length > 0) {
      const batchHeaders = [
        ['Production Batches'],
        [''],
        ['Batch Number', 'Status', 'Stage', 'Target Quantity', 'Output Quantity', 'Progress (%)', 'Created Date', 'Completed Date', 'Created By']
      ];

      const batchRows = batches.map(batch => [
        batch.batchNumber,
        batch.status?.toUpperCase(),
        batch.stage?.replace('_', ' ').toUpperCase(),
        `${batch.targetQuantity} ${batch.unit}`,
        batch.outputQuantity ? `${batch.outputQuantity} ${batch.unit}` : 'N/A',
        `${batch.progress || 0}%`,
        batch.createdAt ? new Date(batch.createdAt).toLocaleDateString() : 'N/A',
        batch.completedAt ? new Date(batch.completedAt).toLocaleDateString() : 'N/A',
        batch.createdByName || 'N/A'
      ]);

      const batchData = [...batchHeaders, ...batchRows];
      const batchWS = XLSX.utils.aoa_to_sheet(batchData);
      XLSX.utils.book_append_sheet(wb, batchWS, 'Production Batches');
    }

    // Save file
    XLSX.writeFile(wb, `product-${product.code}-${new Date().toISOString().split('T')[0]}.xlsx`);
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

  const getBatchStatusColor = (status) => {
    switch (status) {
      case 'created':
        return 'bg-blue-100 text-blue-800';
      case 'mixing':
        return 'bg-yellow-100 text-yellow-800';
      case 'heating':
        return 'bg-orange-100 text-orange-800';
      case 'cooling':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'handed_over':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading product details..." />;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Error loading product</h3>
          <p className="text-red-500 mt-2">{error}</p>
          <button
            onClick={() => navigate('/production/products')}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Product not found</h3>
          <button
            onClick={() => navigate('/production/products')}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Back to Products
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
              onClick={() => navigate('/production/products')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Package className="h-8 w-8 mr-3 text-blue-600" />
                {product.name}
              </h1>
              <p className="text-gray-600 mt-2">Code: {product.code} • Category: {product.category}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={exportToExcel}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Export to Excel</span>
            </button>
            <button
              onClick={() => navigate(`/production/products/${id}/edit`)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Edit className="h-4 w-4" />
              <span>Edit Product</span>
            </button>
          </div>
        </div>
      </div>

      {/* Product Information Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Product Information</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">Product Name</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.name}</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">Product Code</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.code}</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">Category</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.category}</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">Unit</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.unit}</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">Shelf Life</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {product.shelfLife ? `${product.shelfLife} days` : 'N/A'}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">Status</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(product.status)}`}>
                    {product.status}
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm font-medium text-gray-500">Description</td>
                <td className="px-6 py-4 text-sm text-gray-900">{product.description || 'N/A'}</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm font-medium text-gray-500">Storage Conditions</td>
                <td className="px-6 py-4 text-sm text-gray-900">{product.storageConditions || 'N/A'}</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm font-medium text-gray-500">Quality Parameters</td>
                <td className="px-6 py-4 text-sm text-gray-900">{product.qualityParameters || 'N/A'}</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">Created Date</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {product.createdAt ? new Date(product.createdAt).toLocaleDateString() : 'N/A'}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">Created By</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.createdByName || 'N/A'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Material Requirements Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Material Requirements</h2>
            <button
              onClick={() => {
                if (product.materialRequirements && product.materialRequirements.length > 0) {
                  const materialData = [
                    ['Material Requirements for ' + product.name],
                    [''],
                    ['Material Name', 'Material Code', 'Quantity per Unit', 'Unit', 'Notes']
                  ];

                  const materialRows = product.materialRequirements.map(req => {
                    const material = materials.find(m => m.id === req.materialId);
                    return [
                      req.materialName,
                      material?.code || 'N/A',
                      req.quantityPerUnit,
                      req.unit,
                      req.notes || 'N/A'
                    ];
                  });

                  const ws = XLSX.utils.aoa_to_sheet([...materialData, ...materialRows]);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, 'Material Requirements');
                  XLSX.writeFile(wb, `${product.code}-material-requirements.xlsx`);
                }
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center space-x-1 transition-colors"
            >
              <Download className="h-3 w-3" />
              <span>Export</span>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Material Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Material Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity per Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {product.materialRequirements && product.materialRequirements.length > 0 ? (
                product.materialRequirements.map((requirement, index) => {
                  const material = materials.find(m => m.id === requirement.materialId);
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {requirement.materialName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {material?.code || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {requirement.quantityPerUnit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {requirement.unit}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {requirement.notes || 'N/A'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    No material requirements defined for this product
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Production Batches Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Production Batches</h2>
            <button
              onClick={() => {
                if (batches.length > 0) {
                  const batchData = [
                    [`Production Batches for ${product.name}`],
                    [''],
                    ['Batch Number', 'Status', 'Stage', 'Target Quantity', 'Output Quantity', 'Progress (%)', 'Created Date', 'Completed Date', 'Created By', 'Notes']
                  ];

                  const batchRows = batches.map(batch => [
                    batch.batchNumber,
                    batch.status?.toUpperCase(),
                    batch.stage?.replace('_', ' ').toUpperCase(),
                    `${batch.targetQuantity} ${batch.unit}`,
                    batch.outputQuantity ? `${batch.outputQuantity} ${batch.unit}` : 'N/A',
                    `${batch.progress || 0}%`,
                    batch.createdAt ? new Date(batch.createdAt).toLocaleDateString() : 'N/A',
                    batch.completedAt ? new Date(batch.completedAt).toLocaleDateString() : 'N/A',
                    batch.createdByName || 'N/A',
                    batch.notes || 'N/A'
                  ]);

                  const ws = XLSX.utils.aoa_to_sheet([...batchData, ...batchRows]);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, 'Production Batches');
                  XLSX.writeFile(wb, `${product.code}-production-batches.xlsx`);
                }
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center space-x-1 transition-colors"
            >
              <Download className="h-3 w-3" />
              <span>Export</span>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Batch Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Target Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Output Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
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
              {batches.length > 0 ? (
                batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      {batch.batchNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getBatchStatusColor(batch.status)}`}>
                        {batch.status?.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {batch.stage?.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {batch.targetQuantity} {batch.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {batch.outputQuantity ? `${batch.outputQuantity} ${batch.unit}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                            style={{width: `${batch.progress || 0}%`}}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">{batch.progress || 0}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {batch.createdAt ? new Date(batch.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {batch.createdByName || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => navigate(`/production/batches/${batch.id}`)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        title="View Batch Details"
                      >
                        <Factory className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="px-6 py-8 text-center text-gray-500">
                    <Factory className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p>No production batches created for this product yet</p>
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

export default ProductDetail;