import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { mouldsAPI, skusAPI } from '../../services/apiServices';
import { useAuth } from '../../context/AuthContext';
import { Table, PageHeader, Modal, FormField, ConfirmDialog, EmptyState } from '../../components/common';
import { Wrench } from 'lucide-react';
import toast from 'react-hot-toast';

const emptyForm = { code: '', name: '', sku: '', componentName: '', partsPerShot: 1, machineName: '', notes: '' };

export default function MasterMouldsPage() {
  const qc = useQueryClient();
  const { isMasterAdmin } = useAuth();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const { data: moulds, isLoading } = useQuery({ queryKey: ['moulds'], queryFn: () => mouldsAPI.getAll().then(r => r.data.data) });
  const { data: skus } = useQuery({ queryKey: ['skus'], queryFn: () => skusAPI.getAll({ active: true }).then(r => r.data.data) });

  const openEdit = (m) => { setEditing(m); setForm({ code: m.code, name: m.name || '', sku: m.sku?._id || '', componentName: m.componentName || '', partsPerShot: m.partsPerShot, machineName: m.machineName || '', notes: m.notes || '' }); setModal(true); };
  const openNew = () => { setEditing(null); setForm(emptyForm); setModal(true); };

  const saveMutation = useMutation({
    mutationFn: () => editing ? mouldsAPI.update(editing._id, form) : mouldsAPI.create(form),
    onSuccess: () => { qc.invalidateQueries(['moulds']); toast.success(editing ? 'Mould updated' : 'Mould created'); setModal(false); },
    onError: (err) => toast.error(err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => mouldsAPI.remove(id),
    onSuccess: () => { qc.invalidateQueries(['moulds']); toast.success('Mould deactivated'); setDeleteTarget(null); }
  });

  const columns = [
    { key: 'code', label: 'Mould Code', render: r => <span className="font-mono font-medium">{r.code}</span> },
    { key: 'sku', label: 'SKU', render: r => r.sku?.name || '—' },
    { key: 'componentName', label: 'Component', render: r => r.componentName || '—' },
    { key: 'partsPerShot', label: 'Parts/Shot', render: r => r.partsPerShot },
    { key: 'machine', label: 'Machine', render: r => r.machineName || '—' },
    ...(isMasterAdmin ? [{ key: 'actions', label: '', render: r => (
      <div className="flex gap-2">
        <button onClick={() => openEdit(r)} className="btn-secondary btn-sm"><Edit size={12} /></button>
        <button onClick={() => setDeleteTarget(r)} className="btn-secondary btn-sm text-red-500"><Trash2 size={12} /></button>
      </div>
    )}] : [])
  ];

  return (
    <div>
      <PageHeader title="Moulds" subtitle="Mould configurations and machine mapping"
        actions={isMasterAdmin && <button onClick={openNew} className="btn-primary"><Plus size={16} />New Mould</button>}
      />
      <div className="card">
        {moulds?.length === 0 && !isLoading
          ? <EmptyState icon={Wrench} title="No moulds configured" description="Add mould configurations to enable shot calculations in production." action={isMasterAdmin && <button onClick={openNew} className="btn-primary">Add Mould</button>} />
          : <Table columns={columns} data={moulds || []} loading={isLoading} />}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Mould' : 'New Mould'}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Mould Code" required><input className="input" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. TR1" /></FormField>
            <FormField label="Mould Name"><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></FormField>
            <FormField label="SKU" required>
              <select className="input" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}>
                <option value="">Select SKU...</option>
                {skus?.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </FormField>
            <FormField label="Parts per Shot" required><input type="number" className="input" min={1} value={form.partsPerShot} onChange={e => setForm(f => ({ ...f, partsPerShot: Number(e.target.value) }))} /></FormField>
            <FormField label="Component Name"><input className="input" value={form.componentName} onChange={e => setForm(f => ({ ...f, componentName: e.target.value }))} placeholder="e.g. Truck body" /></FormField>
            <FormField label="Machine Name"><input className="input" value={form.machineName} onChange={e => setForm(f => ({ ...f, machineName: e.target.value }))} /></FormField>
          </div>
          <FormField label="Notes"><input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></FormField>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={() => saveMutation.mutate()} disabled={!form.code || !form.sku || saveMutation.isPending} className="btn-primary">
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget?._id)} loading={deleteMutation.isPending}
        title="Deactivate Mould" message={`Deactivate mould "${deleteTarget?.code}"?`} danger />
    </div>
  );
}
