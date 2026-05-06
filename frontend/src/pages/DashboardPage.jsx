import { useQuery } from '@tanstack/react-query';
import { ShoppingCart, Package, Factory, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { ordersAPI, inventoryAPI, productionAPI } from '../services/apiServices';
import { StatCard, PageHeader, PageLoader } from '../components/common';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const { data: orderStats, isLoading: loadingOrders } = useQuery({
    queryKey: ['order-dashboard'],
    queryFn: () => ordersAPI.dashboard().then(r => r.data.data)
  });
  const { data: inventoryStats, isLoading: loadingInventory } = useQuery({
    queryKey: ['inventory-dashboard'],
    queryFn: () => inventoryAPI.dashboard().then(r => r.data.data)
  });
  const { data: productionStats, isLoading: loadingProduction } = useQuery({
    queryKey: ['production-dashboard'],
    queryFn: () => productionAPI.dashboard().then(r => r.data.data)
  });

  const getStatusCount = (counts, status) =>
    counts?.find(c => c._id === status)?.count || 0;

  const totalOrders = orderStats?.statusCounts?.reduce((s, c) => s + c.count, 0) || 0;
  const pendingOrders = getStatusCount(orderStats?.statusCounts, 'confirmed');
  const completedOrders = getStatusCount(orderStats?.statusCounts, 'completed');
  const inProductionOrders = getStatusCount(orderStats?.statusCounts, 'in_production');

  const activeJobs = getStatusCount(productionStats?.statusCounts, 'in_progress');
  const plannedJobs = getStatusCount(productionStats?.statusCounts, 'planned');

  if (loadingOrders && loadingInventory && loadingProduction) return <PageLoader />;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Manufacturing overview" />

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Orders" value={totalOrders} icon={ShoppingCart} color="brand" />
        <StatCard label="Pending Orders" value={pendingOrders} icon={Clock} color="amber" />
        <StatCard label="In Production" value={inProductionOrders} icon={Factory} color="purple" />
        <StatCard label="Completed Orders" value={completedOrders} icon={CheckCircle} color="green" />
        <StatCard label="SKUs in Stock" value={inventoryStats?.totalSKUs || 0} icon={Package} color="brand" />
        <StatCard label="Low Stock SKUs" value={inventoryStats?.lowStock || 0} icon={AlertTriangle} color="amber" sub="≤10 units available" />
        <StatCard label="Out of Stock" value={inventoryStats?.outOfStock || 0} icon={AlertTriangle} color="red" />
        <StatCard label="Active Jobs" value={activeJobs} icon={Factory} color="purple" sub={`${plannedJobs} planned`} />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <QuickAction to="/orders/new" title="New Order" desc="Create a B2B sales order" color="brand" />
        <QuickAction to="/inventory" title="Stock In" desc="Add finished goods to inventory" color="green" />
        <QuickAction to="/production/new" title="New Production Job" desc="Manually trigger production" color="amber" />
      </div>

      {/* Alerts */}
      {(inventoryStats?.lowStock > 0 || inventoryStats?.outOfStock > 0) && (
        <div className="card p-4 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Inventory Alerts</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                {inventoryStats?.outOfStock > 0 && `${inventoryStats.outOfStock} SKU(s) are out of stock. `}
                {inventoryStats?.lowStock > 0 && `${inventoryStats.lowStock} SKU(s) are running low.`}
              </p>
              <Link to="/inventory" className="text-xs text-amber-700 dark:text-amber-400 underline mt-1 inline-block">View inventory →</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const QuickAction = ({ to, title, desc, color }) => {
  const colors = {
    brand: 'border-brand-200 dark:border-brand-800 hover:bg-brand-50 dark:hover:bg-brand-900/20',
    green: 'border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/20',
    amber: 'border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-900/20',
  };
  return (
    <Link to={to} className={`card p-5 border-2 transition-colors cursor-pointer ${colors[color]}`}>
      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{title}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{desc}</p>
    </Link>
  );
};
