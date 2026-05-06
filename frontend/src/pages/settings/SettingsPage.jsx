import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Loader2 } from 'lucide-react';
import { usersAPI } from '../../services/apiServices';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, Modal, FormField, Table, Badge } from '../../components/common';
import toast from 'react-hot-toast';

const ROLES = [
  { value: 'master_admin', label: 'Master Admin' },
  { value: 'order_manager', label: 'Order Manager' },
  { value: 'inventory_manager', label: 'Inventory Manager' },
  { value: 'production_manager', label: 'Production Manager' },
  { value: 'store_manager', label: 'Store Manager' },
];

export default function SettingsPage() {
  const { user: me, isMasterAdmin } = useAuth();
  const qc = useQueryClient();
  const [userModal, setUserModal] = useState(false);
  const [pwModal, setPwModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'order_manager' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });

  const { data: users, isLoading } = useQuery({ queryKey: ['users'], enabled: isMasterAdmin, queryFn: () => usersAPI.getAll().then(r => r.data.data) });

  const openNew = () => { setEditingUser(null); setForm({ name: '', email: '', password: '', role: 'order_manager' }); setUserModal(true); };
  const openEdit = (u) => { setEditingUser(u); setForm({ name: u.name, email: u.email, password: '', role: u.role }); setUserModal(true); };

  const saveMutation = useMutation({
    mutationFn: () => editingUser ? usersAPI.update(editingUser._id, { name: form.name, role: form.role }) : usersAPI.create(form),
    onSuccess: () => { qc.invalidateQueries(['users']); toast.success(editingUser ? 'User updated' : 'User created'); setUserModal(false); },
    onError: (err) => toast.error(err.message)
  });

  const deactivateMutation = useMutation({
    mutationFn: (id) => usersAPI.deactivate(id),
    onSuccess: () => { qc.invalidateQueries(['users']); toast.success('User deactivated'); }
  });

  const pwMutation = useMutation({
    mutationFn: () => {
      if (pwForm.newPassword !== pwForm.confirm) throw { message: 'Passwords do not match' };
      return import('../../services/api').then(m => m.default.put('/auth/change-password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }));
    },
    onSuccess: () => { toast.success('Password changed'); setPwModal(false); setPwForm({ currentPassword: '', newPassword: '', confirm: '' }); },
    onError: (err) => toast.error(err.message)
  });

  const columns = [
    { key: 'name', label: 'Name', render: r => <span className="font-medium">{r.name}</span> },
    { key: 'email', label: 'Email', render: r => r.email },
    { key: 'role', label: 'Role', render: r => <span className="capitalize text-xs">{r.role?.replace(/_/g, ' ')}</span> },
    { key: 'status', label: 'Status', render: r => <Badge status={r.isActive ? 'fulfilled' : 'cancelled'} label={r.isActive ? 'Active' : 'Inactive'} /> },
    { key: 'actions', label: '', render: r => (
      <div className="flex gap-2">
        <button onClick={() => openEdit(r)} className="btn-secondary btn-sm"><Edit size={12} /></button>
        {r._id !== me?._id && r.isActive && (
          <button onClick={() => deactivateMutation.mutate(r._id)} className="btn-secondary btn-sm text-red-500 text-xs">Deactivate</button>
        )}
      </div>
    )}
  ];

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Settings" />

      {/* My account */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">My Account</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">{me?.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{me?.email} · <span className="capitalize">{me?.role?.replace(/_/g, ' ')}</span></p>
          </div>
          <button onClick={() => setPwModal(true)} className="btn-secondary">Change Password</button>
        </div>
      </div>

      {/* User management — master admin only */}
      {isMasterAdmin && (
        <div className="card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">User Management</h2>
            <button onClick={openNew} className="btn-primary btn-sm"><Plus size={14} />New User</button>
          </div>
          <Table columns={columns} data={users || []} loading={isLoading} />
        </div>
      )}

      {/* New/Edit user modal */}
      <Modal open={userModal} onClose={() => setUserModal(false)} title={editingUser ? 'Edit User' : 'New User'} size="sm">
        <div className="space-y-3">
          <FormField label="Full Name" required><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></FormField>
          {!editingUser && <FormField label="Email" required><input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></FormField>}
          {!editingUser && <FormField label="Password" required hint="Minimum 6 characters"><input type="password" className="input" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></FormField>}
          <FormField label="Role" required>
            <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </FormField>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setUserModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="btn-primary">
              {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Change password modal */}
      <Modal open={pwModal} onClose={() => setPwModal(false)} title="Change Password" size="sm">
        <div className="space-y-3">
          <FormField label="Current Password"><input type="password" className="input" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} /></FormField>
          <FormField label="New Password"><input type="password" className="input" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} /></FormField>
          <FormField label="Confirm New Password"><input type="password" className="input" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} /></FormField>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setPwModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={() => pwMutation.mutate()} disabled={pwMutation.isPending} className="btn-primary">
              {pwMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Update Password'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
