import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Upload, Download } from 'lucide-react';
import { rawMaterialsAPI, reportsAPI, downloadBlob } from '../../services/apiServices';
import { useAuth } from '../../context/AuthContext';
import { Table, PageHeader, Modal, FormField, ConfirmDialog, SearchInput, EmptyState } from '../../components/common';
import { Package } from 'lucide-react';
import toast from 'react-hot-toast';

const UNITS = ['pcs','nos','gms','kg','ml','ltr','mtr','set','box','sheets'];
const emptyForm = { name: '', code: '', unit: 'pcs', qtyOnHand: 0, reorderLevel: 0 };

export default function MasterRawMaterialsPage() {
  const qc = useQueryClient();
  const { isMasterAdmin } = useAuth();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const fileRef = useRef();

  const { data: materials, isLoading } = useQuery({ queryKey: ['raw-materials'], queryFn: () => rawMaterialsAPI.getAll().then(r => r.data.data) });

  const openEdit = (m) => { setEditing(m); setForm({ name: m.name, code: m.code || '', unit: m.unit, qtyOnHand: m.qtyOnHand, reorderLevel: m.reorderLevel }); setModal(true); };
  const openNew = () => { setEditing(null); setForm(emptyForm); setModal(true); };

  const saveMutation = useMutation({
    mutationFn: () => editing ? rawMaterialsAPI.update(editing._id, form) : rawMaterialsAPI.create(form),
    onSuccess: () => { qc.invalidateQueries(['raw-materials']); toast.success(editing ? 'Material updated' : 'Material created'); setModal(false); },
    onError: (err) => toast.error(err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => rawMaterialsAPI.remove(id),
    onSuccess: () => { qc.invalidateQueries(['raw-materials']); toast.success('Material deactivated'); setDeleteTarget(null); }
  });

  const handleImport = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try { await rawMaterialsAPI.import(file); qc.invalidateQueries(['raw-materials']); toast.success('Materials imported'); }
    catch { toast.error('Import failed'); }
    e.target.value = '';
  };

  const handleExport = async () => {
    try { const r = await reportsAPI.rawMaterialsExcel(); downloadBlob(r.data, 'raw-materials.xlsx'); }
    catch { toast.error('Export failed'); }
  };

  const filtered = materials?.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase())) || [];

  const columns = [
    { key: 'name', label: 'Material Name', render: r => <span className="font-medium">{r.name}</span> },
    { key: 'code', label: 'Code', render: r => r.code ? <span className="font-mono text-xs">{r.code}</span> : '—' },
    { key: 'unit', label: 'Unit', render: r => r.unit },
    { key: 'qtyOnHand', label: 'Stock', render: r => {
      const isLow = r.qtyOnHand <= r.reorderLevel;
      return <span className={isLow ? 'text-amber-600 font-semibold' : ''}>{r.qtyOnHand} {r.unit}</span>;
    }},
    { key: 'reorderLevel', label: 'Reorder At', render: r => `${r.reorderLevel} ${r.unit}` },
    { key: 'status', label: 'Status', render: r => r.qtyOnHand <= r.reorderLevel
      ? <span className="badge bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Low</span>
      : <span className="badge bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">OK</span>
    },
    ...(isMasterAdmin ? [{ key: 'actions', label: '', render: r => (
      <div className="flex gap-2">
        <button onClick={() => openEdit(r)} className="btn-secondary btn-sm"><Edit size={12} /></button>
        <button onClick={() => setDeleteTarget(r)} className="btn-secondary btn-sm text-red-500"><Trash2 size={12} /></button>
      </div>
    )}] : [])
  ];

  return (
    <div>
      <PageHeader title="Raw Materials" subtitle="Store inventory master"
        actions={
          <div className="flex gap-2">
            <button onClick={handleExport} className="btn-secondary"><Download size={16} />Export</button>
            {isMasterAdmin && (
              <>
                <input type="file" ref={fileRef} onChange={handleImport} accept=".xlsx,.xls,.csv" className="hidden" />
                <button onClick={() => fileRef.current?.click()} className="btn-secondary"><Upload size={16} />Import Excel</button>
                <button onClick={openNew} className="btn-primary"><Plus size={16} />New Material</button>
              </>
            )}
          </div>
        }
      />
      <div className="card">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <SearchInput value={search} onChange={setSearch} placeholder="Search material name..." />
        </div>
        {filtered.length === 0 && !isLoading
          ? <EmptyState icon={Package} title="No materials found" description="Import from Excel or add manually." />
          : <Table columns={columns} data={filtered} loading={isLoading} />}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Raw Material' : 'New Raw Material'}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Material Name" required><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></FormField>
            <FormField label="Code"><input className="input" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="Optional" /></FormField>
            <FormField label="Unit" required>
              <select className="input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </FormField>
            <FormField label="Opening Stock"><input type="number" className="input" min={0} value={form.qtyOnHand} onChange={e => setForm(f => ({ ...f, qtyOnHand: Number(e.target.value) }))} /></FormField>
            <FormField label="Reorder Level" hint="Alert when stock falls below this"><input type="number" className="input" min={0} value={form.reorderLevel} onChange={e => setForm(f => ({ ...f, reorderLevel: Number(e.target.value) }))} /></FormField>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending} className="btn-primary">
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget?._id)} loading={deleteMutation.isPending}
        title="Deactivate Material" message={`Deactivate "${deleteTarget?.name}"?`} danger />
    </div>
  );
}
