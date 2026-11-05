'use strict';

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { get, run, all, withTransaction } = require('../db');
const { signToken, requirePlatformAuth, requireBusinessAuth } = require('../middleware/auth');
const zohoService = require('../services/zohoService');

/**
 * Super Admin / Platform User Login
 */
router.post(['/platform/login', '/admin/login'], (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const user = get('SELECT * FROM platform_users WHERE email = ?', [email.toLowerCase().trim()]);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ success: false, message: 'Invalid platform administrative credentials.' });
  }

  if (!user.is_active) {
    return res.status(403).json({ success: false, message: 'Your platform account has been deactivated.' });
  }

  run('UPDATE platform_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
  run(`
    INSERT INTO audit_logs (id, actor_type, actor_id, actor_name, action, resource, resource_id)
    VALUES (?, 'PLATFORM_USER', ?, ?, 'LOGIN', 'platform_users', ?)
  `, [`log_${Date.now()}`, user.id, user.name, user.id]);

  const token = signToken({
    id: user.id,
    type: 'PLATFORM',
    role: user.role,
    name: user.name,
    email: user.email
  });

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mfa_enabled: Boolean(user.mfa_enabled)
    }
  });
});

/**
 * Get current platform user session info
 */
router.get('/platform/me', requirePlatformAuth, (req, res) => {
  res.json({ success: true, user: req.platformUser });
});

/**
 * Shopkeeper / Business User Login (Email + Password)
 */
router.post('/business/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const user = get('SELECT * FROM business_users WHERE email = ?', [email.toLowerCase().trim()]);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ success: false, message: 'Invalid business email or password.' });
  }

  if (!user.is_active) {
    return res.status(403).json({ success: false, message: 'Your user profile is inactive. Contact store owner.' });
  }

  const business = get('SELECT * FROM businesses WHERE id = ?', [user.business_id]);
  if (!business) {
    return res.status(404).json({ success: false, message: 'Business tenant not found.' });
  }

  if (business.status === 'SUSPENDED') {
    return res.status(403).json({ success: false, message: 'This business account is suspended. Please contact platform support.' });
  }

  run('UPDATE business_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

  const token = signToken({
    id: user.id,
    businessId: user.business_id,
    branchId: user.branch_id,
    type: 'BUSINESS',
    role: user.role,
    name: user.name,
    email: user.email
  });

  // Get active branch details
  const branch = user.branch_id ? get('SELECT * FROM business_branches WHERE id = ?', [user.branch_id]) : null;
  const branches = all('SELECT id, name, code, phone, address, is_main, is_active FROM business_branches WHERE business_id = ? AND is_active = 1', [business.id]);

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      branchId: user.branch_id,
      branchName: branch ? branch.name : null
    },
    business: {
      id: business.id,
      name: business.name,
      slug: business.slug,
      email: business.email,
      currency: business.currency,
      currency_symbol: business.currency_symbol,
      status: business.status,
      industry_type: business.industry_type
    },
    branches
  });
});

/**
 * Quick PIN Login (Touchscreen / POS Cashier)
 */
router.post('/business/pin-login', (req, res) => {
  const { businessId, pin } = req.body;
  if (!businessId || !pin) {
    return res.status(400).json({ success: false, message: 'Business ID and 4-digit PIN are required.' });
  }

  const user = get('SELECT * FROM business_users WHERE business_id = ? AND pin = ? AND is_active = 1', [businessId, pin]);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid cashier PIN code.' });
  }

  const business = get('SELECT * FROM businesses WHERE id = ?', [businessId]);
  if (!business || business.status === 'SUSPENDED') {
    return res.status(403).json({ success: false, message: 'Business account is not active.' });
  }

  run('UPDATE business_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

  const token = signToken({
    id: user.id,
    businessId: user.business_id,
    branchId: user.branch_id,
    type: 'BUSINESS',
    role: user.role,
    name: user.name,
    email: user.email
  });

  const branch = user.branch_id ? get('SELECT * FROM business_branches WHERE id = ?', [user.branch_id]) : null;
  const branches = all('SELECT id, name, code, phone, address, is_main, is_active FROM business_branches WHERE business_id = ? AND is_active = 1', [business.id]);

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      branchId: user.branch_id,
      branchName: branch ? branch.name : null
    },
    business: {
      id: business.id,
      name: business.name,
      currency_symbol: business.currency_symbol
    },
    branches
  });
});

/**
 * Self-Serve Business Registration (Onboarding with 14-day free trial)
 */
router.post('/business/register', async (req, res) => {
  const {
    businessName,
    ownerName,
    email,
    phone,
    password,
    industryType = 'retail',
    gstin = ''
  } = req.body;

  if (!businessName || !ownerName || !email || !password || !phone) {
    return res.status(400).json({ success: false, message: 'Please provide all required business registration fields.' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const existing = get('SELECT id FROM business_users WHERE email = ?', [cleanEmail]);
  if (existing) {
    return res.status(409).json({ success: false, message: 'An account with this email address already exists. Please log in.' });
  }

  try {
    const result = withTransaction((db) => {
      const businessId = `biz_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const slug = businessName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString().slice(-4);
      const branchId = `branch_${businessId}_main`;
      const userId = `user_${businessId}_owner`;

      // 1. Create Business Record
      run(`
        INSERT INTO businesses (
          id, name, slug, email, phone, gstin, status, industry_type, currency, currency_symbol
        ) VALUES (?, ?, ?, ?, ?, ?, 'TRIAL', ?, 'INR', '₹')
      `, [businessId, businessName, slug, cleanEmail, phone, gstin, industryType]);

      // 2. Create Default Main Branch
      run(`
        INSERT INTO business_branches (id, business_id, name, code, phone, is_main, is_active)
        VALUES (?, ?, 'Main Store', 'MAIN', ?, 1, 1)
      `, [branchId, businessId, phone]);

      // 3. Create Owner User
      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(password, salt);
      run(`
        INSERT INTO business_users (
          id, business_id, branch_id, name, email, password_hash, pin, role, phone, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, '1234', 'Owner', ?, 1)
      `, [userId, businessId, branchId, ownerName, cleanEmail, passwordHash, phone]);

      // 4. Create Business Settings
      run(`
        INSERT INTO business_settings (
          business_id, tax_type, default_tax_rate, enable_cgst_sgst, invoice_prefix,
          invoice_footer, thermal_printer_width, enable_loyalty, exchange_period_days
        ) VALUES (?, 'GST', 18.0, 1, 'INV', 'Thank you for your purchase!', '80mm', 1, 15)
      `, [businessId]);

      // 5. Create 14-day Free Trial Subscription
      const now = new Date();
      const trialExpiry = new Date();
      trialExpiry.setDate(trialExpiry.getDate() + 14);

      run(`
        INSERT INTO subscriptions (
          id, business_id, plan_id, status, start_date, expires_at, trial_end_at, notes
        ) VALUES (?, ?, 'plan_monthly', 'TRIAL', ?, ?, ?, '14-day free trial on signup.')
      `, [`sub_${Date.now()}`, businessId, now.toISOString(), trialExpiry.toISOString(), trialExpiry.toISOString()]);

      // 6. Onboarding Progress Record
      run(`INSERT INTO onboarding_records (business_id) VALUES (?)`, [businessId]);

      // 7. Audit Log
      run(`
        INSERT INTO audit_logs (id, business_id, actor_type, actor_id, actor_name, action, resource, resource_id)
        VALUES (?, ?, 'BUSINESS_USER', ?, ?, 'REGISTER_BUSINESS', 'businesses', ?)
      `, [`log_${Date.now()}`, businessId, userId, ownerName, businessId]);

      return { businessId, branchId, userId, cleanEmail, ownerName, businessName };
    });

    // Trigger Zoho CRM sync in background (non-blocking)
    zohoService.syncBusinessCustomer({
      businessId: result.businessId,
      name: result.businessName,
      email: result.cleanEmail,
      phone,
      planName: '14-Day Free Trial',
      status: 'TRIAL'
    }).catch(err => console.error('[Zoho CRM] Sync error:', err.message));

    // Sign JWT token
    const token = signToken({
      id: result.userId,
      businessId: result.businessId,
      branchId: result.branchId,
      type: 'BUSINESS',
      role: 'Owner',
      name: result.ownerName,
      email: result.cleanEmail
    });

    res.status(201).json({
      success: true,
      message: 'Business registered successfully! 14-day free trial activated.',
      token,
      user: {
        id: result.userId,
        name: result.ownerName,
        email: result.cleanEmail,
        role: 'Owner',
        branchId: result.branchId
      },
      business: {
        id: result.businessId,
        name: result.businessName,
        status: 'TRIAL',
        industry_type: industryType
      }
    });
  } catch (error) {
    console.error('[Auth Register Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Registration failed.' });
  }
});

/**
 * Get current business user session details
 */
router.get('/business/me', requireBusinessAuth, (req, res) => {
  const branches = all('SELECT id, name, code, is_main FROM business_branches WHERE business_id = ? AND is_active = 1', [req.businessId]);
  const settings = get('SELECT * FROM business_settings WHERE business_id = ?', [req.businessId]);
  const subscription = get(`
    SELECT s.*, p.name as plan_name, p.max_users, p.max_branches, p.max_products, p.max_invoices_per_month
    FROM subscriptions s
    JOIN subscription_plans p ON s.plan_id = p.id
    WHERE s.business_id = ?
    ORDER BY s.expires_at DESC LIMIT 1
  `, [req.businessId]);

  res.json({
    success: true,
    user: req.user,
    business: req.business,
    branches,
    settings,
    subscription
  });
});

module.exports = router;
