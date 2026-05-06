// MasterPartiesPage.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Upload } from 'lucide-react';
import { partiesAPI } from '../../services/apiServices';
import { useAuth } from '../../context/AuthContext';
import { Table, PageHeader, Modal, FormField, ConfirmDialog, SearchInput, EmptyState } from '../../components/common';
import { Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRef } from 'react';

export default function MasterPartiesPage() {
  const qc = useQueryClient();
  const { isMasterAdmin } = useAuth();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', contactPerson: '', phone: '', email: '', address: '', city: '', state: '', gstNo: '' });
  const fileRef = useRef();

  const { data: parties, isLoading } = useQuery({ queryKey: ['parties'], queryFn: () => partiesAPI.getAll().then(r => r.data.data) });

  const openEdit = (p) => { setEditing(p); setForm({ name: p.name, contactPerson: p.contactPerson || '', phone: p.phone || '', email: p.email || '', address: p.address || '', city: p.city || '', state: p.state || '', gstNo: p.gstNo || '' }); setModal(true); };
  const openNew = () => { setEditing(null); setForm({ name: '', contactPerson: '', phone: '', email: '', address: '', city: '', state: '', gstNo: '' }); setModal(true); };

  const saveMutation = useMutation({
    mutationFn: () => editing ? partiesAPI.update(editing._id, form) : partiesAPI.create(form),
    onSuccess: () => { qc.invalidateQueries(['parties']); toast.success(editing ? 'Party updated' : 'Party created'); setModal(false); },
    onError: (err) => toast.error(err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => partiesAPI.remove(id),
    onSuccess: () => { qc.invalidateQueries(['parties']); toast.success('Party deactivated'); setDeleteTarget(null); }
  });

  const handleImport = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try { await partiesAPI.import(file); qc.invalidateQueries(['parties']); toast.success('Parties imported'); }
    catch { toast.error('Import failed'); }
    e.target.value = '';
  };

  const filtered = parties?.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase())) || [];

  const columns = [
    { key: 'name', label: 'Party Name', render: r => <span className="font-medium">{r.name}</span> },
    { key: 'contact', label: 'Contact', render: r => r.contactPerson || '—' },
    { key: 'phone', label: 'Phone', render: r => r.phone || '—' },
    { key: 'city', label: 'City', render: r => r.city || '—' },
    { key: 'gstNo', label: 'GST No', render: r => r.gstNo || '—' },
    ...(isMasterAdmin ? [{ key: 'actions', label: '', render: r => (
      <div className="flex gap-2">
        <button onClick={() => openEdit(r)} className="btn-secondary btn-sm"><Edit size={12} /></button>
        <button onClick={() => setDeleteTarget(r)} className="btn-secondary btn-sm text-red-500"><Trash2 size={12} /></button>
      </div>
    )}] : [])
  ];

  return (
    <div>
      <PageHeader title="Parties" subtitle="Customer & supplier master data"
        actions={isMasterAdmin && (
          <div className="flex gap-2">
            <input type="file" ref={fileRef} onChange={handleImport} accept=".xlsx,.xls,.csv" className="hidden" />
            <button onClick={() => fileRef.current?.click()} className="btn-secondary"><Upload size={16} />Import Excel</button>
            <button onClick={openNew} className="btn-primary"><Plus size={16} />New Party</button>
          </div>
        )}
      />
      <div className="card">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <SearchInput value={search} onChange={setSearch} placeholder="Search party name..." />
        </div>
        {filtered.length === 0 && !isLoading
          ? <EmptyState icon={Users} title="No parties found" description="Import from Excel or create manually." />
          : <Table columns={columns} data={filtered} loading={isLoading} />}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Party' : 'New Party'}>
        <div className="space-y-3">
          <FormField label="Party Name" required><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Contact Person"><input className="input" value={form.contactPerson} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} /></FormField>
            <FormField label="Phone"><input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></FormField>
            <FormField label="Email"><input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></FormField>
            <FormField label="GST No"><input className="input" value={form.gstNo} onChange={e => setForm(f => ({ ...f, gstNo: e.target.value }))} /></FormField>
            <FormField label="City"><input className="input" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></FormField>
            <FormField label="State"><input className="input" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} /></FormField>
          </div>
          <FormField label="Address"><input className="input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></FormField>
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
        title="Deactivate Party" message={`Deactivate party "${deleteTarget?.name}"?`} danger />
    </div>
  );
}
