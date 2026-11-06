'use strict';

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { get, run, all, withTransaction } = require('../db');
const { requirePlatformAuth } = require('../middleware/auth');
const zohoService = require('../services/zohoService');

// All routes here strictly require Platform Authentication (Super Admin / Staff)
router.use(requirePlatformAuth);

/**
 * Super Admin Dashboard Analytics (Real Database Figures)
 */
router.get('/dashboard', (req, res) => {
  // Business counts
  const totalBiz = get('SELECT COUNT(*) as count FROM businesses')?.count || 0;
  const activeSubs = get("SELECT COUNT(*) as count FROM subscriptions WHERE status = 'ACTIVE'")?.count || 0;
  const trialSubs = get("SELECT COUNT(*) as count FROM subscriptions WHERE status = 'TRIAL'")?.count || 0;
  const expiredSubs = get("SELECT COUNT(*) as count FROM subscriptions WHERE status = 'EXPIRED'")?.count || 0;
  const suspendedBiz = get("SELECT COUNT(*) as count FROM businesses WHERE status = 'SUSPENDED'")?.count || 0;

  // Revenue & Collections
  const totalCollections = get("SELECT COALESCE(SUM(amount), 0) as total FROM subscription_payments WHERE status = 'SUCCESS'")?.total || 0;
  const pendingPayments = get("SELECT COALESCE(SUM(amount), 0) as total FROM subscription_payments WHERE status = 'PENDING'")?.total || 0;
  const failedPaymentsCount = get("SELECT COUNT(*) as count FROM subscription_payments WHERE status = 'FAILED'")?.count || 0;

  // MRR & ARR calculation based on active plans
  const mrrRow = get(`
    SELECT COALESCE(SUM(
      CASE
        WHEN p.billing_interval = 'MONTHLY' THEN p.price_inr
        WHEN p.billing_interval = 'QUARTERLY' THEN p.price_inr / 3.0
        WHEN p.billing_interval = 'HALF_YEARLY' THEN p.price_inr / 6.0
        WHEN p.billing_interval = 'YEARLY' THEN p.price_inr / 12.0
        ELSE p.price_inr
      END
    ), 0) as mrr
    FROM subscriptions s
    JOIN subscription_plans p ON s.plan_id = p.id
    WHERE s.status = 'ACTIVE'
  `);
  const mrr = Math.round((mrrRow?.mrr || 0) * 100) / 100;
  const arr = Math.round(mrr * 12 * 100) / 100;

  // Businesses expiring in next 7 days
  const now = new Date();
  const next7Days = new Date();
  next7Days.setDate(next7Days.getDate() + 7);

  const expiringSoon = all(`
    SELECT b.id, b.name, b.email, b.phone, s.status, s.expires_at, p.name as plan_name
    FROM businesses b
    JOIN subscriptions s ON b.id = s.business_id
    JOIN subscription_plans p ON s.plan_id = p.id
    WHERE s.expires_at BETWEEN ? AND ?
    ORDER BY s.expires_at ASC
  `, [now.toISOString(), next7Days.toISOString()]);

  // Support ticket summary
  const openTickets = get("SELECT COUNT(*) as count FROM support_tickets WHERE status = 'Open'")?.count || 0;
  const totalTickets = get('SELECT COUNT(*) as count FROM support_tickets')?.count || 0;

  // Recent audit activities
  const recentActivities = all(`
    SELECT id, actor_name, action, resource, details, created_at
    FROM audit_logs
    ORDER BY created_at DESC
    LIMIT 10
  `);

  res.json({
    success: true,
    data: {
      metrics: {
        totalBusinesses: totalBiz,
        activeSubscriptions: activeSubs,
        freeTrialAccounts: trialSubs,
        expiredSubscriptions: expiredSubs,
        suspendedAccounts: suspendedBiz,
        mrr,
        arr,
        totalCollections,
        pendingPayments,
        failedPaymentsCount,
        openTickets,
        totalTickets,
        trialConversionRate: totalBiz > 0 ? Math.round((activeSubs / totalBiz) * 100) : 0
      },
      expiringSoon,
      recentActivities,
      systemHealth: {
        status: 'HEALTHY',
        databaseEngine: 'SQLite WAL (Synchronous Transactional)',
        nodeVersion: process.version,
        memoryUsageMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
        uptimeSeconds: Math.round(process.uptime())
      }
    }
  });
});

/**
 * Business Management: List all businesses with stats
 */
router.get('/businesses', (req, res) => {
  const { search, status, page = 1, limit = 50 } = req.query;
  let sql = `
    SELECT b.*,
           s.status as subscription_status, s.expires_at as subscription_expires_at,
           p.name as plan_name,
           (SELECT COUNT(*) FROM business_branches WHERE business_id = b.id) as branch_count,
           (SELECT COUNT(*) FROM business_users WHERE business_id = b.id) as staff_count,
           (SELECT COUNT(*) FROM products WHERE business_id = b.id) as product_count,
           (SELECT COUNT(*) FROM sales WHERE business_id = b.id) as sale_count
    FROM businesses b
    LEFT JOIN (
      SELECT s1.business_id, s1.status, s1.expires_at, s1.plan_id
      FROM subscriptions s1
      INNER JOIN (
        SELECT business_id, MAX(expires_at) as max_exp FROM subscriptions GROUP BY business_id
      ) s2 ON s1.business_id = s2.business_id AND s1.expires_at = s2.max_exp
    ) s ON b.id = s.business_id
    LEFT JOIN subscription_plans p ON s.plan_id = p.id
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    sql += ` AND (b.name LIKE ? OR b.email LIKE ? OR b.phone LIKE ? OR b.id LIKE ?)`;
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  if (status) {
    sql += ` AND b.status = ?`;
    params.push(status);
  }

  sql += ` ORDER BY b.created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit, 10), (parseInt(page, 10) - 1) * parseInt(limit, 10));

  const businesses = all(sql, params);
  res.json({ success: true, data: businesses });
});

/**
 * Business Management: Manually register a business
 */
router.post('/businesses', (req, res) => {
  const { name, email, phone, gstin, address, city, state, industry_type, plan_id, initial_password = 'Password@2026!' } = req.body;
  if (!name || !email || !phone) {
    return res.status(400).json({ success: false, message: 'Name, email, and phone are mandatory.' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const existing = get('SELECT id FROM businesses WHERE email = ?', [cleanEmail]);
  if (existing) {
    return res.status(409).json({ success: false, message: 'Business with this email already exists.' });
  }

  const result = withTransaction((db) => {
    const businessId = `biz_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString().slice(-4);
    const branchId = `branch_${businessId}_main`;
    const userId = `user_${businessId}_owner`;

    run(`
      INSERT INTO businesses (id, name, slug, email, phone, gstin, address, city, state, status, industry_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
    `, [businessId, name, slug, cleanEmail, phone, gstin || null, address || null, city || null, state || null, industry_type || 'retail']);

    run(`
      INSERT INTO business_branches (id, business_id, name, code, phone, is_main, is_active)
      VALUES (?, ?, 'Main Branch', 'MAIN', ?, 1, 1)
    `, [branchId, businessId, phone]);

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(initial_password, salt);
    run(`
      INSERT INTO business_users (id, business_id, branch_id, name, email, password_hash, pin, role, phone)
      VALUES (?, ?, ?, ?, ?, ?, '1234', 'Owner', ?)
    `, [userId, businessId, branchId, name + ' Owner', cleanEmail, passwordHash, phone]);

    run(`INSERT INTO business_settings (business_id) VALUES (?)`, [businessId]);

    const targetPlanId = plan_id || 'plan_quarterly';
    const plan = get('SELECT * FROM subscription_plans WHERE id = ?', [targetPlanId]);
    const duration = plan ? plan.duration_days : 90;

    const now = new Date();
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + duration);

    run(`
      INSERT INTO subscriptions (id, business_id, plan_id, status, start_date, expires_at, notes)
      VALUES (?, ?, ?, 'ACTIVE', ?, ?, 'Provisioned manually by Super Admin.')
    `, [`sub_${Date.now()}`, businessId, targetPlanId, now.toISOString(), expiry.toISOString()]);

    run(`
      INSERT INTO audit_logs (id, actor_type, actor_id, actor_name, action, resource, resource_id, details)
      VALUES (?, 'PLATFORM_USER', ?, ?, 'MANUAL_CREATE_BUSINESS', 'businesses', ?, ?)
    `, [`log_${Date.now()}`, req.platformUser.id, req.platformUser.name, businessId, JSON.stringify({ name, email, planId: targetPlanId })]);

    return { businessId, branchId, userId };
  });

  res.status(201).json({ success: true, message: 'Business created successfully.', data: result });
});

/**
 * Business Status: Activate or Suspend account
 */
router.patch('/businesses/:id/status', (req, res) => {
  const { status, reason } = req.body;
  if (!['ACTIVE', 'SUSPENDED', 'PENDING'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status value.' });
  }

  const business = get('SELECT id, name FROM businesses WHERE id = ?', [req.params.id]);
  if (!business) {
    return res.status(404).json({ success: false, message: 'Business not found.' });
  }

  run('UPDATE businesses SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, business.id]);
  run(`
    INSERT INTO audit_logs (id, actor_type, actor_id, actor_name, action, resource, resource_id, details)
    VALUES (?, 'PLATFORM_USER', ?, ?, 'UPDATE_BUSINESS_STATUS', 'businesses', ?, ?)
  `, [`log_${Date.now()}`, req.platformUser.id, req.platformUser.name, business.id, JSON.stringify({ newStatus: status, reason })]);

  res.json({ success: true, message: `Business '${business.name}' is now ${status}.` });
});

/**
 * Business Management: Update internal notes & account manager
 */
router.patch('/businesses/:id', (req, res) => {
  const { internal_notes, account_manager, name, phone, gstin } = req.body;
  run(`
    UPDATE businesses
    SET internal_notes = COALESCE(?, internal_notes),
        account_manager = COALESCE(?, account_manager),
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        gstin = COALESCE(?, gstin),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [internal_notes, account_manager, name, phone, gstin, req.params.id]);

  res.json({ success: true, message: 'Business details updated.' });
});

/**
 * Subscription Plans: List all plans
 */
router.get('/plans', (req, res) => {
  const plans = all('SELECT * FROM subscription_plans ORDER BY price_inr ASC');
  const formatted = plans.map(p => ({
    ...p,
    features: p.features_json ? JSON.parse(p.features_json) : []
  }));
  res.json({ success: true, data: formatted });
});

/**
 * Subscription Plans: Update or Create Plan
 */
router.post('/plans', (req, res) => {
  const {
    id, name, billing_interval, duration_days, price_inr, original_price_inr,
    is_active = 1, is_popular = 0, trial_days = 14, max_users = 2, max_branches = 1,
    max_products = 500, max_invoices_per_month = 1000, features = []
  } = req.body;

  const planId = id || `plan_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

  run(`
    INSERT INTO subscription_plans (
      id, name, billing_interval, duration_days, price_inr, original_price_inr,
      is_active, is_popular, trial_days, max_users, max_branches, max_products,
      max_invoices_per_month, features_json, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      billing_interval = excluded.billing_interval,
      duration_days = excluded.duration_days,
      price_inr = excluded.price_inr,
      original_price_inr = excluded.original_price_inr,
      is_active = excluded.is_active,
      is_popular = excluded.is_popular,
      trial_days = excluded.trial_days,
      max_users = excluded.max_users,
      max_branches = excluded.max_branches,
      max_products = excluded.max_products,
      max_invoices_per_month = excluded.max_invoices_per_month,
      features_json = excluded.features_json,
      updated_at = CURRENT_TIMESTAMP
  `, [
    planId, name, billing_interval, duration_days, price_inr, original_price_inr || price_inr,
    is_active ? 1 : 0, is_popular ? 1 : 0, trial_days, max_users, max_branches,
    max_products, max_invoices_per_month, JSON.stringify(features)
  ]);

  res.json({ success: true, message: 'Plan saved successfully.', planId });
});

/**
 * Payment Management: List all subscription payment transactions
 */
router.get('/payments', (req, res) => {
  const payments = all(`
    SELECT p.*, b.name as business_name, pl.name as plan_name
    FROM subscription_payments p
    LEFT JOIN businesses b ON p.business_id = b.id
    LEFT JOIN subscription_plans pl ON p.plan_id = pl.id
    ORDER BY p.created_at DESC
    LIMIT 100
  `);
  res.json({ success: true, data: payments });
});

/**
 * Software Update Management: List and create versions
 */
router.get('/software-versions', (req, res) => {
  const versions = all('SELECT * FROM software_versions ORDER BY release_date DESC');
  const flags = all('SELECT * FROM feature_flags');
  res.json({ success: true, data: { versions, featureFlags: flags } });
});

router.post('/software-versions', (req, res) => {
  const { version_tag, release_name, release_notes, is_critical = 0, release_date } = req.body;
  const id = `ver_${Date.now()}`;
  run(`
    INSERT INTO software_versions (id, version_tag, release_name, release_notes, is_critical, release_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [id, version_tag, release_name, release_notes, is_critical ? 1 : 0, release_date || new Date().toISOString().split('T')[0]]);

  res.status(201).json({ success: true, message: 'Release published.' });
});

router.patch('/feature-flags/:key', (req, res) => {
  const { is_enabled } = req.body;
  run('UPDATE feature_flags SET is_enabled_globally = ? WHERE flag_key = ?', [is_enabled ? 1 : 0, req.params.key]);
  res.json({ success: true, message: 'Feature flag updated.' });
});

/**
 * Platform Settings: Get all configurable branding & operational settings
 */
router.get('/settings', (req, res) => {
  const settings = all('SELECT * FROM platform_settings');
  const mapped = {};
  for (const s of settings) {
    mapped[s.key] = s.value;
  }
  res.json({ success: true, data: mapped });
});

/**
 * Platform Settings: Update branding, app name, logo, colors, contact info
 */
router.post('/settings', (req, res) => {
  const updates = req.body; // e.g. { app_name: 'Universal Billing', primary_color: '#0c87eb' }
  const stmt = db.prepare(`
    INSERT INTO platform_settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `);

  for (const [key, value] of Object.entries(updates)) {
    stmt.run(key, String(value));
  }

  run(`
    INSERT INTO audit_logs (id, actor_type, actor_id, actor_name, action, resource, details)
    VALUES (?, 'PLATFORM_USER', ?, ?, 'UPDATE_PLATFORM_SETTINGS', 'platform_settings', ?)
  `, [`log_${Date.now()}`, req.platformUser.id, req.platformUser.name, JSON.stringify(updates)]);

  res.json({ success: true, message: 'Platform branding & settings updated successfully.' });
});

/**
 * Platform Staff Management
 */
router.get('/staff', (req, res) => {
  const staff = all('SELECT id, name, email, role, phone, is_active, last_login_at, created_at FROM platform_users');
  res.json({ success: true, data: staff });
});

router.post('/staff', (req, res) => {
  const { name, email, role, phone, password } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ success: false, message: 'Name, email, password, and role are required.' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const existing = get('SELECT id FROM platform_users WHERE email = ?', [cleanEmail]);
  if (existing) {
    return res.status(409).json({ success: false, message: 'A platform staff account with this email already exists.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);
  const id = `user_staff_${Date.now()}`;

  run(`
    INSERT INTO platform_users (id, name, email, password_hash, role, phone, is_active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `, [id, name, cleanEmail, hash, role, phone || null]);

  res.status(201).json({ success: true, message: 'Staff member added successfully.' });
});

/**
 * Audit Logs: View system audit trail
 */
router.get('/audit-logs', (req, res) => {
  const { limit = 50 } = req.query;
  const logs = all(`
    SELECT * FROM audit_logs
    ORDER BY created_at DESC
    LIMIT ?
  `, [parseInt(limit, 10)]);
  res.json({ success: true, data: logs });
});

/**
 * Zoho Central Monitor & Sync Logs
 */
router.get(['/zoho/status', '/zoho/config'], (req, res) => {
  const crmConn = zohoService.getConnection('CRM');
  const deskConn = zohoService.getConnection('DESK');
  const logs = all('SELECT * FROM zoho_sync_logs ORDER BY created_at DESC LIMIT 50');

  res.json({
    success: true,
    data: {
      crm: crmConn,
      desk: deskConn,
      syncLogs: logs,
      recentSyncLogs: logs
    }
  });
});

router.post('/zoho/connect', (req, res) => {
  const { service, clientId, clientSecret, refreshToken, deskOrgId, deskDepartmentId } = req.body;
  if (!service || !clientId || !clientSecret || !refreshToken) {
    return res.status(400).json({ success: false, message: 'Service, Client ID, Client Secret, and Refresh Token are required.' });
  }

  const result = zohoService.saveConnection({
    service,
    clientId,
    clientSecret,
    refreshToken,
    deskOrgId,
    deskDepartmentId
  });

  res.json(result);
});

/**
 * Coupon Management Endpoints
 */
router.get('/coupons', (req, res) => {
  const coupons = all(`
    SELECT c.*,
           (SELECT COUNT(*) FROM coupon_redemptions WHERE coupon_id = c.id) as redemption_count
    FROM coupons c
    ORDER BY c.created_at DESC
  `);
  res.json({ success: true, data: coupons });
});

router.post('/coupons', (req, res) => {
  const { code, description, discount_type, discount_value, min_amount, max_discount, max_uses, valid_to } = req.body;
  if (!code || !discount_type || discount_value === undefined) {
    return res.status(400).json({ success: false, message: 'Coupon code, discount type, and discount value are required.' });
  }

  const existing = get('SELECT id FROM coupons WHERE code = ?', [code.trim().toUpperCase()]);
  if (existing) {
    return res.status(409).json({ success: false, message: `Coupon with code '${code.trim().toUpperCase()}' already exists.` });
  }

  const id = `coup_${Date.now()}`;
  run(`
    INSERT INTO coupons (
      id, code, description, discount_type, discount_value, min_amount,
      max_discount, valid_to, max_uses, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `, [
    id, code.trim().toUpperCase(), description || '', discount_type, parseFloat(discount_value),
    parseFloat(min_amount || 0), max_discount ? parseFloat(max_discount) : null,
    valid_to || null, parseInt(max_uses || 100, 10)
  ]);

  res.status(201).json({ success: true, message: `Coupon '${code.trim().toUpperCase()}' created successfully.`, data: { id, code: code.trim().toUpperCase() } });
});

router.put('/coupons/:id', (req, res) => {
  const { is_active, description, max_uses, discount_value } = req.body;
  const coupon = get('SELECT id FROM coupons WHERE id = ?', [req.params.id]);
  if (!coupon) {
    return res.status(404).json({ success: false, message: 'Coupon not found.' });
  }

  let updates = [];
  let params = [];
  if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }
  if (description !== undefined) { updates.push('description = ?'); params.push(description); }
  if (max_uses !== undefined) { updates.push('max_uses = ?'); params.push(parseInt(max_uses, 10)); }
  if (discount_value !== undefined) { updates.push('discount_value = ?'); params.push(parseFloat(discount_value)); }

  if (updates.length > 0) {
    params.push(req.params.id);
    run(`UPDATE coupons SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  res.json({ success: true, message: 'Coupon updated successfully.' });
});

router.delete('/coupons/:id', (req, res) => {
  run('DELETE FROM coupons WHERE id = ?', [req.params.id]);
  res.json({ success: true, message: 'Coupon deleted successfully.' });
});

module.exports = router;
