import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ArrowLeft, Loader2 } from 'lucide-react';
import { bomAPI, skusAPI, rawMaterialsAPI } from '../../services/apiServices';
import { PageHeader, FormField } from '../../components/common';
import toast from 'react-hot-toast';

const emptyComp = { rawMaterial: '', quantity: 1, unit: 'pcs', rate: 0 };
const UNITS = ['pcs', 'nos', 'gms', 'kg', 'ml', 'ltr', 'mtr', 'set', 'box', 'sheets'];

export default function BOMFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({ sku: '', variantName: '', isDefault: false, notes: '', components: [{ ...emptyComp }] });

  const { data: skus } = useQuery({ queryKey: ['skus'], queryFn: () => skusAPI.getAll({ active: true }).then(r => r.data.data) });
  const { data: materials } = useQuery({ queryKey: ['raw-materials'], queryFn: () => rawMaterialsAPI.getAll({ active: true }).then(r => r.data.data) });
  const { data: existing } = useQuery({ queryKey: ['bom', id], enabled: isEdit, queryFn: () => bomAPI.getOne(id).then(r => r.data.data) });

  useEffect(() => {
    if (existing) {
      setForm({
        sku: existing.sku?._id || '',
        variantName: existing.variantName || '',
        isDefault: existing.isDefault || false,
        notes: existing.notes || '',
        components: existing.components?.map(c => ({
          rawMaterial: c.rawMaterial?._id || '',
          quantity: c.quantity,
          unit: c.unit,
          rate: c.rate || 0
        })) || [{ ...emptyComp }]
      });
    }
  }, [existing]);

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? bomAPI.update(id, data) : bomAPI.create(data),
    onSuccess: () => {
      qc.invalidateQueries(['boms']);
      toast.success(isEdit ? 'BOM updated' : 'BOM created');
      navigate('/bom');
    },
    onError: (err) => toast.error(err.message)
  });

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setComp = (idx, k, v) => {
    const components = [...form.components];
    components[idx] = { ...components[idx], [k]: v };
    // Auto-fill unit from raw material
    if (k === 'rawMaterial') {
      const mat = materials?.find(m => m._id === v);
      if (mat) components[idx].unit = mat.unit;
    }
    setForm(f => ({ ...f, components }));
  };
  const addComp = () => setForm(f => ({ ...f, components: [...f.components, { ...emptyComp }] }));
  const removeComp = (idx) => setForm(f => ({ ...f, components: f.components.filter((_, i) => i !== idx) }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.sku || !form.variantName) { toast.error('SKU and Variant Name are required'); return; }
    if (form.components.some(c => !c.rawMaterial)) { toast.error('All components must have a material selected'); return; }
    mutation.mutate(form);
  };

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={isEdit ? 'Edit BOM' : 'New BOM'}
        actions={<button onClick={() => navigate(-1)} className="btn-secondary"><ArrowLeft size={16} />Back</button>}
      />
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">BOM Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="SKU" required>
              <select className="input" value={form.sku} onChange={e => setField('sku', e.target.value)}>
                <option value="">Select SKU...</option>
                {skus?.map(s => <option key={s._id} value={s._id}>{s.name} ({s.itemCode})</option>)}
              </select>
            </FormField>
            <FormField label="Variant Name" required hint='e.g. "Standard", "Export", "V2"'>
              <input type="text" className="input" value={form.variantName} onChange={e => setField('variantName', e.target.value)} placeholder="Standard" />
            </FormField>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="isDefault" checked={form.isDefault} onChange={e => setField('isDefault', e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-brand-600" />
            <label htmlFor="isDefault" className="text-sm text-gray-700 dark:text-gray-300">Set as default BOM for this SKU</label>
          </div>
          <FormField label="Notes">
            <textarea className="input" rows={2} value={form.notes} onChange={e => setField('notes', e.target.value)} />
          </FormField>
        </div>

        {/* Components */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Raw Material Components</h3>
            <button type="button" onClick={addComp} className="btn-secondary btn-sm"><Plus size={14} />Add Material</button>
          </div>
          <div className="space-y-3">
            {form.components.map((comp, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="col-span-5">
                  {idx === 0 && <p className="text-xs font-medium text-gray-500 mb-1">Raw Material</p>}
                  <select className="input" value={comp.rawMaterial} onChange={e => setComp(idx, 'rawMaterial', e.target.value)}>
                    <option value="">Select material...</option>
                    {materials?.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  {idx === 0 && <p className="text-xs font-medium text-gray-500 mb-1">Qty / unit</p>}
                  <input type="number" className="input" min={0} step="0.001" value={comp.quantity} onChange={e => setComp(idx, 'quantity', e.target.value)} />
                </div>
                <div className="col-span-2">
                  {idx === 0 && <p className="text-xs font-medium text-gray-500 mb-1">Unit</p>}
                  <select className="input" value={comp.unit} onChange={e => setComp(idx, 'unit', e.target.value)}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  {idx === 0 && <p className="text-xs font-medium text-gray-500 mb-1">Rate (₹)</p>}
                  <input type="number" className="input" min={0} step="0.01" value={comp.rate} onChange={e => setComp(idx, 'rate', e.target.value)} />
                </div>
                <div className="col-span-1 flex justify-center">
                  {form.components.length > 1 && (
                    <button type="button" onClick={() => removeComp(idx)} className="text-red-400 hover:text-red-600 p-1">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : (isEdit ? 'Update BOM' : 'Create BOM')}
          </button>
        </div>
      </form>
    </div>
  );
}
