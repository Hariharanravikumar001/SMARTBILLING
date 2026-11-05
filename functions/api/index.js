'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');
const { initSchema } = require('./db/schema');
const { seedDatabase } = require('./db/seed');
const { get, all } = require('./db');

// Initialize Database Schema & Seed Data
try {
  initSchema();
  seedDatabase();
} catch (error) {
  console.error('[Initialization Error]:', error);
}

const app = express();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
    database: 'SQLite WAL ACID Transactional Storage',
    timestamp: new Date().toISOString()
  });
});

/**
 * Public Platform Config (Dynamic Whitelabeling & Branding)
 * Returns the configurable Software Name, Logo, Colors, Contact Info, and Active Subscription Plans
 * so the owner can change branding without modifying frontend source code!
 */
app.get('/api/public/config', (req, res) => {
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
});

// Mount Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/pos', require('./routes/pos'));
app.use('/api/exchange', require('./routes/exchange'));
app.use('/api/products', require('./routes/products'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/cash-register', require('./routes/cashRegister'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/subscription', require('./routes/subscription'));
app.use('/api/zoho', require('./routes/zoho'));

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
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 Universal Billing SaaS API running on port ${PORT}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
    console.log(`⚙️  Platform branding: http://localhost:${PORT}/api/public/config`);
    console.log(`=======================================================`);
  });
}

// Export for Zoho Catalyst Advanced I/O function
module.exports = (req, res) => {
  app(req, res);
};
