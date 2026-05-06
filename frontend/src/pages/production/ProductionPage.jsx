import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { productionAPI } from '../../services/apiServices';
import { useAuth } from '../../context/AuthContext';
import { Table, Badge, PageHeader, StatCard, SearchInput, Select, Pagination } from '../../components/common';
import { Factory, Clock, CheckCircle } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function ProductionPage() {
  const navigate = useNavigate();
  const { isProductionManager } = useAuth();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data: dashboard } = useQuery({ queryKey: ['production-dashboard'], queryFn: () => productionAPI.dashboard().then(r => r.data.data) });
  const { data, isLoading } = useQuery({
    queryKey: ['production', { status, page }],
    queryFn: () => productionAPI.getAll({ status, page, limit: 20 }).then(r => r.data)
  });

  const getCount = (s) => dashboard?.statusCounts?.find(c => c._id === s)?.count || 0;

  const columns = [
    { key: 'jobNumber', label: 'Job No', render: r => <span className="font-mono text-xs font-medium">{r.jobNumber}</span> },
    { key: 'name', label: 'Name', render: r => r.name || '—' },
    { key: 'items', label: 'SKUs', render: r => r.items?.map(i => i.sku?.name).join(', ') || '—' },
    { key: 'status', label: 'Status', render: r => <Badge status={r.status} /> },
    { key: 'createdAt', label: 'Created', render: r => new Date(r.createdAt).toLocaleDateString('en-IN') },
    { key: 'action', label: '', render: r => (
      <button onClick={() => navigate(`/production/${r._id}`)} className="btn-secondary btn-sm">View</button>
    )},
  ];

  return (
    <div>
      <PageHeader
        title="Production"
        subtitle="Job management"
        actions={
          isProductionManager && (
            <button onClick={() => navigate('/production/new')} className="btn-primary"><Plus size={16} />New Job</button>
          )
        }
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Planned" value={getCount('planned')} icon={Clock} color="brand" />
        <StatCard label="In Progress" value={getCount('in_progress')} icon={Factory} color="amber" />
        <StatCard label="Completed" value={getCount('completed')} icon={CheckCircle} color="green" />
        <StatCard label="Cancelled" value={getCount('cancelled')} icon={Factory} color="red" />
      </div>
      <div className="card">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <Select options={STATUS_OPTIONS} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="input w-auto" />
        </div>
        <Table columns={columns} data={data?.data || []} loading={isLoading} emptyMessage="No production jobs found." />
        <div className="p-4"><Pagination page={page} pages={data?.pagination?.pages || 1} onChange={setPage} /></div>
      </div>
    </div>
  );
}
