import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, Wrench, BookOpen,
  Database, Users, FileText, Settings, ChevronDown, ChevronRight,
  Boxes, Factory, X, LogOut
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const NavItem = ({ to, icon: Icon, label, onClick }) => (
  <NavLink to={to} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={onClick}>
    <Icon size={18} />
    <span>{label}</span>
  </NavLink>
);

const NavGroup = ({ icon: Icon, label, children }) => {
  const location = useLocation();
  const isActive = children.some(c => location.pathname.startsWith(c.to));
  const [open, setOpen] = useState(isActive);
  return (
    <div>
      <button onClick={() => setOpen(o => !o)}
        className={`sidebar-link w-full justify-between ${isActive ? 'active' : ''}`}>
        <span className="flex items-center gap-3"><Icon size={18} />{label}</span>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && <div className="ml-4 mt-1 space-y-0.5 border-l border-gray-200 dark:border-gray-700 pl-3">{children.map(c => <NavItem key={c.to} {...c} />)}</div>}
    </div>
  );
};

export default function Sidebar({ onClose }) {
  const { user, logout, isMasterAdmin } = useAuth();

  const masterLinks = [
    { to: '/master/parties', icon: Users, label: 'Parties' },
    { to: '/master/skus', icon: Boxes, label: 'SKUs' },
    { to: '/master/raw-materials', icon: Package, label: 'Raw Materials' },
    { to: '/master/moulds', icon: Wrench, label: 'Moulds' },
  ];

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <Factory size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Toy ERP</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Manufacturing</p>
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        <NavItem to="/" icon={LayoutDashboard} label="Dashboard" onClick={onClose} />
        <NavItem to="/orders" icon={ShoppingCart} label="Orders" onClick={onClose} />
        <NavItem to="/inventory" icon={Package} label="Inventory" onClick={onClose} />
        <NavItem to="/production" icon={Factory} label="Production" onClick={onClose} />
        <NavItem to="/bom" icon={BookOpen} label="BOM" onClick={onClose} />
        <NavItem to="/reports" icon={FileText} label="Reports" onClick={onClose} />

        {isMasterAdmin && (
          <>
            <div className="pt-3 pb-1">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3">Master Data</p>
            </div>
            <NavGroup icon={Database} label="Master Data" children={masterLinks} />
            <NavItem to="/settings" icon={Settings} label="Settings" onClick={onClose} />
            <NavItem to="/settings/audit" icon={FileText} label="Audit Log" onClick={onClose} />
          </>
        )}

        {!isMasterAdmin && (
          <NavItem to="/settings" icon={Settings} label="Settings" onClick={onClose} />
        )}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role?.replace(/_/g, ' ')}</p>
          </div>
          <button onClick={logout} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500" title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
