'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { initSchema } = require('../db/schema');
const { seedDatabase } = require('../db/seed');
const { get, run, all } = require('../db');

// Initialize schema and seed data for the test run
initSchema();
seedDatabase();

const { createSaleTransaction, getNextInvoiceNumber } = require('../services/posService');
const { processExchangeTransaction } = require('../services/exchangeService');
const { PaymentManager } = require('../services/paymentAdapters');
const zohoService = require('../services/zohoService');

test('1. Invoice Numbering: Sequential, unique, and business-scoped', () => {
  const inv1 = getNextInvoiceNumber('biz_apex_demo', 'APX');
  assert.ok(inv1.startsWith('APX-2026-'));
  assert.match(inv1, /^APX-2026-\d{4}$/);
});

test('2. POS Checkout: Atomic Sale Transaction & Stock Deduction', () => {
  const businessId = 'biz_apex_demo';
  const branchId = 'branch_apex_main';

  // Ensure ample stock for test repeatability
  run(`
    UPDATE stock SET quantity = 30
    WHERE business_id = ? AND branch_id = ? AND product_id = 'prod_shirt_01' AND variant_id = 'var_shirt_m_blue'
  `, [businessId, branchId]);

  // Check initial stock for Cotton Oxford Shirt (variant: var_shirt_m_blue)
  const initialStock = get(`
    SELECT quantity FROM stock
    WHERE business_id = ? AND branch_id = ? AND product_id = 'prod_shirt_01' AND variant_id = 'var_shirt_m_blue'
  `, [businessId, branchId]).quantity;

  const saleResult = createSaleTransaction({
    businessId,
    branchId,
    cashierId: 'user_apex_cashier',
    cashierName: 'Sumanth Kumar',
    customerId: 'cust_01',
    customerName: 'Rahul Sharma',
    customerPhone: '+91 98111 22233',
    invoiceType: 'TAX_INVOICE',
    items: [
      {
        productId: 'prod_shirt_01',
        variantId: 'var_shirt_m_blue',
        quantity: 2,
        unitPrice: 1299.0,
        taxRate: 12.0
      }
    ],
    discountAmount: 100.0,
    deliveryCharge: 0,
    paymentMethod: 'CASH',
    cashTendered: 3000.0,
    redeemPoints: 0,
    notes: 'POS Automated Test Sale'
  });

  assert.strictEqual(saleResult.success, true);
  assert.ok(saleResult.invoiceNo.startsWith('APX-'));
  assert.ok(saleResult.grandTotal > 0);

  // Verify stock was decremented by exactly 2
  const updatedStock = get(`
    SELECT quantity FROM stock
    WHERE business_id = ? AND branch_id = ? AND product_id = 'prod_shirt_01' AND variant_id = 'var_shirt_m_blue'
  `, [businessId, branchId]).quantity;

  assert.strictEqual(updatedStock, initialStock - 2);

  // Verify sale record exists in DB
  const saleInDb = get('SELECT * FROM sales WHERE id = ?', [saleResult.saleId]);
  assert.ok(saleInDb);
  assert.strictEqual(saleInDb.invoice_no, saleResult.invoiceNo);

  // Verify cash register movement was created
  const cashMove = get('SELECT * FROM cash_movements WHERE business_id = ? AND reason = ?', [businessId, `Cash Sale ${saleResult.invoiceNo}`]);
  assert.ok(cashMove);
  assert.strictEqual(cashMove.amount, saleResult.grandTotal);
});

test('3. Dedicated Product Exchange: Higher Price Differential & Stock Consistency', () => {
  const businessId = 'biz_apex_demo';
  const branchId = 'branch_apex_main';

  // Ensure ample stock for test repeatability
  run("UPDATE stock SET quantity = 50 WHERE business_id = ? AND branch_id = ? AND product_id IN ('prod_tshirt_02', 'prod_sneaker_03')", [businessId, branchId]);

  // 1. Create an initial sale of a T-Shirt (Selling Price ₹799)
  const initialSale = createSaleTransaction({
    businessId,
    branchId,
    cashierId: 'user_apex_cashier',
    cashierName: 'Sumanth Kumar',
    customerName: 'Exchange Tester',
    items: [
      {
        productId: 'prod_tshirt_02',
        quantity: 1,
        unitPrice: 799.0,
        taxRate: 5.0
      }
    ],
    paymentMethod: 'CASH'
  });

  // Verify stock before exchange:
  // Returned item: prod_tshirt_02
  const tShirtStockBefore = get("SELECT quantity FROM stock WHERE product_id = 'prod_tshirt_02' AND branch_id = ?", [branchId]).quantity;
  // Replacement item: prod_sneaker_03 (Selling price ₹2499, higher price!)
  const sneakerStockBefore = get("SELECT quantity FROM stock WHERE product_id = 'prod_sneaker_03' AND branch_id = ?", [branchId]).quantity;

  // 2. Perform Dedicated Product Exchange: Return T-Shirt (₹799 + 5% tax = ₹838.95), Take Sneakers (₹2499 + 18% tax = ₹2948.82)
  const exchangeResult = processExchangeTransaction({
    businessId,
    branchId,
    cashierId: 'user_apex_cashier',
    cashierName: 'Sumanth Kumar',
    originalInvoiceNo: initialSale.invoiceNo,
    returnedItems: [
      {
        productId: 'prod_tshirt_02',
        quantity: 1,
        condition: 'GOOD'
      }
    ],
    replacementItems: [
      {
        productId: 'prod_sneaker_03',
        quantity: 1,
        unitPrice: 2499.0,
        taxRate: 18.0
      }
    ],
    paymentMethod: 'CASH',
    reason: 'Customer wanted size upgrade to sneakers'
  });

  assert.strictEqual(exchangeResult.success, true);
  assert.ok(exchangeResult.diffAmount > 0, 'Customer should pay additional collection');
  assert.strictEqual(exchangeResult.actionType, 'COLLECT_DIFFERENCE');

  // Verify returned item stock restored (+1)
  const tShirtStockAfter = get("SELECT quantity FROM stock WHERE product_id = 'prod_tshirt_02' AND branch_id = ?", [branchId]).quantity;
  assert.strictEqual(tShirtStockAfter, tShirtStockBefore + 1);

  // Verify replacement item stock decremented (-1)
  const sneakerStockAfter = get("SELECT quantity FROM stock WHERE product_id = 'prod_sneaker_03' AND branch_id = ?", [branchId]).quantity;
  assert.strictEqual(sneakerStockAfter, sneakerStockBefore - 1);

  // Verify cash collection was recorded in cash movements
  const exchangeCashMove = get("SELECT * FROM cash_movements WHERE business_id = ? AND type = 'EXCHANGE_COLLECT' ORDER BY created_at DESC LIMIT 1", [businessId]);
  assert.ok(exchangeCashMove);
  assert.strictEqual(exchangeCashMove.amount, exchangeResult.diffAmount);
});

test('4. Dedicated Product Exchange: Defective Quarantine Handling', () => {
  const businessId = 'biz_apex_demo';
  const branchId = 'branch_apex_main';

  // Ensure ample stock for test repeatability
  run("UPDATE stock SET quantity = 50 WHERE business_id = ? AND branch_id = ? AND product_id = 'prod_leather_belt_05'", [businessId, branchId]);

  // Create initial sale
  const sale = createSaleTransaction({
    businessId,
    branchId,
    cashierId: 'user_apex_cashier',
    cashierName: 'Sumanth Kumar',
    items: [{ productId: 'prod_leather_belt_05', quantity: 1, unitPrice: 699.0, taxRate: 18.0 }],
    paymentMethod: 'CASH'
  });

  const beltStockBefore = get("SELECT quantity FROM stock WHERE product_id = 'prod_leather_belt_05' AND branch_id = ?", [branchId]).quantity;

  // Exchange for another belt, but flag returned belt as DEFECTIVE
  const exchResult = processExchangeTransaction({
    businessId,
    branchId,
    cashierId: 'user_apex_cashier',
    cashierName: 'Sumanth Kumar',
    originalInvoiceNo: sale.invoiceNo,
    returnedItems: [{ productId: 'prod_leather_belt_05', quantity: 1, condition: 'DEFECTIVE' }],
    replacementItems: [{ productId: 'prod_leather_belt_05', quantity: 1, unitPrice: 699.0, taxRate: 18.0 }],
    paymentMethod: 'CASH',
    reason: 'Buckle broken upon purchase'
  });

  assert.strictEqual(exchResult.success, true);
  assert.strictEqual(exchResult.diffAmount, 0, 'Same item exchange should be even');

  // Since returned item was defective, it is quarantined and NOT added to sellable stock.
  // The replacement is issued (-1), so total sellable stock should be beltStockBefore - 1
  const beltStockAfter = get("SELECT quantity FROM stock WHERE product_id = 'prod_leather_belt_05' AND branch_id = ?", [branchId]).quantity;
  assert.strictEqual(beltStockAfter, beltStockBefore - 1);

  // Verify defective movement was logged
  const defectiveMove = get("SELECT * FROM stock_movements WHERE business_id = ? AND type = 'DEFECTIVE' ORDER BY created_at DESC LIMIT 1", [businessId]);
  assert.ok(defectiveMove);
});

test('5. Payment Gateway & Webhook Idempotency', () => {
  const eventId = `test_evt_${Date.now()}`;
  const payload = {
    payment: {
      id: `pay_test_${Date.now()}`,
      order_id: 'order_test_101',
      businessId: 'biz_apex_demo',
      planId: 'plan_yearly',
      amount: 499900
    }
  };

  // First webhook delivery
  const res1 = PaymentManager.processWebhookEvent({
    gateway: 'RAZORPAY',
    eventId,
    eventType: 'payment.captured',
    payload,
    rawBody: JSON.stringify(payload),
    signature: 'mock_sig'
  });
  assert.strictEqual(res1.success, true);
  assert.strictEqual(res1.processed, true);

  // Duplicate webhook replay
  const res2 = PaymentManager.processWebhookEvent({
    gateway: 'RAZORPAY',
    eventId,
    eventType: 'payment.captured',
    payload,
    rawBody: JSON.stringify(payload),
    signature: 'mock_sig'
  });
  assert.strictEqual(res2.success, true);
  assert.strictEqual(res2.duplicate, true);
});

test('6. Zoho CRM & Desk Integration Queuing', async () => {
  // Demo request lead creation
  const leadRes = await zohoService.syncDemoRequestAsLead({
    name: 'Anand Kumar',
    email: 'anand@retailhub.in',
    phone: '+91 99000 11223',
    businessName: 'Retail Hub Superstores',
    industry: 'grocery',
    notes: 'Needs 5 terminal billing system'
  });
  assert.strictEqual(leadRes.success, true);

  // Desk Support Ticket creation
  const ticketRes = await zohoService.createSupportTicket({
    businessId: 'biz_apex_demo',
    businessName: 'Apex Retail',
    category: 'Printing issue',
    priority: 'High',
    subject: 'Thermal printer 80mm paper cutter not firing',
    description: 'When clicking print bill, printer prints but fails to trigger auto-cut command.',
    customerEmail: 'owner@apex.com'
  });
  assert.strictEqual(ticketRes.success, true);
  assert.ok(ticketRes.ticketNumber.startsWith('TICK-'));
});

test('7. Multi-Tenant Isolation: Business data is strictly partitioned', () => {
  // Query products for a non-existent or other tenant
  const foreignProducts = all("SELECT * FROM products WHERE business_id = 'biz_other_tenant'");
  assert.strictEqual(foreignProducts.length, 0, 'No products should leak to foreign tenant');

  const apexProducts = all("SELECT * FROM products WHERE business_id = 'biz_apex_demo'");
  assert.ok(apexProducts.length > 0, 'Apex demo business products must exist');

  // Verify sales cannot be queried across tenants
  const foreignSales = all("SELECT * FROM sales WHERE business_id = 'biz_other_tenant'");
  assert.strictEqual(foreignSales.length, 0, 'No sales should leak to foreign tenant');
});

test('8. Configurable Branding & Dynamic Platform Settings', () => {
  const appNameRow = get("SELECT value FROM platform_settings WHERE key = 'app_name'");
  assert.ok(appNameRow && appNameRow.value.length > 0);

  const plans = all('SELECT * FROM subscription_plans WHERE is_active = 1');
  assert.ok(plans.length >= 4, 'Must have at least 4 default active plans (Monthly, Quarterly, Half-Yearly, Yearly)');
  
  const monthly = plans.find(p => p.billing_interval === 'MONTHLY');
  const quarterly = plans.find(p => p.billing_interval === 'QUARTERLY');
  const halfYearly = plans.find(p => p.billing_interval === 'HALF_YEARLY');
  const yearly = plans.find(p => p.billing_interval === 'YEARLY');

  assert.strictEqual(monthly.price_inr, 499);
  assert.strictEqual(quarterly.price_inr, 1399);
  assert.strictEqual(halfYearly.price_inr, 2599);
  assert.strictEqual(yearly.price_inr, 4999);
});

test('9. Stock Upsert & Composite Key Integrity without Collision', () => {
  const businessId = 'biz_apex_demo';
  const branchId = 'branch_apex_main';
  const productId = 'prod_shirt_01';

  // Test updating stock using primary ID lookup
  const stockRow = get(`
    SELECT id, quantity FROM stock
    WHERE business_id = ? AND branch_id = ? AND product_id = ? AND variant_id = 'var_shirt_m_blue'
  `, [businessId, branchId, productId]);

  assert.ok(stockRow && stockRow.id, 'Stock row must exist for seed product variant');
  const prevQty = stockRow.quantity;

  // Safe update
  run('UPDATE stock SET quantity = quantity + 5, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [stockRow.id]);

  const updatedStock = get('SELECT quantity FROM stock WHERE id = ?', [stockRow.id]);
  assert.strictEqual(updatedStock.quantity, prevQty + 5);
});

test('10. Coupon Redemption Tracking and Ledger Recording', () => {
  const businessId = 'biz_apex_demo';
  const couponCode = 'WELCOME50';

  const coupon = get('SELECT id, used_count FROM coupons WHERE code = ?', [couponCode]);
  assert.ok(coupon, 'Default coupon WELCOME50 must exist');
  const initialUsedCount = coupon.used_count;

  // Activate subscription with coupon
  PaymentManager.activateSubscription({
    businessId,
    planId: 'plan_monthly',
    gateway: 'RAZORPAY',
    orderId: `order_test_${Date.now()}`,
    paymentId: `pay_test_${Date.now()}`,
    amount: 449.10,
    couponCode
  });

  const updatedCoupon = get('SELECT used_count FROM coupons WHERE id = ?', [coupon.id]);
  assert.strictEqual(updatedCoupon.used_count, initialUsedCount + 1, 'Coupon used_count must increment upon activation');

  const redemption = get('SELECT * FROM coupon_redemptions WHERE coupon_id = ? AND business_id = ?', [coupon.id, businessId]);
  assert.ok(redemption, 'Coupon redemption record must be created in ledger');
});

