'use strict';

const express = require('express');
const router = express.Router();
const { get, run, all, withTransaction } = require('../db');
const { requireBusinessAuth } = require('../middleware/auth');
const { checkSubscriptionActive } = require('../middleware/entitlement');

router.use(requireBusinessAuth);
router.use(checkSubscriptionActive);

/**
 * List Suppliers
 */
router.get('/', (req, res) => {
  const suppliers = all('SELECT * FROM suppliers WHERE business_id = ? ORDER BY name ASC', [req.businessId]);
  res.json({ success: true, data: suppliers });
});

/**
 * Create Supplier
 */
router.post('/', (req, res) => {
  const { name, company_name, gstin, phone, email, address } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Supplier name is required.' });

  const id = `supp_${Date.now()}`;
  run(`
    INSERT INTO suppliers (id, business_id, name, company_name, gstin, phone, email, address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, req.businessId, name, company_name || null, gstin || null, phone || null, email || null, address || null]);

  res.status(201).json({ success: true, data: { id, name } });
});

/**
 * List Purchases
 */
router.get('/purchases', (req, res) => {
  const purchases = all(`
    SELECT p.*, s.name as supplier_name
    FROM purchases p
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    WHERE p.business_id = ?
    ORDER BY p.purchase_date DESC, p.created_at DESC
    LIMIT 100
  `, [req.businessId]);
  res.json({ success: true, data: purchases });
});

/**
 * Create Purchase Invoice (Atomic Stock-In & Ledger Entry)
 */
router.post('/purchases', (req, res) => {
  const {
    supplierId,
    supplierInvoiceNo,
    purchaseDate,
    items = [], // [{ productId, variantId, quantity, purchasePrice, taxRate }]
    paidAmount = 0,
    paymentMethod = 'BANK_TRANSFER',
    notes = ''
  } = req.body;

  if (!supplierId || !items || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Supplier and at least 1 item are required.' });
  }

  const result = withTransaction((db) => {
    let subtotal = 0;
    let taxTotal = 0;

    for (const item of items) {
      const qty = parseFloat(item.quantity) || 1;
      const price = parseFloat(item.purchasePrice) || 0;
      const taxRate = parseFloat(item.taxRate) || 0;
      const rawTotal = qty * price;
      const taxAmount = (rawTotal * taxRate) / 100;
      subtotal += rawTotal;
      taxTotal += taxAmount;
    }

    const totalAmount = Math.round((subtotal + taxTotal) * 100) / 100;
    const paid = parseFloat(paidAmount) || 0;
    const balance = Math.round((totalAmount - paid) * 100) / 100;
    const paymentStatus = balance <= 0 ? 'PAID' : (paid > 0 ? 'PARTIAL' : 'DUE');

    const purchaseId = `pur_${Date.now()}`;

    // 1. Insert Purchase Record
    run(`
      INSERT INTO purchases (
        id, business_id, branch_id, supplier_id, supplier_invoice_no, purchase_date,
        subtotal, tax_amount, total_amount, paid_amount, balance_amount, payment_status,
        payment_method, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      purchaseId, req.businessId, req.branchId, supplierId, supplierInvoiceNo || null,
      purchaseDate || new Date().toISOString().split('T')[0], subtotal, taxTotal,
      totalAmount, paid, balance, paymentStatus, paymentMethod, notes
    ]);

    // 2. Insert Items & Increment Stock
    for (const item of items) {
      const product = get('SELECT id, name FROM products WHERE id = ? AND business_id = ?', [item.productId, req.businessId]);
      if (!product) continue;

      const qty = parseFloat(item.quantity) || 1;
      const price = parseFloat(item.purchasePrice) || 0;
      const taxRate = parseFloat(item.taxRate) || 0;
      const lineTotal = (qty * price) + ((qty * price * taxRate) / 100);

      run(`
        INSERT INTO purchase_items (id, purchase_id, business_id, product_id, variant_id, product_name, quantity, purchase_price, tax_rate, total_amount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [`pi_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, purchaseId, req.businessId, product.id, item.variantId || null, product.name, qty, price, taxRate, lineTotal]);

      // Update stock
      const stockRow = get(`
        SELECT quantity FROM stock
        WHERE business_id = ? AND branch_id = ? AND product_id = ? AND (variant_id = ? OR (variant_id IS NULL AND ? IS NULL))
      `, [req.businessId, req.branchId, product.id, item.variantId || null, item.variantId || null]);

      const curQty = stockRow ? stockRow.quantity : 0;
      const newQty = curQty + qty;

      const stockId = `stock_${req.businessId}_${req.branchId}_${product.id}_${item.variantId || 'base'}`;
      run(`
        INSERT INTO stock (id, business_id, branch_id, product_id, variant_id, quantity)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET quantity = excluded.quantity, updated_at = CURRENT_TIMESTAMP
      `, [stockId, req.businessId, req.branchId, product.id, item.variantId || null, newQty]);

      run(`
        INSERT INTO stock_movements (id, business_id, branch_id, product_id, variant_id, change_qty, balance_qty, type, reason, ref_id, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'PURCHASE', ?, ?, ?)
      `, [`sm_${Date.now()}_pur`, req.businessId, req.branchId, product.id, item.variantId || null, qty, newQty, `Purchase Invoice ${supplierInvoiceNo || purchaseId}`, purchaseId, req.user.name]);
    }

    // 3. Update Supplier Payable Balance if unpaid amount
    if (balance > 0) {
      run('UPDATE suppliers SET outstanding_payable = outstanding_payable + ? WHERE id = ?', [balance, supplierId]);
    }

    return { purchaseId, totalAmount, balance };
  });

  res.status(201).json({ success: true, message: 'Purchase recorded and stock updated.', data: result });
});

module.exports = router;
