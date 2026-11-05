'use strict';

const express = require('express');
const router = express.Router();
const { get, run, all, withTransaction } = require('../db');
const { requireBusinessAuth } = require('../middleware/auth');
const { checkSubscriptionActive } = require('../middleware/entitlement');

router.use(requireBusinessAuth);
router.use(checkSubscriptionActive);

/**
 * Get branch stock overview
 */
router.get('/stock', (req, res) => {
  const { branchId, search } = req.query;
  const targetBranch = branchId || req.branchId;

  let sql = `
    SELECT s.*, p.name as product_name, p.sku, p.barcode, p.purchase_price, p.selling_price,
           p.min_stock_alert, c.name as category_name, v.variant_name
    FROM stock s
    JOIN products p ON s.product_id = p.id
    LEFT JOIN product_variants v ON s.variant_id = v.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE s.business_id = ? AND s.branch_id = ?
  `;
  const params = [req.businessId, targetBranch];

  if (search) {
    sql += ` AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)`;
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  sql += ` ORDER BY p.name ASC`;
  const items = all(sql, params);
  res.json({ success: true, data: items });
});

/**
 * Stock Movements Ledger
 */
router.get('/movements', (req, res) => {
  const { limit = 50, productId } = req.query;
  let sql = `
    SELECT sm.*, p.name as product_name, p.sku, b.name as branch_name
    FROM stock_movements sm
    JOIN products p ON sm.product_id = p.id
    JOIN business_branches b ON sm.branch_id = b.id
    WHERE sm.business_id = ?
  `;
  const params = [req.businessId];

  if (productId) {
    sql += ` AND sm.product_id = ?`;
    params.push(productId);
  }

  sql += ` ORDER BY sm.created_at DESC LIMIT ?`;
  params.push(parseInt(limit, 10));

  const movements = all(sql, params);
  res.json({ success: true, data: movements });
});

/**
 * Stock Adjustment (Manual correction, damage, audit count)
 */
router.post('/adjust', (req, res) => {
  const { productId, variantId, branchId, adjustmentQty, reason = 'Inventory audit count' } = req.body;
  if (!productId || adjustmentQty === undefined) {
    return res.status(400).json({ success: false, message: 'Product ID and adjustment quantity are required.' });
  }

  const targetBranch = branchId || req.branchId;
  const adj = parseFloat(adjustmentQty);

  const result = withTransaction((db) => {
    const stockRow = get(`
      SELECT quantity FROM stock
      WHERE business_id = ? AND branch_id = ? AND product_id = ? AND (variant_id = ? OR (variant_id IS NULL AND ? IS NULL))
    `, [req.businessId, targetBranch, productId, variantId || null, variantId || null]);

    const currentQty = stockRow ? stockRow.quantity : 0;
    const newQty = currentQty + adj;

    const stockId = `stock_${req.businessId}_${targetBranch}_${productId}_${variantId || 'base'}`;
    run(`
      INSERT INTO stock (id, business_id, branch_id, product_id, variant_id, quantity)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET quantity = excluded.quantity, updated_at = CURRENT_TIMESTAMP
    `, [stockId, req.businessId, targetBranch, productId, variantId || null, newQty]);

    const movementId = `sm_${Date.now()}`;
    run(`
      INSERT INTO stock_movements (
        id, business_id, branch_id, product_id, variant_id, change_qty, balance_qty,
        type, reason, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ADJUSTMENT', ?, ?)
    `, [movementId, req.businessId, targetBranch, productId, variantId || null, adj, newQty, reason, req.user.name]);

    return { newQty, changeQty: adj };
  });

  res.json({ success: true, message: 'Stock adjusted successfully.', data: result });
});

/**
 * Branch-to-Branch Stock Transfer
 */
router.post('/transfer', (req, res) => {
  const { fromBranchId, toBranchId, productId, variantId, quantity, notes } = req.body;
  const qty = parseFloat(quantity);
  if (!fromBranchId || !toBranchId || !productId || !qty || qty <= 0) {
    return res.status(400).json({ success: false, message: 'Source branch, destination branch, product, and positive quantity are required.' });
  }

  if (fromBranchId === toBranchId) {
    return res.status(400).json({ success: false, message: 'Source and destination branches cannot be identical.' });
  }

  const result = withTransaction((db) => {
    // 1. Check source stock
    const sourceStock = get(`
      SELECT quantity FROM stock
      WHERE business_id = ? AND branch_id = ? AND product_id = ? AND (variant_id = ? OR (variant_id IS NULL AND ? IS NULL))
    `, [req.businessId, fromBranchId, productId, variantId || null, variantId || null]);

    const curSourceQty = sourceStock ? sourceStock.quantity : 0;
    if (curSourceQty < qty) {
      throw new Error(`Insufficient stock in source branch. Available: ${curSourceQty}, Requested: ${qty}`);
    }

    const newSourceQty = curSourceQty - qty;

    // 2. Decrement source branch stock
    const sourceStockId = `stock_${req.businessId}_${fromBranchId}_${productId}_${variantId || 'base'}`;
    run(`
      INSERT INTO stock (id, business_id, branch_id, product_id, variant_id, quantity)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET quantity = excluded.quantity, updated_at = CURRENT_TIMESTAMP
    `, [sourceStockId, req.businessId, fromBranchId, productId, variantId || null, newSourceQty]);

    run(`
      INSERT INTO stock_movements (id, business_id, branch_id, product_id, variant_id, change_qty, balance_qty, type, reason, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'TRANSFER', ?, ?)
    `, [`sm_${Date.now()}_out`, req.businessId, fromBranchId, productId, variantId || null, -qty, newSourceQty, `Transfer OUT to branch ${toBranchId}`, req.user.name]);

    // 3. Increment destination branch stock
    const destStock = get(`
      SELECT quantity FROM stock
      WHERE business_id = ? AND branch_id = ? AND product_id = ? AND (variant_id = ? OR (variant_id IS NULL AND ? IS NULL))
    `, [req.businessId, toBranchId, productId, variantId || null, variantId || null]);

    const curDestQty = destStock ? destStock.quantity : 0;
    const newDestQty = curDestQty + qty;

    const destStockId = `stock_${req.businessId}_${toBranchId}_${productId}_${variantId || 'base'}`;
    run(`
      INSERT INTO stock (id, business_id, branch_id, product_id, variant_id, quantity)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET quantity = excluded.quantity, updated_at = CURRENT_TIMESTAMP
    `, [destStockId, req.businessId, toBranchId, productId, variantId || null, newDestQty]);

    run(`
      INSERT INTO stock_movements (id, business_id, branch_id, product_id, variant_id, change_qty, balance_qty, type, reason, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'TRANSFER', ?, ?)
    `, [`sm_${Date.now()}_in`, req.businessId, toBranchId, productId, variantId || null, qty, newDestQty, `Transfer IN from branch ${fromBranchId}`, req.user.name]);

    return { transferredQty: qty, fromBranchId, toBranchId };
  });

  res.json({ success: true, message: 'Stock transferred successfully.', data: result });
});

/**
 * Stock Valuation & Summary
 */
router.get('/valuation', (req, res) => {
  const row = get(`
    SELECT
      COUNT(DISTINCT s.product_id) as total_products,
      COALESCE(SUM(s.quantity), 0) as total_units,
      COALESCE(SUM(s.quantity * p.purchase_price), 0) as total_cost_valuation,
      COALESCE(SUM(s.quantity * p.selling_price), 0) as total_retail_valuation
    FROM stock s
    JOIN products p ON s.product_id = p.id
    WHERE s.business_id = ?
  `, [req.businessId]);

  res.json({
    success: true,
    data: {
      totalProducts: row.total_products,
      totalUnits: Math.round(row.total_units),
      costValuation: Math.round(row.total_cost_valuation * 100) / 100,
      retailValuation: Math.round(row.total_retail_valuation * 100) / 100,
      potentialProfit: Math.round((row.total_retail_valuation - row.total_cost_valuation) * 100) / 100
    }
  });
});

module.exports = router;
