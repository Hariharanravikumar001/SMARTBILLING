'use strict';

const express = require('express');
const router = express.Router();
const { get, run, all } = require('../db');
const { requireBusinessAuth } = require('../middleware/auth');
const { checkSubscriptionActive, checkInvoiceLimit } = require('../middleware/entitlement');
const { createSaleTransaction } = require('../services/posService');

// All POS routes enforce Business Tenant Auth and Subscription Entitlement
router.use(requireBusinessAuth);
router.use(checkSubscriptionActive);

/**
 * Fast POS Product & Barcode Lookup
 */
router.get('/lookup', (req, res) => {
  const { q } = req.query;
  const businessId = req.businessId;
  const branchId = req.branchId;

  if (!q || q.trim().length === 0) {
    // Return top 25 active products for quick POS grid
    const products = all(`
      SELECT p.*, c.name as category_name,
             COALESCE(s.quantity, 0) as current_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN stock s ON (s.product_id = p.id AND s.business_id = p.business_id AND s.branch_id = ?)
      WHERE p.business_id = ? AND p.is_active = 1
      LIMIT 30
    `, [branchId, businessId]);

    return res.json({ success: true, data: products });
  }

  const queryTerm = `%${q.trim()}%`;
  const exactBarcode = q.trim();

  // Search by exact barcode or partial name/SKU
  const products = all(`
    SELECT p.*, c.name as category_name,
           COALESCE(s.quantity, 0) as current_stock
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN stock s ON (s.product_id = p.id AND s.business_id = p.business_id AND s.branch_id = ?)
    WHERE p.business_id = ? AND p.is_active = 1
      AND (p.barcode = ? OR p.sku LIKE ? OR p.name LIKE ?)
    LIMIT 20
  `, [branchId, businessId, exactBarcode, queryTerm, queryTerm]);

  // Also search variants
  const variants = all(`
    SELECT v.*, p.name as parent_product_name, p.tax_rate, p.unit,
           COALESCE(s.quantity, 0) as current_stock
    FROM product_variants v
    JOIN products p ON v.product_id = p.id
    LEFT JOIN stock s ON (s.product_id = p.id AND s.variant_id = v.id AND s.branch_id = ?)
    WHERE v.business_id = ? AND p.is_active = 1
      AND (v.barcode = ? OR v.sku LIKE ? OR v.variant_name LIKE ?)
    LIMIT 20
  `, [branchId, businessId, exactBarcode, queryTerm, queryTerm]);

  res.json({
    success: true,
    data: {
      products,
      variants
    }
  });
});

/**
 * Check Active Shift / Cash Register Status
 */
router.get('/register/active', (req, res) => {
  const active = get(`
    SELECT * FROM cash_registers
    WHERE business_id = ? AND branch_id = ? AND status = 'OPEN'
    ORDER BY opening_time DESC LIMIT 1
  `, [req.businessId, req.branchId]);

  res.json({
    success: true,
    hasActiveShift: Boolean(active),
    data: active || null
  });
});

/**
 * POS Checkout (Atomic Transaction)
 */
router.post('/checkout', checkInvoiceLimit, (req, res) => {
  const {
    items,
    customerId,
    customerName,
    customerPhone,
    invoiceType = 'TAX_INVOICE',
    discountAmount = 0,
    deliveryCharge = 0,
    paymentMethod = 'CASH',
    paymentDetails,
    cashTendered,
    redeemPoints = 0,
    notes = ''
  } = req.body;

  try {
    const saleResult = createSaleTransaction({
      businessId: req.businessId,
      branchId: req.branchId,
      cashierId: req.user.id,
      cashierName: req.user.name,
      customerId,
      customerName,
      customerPhone,
      invoiceType,
      items,
      discountAmount,
      deliveryCharge,
      paymentMethod,
      paymentDetails,
      cashTendered,
      redeemPoints,
      notes
    });

    res.status(201).json({
      success: true,
      message: 'Sale completed successfully.',
      data: saleResult
    });
  } catch (error) {
    console.error('[POS Checkout Error]:', error);
    res.status(400).json({ success: false, message: error.message || 'Checkout failed.' });
  }
});

/**
 * Hold Bill (Park Cart)
 */
router.post('/hold', (req, res) => {
  const { items, customerName, customerPhone, reference } = req.body;
  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Cannot park an empty cart.' });
  }

  const holdId = `hold_${Date.now()}`;
  const ref = reference || `Parked #${Date.now().toString().slice(-4)}`;

  run(`
    INSERT INTO sales (
      id, business_id, branch_id, invoice_no, cashier_id, cashier_name,
      customer_name, customer_phone, subtotal, tax_amount, grand_total,
      payment_method, is_held, hold_reference, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 'CASH', 1, ?, ?)
  `, [
    holdId, req.businessId, req.branchId, `HOLD-${Date.now().toString().slice(-6)}`,
    req.user.id, req.user.name, customerName || null, customerPhone || null,
    ref, JSON.stringify(items)
  ]);

  res.json({ success: true, message: 'Cart held successfully.', holdId, reference: ref });
});

/**
 * List Held Bills
 */
router.get('/held', (req, res) => {
  const heldSales = all(`
    SELECT id, invoice_no, hold_reference, customer_name, customer_phone, notes as items_json, created_at
    FROM sales
    WHERE business_id = ? AND branch_id = ? AND is_held = 1
    ORDER BY created_at DESC
  `, [req.businessId, req.branchId]);

  const formatted = heldSales.map(h => ({
    id: h.id,
    invoiceNo: h.invoice_no,
    reference: h.hold_reference,
    customerName: h.customer_name,
    customerPhone: h.customer_phone,
    items: h.items_json ? JSON.parse(h.items_json) : [],
    createdAt: h.created_at
  }));

  res.json({ success: true, data: formatted });
});

/**
 * Delete / Resume Held Bill
 */
router.delete('/held/:id', (req, res) => {
  run('DELETE FROM sales WHERE id = ? AND business_id = ? AND is_held = 1', [req.params.id, req.businessId]);
  res.json({ success: true, message: 'Held cart removed.' });
});

/**
 * Get Invoice Details for Thermal / A4 Print
 */
router.get('/invoices/:invoiceNo', (req, res) => {
  const sale = get(`
    SELECT * FROM sales
    WHERE business_id = ? AND invoice_no = ?
  `, [req.businessId, req.params.invoiceNo]);

  if (!sale) {
    return res.status(404).json({ success: false, message: 'Invoice not found.' });
  }

  const items = all(`
    SELECT * FROM sale_items
    WHERE sale_id = ?
  `, [sale.id]);

  const branch = get('SELECT * FROM business_branches WHERE id = ?', [sale.branch_id]);
  const settings = get('SELECT * FROM business_settings WHERE business_id = ?', [req.businessId]);

  res.json({
    success: true,
    data: {
      sale,
      items,
      business: req.business,
      branch,
      settings
    }
  });
});

/**
 * List Invoices (with date range & search)
 */
router.get('/invoices', (req, res) => {
  const { search, fromDate, toDate, limit = 50 } = req.query;
  let sql = `
    SELECT id, invoice_no, customer_name, customer_phone, grand_total, payment_method, payment_status, created_at
    FROM sales
    WHERE business_id = ? AND is_held = 0
  `;
  const params = [req.businessId];

  if (fromDate) {
    sql += ` AND created_at >= ?`;
    params.push(fromDate);
  }
  if (toDate) {
    sql += ` AND created_at <= ?`;
    params.push(toDate);
  }
  if (search) {
    sql += ` AND (invoice_no LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ?)`;
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  sql += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(parseInt(limit, 10));

  const sales = all(sql, params);
  res.json({ success: true, data: sales });
});

module.exports = router;
