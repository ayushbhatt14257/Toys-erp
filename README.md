# Toy Manufacturing ERP

Full-stack ERP system built with MERN stack (MongoDB, Express, React, Node.js).

## Tech Stack
- **Frontend**: React 18 + Vite + Tailwind CSS + React Query
- **Backend**: Node.js + Express (REST API)
- **Database**: MongoDB (Mongoose)
- **Auth**: JWT (stateless)
- **Exports**: ExcelJS (Excel) + PDFKit (PDF)
- **Imports**: XLSX (Excel/CSV parsing)

---

## Project Structure

```
erp/
├── backend/
│   ├── src/
│   │   ├── config/       db.js
│   │   ├── models/       User, Party, SKU, RawMaterial, BOM, Mould,
│   │   │                 Order, InventoryStock, ProductionJob, AuditLog
│   │   ├── controllers/  auth, users, master, orders, inventory,
│   │   │                 bom, production, imports, reports
│   │   ├── routes/       all route files with RBAC guards
│   │   ├── middleware/   auth.js, errorHandler.js, audit.js
│   │   └── utils/        seed.js
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── context/      AuthContext (JWT + dark mode)
    │   ├── services/     api.js, apiServices.js
    │   ├── components/   Layout, Sidebar, Topbar, common UI
    │   └── pages/        auth, orders, inventory, production,
    │                     bom, master, reports, settings
    ├── package.json
    ├── vite.config.js
    └── tailwind.config.js
```

---

## Setup Instructions

### 1. Clone and install

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure environment

```bash
cd backend
cp .env.example .env
```

Edit `.env` and set:
```
MONGODB_URI=mongodb+srv://youruser:yourpass@cluster.mongodb.net/
JWT_SECRET=change_this_to_a_long_random_string
```

### 3. Seed the first admin user

```bash
cd backend
npm run seed
```

This creates:
- Email: `admin@toyerp.com`
- Password: `Admin@1234`

**Change this password immediately after first login.**

### 4. Start the servers

```bash
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

- Backend runs on: http://localhost:5000
- Frontend runs on: http://localhost:5173

---

## Roles & Permissions

| Role | Orders | Inventory | Production | Master Data | Reports |
|------|--------|-----------|------------|-------------|---------|
| master_admin | Full | Full | Full | Full (CRUD) | Full |
| order_manager | Create/Edit | View | View | Select only | View |
| inventory_manager | View | Full | View | Select only | View |
| production_manager | View | View | Full trigger | View BOM | View |
| store_manager | — | View | — | Select only | View |

---

## Excel Import Format

### Parties (`/api/imports/parties`)
| Party Name | Contact Person | Phone | Email | GST No | City | State | Address |

### SKUs (`/api/imports/skus`)
| Item Name | Item Code | Category | Unit | Base Price | Description |

**Category values**: `toy_truck`, `rattle`, `wooden_toy`, `vehicle`, `educational`, `other`

### Raw Materials (`/api/imports/raw-materials`)
| Material Name | Code | Unit | Opening Stock | Reorder Level |

### Inventory (`/api/imports/inventory`)
| Item Code | Item Name | Quantity |

---

## Key API Endpoints

```
POST   /api/auth/login
GET    /api/auth/me

GET    /api/orders
POST   /api/orders
PUT    /api/orders/:id          (blocked if locked)
PATCH  /api/orders/:id/payment  (locks order permanently)

GET    /api/inventory
POST   /api/inventory/stock-in
POST   /api/inventory/bulk-stock-in
POST   /api/imports/inventory   (Excel upload)

GET    /api/production
POST   /api/production
PATCH  /api/production/:id/start
PATCH  /api/production/:id/complete

GET    /api/bom
POST   /api/bom                 (master_admin only)
GET    /api/bom/calculate       (?bomId=&quantity=)

GET    /api/reports/orders/excel
GET    /api/reports/inventory/excel
GET    /api/reports/production/:jobId/pdf
GET    /api/reports/raw-materials/excel
```

---

## Future Modules (ready to plug in)

- **Assembly module** — same RBAC pattern, new role `assembly_manager`
- **Packaging module** — track packing materials, packaging jobs
- **Accounts module** — invoice generation from locked orders
- **Staff/HR module** — attendance, payroll linked to production jobs
- **Purchase module** — auto-raise PO when raw material hits reorder level
- **Multi-warehouse** — add `warehouseId` to `InventoryStock`

Each new module follows the same pattern:
1. Add model in `backend/src/models/`
2. Add controller + route
3. Add role to RBAC middleware
4. Add page + nav link in frontend
