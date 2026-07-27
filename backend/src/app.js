const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const { errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const { requireAuth } = require('./middleware/auth');

const authRoutes = require('./api/auth/routes');
const transactionRoutes = require('./api/transactions/routes');
const importRoutes = require('./api/import/routes');
const categoryRoutes = require('./api/categories/routes');
const exportRoutes = require('./api/export/routes');
const dashboardRoutes = require('./api/dashboard/routes');

const app = express();

app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api', apiLimiter);

// Serve uploaded receipts (auth required so files aren't publicly guessable in bulk)
app.use('/uploads', requireAuth, express.static(config.uploadDir));

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/import', importRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use((req, res) => res.status(404).json({ error: 'Route not found.' }));
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Petronas Tracker API listening on port ${config.port} [${config.nodeEnv}]`);
});

module.exports = app;
