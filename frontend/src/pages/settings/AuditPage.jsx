// AuditPage.jsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditAPI } from '../../services/apiServices';
import { PageHeader, Table, Pagination, Select } from '../../components/common';

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'CREATE', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'DELETE', label: 'Delete' },
  { value: 'PAYMENT_LOCK', label: 'Payment Lock' },
  { value: 'STOCK_IN', label: 'Stock In' },
  { value: 'PRODUCTION_TRIGGER', label: 'Production Trigger' },
  { value: 'PRODUCTION_START', label: 'Production Start' },
  { value: 'PRODUCTION_COMPLETE', label: 'Production Complete' },
  { value: 'IMPORT', label: 'Import' },
  { value: 'LOGIN', label: 'Login' },
];

const ENTITY_OPTIONS = [
  { value: '', label: 'All Entities' },
  { value: 'Order', label: 'Order' },
  { value: 'SKU', label: 'SKU' },
  { value: 'Party', label: 'Party' },
  { value: 'RawMaterial', label: 'Raw Material' },
  { value: 'BOM', label: 'BOM' },
  { value: 'InventoryStock', label: 'Inventory' },
  { value: 'ProductionJob', label: 'Production' },
  { value: 'User', label: 'User' },
];

export default function AuditPage() {
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit', { action, entityType, page }],
    queryFn: () => auditAPI.getAll({ action, entityType, page, limit: 50 }).then(r => r.data)
  });

  const actionColors = {
    CREATE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    UPDATE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    PAYMENT_LOCK: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    LOGIN: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    IMPORT: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  };

  const columns = [
    { key: 'timestamp', label: 'Time', render: r => new Date(r.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) },
    { key: 'user', label: 'User', render: r => <span className="text-xs">{r.userName || r.user?.name}</span> },
    { key: 'role', label: 'Role', render: r => <span className="text-xs capitalize">{(r.userRole || r.user?.role)?.replace(/_/g, ' ')}</span> },
    { key: 'action', label: 'Action', render: r => <span className={`badge text-xs ${actionColors[r.action] || 'bg-gray-100 text-gray-700'}`}>{r.action}</span> },
    { key: 'entityType', label: 'Entity', render: r => <span className="text-xs">{r.entityType}</span> },
    { key: 'entityRef', label: 'Reference', render: r => <span className="font-mono text-xs text-gray-500">{r.entityRef || r.entityId || '—'}</span> },
  ];

  return (
    <div>
      <PageHeader title="Audit Log" subtitle="All system activity — read only" />
      <div className="card">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-wrap gap-3">
          <Select options={ACTION_OPTIONS} value={action} onChange={e => { setAction(e.target.value); setPage(1); }} className="input w-auto" />
          <Select options={ENTITY_OPTIONS} value={entityType} onChange={e => { setEntityType(e.target.value); setPage(1); }} className="input w-auto" />
        </div>
        <Table columns={columns} data={data?.data || []} loading={isLoading} emptyMessage="No audit records found." />
        <div className="p-4"><Pagination page={page} pages={data?.pagination?.pages || 1} onChange={setPage} /></div>
      </div>
    </div>
  );
}
