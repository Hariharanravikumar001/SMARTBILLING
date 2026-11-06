'use strict';

const express = require('express');
const router = express.Router();
const { get, run, all, withTransaction } = require('../db');
const { requireBusinessAuth } = require('../middleware/auth');

router.use(requireBusinessAuth);

function getNextReturnNumber(businessId) {
  const currentYear = new Date().getFullYear();
  const prefix = `RET-${currentYear}-`;
  const latest = get(`
    SELECT return_no FROM sales_returns
    WHERE business_id = ? AND return_no LIKE ?
    ORDER BY return_no DESC LIMIT 1
  `, [businessId, `${prefix}%`]);

  let nextSequence = 1;
  if (latest && latest.return_no) {
    const parts = latest.return_no.split('-');
    if (parts.length === 3) {
      const parsed = parseInt(parts[2], 10);
      if (!isNaN(parsed)) nextSequence = parsed + 1;
    }
  }
  return `${prefix}${nextSequence.toString().padStart(4, '0')}`;
}

/**
 * Get Recent Sales Returns
 */
router.get('/', (req, res) => {
  const { branchId, search } = req.query;
  const targetBranch = branchId || req.branchId;

  let sql = `
    SELECT r.*,
           (SELECT COUNT(*) FROM sales_return_items WHERE return_id = r.id) as item_count
    FROM sales_returns r
    WHERE r.business_id = ?
  `;
  const params = [req.businessId];

  if (targetBranch) {
    sql += ` AND r.branch_id = ?`;
    params.push(targetBranch);
  }

  if (search) {
    sql += ` AND (r.return_no LIKE ? OR r.original_invoice_no LIKE ? OR r.customer_name LIKE ?)`;
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  sql += ` ORDER BY r.created_at DESC LIMIT 50`;

  const returns = all(sql, params);
  res.json({ success: true, data: returns });
});

/**
 * Get Return Details by ID
 */
router.get('/:id', (req, res) => {
  const returnRecord = get('SELECT * FROM sales_returns WHERE id = ? AND business_id = ?', [req.params.id, req.businessId]);
  if (!returnRecord) {
    return res.status(404).json({ success: false, message: 'Return record not found.' });
  }

  const items = all('SELECT * FROM sales_return_items WHERE return_id = ? AND business_id = ?', [returnRecord.id, req.businessId]);
  res.json({ success: true, data: { ...returnRecord, items } });
});

/**
 * Process Sales Return (Cash Refund or Credit Note)
 */
router.post('/', (req, res) => {
  const {
    invoiceNo,
    returnedItems = [],
    refundMethod = 'CASH', // 'CASH', 'UPI', 'CREDIT_NOTE'
    reason = 'Customer Return'
  } = req.body;

  if (!invoiceNo) {
    return res.status(400).json({ success: false, message: 'Original Invoice number is required.' });
  }

  if (!Array.isArray(returnedItems) || returnedItems.length === 0) {
    return res.status(400).json({ success: false, message: 'At least one item must be selected for return.' });
  }

  try {
    const result = withTransaction((db) => {
      // 1. Fetch original sale
      const sale = get('SELECT * FROM sales WHERE invoice_no = ? AND business_id = ?', [invoiceNo.trim(), req.businessId]);
      if (!sale) {
        throw new Error(`Original Invoice '${invoiceNo}' not found in your business records.`);
      }

      // 2. Validate items
      let totalRefund = 0;
      const validatedItems = [];

      for (const item of returnedItems) {
        const saleItem = item.saleItemId
          ? get('SELECT * FROM sale_items WHERE id = ? AND sale_id = ? AND business_id = ?', [item.saleItemId, sale.id, req.businessId])
          : get('SELECT * FROM sale_items WHERE sale_id = ? AND product_id = ? AND business_id = ?', [sale.id, item.productId, req.businessId]);

        if (!saleItem) {
          throw new Error(`Item was not found in original invoice ${invoiceNo}.`);
        }

        const qty = parseFloat(item.quantity) || 1;
        if (qty > saleItem.quantity) {
          throw new Error(`Return quantity (${qty}) exceeds purchased quantity (${saleItem.quantity}) for ${saleItem.product_name}.`);
        }

        const itemRefund = (qty * saleItem.unit_price) + (qty * (saleItem.tax_amount / saleItem.quantity));
        const itemRefundRounded = Math.round(itemRefund * 100) / 100;
        totalRefund += itemRefundRounded;

        validatedItems.push({
          saleItemId: saleItem.id,
          productId: saleItem.product_id,
          variantId: saleItem.variant_id,
          productName: saleItem.product_name,
          quantity: qty,
          unitPrice: saleItem.unit_price,
          refundAmount: itemRefundRounded,
          condition: item.condition || 'GOOD'
        });
      }

      const returnNo = getNextReturnNumber(req.businessId);
      const returnId = `ret_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const branchId = req.branchId || sale.branch_id;

      // 3. Insert into sales_returns
      run(`
        INSERT INTO sales_returns (
          id, business_id, branch_id, return_no, original_sale_id, original_invoice_no,
          customer_id, customer_name, cashier_id, total_refund_amount, refund_method,
          reason, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        returnId, req.businessId, branchId, returnNo, sale.id, sale.invoice_no,
        sale.customer_id, sale.customer_name, req.user?.id, totalRefund, refundMethod,
        reason
      ]);

      // 4. Insert items and restock if GOOD
      for (const vItem of validatedItems) {
        const retItemId = `ri_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        run(`
          INSERT INTO sales_return_items (
            id, return_id, business_id, product_id, variant_id, product_name,
            quantity, unit_price, refund_amount, restock_condition, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [
          retItemId, returnId, req.businessId, vItem.productId, vItem.variantId || null,
          vItem.productName, vItem.quantity, vItem.unitPrice, vItem.refundAmount, vItem.condition
        ]);

        if (vItem.condition === 'GOOD') {
          // Increment stock
          const stockRow = get(`
            SELECT id, quantity FROM stock
            WHERE business_id = ? AND branch_id = ? AND product_id = ? AND (variant_id = ? OR (variant_id IS NULL AND ? IS NULL))
          `, [req.businessId, branchId, vItem.productId, vItem.variantId || null, vItem.variantId || null]);

          const curQty = stockRow ? stockRow.quantity : 0;
          const newQty = curQty + vItem.quantity;

          if (stockRow) {
            run('UPDATE stock SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newQty, stockRow.id]);
          } else {
            const stockId = `stock_${req.businessId}_${branchId}_${vItem.productId}_${vItem.variantId || 'base'}`;
            run(`
              INSERT INTO stock (id, business_id, branch_id, product_id, variant_id, quantity)
              VALUES (?, ?, ?, ?, ?, ?)
            `, [stockId, req.businessId, branchId, vItem.productId, vItem.variantId || null, newQty]);
          }

          run(`
            INSERT INTO stock_movements (
              id, business_id, branch_id, product_id, variant_id, change_qty,
              balance_qty, type, reason, ref_id, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'RETURN', ?, ?, ?)
          `, [
            `sm_${Date.now()}_ret`, req.businessId, branchId, vItem.productId, vItem.variantId || null,
            vItem.quantity, newQty, `Return ${returnNo}`, returnId, req.user?.name || 'Cashier'
          ]);
        }
      }

      // 5. Cash Register movement if CASH refund
      if (refundMethod === 'CASH') {
        const activeRegister = get('SELECT id FROM cash_registers WHERE business_id = ? AND branch_id = ? AND status = "OPEN" LIMIT 1', [req.businessId, branchId]);
        if (activeRegister) {
          run(`
            INSERT INTO cash_movements (id, register_id, business_id, type, amount, reason, created_at)
            VALUES (?, ?, ?, 'PAY_OUT', ?, ?, CURRENT_TIMESTAMP)
          `, [`cm_${Date.now()}`, activeRegister.id, req.businessId, -totalRefund, `Cash refund for Return ${returnNo}`]);
        }
      }

      return {
        returnId,
        returnNo,
        totalRefund,
        refundMethod,
        originalInvoiceNo: sale.invoice_no
      };
    });

    res.status(201).json({ success: true, message: `Return ${result.returnNo} processed successfully.`, data: result });
  } catch (error) {
    console.error('[Return Process Error]:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
