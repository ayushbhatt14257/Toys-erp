const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const authRoutes        = require('./routes/auth');
const userRoutes        = require('./routes/users');
const partyRoutes       = require('./routes/parties');
const skuRoutes         = require('./routes/skus');
const rawMaterialRoutes = require('./routes/rawMaterials');
const bomRoutes         = require('./routes/bom');
const orderRoutes       = require('./routes/orders');
const inventoryRoutes   = require('./routes/inventory');
const productionRoutes  = require('./routes/production');
const mouldRoutes       = require('./routes/moulds');
const reportRoutes      = require('./routes/reports');
const importRoutes      = require('./routes/imports');
const auditRoutes       = require('./routes/audit');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

connectDB();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: isProduction ? false : (process.env.CLIENT_URL || 'http://localhost:5173'),
  credentials: true
}));

app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (!isProduction) app.use(morgan('dev'));

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/parties',       partyRoutes);
app.use('/api/skus',          skuRoutes);
app.use('/api/raw-materials', rawMaterialRoutes);
app.use('/api/bom',           bomRoutes);
app.use('/api/orders',        orderRoutes);
app.use('/api/inventory',     inventoryRoutes);
app.use('/api/production',    productionRoutes);
app.use('/api/moulds',        mouldRoutes);
app.use('/api/reports',       reportRoutes);
app.use('/api/imports',       importRoutes);
app.use('/api/audit',         auditRoutes);

// Serve React frontend
const frontendDist = path.resolve(process.cwd(), 'frontend', 'dist');
app.use(express.static(frontendDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

app.use(errorHandler);

// CRITICAL: must bind to 0.0.0.0 for Render to detect the open port
const PORT = parseInt(process.env.PORT, 10) || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`==> Server listening on port ${PORT}`);
  console.log(`==> NODE_ENV  : ${process.env.NODE_ENV}`);
  console.log(`==> MongoDB   : ${process.env.MONGODB_URI ? 'SET' : 'MISSING ⚠️'}`);
  console.log(`==> Frontend  : ${frontendDist}`);
});

module.exports = app;
