import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Loader2, ArrowLeft } from 'lucide-react';
import { ordersAPI, partiesAPI, skusAPI } from '../../services/apiServices';
import { PageHeader, FormField } from '../../components/common';
import toast from 'react-hot-toast';

const emptyItem = { sku: '', quantity: 1, price: 0 };

export default function OrderFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    party: '', dateOfReceipt: new Date().toISOString().slice(0, 10),
    deliveryDate: '', transporterName: '', transporterDetails: '', notes: '', items: [{ ...emptyItem }]
  });
  const [errors, setErrors] = useState({});

  const { data: parties } = useQuery({ queryKey: ['parties'], queryFn: () => partiesAPI.getAll({ active: true }).then(r => r.data.data) });
  const { data: skusData } = useQuery({ queryKey: ['skus'], queryFn: () => skusAPI.getAll({ active: true }).then(r => r.data.data) });
  const { data: existingOrder } = useQuery({
    queryKey: ['order', id], enabled: isEdit,
    queryFn: () => ordersAPI.getOne(id).then(r => r.data.data)
  });

  useEffect(() => {
    if (existingOrder) {
      setForm({
        party: existingOrder.party?._id || '',
        dateOfReceipt: existingOrder.dateOfReceipt?.slice(0, 10) || '',
        deliveryDate: existingOrder.deliveryDate?.slice(0, 10) || '',
        transporterName: existingOrder.transporterName || '',
        transporterDetails: existingOrder.transporterDetails || '',
        notes: existingOrder.notes || '',
        items: existingOrder.items?.map(i => ({ sku: i.sku?._id || '', quantity: i.quantity, price: i.price })) || [{ ...emptyItem }]
      });
    }
  }, [existingOrder]);

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? ordersAPI.update(id, data) : ordersAPI.create(data),
    onSuccess: (res) => {
      qc.invalidateQueries(['orders']);
      toast.success(isEdit ? 'Order updated' : 'Order created');
      navigate(`/orders/${res.data.data._id}`);
    },
    onError: (err) => toast.error(err.message || 'Failed to save order')
  });

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const setItem = (idx, key, val) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [key]: val };
    // Auto-fill price from SKU base price
    if (key === 'sku') {
      const sku = skusData?.find(s => s._id === val);
      if (sku?.basePrice) items[idx].price = sku.basePrice;
    }
    setForm(f => ({ ...f, items }));
  };

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { ...emptyItem }] }));
  const removeItem = (idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const totalAmount = form.items.reduce((s, i) => s + (Number(i.quantity) * Number(i.price)), 0);

  const validate = () => {
    const e = {};
    if (!form.party) e.party = 'Party is required';
    if (!form.dateOfReceipt) e.dateOfReceipt = 'Date is required';
    if (form.items.some(i => !i.sku)) e.items = 'All items must have an SKU selected';
    if (form.items.some(i => i.quantity < 1)) e.items = 'Quantity must be at least 1';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate(form);
  };

  const skuOptions = skusData || [];

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={isEdit ? 'Edit Order' : 'New Order'}
        actions={<button onClick={() => navigate(-1)} className="btn-secondary"><ArrowLeft size={16} />Back</button>}
      />
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Order details */}
        <div className="card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Order Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Party Name" required error={errors.party}>
              <select className="input" value={form.party} onChange={e => setField('party', e.target.value)}>
                <option value="">Select party...</option>
                {parties?.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </FormField>
            <FormField label="Date of Receipt" required error={errors.dateOfReceipt}>
              <input type="date" className="input" value={form.dateOfReceipt} onChange={e => setField('dateOfReceipt', e.target.value)} />
            </FormField>
            <FormField label="Delivery Date">
              <input type="date" className="input" value={form.deliveryDate} onChange={e => setField('deliveryDate', e.target.value)} />
            </FormField>
            <FormField label="Transporter Name">
              <input type="text" className="input" value={form.transporterName} onChange={e => setField('transporterName', e.target.value)} placeholder="Optional" />
            </FormField>
          </div>
          <FormField label="Transporter Details">
            <input type="text" className="input" value={form.transporterDetails} onChange={e => setField('transporterDetails', e.target.value)} placeholder="Vehicle no, contact, etc." />
          </FormField>
          <FormField label="Notes">
            <textarea className="input" rows={2} value={form.notes} onChange={e => setField('notes', e.target.value)} placeholder="Any special instructions..." />
          </FormField>
        </div>

        {/* Line items */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Order Items</h3>
            <button type="button" onClick={addItem} className="btn-secondary btn-sm"><Plus size={14} />Add Item</button>
          </div>
          {errors.items && <p className="text-xs text-red-500 mb-3">{errors.items}</p>}
          <div className="space-y-3">
            {form.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="col-span-5">
                  {idx === 0 && <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Item (SKU)</p>}
                  <select className="input" value={item.sku} onChange={e => setItem(idx, 'sku', e.target.value)}>
                    <option value="">Select SKU...</option>
                    {skuOptions.map(s => <option key={s._id} value={s._id}>{s.name} ({s.itemCode})</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  {idx === 0 && <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Qty</p>}
                  <input type="number" className="input" min={1} value={item.quantity} onChange={e => setItem(idx, 'quantity', e.target.value)} />
                </div>
                <div className="col-span-3">
                  {idx === 0 && <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Price (₹)</p>}
                  <input type="number" className="input" min={0} step="0.01" value={item.price} onChange={e => setItem(idx, 'price', e.target.value)} />
                </div>
                <div className="col-span-2 text-right">
                  {idx === 0 && <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Amount</p>}
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      ₹{(item.quantity * item.price).toLocaleString('en-IN')}
                    </span>
                    {form.items.length > 1 && (
                      <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 p-1">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-right">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Amount</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">₹{totalAmount.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : (isEdit ? 'Update Order' : 'Create Order')}
          </button>
        </div>
      </form>
    </div>
  );
}
