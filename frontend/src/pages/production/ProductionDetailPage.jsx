import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Play, CheckCircle, XCircle, Download, AlertTriangle } from 'lucide-react';
import { productionAPI, reportsAPI, downloadBlob } from '../../services/apiServices';
import { useAuth } from '../../context/AuthContext';
import { Badge, PageHeader, ConfirmDialog, PageLoader } from '../../components/common';
import toast from 'react-hot-toast';

export default function ProductionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isProductionManager } = useAuth();
  const [startDialog, setStartDialog] = useState(false);
  const [completeDialog, setCompleteDialog] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['production-job', id],
    queryFn: () => productionAPI.getOne(id).then(r => r.data.data)
  });

  const startMutation = useMutation({
    mutationFn: () => productionAPI.start(id),
    onSuccess: () => { qc.invalidateQueries(['production-job', id]); toast.success('Job started. Materials deducted.'); setStartDialog(false); },
    onError: (err) => toast.error(err.message)
  });

  const completeMutation = useMutation({
    mutationFn: () => productionAPI.complete(id, {}),
    onSuccess: () => { qc.invalidateQueries(['production-job', id]); toast.success('Job completed. Added to inventory.'); setCompleteDialog(false); },
    onError: (err) => toast.error(err.message)
  });

  const cancelMutation = useMutation({
    mutationFn: () => productionAPI.cancel(id),
    onSuccess: () => { qc.invalidateQueries(['production-job', id]); toast.success('Job cancelled.'); setCancelDialog(false); },
    onError: (err) => toast.error(err.message)
  });

  const handlePDF = async () => {
    try { const r = await reportsAPI.productionPDF(id); downloadBlob(r.data, `production-${job.jobNumber}.pdf`); }
    catch { toast.error('PDF export failed'); }
  };

  if (isLoading) return <PageLoader />;
  if (!data) return <div className="card p-6 text-center text-gray-400">Job not found.</div>;
  const job = data;

  const canStart = isProductionManager && (job.status === 'planned' || job.status === 'material_allocated');
  const canComplete = isProductionManager && job.status === 'in_progress';
  const canCancel = isProductionManager && !['completed', 'cancelled'].includes(job.status);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={job.jobNumber}
        subtitle={job.name || 'Production Job'}
        actions={
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => navigate('/production')} className="btn-secondary"><ArrowLeft size={16} />Back</button>
            <button onClick={handlePDF} className="btn-secondary"><Download size={16} />PDF</button>
            {canStart && <button onClick={() => setStartDialog(true)} className="btn-primary"><Play size={16} />Start Job</button>}
            {canComplete && <button onClick={() => setCompleteDialog(true)} className="btn-primary"><CheckCircle size={16} />Complete</button>}
            {canCancel && <button onClick={() => setCancelDialog(true)} className="btn-danger"><XCircle size={16} />Cancel</button>}
          </div>
        }
      />

      <div className="space-y-4">
        {/* Status card */}
        <div className="card p-6 grid grid-cols-2 md:grid-cols-3 gap-4">
          <InfoRow label="Status" value={<Badge status={job.status} />} />
          <InfoRow label="Created By" value={job.createdBy?.name} />
          <InfoRow label="Created" value={new Date(job.createdAt).toLocaleDateString('en-IN')} />
          {job.plannedStartDate && <InfoRow label="Planned Start" value={new Date(job.plannedStartDate).toLocaleDateString('en-IN')} />}
          {job.actualStartDate && <InfoRow label="Started" value={new Date(job.actualStartDate).toLocaleDateString('en-IN')} />}
          {job.actualEndDate && <InfoRow label="Completed" value={new Date(job.actualEndDate).toLocaleDateString('en-IN')} />}
          {job.notes && <InfoRow label="Notes" value={job.notes} className="col-span-full" />}
        </div>

        {/* Items */}
        {job.items?.map((item, idx) => (
          <div key={idx} className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.sku?.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{item.sku?.itemCode} · BOM: {item.bom?.variantName}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{item.qtyToMake} units</p>
                {item.mould && <p className="text-xs text-gray-500">{item.mould.code} · {item.shotsRequired} shots</p>}
              </div>
            </div>
            {/* Material requirements */}
            <div className="p-6">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Raw Material Requirements</p>
              <div className="space-y-2">
                {item.materialRequirements?.map((req, ri) => (
                  <div key={ri} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <div className="flex items-center gap-2">
                      {req.isAvailable
                        ? <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                        : <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />}
                      <span className="text-sm text-gray-700 dark:text-gray-300">{req.rawMaterial?.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{req.required} {req.unit}</span>
                      {!req.isAvailable && (
                        <p className="text-xs text-red-500">Insufficient stock</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog open={startDialog} onClose={() => setStartDialog(false)}
        onConfirm={() => startMutation.mutate()} loading={startMutation.isPending}
        title="Start Production Job"
        message="This will deduct all required raw materials from stock and mark the job as in-progress. Confirm?" />
      <ConfirmDialog open={completeDialog} onClose={() => setCompleteDialog(false)}
        onConfirm={() => completeMutation.mutate()} loading={completeMutation.isPending}
        title="Complete Production Job"
        message="This will add all produced quantities to finished goods inventory and mark the job as completed. Confirm?" />
      <ConfirmDialog open={cancelDialog} onClose={() => setCancelDialog(false)}
        onConfirm={() => cancelMutation.mutate()} loading={cancelMutation.isPending}
        title="Cancel Job" message="Are you sure you want to cancel this production job?" danger />
    </div>
  );
}

const InfoRow = ({ label, value, className = '' }) => (
  <div className={className}>
    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">{value}</div>
  </div>
);
