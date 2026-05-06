import { X, AlertTriangle, Loader2 } from 'lucide-react';

// ─── MODAL ───────────────────────────────────────────────────────────────────
export const Modal = ({ open, onClose, title, children, size = 'md' }) => {
  if (!open) return null;
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${sizes[size]} bg-white dark:bg-gray-900 rounded-2xl shadow-xl flex flex-col max-h-[90vh]`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">{children}</div>
      </div>
    </div>
  );
};

// ─── CONFIRM DIALOG ──────────────────────────────────────────────────────────
export const ConfirmDialog = ({ open, onClose, onConfirm, title, message, danger = false, loading = false }) => (
  <Modal open={open} onClose={onClose} title={title} size="sm">
    <div className="flex gap-3 mb-4">
      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${danger ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
        <AlertTriangle size={20} className={danger ? 'text-red-600' : 'text-amber-600'} />
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{message}</p>
    </div>
    <div className="flex gap-3 justify-end">
      <button onClick={onClose} className="btn-secondary">Cancel</button>
      <button onClick={onConfirm} disabled={loading} className={danger ? 'btn-danger' : 'btn-primary'}>
        {loading ? <Loader2 size={14} className="animate-spin" /> : 'Confirm'}
      </button>
    </div>
  </Modal>
);

// ─── TABLE ───────────────────────────────────────────────────────────────────
export const Table = ({ columns, data, loading, emptyMessage = 'No records found.' }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200 dark:border-gray-800">
          {columns.map(col => (
            <th key={col.key} className="table-header" style={col.width ? { width: col.width } : {}}>
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
        {loading ? (
          <tr><td colSpan={columns.length} className="py-12 text-center">
            <Loader2 size={24} className="animate-spin mx-auto text-brand-500" />
          </td></tr>
        ) : data.length === 0 ? (
          <tr><td colSpan={columns.length} className="py-12 text-center text-gray-400 dark:text-gray-500">{emptyMessage}</td></tr>
        ) : (
          data.map((row, i) => (
            <tr key={row._id || i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              {columns.map(col => (
                <td key={col.key} className="table-cell">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

// ─── BADGE ───────────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  in_inventory: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  in_production: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  planned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  shortfall: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  pending: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  reserved: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  fulfilled: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  material_allocated: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  raw_material_check: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
};

export const Badge = ({ status, label }) => {
  const style = STATUS_STYLES[status] || 'bg-gray-100 text-gray-700';
  const text = label || status?.replace(/_/g, ' ');
  return <span className={`badge ${style}`}>{text}</span>;
};

// ─── SPINNER ─────────────────────────────────────────────────────────────────
export const Spinner = ({ size = 24 }) => (
  <Loader2 size={size} className="animate-spin text-brand-500" />
);

export const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <Spinner size={32} />
  </div>
);

// ─── PAGE HEADER ─────────────────────────────────────────────────────────────
export const PageHeader = ({ title, subtitle, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
    <div>
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
      {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
  </div>
);

// ─── STAT CARD ───────────────────────────────────────────────────────────────
export const StatCard = ({ label, value, icon: Icon, color = 'brand', sub }) => {
  const colors = {
    brand: 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
            <Icon size={20} />
          </div>
        )}
      </div>
    </div>
  );
};

// ─── EMPTY STATE ─────────────────────────────────────────────────────────────
export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    {Icon && <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
      <Icon size={28} className="text-gray-400" />
    </div>}
    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
    {description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xs">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

// ─── FORM FIELD ──────────────────────────────────────────────────────────────
export const FormField = ({ label, error, required, children, hint }) => (
  <div>
    {label && <label className="label">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>}
    {children}
    {hint && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{hint}</p>}
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

// ─── SELECT ──────────────────────────────────────────────────────────────────
export const Select = ({ options, placeholder, ...props }) => (
  <select className="input" {...props}>
    {placeholder && <option value="">{placeholder}</option>}
    {options.map(opt => (
      <option key={opt.value} value={opt.value}>{opt.label}</option>
    ))}
  </select>
);

// ─── SEARCH INPUT ────────────────────────────────────────────────────────────
export const SearchInput = ({ value, onChange, placeholder = 'Search...' }) => (
  <div className="relative">
    <input
      type="text" value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="input pl-9 w-full sm:w-64"
    />
    <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  </div>
);

// ─── PAGINATION ──────────────────────────────────────────────────────────────
export const Pagination = ({ page, pages, onChange }) => {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <button onClick={() => onChange(page - 1)} disabled={page === 1} className="btn-secondary btn-sm disabled:opacity-40">Prev</button>
      <span className="text-sm text-gray-600 dark:text-gray-400">Page {page} of {pages}</span>
      <button onClick={() => onChange(page + 1)} disabled={page === pages} className="btn-secondary btn-sm disabled:opacity-40">Next</button>
    </div>
  );
};
