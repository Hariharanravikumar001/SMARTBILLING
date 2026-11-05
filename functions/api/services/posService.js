'use strict';

const { withTransaction, get, run, all } = require('../db');

/**
 * Generate sequential invoice number scoped to the business and current year
 * Example: INV-2026-0001
 */
function getNextInvoiceNumber(businessId, prefix = 'INV') {
  const currentYear = new Date().getFullYear();
  const pattern = `${prefix}-${currentYear}-%`;

  const lastInvoice = get(`
    SELECT invoice_no FROM sales
    WHERE business_id = ? AND invoice_no LIKE ?
    ORDER BY created_at DESC, rowid DESC
    LIMIT 1
  `, [businessId, pattern]);

  let nextSequence = 1;
  if (lastInvoice && lastInvoice.invoice_no) {
    const parts = lastInvoice.invoice_no.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) {
      nextSequence = lastSeq + 1;
    }
  }

  return `${prefix}-${currentYear}-${String(nextSequence).padStart(4, '0')}`;
}

/**
 * Atomic Checkout: creates sale, items, updates stock, records movements, cash register
 */
function createSaleTransaction({
  businessId,
  branchId,
  cashierId,
  cashierName,
  customerId,
  customerName,
  customerPhone,
  invoiceType = 'TAX_INVOICE',
  items = [],
  discountAmount = 0,
  deliveryCharge = 0,
  paymentMethod = 'CASH',
  paymentDetails = null,
  cashTendered = 0,
  redeemPoints = 0,
  notes = ''
}) {
  if (!items || items.length === 0) {
    throw new Error('Cannot checkout an empty cart. At least 1 item is required.');
  }

  return withTransaction((db) => {
    // 1. Fetch business settings for tax and invoice prefix
    const settings = get('SELECT * FROM business_settings WHERE business_id = ?', [businessId]) || {};
    const prefix = settings.invoice_prefix || 'INV';
    const invoiceNo = getNextInvoiceNumber(businessId, prefix);

    // 2. Validate items, calculate line amounts, and prepare stock updates
    let calculatedSubtotal = 0;
    let calculatedTaxTotal = 0;
    let calculatedCgst = 0;
    let calculatedSgst = 0;
    let calculatedIgst = 0;

    const validatedItems = [];

    for (const item of items) {
      const product = get(`
        SELECT id, name, sku, barcode, selling_price, tax_rate, unit
        FROM products
        WHERE id = ? AND business_id = ?
      `, [item.productId, businessId]);

      if (!product) {
        throw new Error(`Product with ID ${item.productId} was not found in catalog.`);
      }

      const qty = parseFloat(item.quantity) || 1;
      const unitPrice = parseFloat(item.unitPrice !== undefined ? item.unitPrice : product.selling_price);
      const lineTaxRate = parseFloat(item.taxRate !== undefined ? item.taxRate : (product.tax_rate || 0));
      const lineDiscount = parseFloat(item.discountAmount) || 0;

      const rawLineTotal = (qty * unitPrice) - lineDiscount;
      const lineTaxAmount = (rawLineTotal * lineTaxRate) / 100;
      const finalLineTotal = rawLineTotal + lineTaxAmount;

      calculatedSubtotal += rawLineTotal;
      calculatedTaxTotal += lineTaxAmount;

      // GST Split: CGST + SGST (50% each) unless IGST specified
      if (item.isInterstate) {
        calculatedIgst += lineTaxAmount;
      } else {
        calculatedCgst += (lineTaxAmount / 2);
        calculatedSgst += (lineTaxAmount / 2);
      }

      // Check stock availability in target branch
      const currentStock = get(`
        SELECT quantity FROM stock
        WHERE business_id = ? AND branch_id = ? AND product_id = ? AND (variant_id = ? OR (variant_id IS NULL AND ? IS NULL))
      `, [businessId, branchId, product.id, item.variantId || null, item.variantId || null]);

      const availableQty = currentStock ? currentStock.quantity : 0;
      const newStockQty = availableQty - qty;

      validatedItems.push({
        productId: product.id,
        variantId: item.variantId || null,
        productName: product.name,
        sku: product.sku,
        barcode: product.barcode,
        unit: product.unit || 'PCS',
        quantity: qty,
        unitPrice,
        taxRate: lineTaxRate,
        taxAmount: lineTaxAmount,
        discountAmount: lineDiscount,
        totalAmount: finalLineTotal,
        availableQty,
        newStockQty
      });
    }

    // 3. Customer loyalty redemption
    let pointsDiscount = 0;
    if (customerId && redeemPoints > 0) {
      const cust = get('SELECT loyalty_points FROM customers WHERE id = ? AND business_id = ?', [customerId, businessId]);
      if (cust && cust.loyalty_points >= redeemPoints) {
        const redemptionRate = settings.loyalty_redemption_rate || 1.0;
        pointsDiscount = redeemPoints * redemptionRate;
      }
    }

    // 4. Grand Total & Round Off
    const totalBeforeRound = calculatedSubtotal + calculatedTaxTotal + (parseFloat(deliveryCharge) || 0) - (parseFloat(discountAmount) || 0) - pointsDiscount;
    const roundedGrandTotal = Math.round(Math.max(0, totalBeforeRound) * 100) / 100;
    const roundOff = Math.round((roundedGrandTotal - totalBeforeRound) * 100) / 100;

    let changeDue = 0;
    if (paymentMethod === 'CASH' && cashTendered >= roundedGrandTotal) {
      changeDue = Math.round((cashTendered - roundedGrandTotal) * 100) / 100;
    }

    // 5. Loyalty Points Accrual (default 1 point per ₹100)
    let pointsEarned = 0;
    if (customerId && settings.enable_loyalty) {
      const pointsPer100 = settings.loyalty_points_per_100 || 1.0;
      pointsEarned = Math.floor(roundedGrandTotal / 100) * pointsPer100;
    }

    const saleId = `sale_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 6. Insert Sale Header
    run(`
      INSERT INTO sales (
        id, business_id, branch_id, invoice_no, customer_id, customer_name, customer_phone,
        cashier_id, cashier_name, invoice_type, subtotal, tax_amount, cgst_amount, sgst_amount,
        igst_amount, discount_amount, delivery_charge, round_off, grand_total, payment_method,
        payment_details, payment_status, cash_tendered, change_due, loyalty_points_earned,
        loyalty_points_redeemed, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      saleId, businessId, branchId, invoiceNo, customerId || null, customerName || null,
      customerPhone || null, cashierId || null, cashierName || null, invoiceType,
      calculatedSubtotal, calculatedTaxTotal, calculatedCgst, calculatedSgst, calculatedIgst,
      (parseFloat(discountAmount) || 0) + pointsDiscount, parseFloat(deliveryCharge) || 0,
      roundOff, roundedGrandTotal, paymentMethod,
      paymentDetails ? JSON.stringify(paymentDetails) : null,
      'PAID', cashTendered || roundedGrandTotal, changeDue, pointsEarned, redeemPoints, notes
    ]);

    // 7. Insert Sale Items and Atomically Update Stock
    const insertItemStmt = db.prepare(`
      INSERT INTO sale_items (
        id, sale_id, business_id, product_id, variant_id, product_name, sku, barcode,
        quantity, unit, unit_price, tax_rate, tax_amount, discount_amount, total_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateStockStmt = db.prepare(`
      INSERT INTO stock (id, business_id, branch_id, product_id, variant_id, quantity)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET quantity = excluded.quantity, updated_at = CURRENT_TIMESTAMP
    `);

    const movementStmt = db.prepare(`
      INSERT INTO stock_movements (
        id, business_id, branch_id, product_id, variant_id, change_qty, balance_qty,
        type, reason, ref_id, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < validatedItems.length; i++) {
      const item = validatedItems[i];
      const saleItemId = `${saleId}_item_${i + 1}`;

      insertItemStmt.run(
        saleItemId, saleId, businessId, item.productId, item.variantId, item.productName,
        item.sku, item.barcode, item.quantity, item.unit, item.unitPrice, item.taxRate,
        item.taxAmount, item.discountAmount, item.totalAmount
      );

      // Update stock record
      const updateResult = run(`
        UPDATE stock
        SET quantity = ?, updated_at = CURRENT_TIMESTAMP
        WHERE business_id = ? AND branch_id = ? AND product_id = ? AND (variant_id = ? OR (variant_id IS NULL AND ? IS NULL))
      `, [item.newStockQty, businessId, branchId, item.productId, item.variantId || null, item.variantId || null]);

      if (updateResult.changes === 0) {
        const stockId = `stock_${businessId}_${branchId}_${item.productId}_${item.variantId || 'base'}`;
        run(`
          INSERT INTO stock (id, business_id, branch_id, product_id, variant_id, quantity)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [stockId, businessId, branchId, item.productId, item.variantId || null, item.newStockQty]);
      }

      // Record stock audit movement
      const movementId = `sm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      movementStmt.run(
        movementId, businessId, branchId, item.productId, item.variantId, -item.quantity,
        item.newStockQty, 'SALE', `Sale Invoice ${invoiceNo}`, saleId, cashierName
      );
    }

    // 8. Update Customer Loyalty & Outstanding if applicable
    if (customerId) {
      if (redeemPoints > 0) {
        run('UPDATE customers SET loyalty_points = loyalty_points - ? WHERE id = ?', [redeemPoints, customerId]);
        run(`
          INSERT INTO customer_loyalty_ledger (id, business_id, customer_id, points_change, reason, ref_id)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [`cl_${Date.now()}_1`, businessId, customerId, -redeemPoints, `Redemption on Invoice ${invoiceNo}`, saleId]);
      }
      if (pointsEarned > 0) {
        run('UPDATE customers SET loyalty_points = loyalty_points + ? WHERE id = ?', [pointsEarned, customerId]);
        run(`
          INSERT INTO customer_loyalty_ledger (id, business_id, customer_id, points_change, reason, ref_id)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [`cl_${Date.now()}_2`, businessId, customerId, pointsEarned, `Points earned on Invoice ${invoiceNo}`, saleId]);
      }
      if (paymentMethod === 'CREDIT') {
        run('UPDATE customers SET outstanding_balance = outstanding_balance + ? WHERE id = ?', [roundedGrandTotal, customerId]);
      }
    }

    // 9. Update Active Cash Register Movement if Cash Collected
    if (paymentMethod === 'CASH' || (paymentDetails && paymentDetails.cash)) {
      const cashAmount = paymentMethod === 'CASH' ? roundedGrandTotal : (parseFloat(paymentDetails.cash) || 0);
      const activeRegister = get(`
        SELECT id FROM cash_registers
        WHERE business_id = ? AND branch_id = ? AND status = 'OPEN'
        ORDER BY opening_time DESC LIMIT 1
      `, [businessId, branchId]);

      if (activeRegister) {
        run(`
          INSERT INTO cash_movements (id, register_id, business_id, type, amount, reason)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [`cm_${Date.now()}`, activeRegister.id, businessId, 'SALE', cashAmount, `Cash Sale ${invoiceNo}`]);
      }
    }

    // 10. Audit Log
    run(`
      INSERT INTO audit_logs (id, business_id, actor_type, actor_id, actor_name, action, resource, resource_id, details)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      `log_${Date.now()}`, businessId, 'BUSINESS_USER', cashierId, cashierName, 'CREATE_SALE',
      'sales', saleId, JSON.stringify({ invoiceNo, grandTotal: roundedGrandTotal, itemsCount: validatedItems.length })
    ]);

    return {
      success: true,
      saleId,
      invoiceNo,
      grandTotal: roundedGrandTotal,
      subtotal: calculatedSubtotal,
      taxAmount: calculatedTaxTotal,
      cgst: calculatedCgst,
      sgst: calculatedSgst,
      igst: calculatedIgst,
      changeDue,
      pointsEarned,
      createdAt: new Date().toISOString()
    };
  });
}

module.exports = {
  getNextInvoiceNumber,
  createSaleTransaction
};
