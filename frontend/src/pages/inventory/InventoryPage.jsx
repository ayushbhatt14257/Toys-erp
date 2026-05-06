import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Upload, Download, AlertTriangle } from 'lucide-react';
import { inventoryAPI, reportsAPI, skusAPI, downloadBlob } from '../../services/apiServices';
import { useAuth } from '../../context/AuthContext';
import { Table, Badge, PageHeader, StatCard, Modal, FormField, PageLoader, EmptyState, SearchInput } from '../../components/common';
import { Package } from 'lucide-react';
import toast from 'react-hot-toast';

export default function InventoryPage() {
  const qc = useQueryClient();
  const { isInventoryManager } = useAuth();
  const [stockInModal, setStockInModal] = useState(false);
  const [search, setSearch] = useState('');
  const fileRef = useRef();

  const { data: dashboard } = useQuery({ queryKey: ['inventory-dashboard'], queryFn: () => inventoryAPI.dashboard().then(r => r.data.data) });
  const { data: stocks, isLoading } = useQuery({ queryKey: ['inventory'], queryFn: () => inventoryAPI.getAll().then(r => r.data.data) });
  const { data: skusData } = useQuery({ queryKey: ['skus'], queryFn: () => skusAPI.getAll({ active: true }).then(r => r.data.data) });

  const filtered = stocks?.filter(s =>
    !search || s.sku?.name?.toLowerCase().includes(search.toLowerCase()) || s.sku?.itemCode?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleExport = async () => {
    try { const r = await reportsAPI.inventoryExcel(); downloadBlob(r.data, 'inventory.xlsx'); }
    catch { toast.error('Export failed'); }
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await inventoryAPI.importFile(file);
      const { success, failed } = res.data.data;
      toast.success(`Imported ${success.length} items. ${failed.length} failed.`);
      qc.invalidateQueries(['inventory']);
    } catch { toast.error('Import failed'); }
    e.target.value = '';
  };

  const columns = [
    { key: 'sku', label: 'SKU Name', render: r => <span className="font-medium">{r.sku?.name}</span> },
    { key: 'code', label: 'Code', render: r => <span className="font-mono text-xs text-gray-500">{r.sku?.itemCode}</span> },
    { key: 'category', label: 'Category', render: r => <span className="capitalize text-xs">{r.sku?.category?.replace(/_/g, ' ')}</span> },
    { key: 'onHand', label: 'On Hand', render: r => `${r.qtyOnHand} ${r.sku?.unit}` },
    { key: 'reserved', label: 'Reserved', render: r => r.qtyReserved },
    { key: 'available', label: 'Available', render: r => {
      const avail = r.qtyAvailable;
      return <span className={`font-semibold ${avail <= 0 ? 'text-red-600' : avail <= 10 ? 'text-amber-600' : 'text-green-600 dark:text-green-400'}`}>
        {avail} {avail <= 0 ? '⚠' : ''}
      </span>;
    }},
    { key: 'status', label: 'Status', render: r => {
      const avail = r.qtyAvailable;
      if (avail <= 0) return <Badge status="shortfall" label="Out of Stock" />;
      if (avail <= 10) return <Badge status="confirmed" label="Low Stock" />;
      return <Badge status="fulfilled" label="In Stock" />;
    }},
  ];

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="Finished goods stock"
        actions={
          <div className="flex gap-2 flex-wrap">
            <button onClick={handleExport} className="btn-secondary"><Download size={16} />Export</button>
            {isInventoryManager && (
              <>
                <input type="file" ref={fileRef} onChange={handleBulkUpload} accept=".xlsx,.xls,.csv" className="hidden" />
                <button onClick={() => fileRef.current?.click()} className="btn-secondary"><Upload size={16} />Bulk Upload</button>
                <button onClick={() => setStockInModal(true)} className="btn-primary"><Plus size={16} />Stock In</button>
              </>
            )}
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total SKUs" value={dashboard?.totalSKUs || 0} icon={Package} color="brand" />
        <StatCard label="Low Stock" value={dashboard?.lowStock || 0} icon={AlertTriangle} color="amber" />
        <StatCard label="Out of Stock" value={dashboard?.outOfStock || 0} icon={AlertTriangle} color="red" />
        <StatCard label="Healthy" value={(dashboard?.totalSKUs || 0) - (dashboard?.lowStock || 0)} icon={Package} color="green" />
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <SearchInput value={search} onChange={setSearch} placeholder="Search SKU name or code..." />
        </div>
        {isLoading ? <PageLoader /> : (
          filtered.length === 0
            ? <EmptyState icon={Package} title="No stock records" description="Add finished goods using Stock In or Bulk Upload." />
            : <Table columns={columns} data={filtered} loading={false} />
        )}
      </div>

      <StockInModal open={stockInModal} onClose={() => setStockInModal(false)} skus={skusData || []} />
    </div>
  );
}

function StockInModal({ open, onClose, skus }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ skuId: '', quantity: 1, notes: '' });
  const mutation = useMutation({
    mutationFn: () => inventoryAPI.stockIn({ skuId: form.skuId, quantity: Number(form.quantity), notes: form.notes }),
    onSuccess: () => { qc.invalidateQueries(['inventory']); toast.success('Stock updated'); onClose(); setForm({ skuId: '', quantity: 1, notes: '' }); },
    onError: (err) => toast.error(err.message)
  });

  return (
    <Modal open={open} onClose={onClose} title="Stock In — Finished Goods" size="sm">
      <div className="space-y-4">
        <FormField label="SKU / Item" required>
          <select className="input" value={form.skuId} onChange={e => setForm(f => ({ ...f, skuId: e.target.value }))}>
            <option value="">Select SKU...</option>
            {skus.map(s => <option key={s._id} value={s._id}>{s.name} ({s.itemCode})</option>)}
          </select>
        </FormField>
        <FormField label="Quantity" required>
          <input type="number" className="input" min={1} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
        </FormField>
        <FormField label="Notes">
          <input type="text" className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
        </FormField>
        <div className="flex gap-3 justify-end pt-2">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={!form.skuId || mutation.isPending} className="btn-primary">
            {mutation.isPending ? 'Saving...' : 'Add Stock'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
