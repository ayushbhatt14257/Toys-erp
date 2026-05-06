import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ArrowLeft, Loader2 } from 'lucide-react';
import { productionAPI, skusAPI, bomAPI, mouldsAPI } from '../../services/apiServices';
import { PageHeader, FormField } from '../../components/common';
import toast from 'react-hot-toast';

const emptyItem = { skuId: '', bomId: '', qtyToMake: 1, mouldId: '' };

export default function ProductionFormPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: '', plannedStartDate: '', plannedEndDate: '', notes: '',
    items: [{ ...emptyItem }]
  });

  const { data: skus } = useQuery({ queryKey: ['skus'], queryFn: () => skusAPI.getAll({ active: true }).then(r => r.data.data) });
  const { data: allBoms } = useQuery({ queryKey: ['boms'], queryFn: () => bomAPI.getAll().then(r => r.data.data) });
  const { data: moulds } = useQuery({ queryKey: ['moulds'], queryFn: () => mouldsAPI.getAll().then(r => r.data.data) });

  const mutation = useMutation({
    mutationFn: (data) => productionAPI.create(data),
    onSuccess: (res) => {
      qc.invalidateQueries(['production']);
      toast.success('Production job created');
      navigate(`/production/${res.data.data._id}`);
    },
    onError: (err) => toast.error(err.message || 'Failed to create job')
  });

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setItem = (idx, k, v) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [k]: v };
    // Reset BOM when SKU changes
    if (k === 'skuId') { items[idx].bomId = ''; items[idx].mouldId = ''; }
    setForm(f => ({ ...f, items }));
  };
  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { ...emptyItem }] }));
  const removeItem = (idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const getBOMsForSKU = (skuId) => allBoms?.filter(b => b.sku?._id === skuId || b.sku === skuId) || [];
  const getMouldsForSKU = (skuId) => moulds?.filter(m => m.sku?._id === skuId || m.sku === skuId) || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.items.some(i => !i.skuId || !i.bomId)) {
      toast.error('Each item must have an SKU and BOM selected');
      return;
    }
    mutation.mutate(form);
  };

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="New Production Job"
        actions={<button onClick={() => navigate(-1)} className="btn-secondary"><ArrowLeft size={16} />Back</button>}
      />
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Job header */}
        <div className="card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Job Details</h3>
          <FormField label="Job Name">
            <input type="text" className="input" value={form.name} onChange={e => setField('name', e.target.value)} placeholder="e.g. Poclain 23 — May Batch" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Planned Start">
              <input type="date" className="input" value={form.plannedStartDate} onChange={e => setField('plannedStartDate', e.target.value)} />
            </FormField>
            <FormField label="Planned End">
              <input type="date" className="input" value={form.plannedEndDate} onChange={e => setField('plannedEndDate', e.target.value)} />
            </FormField>
          </div>
          <FormField label="Notes">
            <textarea className="input" rows={2} value={form.notes} onChange={e => setField('notes', e.target.value)} />
          </FormField>
        </div>

        {/* Items */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Items to Produce</h3>
            <button type="button" onClick={addItem} className="btn-secondary btn-sm"><Plus size={14} />Add SKU</button>
          </div>
          <div className="space-y-4">
            {form.items.map((item, idx) => {
              const bomsForSku = getBOMsForSKU(item.skuId);
              const mouldsForSku = getMouldsForSKU(item.skuId);
              const selectedBom = allBoms?.find(b => b._id === item.bomId);
              const selectedMould = moulds?.find(m => m._id === item.mouldId);
              const shotsRequired = selectedMould ? Math.ceil(item.qtyToMake / selectedMould.partsPerShot) : null;

              return (
                <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Item {idx + 1}</p>
                    {form.items.length > 1 && (
                      <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="SKU" required>
                      <select className="input" value={item.skuId} onChange={e => setItem(idx, 'skuId', e.target.value)}>
                        <option value="">Select SKU...</option>
                        {skus?.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                      </select>
                    </FormField>
                    <FormField label="Qty to Make" required>
                      <input type="number" className="input" min={1} value={item.qtyToMake} onChange={e => setItem(idx, 'qtyToMake', Number(e.target.value))} />
                    </FormField>
                    <FormField label="BOM Variant" required>
                      <select className="input" value={item.bomId} onChange={e => setItem(idx, 'bomId', e.target.value)} disabled={!item.skuId}>
                        <option value="">{item.skuId ? 'Select BOM...' : 'Select SKU first'}</option>
                        {bomsForSku.map(b => <option key={b._id} value={b._id}>{b.variantName}{b.isDefault ? ' (Default)' : ''}</option>)}
                      </select>
                    </FormField>
                    <FormField label="Mould (optional)" hint={shotsRequired ? `${shotsRequired} shots required` : ''}>
                      <select className="input" value={item.mouldId} onChange={e => setItem(idx, 'mouldId', e.target.value)} disabled={!item.skuId}>
                        <option value="">No mould</option>
                        {mouldsForSku.map(m => <option key={m._id} value={m._id}>{m.code} ({m.partsPerShot} parts/shot)</option>)}
                      </select>
                    </FormField>
                  </div>
                  {/* BOM preview */}
                  {selectedBom && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 rounded-lg p-3">
                      <p className="font-medium mb-1">Material requirements:</p>
                      <div className="space-y-0.5">
                        {selectedBom.components?.map((c, ci) => (
                          <p key={ci}>• {c.rawMaterial?.name || 'Unknown'}: {(c.quantity * item.qtyToMake).toFixed(2)} {c.unit}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Create Production Job'}
          </button>
        </div>
      </form>
    </div>
  );
}
