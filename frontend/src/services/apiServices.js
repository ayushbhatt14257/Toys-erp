import api from './api';

// ─── AUTH ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// ─── USERS ───────────────────────────────────────────────────────────────────
export const usersAPI = {
  getAll: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  deactivate: (id) => api.delete(`/users/${id}`),
  resetPassword: (id, data) => api.put(`/users/${id}/reset-password`, data),
};

// ─── PARTIES ─────────────────────────────────────────────────────────────────
export const partiesAPI = {
  getAll: (params) => api.get('/parties', { params }),
  create: (data) => api.post('/parties', data),
  update: (id, data) => api.put(`/parties/${id}`, data),
  remove: (id) => api.delete(`/parties/${id}`),
  import: (file) => {
    const fd = new FormData(); fd.append('file', file);
    return api.post('/imports/parties', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  }
};

// ─── SKUs ─────────────────────────────────────────────────────────────────────
export const skusAPI = {
  getAll: (params) => api.get('/skus', { params }),
  getOne: (id) => api.get(`/skus/${id}`),
  create: (data) => api.post('/skus', data),
  update: (id, data) => api.put(`/skus/${id}`, data),
  remove: (id) => api.delete(`/skus/${id}`),
  import: (file) => {
    const fd = new FormData(); fd.append('file', file);
    return api.post('/imports/skus', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  }
};

// ─── RAW MATERIALS ───────────────────────────────────────────────────────────
export const rawMaterialsAPI = {
  getAll: (params) => api.get('/raw-materials', { params }),
  getOne: (id) => api.get(`/raw-materials/${id}`),
  create: (data) => api.post('/raw-materials', data),
  update: (id, data) => api.put(`/raw-materials/${id}`, data),
  remove: (id) => api.delete(`/raw-materials/${id}`),
  import: (file) => {
    const fd = new FormData(); fd.append('file', file);
    return api.post('/imports/raw-materials', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  }
};

// ─── BOM ─────────────────────────────────────────────────────────────────────
export const bomAPI = {
  getAll: (params) => api.get('/bom', { params }),
  getOne: (id) => api.get(`/bom/${id}`),
  create: (data) => api.post('/bom', data),
  update: (id, data) => api.put(`/bom/${id}`, data),
  remove: (id) => api.delete(`/bom/${id}`),
  calculate: (params) => api.get('/bom/calculate', { params }),
};

// ─── MOULDS ──────────────────────────────────────────────────────────────────
export const mouldsAPI = {
  getAll: (params) => api.get('/moulds', { params }),
  create: (data) => api.post('/moulds', data),
  update: (id, data) => api.put(`/moulds/${id}`, data),
  remove: (id) => api.delete(`/moulds/${id}`),
};

// ─── ORDERS ──────────────────────────────────────────────────────────────────
export const ordersAPI = {
  getAll: (params) => api.get('/orders', { params }),
  getOne: (id) => api.get(`/orders/${id}`),
  dashboard: () => api.get('/orders/dashboard'),
  create: (data) => api.post('/orders', data),
  update: (id, data) => api.put(`/orders/${id}`, data),
  markPayment: (id) => api.patch(`/orders/${id}/payment`),
  updateStatus: (id, status) => api.patch(`/orders/${id}/status`, { status }),
};

// ─── INVENTORY ───────────────────────────────────────────────────────────────
export const inventoryAPI = {
  getAll: (params) => api.get('/inventory', { params }),
  dashboard: () => api.get('/inventory/dashboard'),
  getBySKU: (skuId) => api.get(`/inventory/${skuId}`),
  stockIn: (data) => api.post('/inventory/stock-in', data),
  bulkStockIn: (data) => api.post('/inventory/bulk-stock-in', data),
  adjust: (data) => api.post('/inventory/adjust', data),
  importFile: (file) => {
    const fd = new FormData(); fd.append('file', file);
    return api.post('/imports/inventory', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  }
};

// ─── PRODUCTION ──────────────────────────────────────────────────────────────
export const productionAPI = {
  getAll: (params) => api.get('/production', { params }),
  getOne: (id) => api.get(`/production/${id}`),
  dashboard: () => api.get('/production/dashboard'),
  create: (data) => api.post('/production', data),
  start: (id) => api.patch(`/production/${id}/start`),
  complete: (id, data) => api.patch(`/production/${id}/complete`, data),
  cancel: (id) => api.patch(`/production/${id}/cancel`),
};

// ─── REPORTS ─────────────────────────────────────────────────────────────────
export const reportsAPI = {
  ordersExcel: (params) => api.get('/reports/orders/excel', { params, responseType: 'blob' }),
  inventoryExcel: () => api.get('/reports/inventory/excel', { responseType: 'blob' }),
  productionPDF: (jobId) => api.get(`/reports/production/${jobId}/pdf`, { responseType: 'blob' }),
  rawMaterialsExcel: () => api.get('/reports/raw-materials/excel', { responseType: 'blob' }),
};

// ─── AUDIT ───────────────────────────────────────────────────────────────────
export const auditAPI = {
  getAll: (params) => api.get('/audit', { params }),
};

// ─── UTILS ───────────────────────────────────────────────────────────────────
export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  window.URL.revokeObjectURL(url);
};
