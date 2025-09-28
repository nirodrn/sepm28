import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useRole } from './hooks/useRole';
import { usePermissions } from './hooks/usePermissions';

// Layout Components
import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';
import Footer from './components/Layout/Footer';

// Auth Pages
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import ForgotPassword from './pages/Auth/ForgotPassword';

// Dashboard Pages
import AdminDashboard from './pages/Admin/Dashboard';
import ReadOnlyAdminDashboard from './pages/ReadOnlyAdmin/Dashboard';
import WarehouseOperationsDashboard from './pages/WarehouseOperations/Dashboard';
import HeadOfOperationsDashboard from './pages/HeadOfOperations/Dashboard';
import MainDirectorDashboard from './pages/MainDirector/Dashboard';
import ProductionDashboard from './pages/Production/Dashboard';
import FinishedGoodsStoreDashboard from './pages/FinishedGoodsStore/Dashboard';
import PackingMaterialsStoreDashboard from './pages/PackingMaterialsStore/Dashboard';
import PackingAreaDashboard from './pages/PackingArea/Dashboard';
import RequestMaterials from './pages/PackingArea/RequestMaterials';
import RequestProducts from './pages/PackingArea/RequestProducts';
import ProductionRequestMaterials from './pages/Production/RequestMaterials';
import PackingAreaStockList from './pages/PackingArea/StockList';
import PackingAreaStockDetail from './pages/PackingArea/StockDetail';
import SendToFGStore from './pages/PackingArea/SendToFGStore';
import DispatchHistory from './pages/PackingArea/DispatchHistory';
import PackageProducts from './pages/PackingArea/PackageProducts';
import ProductVariants from './pages/PackingArea/ProductVariants';
import ClaimDispatches from './pages/FinishedGoodsStore/ClaimDispatches';
import FGInventory from './pages/FinishedGoodsStore/Inventory';
import StorageLocations from './pages/FinishedGoodsStore/StorageLocations';
import InternalRequestsList from './pages/PackingMaterialsStore/InternalRequestsList';
import PurchaseRequestHistory from './pages/PackingMaterialsStore/PurchaseRequestHistory';
import PackingMaterialsStoreDispatchHistory from './pages/PackingMaterialsStore/DispatchHistory';
import ProductionRequests from './pages/WarehouseOperations/ProductionRequests';

import CreateBatch from './pages/Production/CreateBatch';
import BatchDetail from './pages/Production/BatchDetail';
import BatchManagement from './pages/Production/BatchManagement';
import HandoverToPacking from './pages/Production/HandoverToPacking';
import QCRecords from './pages/Production/QCRecords';
import ProductionReports from './pages/Production/ProductionReports';
import RawMaterialRequests from './pages/Production/RawMaterialRequests';
import ProductionProductList from './pages/Production/ProductList';
import CreateProductionProduct from './pages/Production/CreateProduct';
import EditProductionProduct from './pages/Production/EditProduct.jsx';
import ProductDetail from './pages/Production/ProductDetail';
import BatchTable from './pages/Production/BatchTable';
import ProductsTable from './pages/Production/ProductsTable';
import ActiveBatchMonitor from './pages/Production/ActiveBatchMonitor';
import ProductionStore from './pages/Production/ProductionStore';
// Head of Operations Pages
import ApprovalQueue from './pages/HeadOfOperations/ApprovalQueue';
import RequestHistory from './pages/HeadOfOperations/RequestHistory';
import SupplierMonitoring from './pages/HeadOfOperations/SupplierMonitoring';

// Admin Pages
import UserList from './pages/Admin/UserManagement/List';
import AddUser from './pages/Admin/UserManagement/AddUser';
import UserDetail from './pages/Admin/UserManagement/UserDetail';
import SupplierList from './pages/Admin/SupplierManagement/List';
import AddSupplier from './pages/Admin/SupplierManagement/AddSupplier';
import SupplierDetail from './pages/Admin/SupplierManagement/SupplierDetail';
import ProductList from './pages/Admin/DataEntry/ProductList';
import EditProduct from './pages/Admin/DataEntry/EditProduct';
import MaterialList from './pages/Admin/DataEntry/MaterialList';
import EditMaterial from './pages/Admin/DataEntry/EditMaterial';
import DataOverride from './pages/Admin/SystemOverride/DataOverride';
import SupplierPerformance from './pages/Admin/Reports/SupplierPerformance';
import StockAnalysis from './pages/Admin/Reports/StockAnalysis';
import SalesPerformance from './pages/Admin/Reports/SalesPerformance';

// ReadOnly Admin Pages
import ReportsView from './pages/ReadOnlyAdmin/ReportsView';

// Packing Materials Store Pages
import StockList from './pages/PackingMaterialsStore/StockList';
import SendToPackingArea from './pages/PackingMaterialsStore/SendToPackingArea';
import RequestFromWarehouse from './pages/PackingMaterialsStore/RequestFromWarehouse';

// Warehouse Operations Pages
import RawMaterialsList from './pages/WarehouseOperations/RawMaterials/List';
import RawMaterialRequestForm from './pages/WarehouseOperations/RawMaterials/RequestForm';
import RawMaterialQCForm from './pages/WarehouseOperations/RawMaterials/QCForm';
import RawMaterialStockDetail from './pages/WarehouseOperations/RawMaterials/StockDetail';
import RawMaterialPriceQualityHistory from './pages/WarehouseOperations/RawMaterials/PriceQualityHistory';
import SupplierAllocation from './pages/WarehouseOperations/RawMaterials/SupplierAllocation';

// Packing Materials Pages
import PackingMaterialsList from './pages/WarehouseOperations/PackingMaterials/List';
import PackingMaterialRequestForm from './pages/WarehouseOperations/PackingMaterials/RequestForm';
import PackingMaterialQCForm from './pages/WarehouseOperations/PackingMaterials/QCForm';
import PackingMaterialStockDetail from './pages/WarehouseOperations/PackingMaterials/StockDetail';
import PackingMaterialPriceQualityHistory from './pages/WarehouseOperations/PackingMaterials/PriceQualityHistory';
import PackingMaterialSupplierAllocation from './pages/WarehouseOperations/PackingMaterials/SupplierAllocation';

// Purchase Order Pages
import PurchaseOrderList from './pages/WarehouseOperations/PurchaseOrders/List';
import CreatePO from './pages/WarehouseOperations/RawMaterials/CreatePO';

// Goods Receipt Pages
import GoodsReceiptList from './pages/WarehouseOperations/GoodsReceipts/List';
import CreateGRN from './pages/WarehouseOperations/GoodsReceipts/CreateGRN';

// Invoice and Payment Pages
import InvoiceList from './pages/WarehouseOperations/Invoices/List';
import InvoiceDetail from './pages/WarehouseOperations/Invoices/InvoiceDetail';
import RecordPayment from './pages/WarehouseOperations/Payments/RecordPayment';
import CreateFromGRN from './pages/WarehouseOperations/Invoices/CreateFromGRN';

// Packing Material Request Pages
import PackingMaterialRequestList from './pages/WarehouseOperations/PackingMaterials/RequestList';
import PackingMaterialRequestStatus from './pages/Admin/Reports/PackingMaterialRequestStatus';

// Direct Shop Request Pages
import DirectShopRequestsMD from './pages/MainDirector/DirectShopRequests';
import DirectShopRequestsHO from './pages/HeadOfOperations/DirectShopRequests';
import DirectShopRequestsFG from './pages/FinishedGoodsStore/DirectShopRequests';
import ProductPricing from './pages/FinishedGoodsStore/ProductPricing';
import ExternalDispatches from './pages/FinishedGoodsStore/ExternalDispatches';
import PriceHistory from './pages/FinishedGoodsStore/PriceHistory';
import ApprovedSalesRequests from './pages/FinishedGoodsStore/ApprovedSalesRequests';
import DispatchTracking from './pages/FinishedGoodsStore/DispatchTracking';

// Raw Material Request Pages
import RawMaterialRequestList from './pages/WarehouseOperations/RawMaterials/RequestList';

// Purchase Preparation Pages
import PurchasePreparationList from './pages/WarehouseOperations/PurchasePreparation/List';
import PurchasePreparationDetail from './pages/WarehouseOperations/PurchasePreparation/Detail';
import DeliveryQCForm from './pages/WarehouseOperations/QualityControl/DeliveryQCForm';
import GRNQCList from './pages/WarehouseOperations/QualityControl/GRNQCList';

// Data Entry Pages
import DataEntryDashboard from './pages/DataEntry/Dashboard';
import AddProduct from './pages/DataEntry/AddProduct';
import AddMaterial from './pages/DataEntry/AddMaterial';
import MaterialTypes from './pages/DataEntry/MaterialTypes';

// PCS Pages
import PermissionControl from './pages/Admin/PCS/PermissionControl';
import SalesApprovalHistory from './pages/Admin/PCS/SalesApprovalHistory';
// Protected Route Component

// Protected Route Component
const ProtectedRoute = ({ children, requiredRoles = [], pagePath = null }) => {
  const { user, loading } = useAuth();
  const { hasRole } = useRole();
  const { hasPagePermission, loading: permissionsLoading } = usePermissions();

  if (loading || permissionsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // For Admin users, always allow access (they have full permissions)
  if (hasRole(['Admin'])) {
    return children;
  }
  
  // For non-Admin users, check PCS permissions first
  if (pagePath) {
    // If user has PCS permission for this page, allow access regardless of role
    if (hasPagePermission(pagePath)) {
      return children;
    }
    
    // If no PCS permission, deny access
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
          <p className="mt-2 text-gray-600">You don't have permission to access this page.</p>
          <p className="mt-1 text-sm text-gray-500">Contact your administrator to request access to this page.</p>
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Page:</strong> {pagePath}
            </p>
            <p className="text-sm text-blue-700 mt-1">
              Access to this page is controlled by the Permission Control System (PCS).
            </p>
          </div>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }
  
  // For routes without pagePath, fall back to role-based permissions
  if (requiredRoles.length > 0 && !hasRole(requiredRoles)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
          <p className="mt-2 text-gray-600">You don't have permission to access this page.</p>
          <p className="mt-1 text-sm text-gray-500">Contact your administrator to request access.</p>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return children;
};

// Dashboard Router Component
const DashboardRouter = () => {
  const { userRole } = useRole();

  if (!userRole) return null;

  switch (userRole.role) {
    case 'Admin':
      return <AdminDashboard />;
    case 'ReadOnlyAdmin':
      return <ReadOnlyAdminDashboard />;
    case 'WarehouseStaff':
      return <WarehouseOperationsDashboard />;
    case 'HeadOfOperations':
      return <HeadOfOperationsDashboard />;
    case 'MainDirector':
      return <MainDirectorDashboard />;
    case 'ProductionManager':
      return <ProductionDashboard />;
    case 'PackingAreaManager':
      return <PackingAreaDashboard />;
    case 'FinishedGoodsStoreManager':
      return <FinishedGoodsStoreDashboard />;
    case 'PackingMaterialsStoreManager':
      return <PackingMaterialsStoreDashboard />;
    case 'DataEntry':
      return <DataEntryDashboard />;
    default:
      return <AdminDashboard />;
  }
};

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading application...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {user ? (
          <div className="flex">
            <Sidebar />
            <div className="flex-1 flex flex-col">
              <Navbar />
              <main className="flex-1">
                <Routes>
                  <Route 
                    path="/dashboard" 
                    element={
                      <ProtectedRoute pagePath="/dashboard">
                        <DashboardRouter />
                      </ProtectedRoute>
                    } 
                  />
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/login" element={<Navigate to="/dashboard" replace />} />
                  
                  {/* Placeholder routes - will be implemented later */}
                  <Route path="/admin/users" element={<ProtectedRoute requiredRoles={['Admin']} pagePath="/admin/users"><UserList /></ProtectedRoute>} />
                  <Route path="/admin/users/add" element={<ProtectedRoute requiredRoles={['Admin']} pagePath="/admin/users/add"><AddUser /></ProtectedRoute>} />
                  <Route path="/admin/users/edit/:id" element={<ProtectedRoute requiredRoles={['Admin']} pagePath="/admin/users/add"><AddUser /></ProtectedRoute>} />
                  <Route path="/admin/users/:id" element={<ProtectedRoute requiredRoles={['Admin']} pagePath="/admin/users"><UserDetail /></ProtectedRoute>} />
                  
                  {/* PCS Route */}
                  <Route path="/admin/pcs" element={<ProtectedRoute requiredRoles={['Admin']} pagePath="/admin/pcs"><PermissionControl /></ProtectedRoute>} />
                  <Route path="/admin/pcs/sales-history" element={<ProtectedRoute requiredRoles={['MainDirector', 'HeadOfOperations', 'Admin']} pagePath="/admin/pcs/sales-history"><SalesApprovalHistory /></ProtectedRoute>} />
                  
                  {/* Admin Supplier Management Routes */}
                  <Route path="/admin/suppliers" element={<ProtectedRoute requiredRoles={['Admin', 'ReadOnlyAdmin']} pagePath="/admin/suppliers"><SupplierList /></ProtectedRoute>} />
                  <Route path="/admin/suppliers/add" element={<ProtectedRoute requiredRoles={['Admin']} pagePath="/admin/suppliers/add"><AddSupplier /></ProtectedRoute>} />
                  <Route path="/admin/suppliers/edit/:id" element={<ProtectedRoute requiredRoles={['Admin']} pagePath="/admin/suppliers/add"><AddSupplier /></ProtectedRoute>} />
                  <Route path="/admin/suppliers/:id" element={<ProtectedRoute requiredRoles={['Admin', 'ReadOnlyAdmin']} pagePath="/admin/suppliers"><SupplierDetail /></ProtectedRoute>} />
                  
                  {/* Admin Product Management Routes */}
                  <Route path="/admin/products" element={<ProtectedRoute requiredRoles={['Admin']} pagePath="/admin/products"><ProductList /></ProtectedRoute>} />
                  <Route path="/admin/products/edit/:id" element={<ProtectedRoute requiredRoles={['Admin']} pagePath="/admin/products"><EditProduct /></ProtectedRoute>} />
                  
                  {/* Admin Material Management Routes */}
                  <Route path="/admin/materials" element={<ProtectedRoute requiredRoles={['Admin']} pagePath="/admin/materials"><MaterialList /></ProtectedRoute>} />
                  <Route path="/admin/materials/edit/:id" element={<ProtectedRoute requiredRoles={['Admin']} pagePath="/admin/materials"><EditMaterial /></ProtectedRoute>} />
                  
                  {/* Admin System Override Routes */}
                  <Route path="/admin/system/data-override" element={<ProtectedRoute requiredRoles={['Admin']} pagePath="/admin/system/data-override"><DataOverride /></ProtectedRoute>} />
                  
                  {/* Admin Data Entry Routes */}
                  <Route path="/admin/data-entry" element={<ProtectedRoute requiredRoles={['Admin']} pagePath="/admin/data-entry"><DataEntryDashboard /></ProtectedRoute>} />
                  <Route path="/admin/data-entry/add-product" element={<ProtectedRoute requiredRoles={['Admin']} pagePath="/admin/data-entry/add-product"><AddProduct /></ProtectedRoute>} />
                  <Route path="/admin/data-entry/add-material" element={<ProtectedRoute requiredRoles={['Admin']} pagePath="/admin/data-entry/add-material"><AddMaterial /></ProtectedRoute>} />
                  <Route path="/admin/data-entry/material-types" element={<ProtectedRoute requiredRoles={['Admin']} pagePath="/admin/data-entry/material-types"><MaterialTypes /></ProtectedRoute>} />
                  
                  {/* Admin Reports Routes */}
                  <Route path="/admin/reports/supplier-performance" element={<ProtectedRoute requiredRoles={['Admin', 'MainDirector']} pagePath="/admin/reports/supplier-performance"><SupplierPerformance /></ProtectedRoute>} />
                  <Route path="/admin/reports/stock-analysis" element={<ProtectedRoute requiredRoles={['Admin']} pagePath="/admin/reports/stock-analysis"><StockAnalysis /></ProtectedRoute>} />
                  <Route path="/admin/reports/sales-performance" element={<ProtectedRoute requiredRoles={['Admin']} pagePath="/admin/reports/sales-performance"><SalesPerformance /></ProtectedRoute>} />
                  <Route path="/admin/reports/packing-material-requests" element={<ProtectedRoute requiredRoles={['Admin', 'HeadOfOperations', 'MainDirector']} pagePath="/admin/reports/packing-material-requests"><PackingMaterialRequestStatus /></ProtectedRoute>} />
                  
                  {/* Direct Shop Request Routes */}
                  <Route path="/direct-shop-requests" element={<ProtectedRoute requiredRoles={['MainDirector']} pagePath="/direct-shop-requests"><DirectShopRequestsMD /></ProtectedRoute>} />
                  
                  <Route path="/admin/*" element={<ProtectedRoute requiredRoles={['Admin']}><div className="p-6">Other admin sections coming soon...</div></ProtectedRoute>} />
                  <Route path="/warehouse/*" element={<ProtectedRoute requiredRoles={['WarehouseStaff', 'Admin']}><div className="p-6">Warehouse section coming soon...</div></ProtectedRoute>} />
                  <Route path="/warehouse/raw-materials" element={<ProtectedRoute requiredRoles={['WarehouseStaff', 'Admin']} pagePath="/warehouse/raw-materials"><RawMaterialsList /></ProtectedRoute>} />
                  <Route path="/warehouse/raw-materials/request" element={<ProtectedRoute requiredRoles={['WarehouseStaff', 'Admin']} pagePath="/warehouse/raw-materials/request"><RawMaterialRequestForm /></ProtectedRoute>} />
                  <Route path="/warehouse/raw-materials/requests" element={<ProtectedRoute requiredRoles={['WarehouseStaff', 'Admin']} pagePath="/warehouse/raw-materials/requests"><RawMaterialRequestList /></ProtectedRoute>} />
                  <Route path="/warehouse/raw-materials/:id" element={<ProtectedRoute requiredRoles={['WarehouseStaff', 'Admin']} pagePath="/warehouse/raw-materials"><RawMaterialStockDetail /></ProtectedRoute>} />
                  <Route path="/warehouse/raw-materials/:id/qc" element={<ProtectedRoute requiredRoles={['WarehouseStaff', 'Admin']} pagePath="/warehouse/raw-materials"><RawMaterialQCForm /></ProtectedRoute>} />
                  <Route path="/warehouse/raw-materials/price-quality-history" element={<ProtectedRoute requiredRoles={['WarehouseStaff', 'Admin']} pagePath="/warehouse/raw-materials"><RawMaterialPriceQualityHistory /></ProtectedRoute>} />
                  <Route path="/warehouse/raw-materials/supplier-allocation" element={<ProtectedRoute requiredRoles={['WarehouseStaff', 'Admin']} pagePath="/warehouse/raw-materials"><SupplierAllocation /></ProtectedRoute>} />
                  
                  <Route path="/warehouse/packing-materials" element={<ProtectedRoute requiredRoles={['WarehouseStaff', 'Admin']} pagePath="/warehouse/packing-materials"><PackingMaterialsList /></ProtectedRoute>} />
                  <Route path="/warehouse/packing-materials/request" element={<ProtectedRoute requiredRoles={['WarehouseStaff', 'Admin']} pagePath="/warehouse/packing-materials/request"><PackingMaterialRequestForm /></ProtectedRoute>} />
                  <Route path="/warehouse/packing-materials/:id" element={<ProtectedRoute requiredRoles={['WarehouseStaff', 'Admin']} pagePath="/warehouse/packing-materials"><PackingMaterialStockDetail /></ProtectedRoute>} />
                  <Route path="/warehouse/packing-materials/:id/qc" element={<ProtectedRoute requiredRoles={['WarehouseStaff', 'Admin']} pagePath="/warehouse/packing-materials"><PackingMaterialQCForm /></ProtectedRoute>} />
                  <Route path="/warehouse/packing-materials/price-quality-history" element={<ProtectedRoute requiredRoles={['WarehouseStaff', 'Admin']} pagePath="/warehouse/packing-materials"><PackingMaterialPriceQualityHistory /></ProtectedRoute>} />
                  <Route path="/warehouse/packing-materials/supplier-allocation" element={<ProtectedRoute requiredRoles={['WarehouseStaff', 'Admin']} pagePath="/warehouse/packing-materials"><PackingMaterialSupplierAllocation /></ProtectedRoute>} />
                  
                  {/* Packing Material Request Routes */}
                  <Route path="/warehouse/packing-materials/requests" element={<ProtectedRoute requiredRoles={['WarehouseStaff', 'Admin']} pagePath="/warehouse/packing-materials/requests"><PackingMaterialRequestList /></ProtectedRoute>} />
                  <Route path="/warehouse/packing-materials/requests/:id/allocate" element={<ProtectedRoute requiredRoles={['WarehouseStaff', 'Admin']} pagePath="/warehouse/packing-materials/requests"><PackingMaterialSupplierAllocation /></ProtectedRoute>} />
                  
                  {/* Purchase Preparation Routes */}
                  <Route path="/warehouse/purchase-preparation" element={<ProtectedRoute requiredRoles={['WarehouseStaff', 'Admin']} pagePath="/warehouse/purchase-preparation"><PurchasePreparationList /></ProtectedRoute>} />
                  <Route path="/warehouse/purchase-preparation/:id" element={<ProtectedRoute requiredRoles={['WarehouseStaff', 'Admin']} pagePath="/warehouse/purchase-preparation"><PurchasePreparationDetail /></ProtectedRoute>} />
                  <Route path="/warehouse/delivery-qc/:deliveryId" element={<ProtectedRoute requiredRoles={['WarehouseStaff', 'Admin']} pagePath="/warehouse/purchase-preparation"><DeliveryQCForm /></ProtectedRoute>} />
                  
                  {/* Raw Material Allocation Routes */}
                  <Route path="/warehouse/raw-materials/requests/:id/allocate" element={<ProtectedRoute requiredRoles={['WarehouseStaff', 'Admin']} pagePath="/warehouse/raw-materials/requests"><SupplierAllocation /></ProtectedRoute>} />
                  
                  {/* Purchase Order Routes */}
                  <Route path="/warehouse/purchase-orders" element={<ProtectedRoute requiredRoles={['WarehouseStaff', 'Admin']} pagePath="/warehouse/purchase-orders"><PurchaseOrderList /></ProtectedRoute>} />
                  <Route path="/warehouse/purchase-orders/create" element={<ProtectedRoute requiredRoles={['WarehouseStaff', 'Admin']} pagePath="/warehouse/purchase-orders"><CreatePO /></ProtectedRoute>} />
                  
                  {/* Goods Receipt Routes */}
                  <Route path="/warehouse/goods-receipts" element={<ProtectedRoute requiredRoles={['WarehouseStaff', 'Admin']} pagePath="/warehouse/goods-receipts"><GoodsReceiptList /></ProtectedRoute>} />
                  <Route path="/warehouse/goods-receipts/create" element={<ProtectedRoute requiredRoles={['WarehouseStaff', 'Admin']} pagePath="/warehouse/goods-receipts"><CreateGRN /></ProtectedRoute>} />
                  
                  {/* Invoice and Payment Routes */}
                  <Route path="/warehouse/invoices" element={<ProtectedRoute requiredRoles={['WarehouseStaff', 'Admin']} pagePath="/warehouse/invoices"><InvoiceList /></ProtectedRoute>} />
                  <Route path="/warehouse/invoices/:id" element={<ProtectedRoute requiredRoles={['WarehouseStaff', 'Admin']} pagePath="/warehouse/invoices"><InvoiceDetail /></ProtectedRoute>} />
                  <Route path="/warehouse/invoices/:invoiceId/payment" element={<ProtectedRoute requiredRoles={['WarehouseStaff', 'Admin']} pagePath="/warehouse/invoices"><RecordPayment /></ProtectedRoute>} />
                  <Route path="/warehouse/invoices/create-from-grn" element={<ProtectedRoute requiredRoles={['WarehouseStaff', 'Admin']} pagePath="/warehouse/invoices"><CreateFromGRN /></ProtectedRoute>} />
                  
                  {/* QC Routes */}
                  <Route path="/warehouse/qc/grn-list" element={<ProtectedRoute requiredRoles={['WarehouseStaff', 'Admin']} pagePath="/warehouse/qc/grn-list"><GRNQCList /></ProtectedRoute>} />
                  
                  {/* Production Request Routes */}
                  <Route path="/warehouse/production-requests" element={<ProtectedRoute requiredRoles={['WarehouseStaff', 'HeadOfOperations', 'Admin']} pagePath="/warehouse/production-requests"><ProductionRequests /></ProtectedRoute>} />
                  
                  {/* Head of Operations Routes */}
                  <Route path="/approvals/*" element={<ProtectedRoute requiredRoles={['HeadOfOperations', 'MainDirector']}><div className="p-6">Approvals section coming soon...</div></ProtectedRoute>} />
                  
                  {/* Head of Operations Routes */}
                  <Route path="/approvals" element={<ProtectedRoute requiredRoles={['HeadOfOperations', 'MainDirector']} pagePath="/approvals"><ApprovalQueue /></ProtectedRoute>} />
                  <Route path="/approvals/history" element={<ProtectedRoute requiredRoles={['HeadOfOperations', 'MainDirector', 'WarehouseStaff', 'PackingMaterialsStoreManager', 'PackingAreaManager']} pagePath="/approvals/history"><RequestHistory /></ProtectedRoute>} />
                  <Route path="/approvals/supplier-monitoring" element={<ProtectedRoute requiredRoles={['HeadOfOperations', 'MainDirector']} pagePath="/approvals/supplier-monitoring"><SupplierMonitoring /></ProtectedRoute>} />
                  <Route path="/approvals/direct-shop-requests" element={<ProtectedRoute requiredRoles={['HeadOfOperations']} pagePath="/approvals/direct-shop-requests"><DirectShopRequestsHO /></ProtectedRoute>} />
                  
                  {/* Production Routes - accessible via PCS permissions */}
                  <Route path="/production/store" element={<ProtectedRoute pagePath="/production/store"><ProductionStore /></ProtectedRoute>} />
                  <Route path="/production/batches" element={<ProtectedRoute pagePath="/production/batches"><BatchManagement /></ProtectedRoute>} />
                  <Route path="/production/monitor" element={<ProtectedRoute pagePath="/production/monitor"><ActiveBatchMonitor /></ProtectedRoute>} />
                  <Route path="/production/raw-material-requests" element={<ProtectedRoute pagePath="/production/raw-material-requests"><RawMaterialRequests /></ProtectedRoute>} />
                  <Route path="/production/products/create" element={<ProtectedRoute pagePath="/production/products/create"><CreateProductionProduct /></ProtectedRoute>} />
                  <Route path="/production/create-batch" element={<ProtectedRoute pagePath="/production/create-batch"><CreateBatch /></ProtectedRoute>} />
                  <Route path="/production/handover" element={<ProtectedRoute pagePath="/production/handover"><HandoverToPacking /></ProtectedRoute>} />
                  <Route path="/production/qc-records" element={<ProtectedRoute pagePath="/production/qc-records"><QCRecords /></ProtectedRoute>} />
                  <Route path="/production/reports" element={<ProtectedRoute pagePath="/production/reports"><ProductionReports /></ProtectedRoute>} />
                  <Route path="/production/batch-table" element={<ProtectedRoute pagePath="/production/batch-table"><BatchTable /></ProtectedRoute>} />
                  <Route path="/production/products" element={<ProtectedRoute pagePath="/production/products"><ProductionProductList /></ProtectedRoute>} />
                  <Route path="/production/products-table" element={<ProtectedRoute pagePath="/production/products-table"><ProductsTable /></ProtectedRoute>} />
                  
                  {/* Packing Area Routes */}
                  <Route path="/production/batches/:id" element={<ProtectedRoute pagePath="/production/batches"><BatchDetail /></ProtectedRoute>} />
                  <Route path="/production/products/:id/edit" element={<ProtectedRoute pagePath="/production/products/create"><EditProductionProduct /></ProtectedRoute>} />
                  <Route path="/production/products/:id" element={<ProtectedRoute pagePath="/production/products"><ProductDetail /></ProtectedRoute>} />
                  
                  {/* Packing Area Routes - accessible via PCS permissions */}
                  <Route path="/packing-area/stock" element={<ProtectedRoute pagePath="/packing-area/stock"><PackingAreaStockList /></ProtectedRoute>} />
                  <Route path="/packing-area/stock/:id" element={<ProtectedRoute pagePath="/packing-area/stock"><PackingAreaStockDetail /></ProtectedRoute>} />
                  <Route path="/packing-area/send-to-fg" element={<ProtectedRoute pagePath="/packing-area/send-to-fg"><SendToFGStore /></ProtectedRoute>} />
                  <Route path="/packing-area/dispatch-history" element={<ProtectedRoute pagePath="/packing-area/dispatch-history"><DispatchHistory /></ProtectedRoute>} />
                  <Route path="/packing-area/package-products" element={<ProtectedRoute pagePath="/packing-area/package-products"><PackageProducts /></ProtectedRoute>} />
                  <Route path="/packing-area/variants" element={<ProtectedRoute pagePath="/packing-area/variants"><ProductVariants /></ProtectedRoute>} />
                  <Route path="/packing-area/request-materials" element={<ProtectedRoute pagePath="/packing-area/request-materials"><RequestMaterials /></ProtectedRoute>} />
                  <Route path="/packing-area/request-products" element={<ProtectedRoute pagePath="/packing-area/request-products"><RequestProducts /></ProtectedRoute>} />
                  
                  {/* Finished Goods Routes - accessible via PCS permissions */}
                  <Route path="/finished-goods/inventory" element={<ProtectedRoute pagePath="/finished-goods/inventory"><FGInventory /></ProtectedRoute>} />
                  <Route path="/finished-goods/storage-locations" element={<ProtectedRoute pagePath="/finished-goods/storage-locations"><StorageLocations /></ProtectedRoute>} />
                  <Route path="/finished-goods/claim-dispatches" element={<ProtectedRoute pagePath="/finished-goods/claim-dispatches"><ClaimDispatches /></ProtectedRoute>} />
                  <Route path="/finished-goods/direct-shop-requests" element={<ProtectedRoute pagePath="/finished-goods/direct-shop-requests"><DirectShopRequestsFG /></ProtectedRoute>} />
                  <Route path="/finished-goods/pricing" element={<ProtectedRoute pagePath="/finished-goods/pricing"><ProductPricing /></ProtectedRoute>} />
                  <Route path="/finished-goods/external-dispatches" element={<ProtectedRoute pagePath="/finished-goods/external-dispatches"><ExternalDispatches /></ProtectedRoute>} />
                  <Route path="/finished-goods/price-history" element={<ProtectedRoute pagePath="/finished-goods/price-history"><PriceHistory /></ProtectedRoute>} />
                  <Route path="/finished-goods/dispatch-tracking" element={<ProtectedRoute pagePath="/finished-goods/dispatch-tracking"><DispatchTracking /></ProtectedRoute>} />
                  <Route path="/finished-goods/approved-sales" element={<ProtectedRoute pagePath="/finished-goods/approved-sales"><ApprovedSalesRequests /></ProtectedRoute>} />
                  
                  {/* Packing Materials Store Routes - accessible via PCS permissions */}
                  <Route path="/packing-materials/stock" element={<ProtectedRoute pagePath="/packing-materials/stock"><StockList /></ProtectedRoute>} />
                  <Route path="/packing-materials/send" element={<ProtectedRoute pagePath="/packing-materials/send"><SendToPackingArea /></ProtectedRoute>} />
                  <Route path="/packing-materials/request-from-warehouse" element={<ProtectedRoute pagePath="/packing-materials/request-from-warehouse"><RequestFromWarehouse /></ProtectedRoute>} />
                  <Route path="/packing-materials/requests/internal" element={<ProtectedRoute pagePath="/packing-materials/requests/internal"><InternalRequestsList /></ProtectedRoute>} />
                  <Route path="/packing-materials/requests/history" element={<ProtectedRoute pagePath="/packing-materials/requests/history"><PurchaseRequestHistory /></ProtectedRoute>} />
                  <Route path="/packing-materials/dispatches" element={<ProtectedRoute pagePath="/packing-materials/dispatches"><PackingMaterialsStoreDispatchHistory /></ProtectedRoute>} />
                  
                  <Route path="/finished-goods/*" element={<ProtectedRoute requiredRoles={['FinishedGoodsStoreManager', 'Admin']}><FinishedGoodsStoreDashboard /></ProtectedRoute>} />
                  <Route path="/reports" element={<ProtectedRoute requiredRoles={['Admin', 'ReadOnlyAdmin', 'MainDirector', 'HeadOfOperations']} pagePath="/reports"><ReportsView /></ProtectedRoute>} />
                  
                  {/* Data Entry Routes */}
                  <Route path="/data-entry" element={<ProtectedRoute requiredRoles={['DataEntry', 'Admin']} pagePath="/data-entry"><DataEntryDashboard /></ProtectedRoute>} />
                  <Route path="/data-entry/add-product" element={<ProtectedRoute requiredRoles={['DataEntry', 'Admin']} pagePath="/data-entry/add-product"><AddProduct /></ProtectedRoute>} />
                  <Route path="/data-entry/add-material" element={<ProtectedRoute requiredRoles={['DataEntry', 'Admin']} pagePath="/data-entry/add-material"><AddMaterial /></ProtectedRoute>} />
                  <Route path="/data-entry/material-types" element={<ProtectedRoute requiredRoles={['DataEntry', 'Admin']} pagePath="/data-entry/material-types"><MaterialTypes /></ProtectedRoute>} />
                  <Route path="/data-entry/*" element={<ProtectedRoute requiredRoles={['DataEntry', 'Admin']}><div className="p-6">Other data entry sections coming soon...</div></ProtectedRoute>} />
                </Routes>
              </main>
              <Footer />
            </div>
          </div>
        ) : (
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        )}
      </div>
    </Router>
  );
}

export default App;