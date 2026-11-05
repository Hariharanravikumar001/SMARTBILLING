'use strict';

const { withTransaction, get, run, all } = require('../db');

/**
 * Generate sequential exchange number scoped to business
 * Example: EXCH-2026-0001
 */
function getNextExchangeNumber(businessId) {
  const currentYear = new Date().getFullYear();
  const pattern = `EXCH-${currentYear}-%`;

  const lastExch = get(`
    SELECT exchange_no FROM exchanges
    WHERE business_id = ? AND exchange_no LIKE ?
    ORDER BY created_at DESC, rowid DESC
    LIMIT 1
  `, [businessId, pattern]);

  let nextSequence = 1;
  if (lastExch && lastExch.exchange_no) {
    const parts = lastExch.exchange_no.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) {
      nextSequence = lastSeq + 1;
    }
  }

  return `EXCH-${currentYear}-${String(nextSequence).padStart(4, '0')}`;
}

/**
 * Atomic Product Exchange Execution
 */
function processExchangeTransaction({
  businessId,
  branchId,
  cashierId,
  cashierName,
  originalInvoiceNo,
  returnedItems = [], // [{ saleItemId, productId, variantId, quantity, unitPrice, condition: 'GOOD'|'DEFECTIVE' }]
  replacementItems = [], // [{ productId, variantId, quantity, unitPrice, taxRate }]
  paymentMethod = 'CASH', // for collecting difference if replacement > return
  reason = 'Exchange request',
  notes = ''
}) {
  if (!originalInvoiceNo) {
    throw new Error('Original invoice number is required for an exchange.');
  }

  if (!returnedItems || returnedItems.length === 0) {
    throw new Error('At least one item must be selected for return/exchange.');
  }

  if (!replacementItems || replacementItems.length === 0) {
    throw new Error('At least one replacement item must be selected.');
  }

  return withTransaction((db) => {
    // 1. Fetch & lock original sale
    const sale = get(`
      SELECT * FROM sales WHERE business_id = ? AND invoice_no = ?
    `, [businessId, originalInvoiceNo]);

    if (!sale) {
      throw new Error(`Original invoice '${originalInvoiceNo}' not found.`);
    }

    // Check exchange policy validity
    const settings = get('SELECT exchange_period_days FROM business_settings WHERE business_id = ?', [businessId]);
    const maxDays = (settings && settings.exchange_period_days) || 15;
    const saleDate = new Date(sale.created_at);
    const diffDays = Math.ceil((new Date() - saleDate) / (1000 * 60 * 60 * 24));

    if (diffDays > maxDays) {
      throw new Error(`Exchange period expired. Invoice is ${diffDays} days old (Allowed limit: ${maxDays} days).`);
    }

    // 2. Validate and calculate Returned Items Total
    let returnSubtotal = 0;
    const validatedReturns = [];

    for (const rItem of returnedItems) {
      const originalSaleItem = get(`
        SELECT * FROM sale_items WHERE sale_id = ? AND product_id = ? AND business_id = ?
      `, [sale.id, rItem.productId, businessId]);

      if (!originalSaleItem) {
        throw new Error(`Item ${rItem.productName || rItem.productId} was not part of the original invoice.`);
      }

      const qty = parseFloat(rItem.quantity) || 1;
      if (qty > originalSaleItem.quantity) {
        throw new Error(`Return quantity (${qty}) exceeds original purchased quantity (${originalSaleItem.quantity}).`);
      }

      const unitPrice = parseFloat(rItem.unitPrice || originalSaleItem.unit_price);
      const taxRate = parseFloat(originalSaleItem.tax_rate) || 0;
      const rawAmount = qty * unitPrice;
      const taxAmount = (rawAmount * taxRate) / 100;
      const totalAmount = rawAmount + taxAmount;

      returnSubtotal += totalAmount;

      validatedReturns.push({
        productId: originalSaleItem.product_id,
        variantId: originalSaleItem.variant_id,
        productName: originalSaleItem.product_name,
        sku: originalSaleItem.sku,
        quantity: qty,
        unitPrice,
        taxRate,
        taxAmount,
        totalAmount,
        condition: rItem.condition || 'GOOD' // 'GOOD' or 'DEFECTIVE'
      });
    }

    // 3. Validate and calculate Replacement Items Total
    let replacementSubtotal = 0;
    const validatedReplacements = [];

    for (const repItem of replacementItems) {
      const product = get(`
        SELECT id, name, sku, selling_price, tax_rate, unit
        FROM products WHERE id = ? AND business_id = ?
      `, [repItem.productId, businessId]);

      if (!product) {
        throw new Error(`Replacement product '${repItem.productId}' not found in catalog.`);
      }

      const qty = parseFloat(repItem.quantity) || 1;
      const unitPrice = parseFloat(repItem.unitPrice !== undefined ? repItem.unitPrice : product.selling_price);
      const taxRate = parseFloat(repItem.taxRate !== undefined ? repItem.taxRate : (product.tax_rate || 0));
      const rawAmount = qty * unitPrice;
      const taxAmount = (rawAmount * taxRate) / 100;
      const totalAmount = rawAmount + taxAmount;

      replacementSubtotal += totalAmount;

      // Check stock availability for replacement
      const currentStock = get(`
        SELECT quantity FROM stock
        WHERE business_id = ? AND branch_id = ? AND product_id = ? AND (variant_id = ? OR (variant_id IS NULL AND ? IS NULL))
      `, [businessId, branchId, product.id, repItem.variantId || null, repItem.variantId || null]);

      const availableQty = currentStock ? currentStock.quantity : 0;
      if (availableQty < qty) {
        throw new Error(`Insufficient stock for replacement product '${product.name}'. Available: ${availableQty}, Requested: ${qty}`);
      }

      validatedReplacements.push({
        productId: product.id,
        variantId: repItem.variantId || null,
        productName: product.name,
        sku: product.sku,
        quantity: qty,
        unitPrice,
        taxRate,
        taxAmount,
        totalAmount,
        availableQty,
        newStockQty: availableQty - qty
      });
    }

    // 4. Calculate Differential
    // diffAmount > 0 => Customer pays difference
    // diffAmount < 0 => Store refunds difference
    // diffAmount = 0 => Even exchange
    const returnTotalRounded = Math.round(returnSubtotal * 100) / 100;
    const replacementTotalRounded = Math.round(replacementSubtotal * 100) / 100;
    const diffAmount = Math.round((replacementTotalRounded - returnTotalRounded) * 100) / 100;

    const exchangeNo = getNextExchangeNumber(businessId);
    const exchangeId = `exch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 5. Check active Cash Register if cash differential collection or refund is needed
    let activeRegisterId = null;
    if (diffAmount !== 0 && paymentMethod === 'CASH') {
      const activeReg = get(`
        SELECT id FROM cash_registers
        WHERE business_id = ? AND branch_id = ? AND status = 'OPEN'
        ORDER BY opening_time DESC LIMIT 1
      `, [businessId, branchId]);
      if (activeReg) {
        activeRegisterId = activeReg.id;
      }
    }

    // 6. Insert Exchange Record
    run(`
      INSERT INTO exchanges (
        id, business_id, branch_id, exchange_no, original_sale_id, original_invoice_no,
        customer_id, customer_name, customer_phone, cashier_id, cashier_name,
        return_subtotal, replacement_subtotal, diff_amount, payment_method, payment_status,
        cash_register_id, reason, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      exchangeId, businessId, branchId, exchangeNo, sale.id, originalInvoiceNo,
      sale.customer_id, sale.customer_name, sale.customer_phone, cashierId, cashierName,
      returnTotalRounded, replacementTotalRounded, diffAmount, paymentMethod, 'COMPLETED',
      activeRegisterId, reason, notes
    ]);

    // 7. Insert Exchange Items & Perform Atomic Stock Adjustments
    const insertExchItemStmt = db.prepare(`
      INSERT INTO exchange_items (
        id, exchange_id, business_id, item_type, product_id, variant_id, product_name,
        sku, quantity, unit_price, tax_rate, tax_amount, total_amount, condition
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // A. Process Returned Items -> Increment stock if GOOD, or mark DEFECTIVE
    for (let i = 0; i < validatedReturns.length; i++) {
      const r = validatedReturns[i];
      insertExchItemStmt.run(
        `${exchangeId}_ret_${i + 1}`, exchangeId, businessId, 'RETURN', r.productId,
        r.variantId, r.productName, r.sku, r.quantity, r.unitPrice, r.taxRate,
        r.taxAmount, r.totalAmount, r.condition
      );

      if (r.condition === 'GOOD') {
        // Return item to shelf inventory
        const stockRow = get(`
          SELECT quantity FROM stock
          WHERE business_id = ? AND branch_id = ? AND product_id = ? AND (variant_id = ? OR (variant_id IS NULL AND ? IS NULL))
        `, [businessId, branchId, r.productId, r.variantId || null, r.variantId || null]);

        const curQty = stockRow ? stockRow.quantity : 0;
        const newQty = curQty + r.quantity;

        const stockUpdate = run(`
          UPDATE stock
          SET quantity = ?, updated_at = CURRENT_TIMESTAMP
          WHERE business_id = ? AND branch_id = ? AND product_id = ? AND (variant_id = ? OR (variant_id IS NULL AND ? IS NULL))
        `, [newQty, businessId, branchId, r.productId, r.variantId || null, r.variantId || null]);

        if (stockUpdate.changes === 0) {
          const stockId = `stock_${businessId}_${branchId}_${r.productId}_${r.variantId || 'base'}`;
          run(`
            INSERT INTO stock (id, business_id, branch_id, product_id, variant_id, quantity)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [stockId, businessId, branchId, r.productId, r.variantId || null, newQty]);
        }

        run(`
          INSERT INTO stock_movements (id, business_id, branch_id, product_id, variant_id, change_qty, balance_qty, type, reason, ref_id, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [`sm_${Date.now()}_r${i}`, businessId, branchId, r.productId, r.variantId, r.quantity, newQty, 'EXCHANGE_IN', `Exchange ${exchangeNo} (Restocked)`, exchangeId, cashierName]);
      } else {
        // Defective goods: record quarantine stock movement without putting back into sellable shelf inventory
        run(`
          INSERT INTO stock_movements (id, business_id, branch_id, product_id, variant_id, change_qty, balance_qty, type, reason, ref_id, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [`sm_${Date.now()}_d${i}`, businessId, branchId, r.productId, r.variantId, 0, 0, 'DEFECTIVE', `Exchange ${exchangeNo} (Defective Quarantine)`, exchangeId, cashierName]);
      }
    }

    // B. Process Replacement Items -> Decrement stock
    for (let j = 0; j < validatedReplacements.length; j++) {
      const rep = validatedReplacements[j];
      insertExchItemStmt.run(
        `${exchangeId}_rep_${j + 1}`, exchangeId, businessId, 'REPLACEMENT', rep.productId,
        rep.variantId, rep.productName, rep.sku, rep.quantity, rep.unitPrice, rep.taxRate,
        rep.taxAmount, rep.totalAmount, 'GOOD'
      );

      const repStockUpdate = run(`
        UPDATE stock
        SET quantity = ?, updated_at = CURRENT_TIMESTAMP
        WHERE business_id = ? AND branch_id = ? AND product_id = ? AND (variant_id = ? OR (variant_id IS NULL AND ? IS NULL))
      `, [rep.newStockQty, businessId, branchId, rep.productId, rep.variantId || null, rep.variantId || null]);

      if (repStockUpdate.changes === 0) {
        const stockId = `stock_${businessId}_${branchId}_${rep.productId}_${rep.variantId || 'base'}`;
        run(`
          INSERT INTO stock (id, business_id, branch_id, product_id, variant_id, quantity)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [stockId, businessId, branchId, rep.productId, rep.variantId || null, rep.newStockQty]);
      }

      run(`
        INSERT INTO stock_movements (id, business_id, branch_id, product_id, variant_id, change_qty, balance_qty, type, reason, ref_id, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [`sm_${Date.now()}_p${j}`, businessId, branchId, rep.productId, rep.variantId, -rep.quantity, rep.newStockQty, 'EXCHANGE_OUT', `Exchange ${exchangeNo} (Replacement issued)`, exchangeId, cashierName]);
    }

    // 8. Record Cash Movement if applicable
    if (activeRegisterId && diffAmount !== 0) {
      if (diffAmount > 0) {
        // Customer paid extra cash
        run(`
          INSERT INTO cash_movements (id, register_id, business_id, type, amount, reason)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [`cm_${Date.now()}_ex`, activeRegisterId, businessId, 'EXCHANGE_COLLECT', diffAmount, `Exchange ${exchangeNo} additional collection`]);
      } else {
        // Store refunded cash
        run(`
          INSERT INTO cash_movements (id, register_id, business_id, type, amount, reason)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [`cm_${Date.now()}_ex`, activeRegisterId, businessId, 'EXCHANGE_REFUND', Math.abs(diffAmount), `Exchange ${exchangeNo} customer refund`]);
      }
    }

    // 9. Central Audit Log
    run(`
      INSERT INTO audit_logs (id, business_id, actor_type, actor_id, actor_name, action, resource, resource_id, details)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      `log_${Date.now()}`, businessId, 'BUSINESS_USER', cashierId, cashierName, 'PROCESS_EXCHANGE',
      'exchanges', exchangeId, JSON.stringify({ exchangeNo, originalInvoiceNo, returnTotal: returnTotalRounded, replacementTotal: replacementTotalRounded, diffAmount })
    ]);

    return {
      success: true,
      exchangeId,
      exchangeNo,
      originalInvoiceNo,
      returnTotal: returnTotalRounded,
      replacementTotal: replacementTotalRounded,
      diffAmount, // Positive = collection, Negative = refund, Zero = even
      actionType: diffAmount > 0 ? 'COLLECT_DIFFERENCE' : (diffAmount < 0 ? 'REFUND_DIFFERENCE' : 'EVEN_EXCHANGE'),
      paymentMethod,
      createdAt: new Date().toISOString()
    };
  });
}

module.exports = {
  getNextExchangeNumber,
  processExchangeTransaction
};
