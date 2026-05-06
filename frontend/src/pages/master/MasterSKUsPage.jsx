import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Upload } from 'lucide-react';
import { skusAPI } from '../../services/apiServices';
import { useAuth } from '../../context/AuthContext';
import { Table, PageHeader, Modal, FormField, ConfirmDialog, SearchInput, EmptyState } from '../../components/common';
import { Boxes } from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = ['toy_truck','rattle','wooden_toy','vehicle','educational','other'];
const UNITS = ['pcs','nos','gms','kg','ml','ltr','mtr','set','box'];

const emptyForm = { name: '', itemCode: '', category: '', unit: 'pcs', description: '', basePrice: 0 };

export default function MasterSKUsPage() {
  const qc = useQueryClient();
  const { isMasterAdmin } = useAuth();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const fileRef = useRef();

  const { data: skus, isLoading } = useQuery({ queryKey: ['skus'], queryFn: () => skusAPI.getAll().then(r => r.data.data) });

  const openEdit = (s) => { setEditing(s); setForm({ name: s.name, itemCode: s.itemCode, category: s.category, unit: s.unit, description: s.description || '', basePrice: s.basePrice || 0 }); setModal(true); };
  const openNew = () => { setEditing(null); setForm(emptyForm); setModal(true); };

  const saveMutation = useMutation({
    mutationFn: () => editing ? skusAPI.update(editing._id, form) : skusAPI.create(form),
    onSuccess: () => { qc.invalidateQueries(['skus']); toast.success(editing ? 'SKU updated' : 'SKU created'); setModal(false); },
    onError: (err) => toast.error(err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => skusAPI.remove(id),
    onSuccess: () => { qc.invalidateQueries(['skus']); toast.success('SKU deactivated'); setDeleteTarget(null); }
  });

  const handleImport = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try { await skusAPI.import(file); qc.invalidateQueries(['skus']); toast.success('SKUs imported'); }
    catch { toast.error('Import failed'); }
    e.target.value = '';
  };

  const filtered = skus?.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.itemCode.toLowerCase().includes(search.toLowerCase())) || [];

  const columns = [
    { key: 'name', label: 'SKU Name', render: r => <span className="font-medium">{r.name}</span> },
    { key: 'itemCode', label: 'Code', render: r => <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{r.itemCode}</span> },
    { key: 'category', label: 'Category', render: r => <span className="capitalize text-xs">{r.category?.replace(/_/g, ' ')}</span> },
    { key: 'unit', label: 'Unit', render: r => r.unit },
    { key: 'basePrice', label: 'Base Price', render: r => r.basePrice ? `₹${r.basePrice}` : '—' },
    ...(isMasterAdmin ? [{ key: 'actions', label: '', render: r => (
      <div className="flex gap-2">
        <button onClick={() => openEdit(r)} className="btn-secondary btn-sm"><Edit size={12} /></button>
        <button onClick={() => setDeleteTarget(r)} className="btn-secondary btn-sm text-red-500"><Trash2 size={12} /></button>
      </div>
    )}] : [])
  ];

  return (
    <div>
      <PageHeader title="SKUs" subtitle="Finished product catalogue"
        actions={isMasterAdmin && (
          <div className="flex gap-2">
            <input type="file" ref={fileRef} onChange={handleImport} accept=".xlsx,.xls,.csv" className="hidden" />
            <button onClick={() => fileRef.current?.click()} className="btn-secondary"><Upload size={16} />Import Excel</button>
            <button onClick={openNew} className="btn-primary"><Plus size={16} />New SKU</button>
          </div>
        )}
      />
      <div className="card">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <SearchInput value={search} onChange={setSearch} placeholder="Search name or code..." />
        </div>
        {filtered.length === 0 && !isLoading
          ? <EmptyState icon={Boxes} title="No SKUs found" description="Import from Excel or create manually." />
          : <Table columns={columns} data={filtered} loading={isLoading} />}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit SKU' : 'New SKU'}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="SKU Name" required><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></FormField>
            <FormField label="Item Code" required><input className="input" value={form.itemCode} onChange={e => setForm(f => ({ ...f, itemCode: e.target.value.toUpperCase() }))} placeholder="e.g. PO-23" /></FormField>
            <FormField label="Category" required>
              <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                <option value="">Select...</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </select>
            </FormField>
            <FormField label="Unit">
              <select className="input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </FormField>
            <FormField label="Base Price (₹)"><input type="number" className="input" min={0} value={form.basePrice} onChange={e => setForm(f => ({ ...f, basePrice: e.target.value }))} /></FormField>
          </div>
          <FormField label="Description"><input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></FormField>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={() => saveMutation.mutate()} disabled={!form.name || !form.itemCode || !form.category || saveMutation.isPending} className="btn-primary">
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget?._id)} loading={deleteMutation.isPending}
        title="Deactivate SKU" message={`Deactivate "${deleteTarget?.name}"?`} danger />
    </div>
  );
}
