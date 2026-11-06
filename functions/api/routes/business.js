'use strict';

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { get, run, all } = require('../db');
const { requireBusinessAuth, requireBusinessRole } = require('../middleware/auth');

router.use(requireBusinessAuth);

/**
 * Get Business & Store Settings
 */
router.get('/settings', (req, res) => {
  const businessId = req.businessId;

  const business = get(`
    SELECT id, name, email, phone, gstin, address, city, state, pincode, currency, currency_symbol, logo_url, industry_type
    FROM businesses WHERE id = ?
  `, [businessId]);

  let settings = get('SELECT * FROM business_settings WHERE business_id = ?', [businessId]);
  if (!settings) {
    settings = {
      business_id: businessId,
      tax_type: 'GST',
      default_tax_rate: 18.0,
      enable_cgst_sgst: 1,
      invoice_prefix: 'INV',
      invoice_footer: 'Thank you for shopping with us! Please visit again.',
      terms_conditions: '1. Goods once sold can be exchanged within 15 days.\n2. Original invoice required for exchange.',
      thermal_printer_width: '80mm',
      enable_loyalty: 1,
      loyalty_points_per_100: 1.0,
      loyalty_redemption_rate: 1.0,
      enable_barcode_scanner: 1,
      exchange_period_days: 15,
      allow_credit_sales: 1
    };
  }

  res.json({
    success: true,
    data: {
      business,
      settings
    }
  });
});

/**
 * Update Business & Store Settings
 */
router.put('/settings', requireBusinessRole(['Owner', 'Business Administrator', 'Manager']), (req, res) => {
  const businessId = req.businessId;
  const {
    name, phone, gstin, address, city, state, pincode,
    tax_type, default_tax_rate, enable_cgst_sgst, invoice_prefix,
    invoice_footer, terms_conditions, thermal_printer_width,
    enable_loyalty, loyalty_points_per_100, loyalty_redemption_rate,
    enable_barcode_scanner, exchange_period_days, allow_credit_sales
  } = req.body;

  // Update businesses table
  run(`
    UPDATE businesses
    SET name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        gstin = COALESCE(?, gstin),
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        pincode = COALESCE(?, pincode),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [name, phone, gstin, address, city, state, pincode, businessId]);

  // Upsert business_settings table
  run(`
    INSERT INTO business_settings (
      business_id, tax_type, default_tax_rate, enable_cgst_sgst, invoice_prefix,
      invoice_footer, terms_conditions, thermal_printer_width, enable_loyalty,
      loyalty_points_per_100, loyalty_redemption_rate, enable_barcode_scanner,
      exchange_period_days, allow_credit_sales, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(business_id) DO UPDATE SET
      tax_type = excluded.tax_type,
      default_tax_rate = excluded.default_tax_rate,
      enable_cgst_sgst = excluded.enable_cgst_sgst,
      invoice_prefix = excluded.invoice_prefix,
      invoice_footer = excluded.invoice_footer,
      terms_conditions = excluded.terms_conditions,
      thermal_printer_width = excluded.thermal_printer_width,
      enable_loyalty = excluded.enable_loyalty,
      loyalty_points_per_100 = excluded.loyalty_points_per_100,
      loyalty_redemption_rate = excluded.loyalty_redemption_rate,
      enable_barcode_scanner = excluded.enable_barcode_scanner,
      exchange_period_days = excluded.exchange_period_days,
      allow_credit_sales = excluded.allow_credit_sales,
      updated_at = CURRENT_TIMESTAMP
  `, [
    businessId,
    tax_type || 'GST',
    default_tax_rate !== undefined ? parseFloat(default_tax_rate) : 18.0,
    enable_cgst_sgst !== undefined ? (enable_cgst_sgst ? 1 : 0) : 1,
    invoice_prefix || 'INV',
    invoice_footer || 'Thank you for your business!',
    terms_conditions || '',
    thermal_printer_width || '80mm',
    enable_loyalty !== undefined ? (enable_loyalty ? 1 : 0) : 1,
    loyalty_points_per_100 !== undefined ? parseFloat(loyalty_points_per_100) : 1.0,
    loyalty_redemption_rate !== undefined ? parseFloat(loyalty_redemption_rate) : 1.0,
    enable_barcode_scanner !== undefined ? (enable_barcode_scanner ? 1 : 0) : 1,
    exchange_period_days !== undefined ? parseInt(exchange_period_days, 10) : 15,
    allow_credit_sales !== undefined ? (allow_credit_sales ? 1 : 0) : 1
  ]);

  res.json({ success: true, message: 'Store settings saved successfully.' });
});

/**
 * Staff Management Endpoints
 */
router.get('/staff', requireBusinessRole(['Owner', 'Business Administrator', 'Manager']), (req, res) => {
  const staff = all(`
    SELECT u.id, u.name, u.email, u.role, u.branch_id, u.is_active, u.phone, u.last_login_at,
           b.name as branch_name
    FROM business_users u
    LEFT JOIN business_branches b ON u.branch_id = b.id
    WHERE u.business_id = ?
    ORDER BY u.created_at ASC
  `, [req.businessId]);

  res.json({ success: true, data: staff });
});

router.post('/staff', requireBusinessRole(['Owner', 'Business Administrator', 'Manager']), (req, res) => {
  const { name, email, password, pin, role = 'Cashier', branchId, phone } = req.body;
  if (!name || !email) {
    return res.status(400).json({ success: false, message: 'Name and email are required.' });
  }

  const existing = get('SELECT id FROM business_users WHERE business_id = ? AND email = ?', [req.businessId, email.toLowerCase().trim()]);
  if (existing) {
    return res.status(409).json({ success: false, message: 'A staff member with this email already exists.' });
  }

  const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const passwordHash = bcrypt.hashSync(password || 'Staff@2026!', 10);
  const hashedPin = pin ? pin.toString() : '1234';

  run(`
    INSERT INTO business_users (id, business_id, branch_id, name, email, password_hash, pin, role, phone, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `, [userId, req.businessId, branchId || req.branchId, name, email.toLowerCase().trim(), passwordHash, hashedPin, role, phone || null]);

  res.status(201).json({ success: true, message: `Staff member '${name}' added successfully.`, data: { id: userId, name, email, role } });
});

router.put('/staff/:id', requireBusinessRole(['Owner', 'Business Administrator', 'Manager']), (req, res) => {
  const { name, role, branchId, phone, is_active, pin, password } = req.body;
  const staffId = req.params.id;

  const staff = get('SELECT id FROM business_users WHERE id = ? AND business_id = ?', [staffId, req.businessId]);
  if (!staff) {
    return res.status(404).json({ success: false, message: 'Staff member not found.' });
  }

  let updates = [];
  let params = [];

  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (role !== undefined) { updates.push('role = ?'); params.push(role); }
  if (branchId !== undefined) { updates.push('branch_id = ?'); params.push(branchId); }
  if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
  if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }
  if (pin !== undefined && pin.toString().length > 0) { updates.push('pin = ?'); params.push(pin.toString()); }
  if (password && password.length >= 6) { updates.push('password_hash = ?'); params.push(bcrypt.hashSync(password, 10)); }

  if (updates.length > 0) {
    params.push(staffId, req.businessId);
    run(`UPDATE business_users SET ${updates.join(', ')} WHERE id = ? AND business_id = ?`, params);
  }

  res.json({ success: true, message: 'Staff details updated successfully.' });
});

router.delete('/staff/:id', requireBusinessRole(['Owner', 'Business Administrator']), (req, res) => {
  const staffId = req.params.id;
  if (staffId === req.user.id) {
    return res.status(400).json({ success: false, message: 'You cannot deactivate your own account.' });
  }

  run('UPDATE business_users SET is_active = 0 WHERE id = ? AND business_id = ?', [staffId, req.businessId]);
  res.json({ success: true, message: 'Staff access deactivated successfully.' });
});

/**
 * Branch Management Endpoints
 */
router.get('/branches', (req, res) => {
  const branches = all('SELECT * FROM business_branches WHERE business_id = ? ORDER BY is_main DESC, name ASC', [req.businessId]);
  res.json({ success: true, data: branches });
});

router.post('/branches', requireBusinessRole(['Owner', 'Business Administrator']), (req, res) => {
  const { name, code, phone, email, address } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, message: 'Branch name is required.' });
  }

  const branchCode = code || name.slice(0, 3).toUpperCase() + Math.floor(100 + Math.random() * 900);
  const branchId = `branch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  run(`
    INSERT INTO business_branches (id, business_id, name, code, phone, email, address, is_main, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1)
  `, [branchId, req.businessId, name, branchCode, phone || null, email || null, address || null]);

  res.status(201).json({ success: true, message: `Branch '${name}' created successfully.`, data: { id: branchId, name, code: branchCode } });
});

module.exports = router;
