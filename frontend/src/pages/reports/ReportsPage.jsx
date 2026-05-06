// ReportsPage.jsx
import { useState } from 'react';
import { reportsAPI, downloadBlob } from '../../services/apiServices';
import { PageHeader } from '../../components/common';
import { Download, FileText, Package, Factory, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const [loading, setLoading] = useState({});

  const run = async (key, fn, filename) => {
    setLoading(l => ({ ...l, [key]: true }));
    try { const r = await fn(); downloadBlob(r.data, filename); }
    catch { toast.error('Export failed'); }
    finally { setLoading(l => ({ ...l, [key]: false })); }
  };

  const reports = [
    { key: 'orders', icon: FileText, title: 'All Orders', desc: 'Export all orders with party, items, amount and status', color: 'brand', action: () => run('orders', reportsAPI.ordersExcel, 'orders.xlsx') },
    { key: 'inventory', icon: Package, title: 'Inventory Stock', desc: 'Current finished goods stock — on hand, reserved, available', color: 'green', action: () => run('inventory', reportsAPI.inventoryExcel, 'inventory.xlsx') },
    { key: 'rawmat', icon: Package, title: 'Raw Materials', desc: 'All raw material stock levels with reorder status', color: 'amber', action: () => run('rawmat', reportsAPI.rawMaterialsExcel, 'raw-materials.xlsx') },
  ];

  const colors = {
    brand: 'border-brand-200 dark:border-brand-800 hover:bg-brand-50 dark:hover:bg-brand-900/10',
    green: 'border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/10',
    amber: 'border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-900/10',
  };

  return (
    <div>
      <PageHeader title="Reports" subtitle="Export data to Excel or PDF" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map(r => (
          <div key={r.key} className={`card p-6 border-2 transition-colors ${colors[r.color]}`}>
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${r.color}-100 dark:bg-${r.color}-900/20`}>
                <r.icon size={20} className={`text-${r.color}-600`} />
              </div>
              <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded">Excel</span>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">{r.title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{r.desc}</p>
            <button onClick={r.action} disabled={loading[r.key]} className="btn-secondary w-full justify-center">
              {loading[r.key] ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Download
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
