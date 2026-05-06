import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Edit, Lock, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import { ordersAPI } from '../../services/apiServices';
import { useAuth } from '../../context/AuthContext';
import { Badge, PageHeader, ConfirmDialog, PageLoader } from '../../components/common';
import toast from 'react-hot-toast';

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isOrderManager } = useAuth();
  const [paymentDialog, setPaymentDialog] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersAPI.getOne(id).then(r => r.data.data)
  });

  const paymentMutation = useMutation({
    mutationFn: () => ordersAPI.markPayment(id),
    onSuccess: () => {
      qc.invalidateQueries(['order', id]);
      qc.invalidateQueries(['orders']);
      toast.success('Payment marked. Order is now locked.');
      setPaymentDialog(false);
    },
    onError: (err) => toast.error(err.message)
  });

  if (isLoading) return <PageLoader />;
  if (!data) return <div className="card p-6 text-center text-gray-400">Order not found.</div>;

  const order = data;
  const canEdit = isOrderManager && !order.isLocked;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={order.orderNumber}
        subtitle={`Created ${new Date(order.createdAt).toLocaleDateString('en-IN')}`}
        actions={
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => navigate('/orders')} className="btn-secondary"><ArrowLeft size={16} />Back</button>
            {canEdit && <Link to={`/orders/${id}/edit`} className="btn-secondary"><Edit size={16} />Edit</Link>}
            {isOrderManager && !order.paymentReceived && (
              <button onClick={() => setPaymentDialog(true)} className="btn-primary"><CheckCircle size={16} />Mark Payment</button>
            )}
          </div>
        }
      />

      {/* Lock warning */}
      {order.isLocked && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 flex items-center gap-2">
          <Lock size={16} className="text-amber-600 flex-shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            This order is <strong>locked</strong> — payment received on {order.paymentDate ? new Date(order.paymentDate).toLocaleDateString('en-IN') : 'N/A'}. No further edits allowed.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {/* Header info */}
        <div className="card p-6 grid grid-cols-2 md:grid-cols-3 gap-4">
          <InfoRow label="Party" value={order.party?.name} />
          <InfoRow label="Status" value={<Badge status={order.status} />} />
          <InfoRow label="Payment" value={
            <span className={`badge ${order.paymentReceived ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
              {order.paymentReceived ? 'Received' : 'Pending'}
            </span>
          } />
          <InfoRow label="Date of Receipt" value={new Date(order.dateOfReceipt).toLocaleDateString('en-IN')} />
          <InfoRow label="Delivery Date" value={order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('en-IN') : '—'} />
          <InfoRow label="Transporter" value={order.transporterName || '—'} />
          {order.notes && <InfoRow label="Notes" value={order.notes} className="col-span-full" />}
        </div>

        {/* Items table */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Order Items</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="table-header">Item</th>
                  <th className="table-header">Code</th>
                  <th className="table-header text-right">Qty</th>
                  <th className="table-header text-right">Price</th>
                  <th className="table-header text-right">Amount</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {order.items?.map((item, i) => (
                  <tr key={i}>
                    <td className="table-cell font-medium">{item.sku?.name}</td>
                    <td className="table-cell font-mono text-xs text-gray-500">{item.sku?.itemCode}</td>
                    <td className="table-cell text-right">{item.quantity} {item.sku?.unit}</td>
                    <td className="table-cell text-right">₹{item.price?.toLocaleString('en-IN')}</td>
                    <td className="table-cell text-right font-medium">₹{(item.quantity * item.price)?.toLocaleString('en-IN')}</td>
                    <td className="table-cell"><Badge status={item.status} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <td colSpan={4} className="table-cell font-semibold text-right">Total</td>
                  <td className="table-cell font-bold text-right text-brand-600 dark:text-brand-400">₹{order.totalAmount?.toLocaleString('en-IN')}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Shortfall alert */}
        {order.items?.some(i => i.status === 'shortfall') && (
          <div className="card p-4 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-300">Stock Shortage</p>
              <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">Some items have insufficient stock. A production job needs to be created manually by the Production Manager.</p>
              <Link to="/production/new" className="text-xs text-red-700 dark:text-red-400 underline mt-1 inline-block">Create production job →</Link>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={paymentDialog}
        onClose={() => setPaymentDialog(false)}
        onConfirm={() => paymentMutation.mutate()}
        loading={paymentMutation.isPending}
        title="Mark Payment Received"
        message="This will permanently lock the order. No further edits will be possible. Are you sure?"
        danger
      />
    </div>
  );
}

const InfoRow = ({ label, value, className = '' }) => (
  <div className={className}>
    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">{value}</p>
  </div>
);
