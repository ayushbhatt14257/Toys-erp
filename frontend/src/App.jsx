import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/DashboardPage';
import OrdersPage from './pages/orders/OrdersPage';
import OrderDetailPage from './pages/orders/OrderDetailPage';
import OrderFormPage from './pages/orders/OrderFormPage';
import InventoryPage from './pages/inventory/InventoryPage';
import ProductionPage from './pages/production/ProductionPage';
import ProductionDetailPage from './pages/production/ProductionDetailPage';
import ProductionFormPage from './pages/production/ProductionFormPage';
import BOMPage from './pages/bom/BOMPage';
import BOMFormPage from './pages/bom/BOMFormPage';
import MasterPartiesPage from './pages/master/MasterPartiesPage';
import MasterSKUsPage from './pages/master/MasterSKUsPage';
import MasterRawMaterialsPage from './pages/master/MasterRawMaterialsPage';
import MasterMouldsPage from './pages/master/MasterMouldsPage';
import ReportsPage from './pages/reports/ReportsPage';
import SettingsPage from './pages/settings/SettingsPage';
import AuditPage from './pages/settings/AuditPage';
import NotFoundPage from './pages/NotFoundPage';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        {/* Orders */}
        <Route path="orders" element={<ProtectedRoute roles={['master_admin','order_manager','inventory_manager','production_manager']}><OrdersPage /></ProtectedRoute>} />
        <Route path="orders/new" element={<ProtectedRoute roles={['master_admin','order_manager']}><OrderFormPage /></ProtectedRoute>} />
        <Route path="orders/:id" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />
        <Route path="orders/:id/edit" element={<ProtectedRoute roles={['master_admin','order_manager']}><OrderFormPage /></ProtectedRoute>} />
        {/* Inventory */}
        <Route path="inventory" element={<ProtectedRoute roles={['master_admin','inventory_manager','order_manager','production_manager']}><InventoryPage /></ProtectedRoute>} />
        {/* Production */}
        <Route path="production" element={<ProtectedRoute roles={['master_admin','production_manager','order_manager','inventory_manager']}><ProductionPage /></ProtectedRoute>} />
        <Route path="production/new" element={<ProtectedRoute roles={['master_admin','production_manager']}><ProductionFormPage /></ProtectedRoute>} />
        <Route path="production/:id" element={<ProtectedRoute><ProductionDetailPage /></ProtectedRoute>} />
        {/* BOM */}
        <Route path="bom" element={<ProtectedRoute><BOMPage /></ProtectedRoute>} />
        <Route path="bom/new" element={<ProtectedRoute roles={['master_admin']}><BOMFormPage /></ProtectedRoute>} />
        <Route path="bom/:id/edit" element={<ProtectedRoute roles={['master_admin']}><BOMFormPage /></ProtectedRoute>} />
        {/* Master Data */}
        <Route path="master/parties" element={<ProtectedRoute><MasterPartiesPage /></ProtectedRoute>} />
        <Route path="master/skus" element={<ProtectedRoute><MasterSKUsPage /></ProtectedRoute>} />
        <Route path="master/raw-materials" element={<ProtectedRoute><MasterRawMaterialsPage /></ProtectedRoute>} />
        <Route path="master/moulds" element={<ProtectedRoute><MasterMouldsPage /></ProtectedRoute>} />
        {/* Reports */}
        <Route path="reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
        {/* Settings */}
        <Route path="settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="settings/audit" element={<ProtectedRoute roles={['master_admin']}><AuditPage /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default function App() {
  return <AuthProvider><AppRoutes /></AuthProvider>;
}
