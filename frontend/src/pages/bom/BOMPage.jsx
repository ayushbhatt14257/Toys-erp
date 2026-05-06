// BOMPage.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { bomAPI, skusAPI } from '../../services/apiServices';
import { useAuth } from '../../context/AuthContext';
import { Table, Badge, PageHeader, SearchInput, ConfirmDialog, EmptyState } from '../../components/common';
import { BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BOMPage() {
  const navigate = useNavigate();
  const { isMasterAdmin } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: boms, isLoading } = useQuery({ queryKey: ['boms'], queryFn: () => bomAPI.getAll().then(r => r.data.data) });

  const deleteMutation = useMutation({
    mutationFn: (id) => bomAPI.remove(id),
    onSuccess: () => { qc.invalidateQueries(['boms']); toast.success('BOM deactivated'); setDeleteTarget(null); }
  });

  const filtered = boms?.filter(b =>
    !search ||
    b.sku?.name?.toLowerCase().includes(search.toLowerCase()) ||
    b.variantName?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const columns = [
    { key: 'sku', label: 'SKU', render: r => <span className="font-medium">{r.sku?.name}</span> },
    { key: 'variant', label: 'Variant', render: r => (
      <div className="flex items-center gap-2">
        {r.variantName}
        {r.isDefault && <span className="badge bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">Default</span>}
      </div>
    )},
    { key: 'components', label: 'Components', render: r => `${r.components?.length || 0} materials` },
    { key: 'category', label: 'Category', render: r => <span className="capitalize text-xs">{r.sku?.category?.replace(/_/g, ' ')}</span> },
    ...(isMasterAdmin ? [{
      key: 'actions', label: '', render: r => (
        <div className="flex gap-2">
          <button onClick={() => navigate(`/bom/${r._id}/edit`)} className="btn-secondary btn-sm"><Edit size={12} /></button>
          <button onClick={() => setDeleteTarget(r)} className="btn-secondary btn-sm text-red-500"><Trash2 size={12} /></button>
        </div>
      )
    }] : [])
  ];

  return (
    <div>
      <PageHeader
        title="Bill of Materials"
        subtitle="BOM variants per SKU"
        actions={isMasterAdmin && <button onClick={() => navigate('/bom/new')} className="btn-primary"><Plus size={16} />New BOM</button>}
      />
      <div className="card">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <SearchInput value={search} onChange={setSearch} placeholder="Search SKU or variant..." />
        </div>
        {filtered.length === 0 && !isLoading
          ? <EmptyState icon={BookOpen} title="No BOMs found" description="Create a BOM to define raw material requirements per SKU." action={isMasterAdmin && <button onClick={() => navigate('/bom/new')} className="btn-primary">Create BOM</button>} />
          : <Table columns={columns} data={filtered} loading={isLoading} />}
      </div>
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget?._id)} loading={deleteMutation.isPending}
        title="Deactivate BOM" message={`Deactivate BOM "${deleteTarget?.variantName}" for ${deleteTarget?.sku?.name}?`} danger />
    </div>
  );
}
