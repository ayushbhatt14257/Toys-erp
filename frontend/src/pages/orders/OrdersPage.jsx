import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Download } from 'lucide-react';
import { ordersAPI, reportsAPI, downloadBlob } from '../../services/apiServices';
import { useAuth } from '../../context/AuthContext';
import { Table, Badge, PageHeader, SearchInput, Select, Pagination } from '../../components/common';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in_inventory', label: 'In Inventory' },
  { value: 'in_production', label: 'In Production' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function OrdersPage() {
  const navigate = useNavigate();
  const { isOrderManager } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['orders', { search, status, page }],
    queryFn: () => ordersAPI.getAll({ search, status, page, limit: 20 }).then(r => r.data)
  });

  const handleExport = async () => {
    try {
      const res = await reportsAPI.ordersExcel({ status });
      downloadBlob(res.data, 'orders.xlsx');
    } catch { toast.error('Export failed'); }
  };

  const columns = [
    { key: 'orderNumber', label: 'Order No', render: r => <span className="font-mono text-xs font-medium">{r.orderNumber}</span> },
    { key: 'party', label: 'Party', render: r => r.party?.name },
    { key: 'dateOfReceipt', label: 'Date', render: r => new Date(r.dateOfReceipt).toLocaleDateString('en-IN') },
    { key: 'items', label: 'Items', render: r => `${r.items?.length} item(s)` },
    { key: 'totalAmount', label: 'Amount', render: r => `₹${r.totalAmount?.toLocaleString('en-IN')}` },
    { key: 'status', label: 'Status', render: r => <Badge status={r.status} /> },
    { key: 'payment', label: 'Payment', render: r => (
      <span className={`badge ${r.paymentReceived ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
        {r.paymentReceived ? 'Received' : 'Pending'}
      </span>
    )},
    { key: 'action', label: '', render: r => (
      <button onClick={() => navigate(`/orders/${r._id}`)} className="btn-secondary btn-sm">View</button>
    )},
  ];

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle={`${data?.pagination?.total || 0} total orders`}
        actions={
          <>
            <button onClick={handleExport} className="btn-secondary"><Download size={16} />Export</button>
            {isOrderManager && (
              <button onClick={() => navigate('/orders/new')} className="btn-primary"><Plus size={16} />New Order</button>
            )}
          </>
        }
      />
      <div className="card">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-wrap gap-3">
          <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search order number..." />
          <Select
            options={STATUS_OPTIONS} value={status}
            onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="input w-auto"
          />
        </div>
        <Table columns={columns} data={data?.data || []} loading={isLoading} emptyMessage="No orders found." />
        <div className="p-4">
          <Pagination page={page} pages={data?.pagination?.pages || 1} onChange={setPage} />
        </div>
      </div>
    </div>
  );
}
