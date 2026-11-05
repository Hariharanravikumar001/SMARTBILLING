'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');
const { initUniversalDb, get, all } = require('./db');
const { initSchema } = require('./db/schema');
const { seedDatabase } = require('./db/seed');

// Initialize Database Schema & Seed Data synchronously if native node:sqlite is ready
try {
  initSchema();
  seedDatabase();
} catch (error) {
  // If waiting for async sql.js, it will initialize via initUniversalDb()
}

const app = express();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Zoho Catalyst Advanced I/O URL normalizer (strips /server/api prefix when deployed)
app.use((req, res, next) => {
  if (req.url.startsWith('/server/api')) {
    req.url = req.url.substring('/server/api'.length) || '/';
  }
  next();
});

// Request Logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (!req.url.startsWith('/health')) {
      console.log(`[API] ${req.method} ${req.originalUrl || req.url} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Root & Health Check Endpoints
app.get(['/', '/health', '/api/health'], (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'Universal Billing SaaS API',
    version: '1.0.0-PROD',
    platform: 'Zoho Catalyst Advanced I/O Engine',
    database: 'SQLite ACID Transactional Storage',
    timestamp: new Date().toISOString()
  });
});

/**
 * Public Platform Config (Dynamic Whitelabeling & Branding)
 */
app.get(['/public/config', '/api/public/config'], (req, res) => {
  try {
    const settings = all('SELECT key, value FROM platform_settings WHERE is_public = 1');
    const branding = {};
    for (const s of settings) {
      branding[s.key] = s.value;
    }

    const plans = all('SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY price_inr ASC');
    const formattedPlans = plans.map(p => ({
      ...p,
      features: p.features_json ? JSON.parse(p.features_json) : []
    }));

    res.json({
      success: true,
      data: {
        branding: {
          appName: branding.app_name || 'Universal Billing SaaS',
          companyName: branding.company_name || 'Universal Systems Inc.',
          logoUrl: branding.logo_url || '/brand-logo.svg',
          primaryColor: branding.primary_color || '#0c87eb',
          supportEmail: branding.support_email || 'support@universalbilling.io',
          supportPhone: branding.support_phone || '+91 80 4000 8800',
          currency: branding.currency || 'INR',
          currencySymbol: branding.currency_symbol || '₹',
          allowPublicRegistration: branding.allow_public_registration !== '0',
          maintenanceMode: branding.maintenance_mode === '1'
        },
        plans: formattedPlans
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Mount Routes (supporting both /api/* and direct routes)
app.use(['/api/auth', '/auth'], require('./routes/auth'));
app.use(['/api/admin', '/admin'], require('./routes/admin'));
app.use(['/api/pos', '/pos'], require('./routes/pos'));
app.use(['/api/exchange', '/exchange'], require('./routes/exchange'));
app.use(['/api/products', '/products'], require('./routes/products'));
app.use(['/api/inventory', '/inventory'], require('./routes/inventory'));
app.use(['/api/customers', '/customers'], require('./routes/customers'));
app.use(['/api/suppliers', '/suppliers'], require('./routes/suppliers'));
app.use(['/api/expenses', '/expenses'], require('./routes/expenses'));
app.use(['/api/cash-register', '/cash-register'], require('./routes/cashRegister'));
app.use(['/api/reports', '/reports'], require('./routes/reports'));
app.use(['/api/subscription', '/subscription'], require('./routes/subscription'));
app.use(['/api/zoho', '/zoho'], require('./routes/zoho'));

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.method} ${req.originalUrl || req.url}' not found.`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start standalone server when run directly (local development & testing)
const PORT = process.env.PORT || 3001;
if (require.main === module) {
  (async () => {
    await initUniversalDb();
    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 Universal Billing SaaS API running on port ${PORT}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
      console.log(`⚙️  Platform branding: http://localhost:${PORT}/api/public/config`);
      console.log(`=======================================================`);
    });
  })();
}

// Export for Zoho Catalyst Advanced I/O function
module.exports = async (req, res) => {
  try {
    await initUniversalDb();
    app(req, res);
  } catch (err) {
    console.error('[Catalyst Invocation Error]:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, message: err.message }));
  }
};
