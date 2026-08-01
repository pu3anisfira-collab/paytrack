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

const PORT = process.env.PORT || config.port || 4000;

// Format CORS origins cleanly (ensures https:// scheme is present)
function formatOrigin(url) {
  if (!url) return '*';
  const trimmed = url.trim();
  if (trimmed === '*' || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

const rawFrontend = config.frontendUrl || '*';
const allowedOrigins = rawFrontend.includes(',')
  ? rawFrontend.split(',').map(formatOrigin)
  : formatOrigin(rawFrontend);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile, server-to-server, curl)
      if (!origin || allowedOrigins === '*') return callback(null, true);
      const isAllowed = Array.isArray(allowedOrigins)
        ? allowedOrigins.includes(origin)
        : allowedOrigins === origin;
      if (isAllowed) return callback(null, true);
      // Auto-allow vercel deployment subdomains and localhost
      if (origin.endsWith('.vercel.app') || origin.includes('localhost')) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`PayTrack API listening on port ${PORT} [${config.nodeEnv}]`);
});

module.exports = app;
