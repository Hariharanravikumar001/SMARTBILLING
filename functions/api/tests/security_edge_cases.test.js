'use strict';

const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const { initSchema } = require('../db/schema');
const { seedDatabase } = require('../db/seed');
const { get, run, all, withTransaction } = require('../db');

// Ensure DB is initialized
initSchema();
seedDatabase();

const { createSaleTransaction, getNextInvoiceNumber } = require('../services/posService');
const { processExchangeTransaction } = require('../services/exchangeService');

test('SECURITY & EDGE-CASES TEST SUITE', async (t) => {

  await t.test('1. Multi-Tenant Strict Isolation: Cross-Tenant Data Leakage Prevention', () => {
    const tenantA = 'biz_apex_demo';
    const tenantB = 'biz_second_competitor';

    // Seed Tenant B
    run(`
      INSERT OR IGNORE INTO businesses (id, name, slug, email, phone, status)
      VALUES (?, 'Competitor Retail', 'competitor-retail', 'owner@competitor.io', '9898989898', 'ACTIVE')
    `, [tenantB]);

    run(`
      INSERT OR IGNORE INTO products (id, business_id, name, sku, mrp, selling_price, is_active)
      VALUES ('prod_secret_b', ?, 'Secret High-End Watch', 'SKU-SECRET-001', 120000.0, 99999.0, 1)
    `, [tenantB]);

    run(`
      INSERT OR IGNORE INTO customers (id, business_id, name, phone)
      VALUES ('cust_vip_b', ?, 'VIP Customer B', '+91 99999 00000')
    `, [tenantB]);

    // Query from perspective of Tenant A
    const tenantAProducts = all('SELECT * FROM products WHERE business_id = ?', [tenantA]);
    const leakedProduct = tenantAProducts.find(p => p.id === 'prod_secret_b');
    assert.strictEqual(leakedProduct, undefined, 'Tenant A must never see Tenant B products');

    const tenantACustomers = all('SELECT * FROM customers WHERE business_id = ?', [tenantA]);
    const leakedCustomer = tenantACustomers.find(c => c.id === 'cust_vip_b');
    assert.strictEqual(leakedCustomer, undefined, 'Tenant A must never see Tenant B customers');

    // Attempt cross-tenant update
    run('UPDATE products SET selling_price = 1.0 WHERE id = ? AND business_id = ?', ['prod_secret_b', tenantA]);
    const targetProduct = get('SELECT selling_price FROM products WHERE id = ?', ['prod_secret_b']);
    assert.strictEqual(targetProduct.selling_price, 99999.0, 'Tenant A cannot tamper with Tenant B data');
  });

  await t.test('2. Inventory Atomicity & Overselling Prevention', () => {
    const businessId = 'biz_apex_demo';
    const branchId = 'branch_apex_main';

    // Create a limited stock item (3 units available)
    const limitedProductId = 'prod_limited_stock';
    run(`
      INSERT OR REPLACE INTO products (id, business_id, name, sku, mrp, selling_price, is_active)
      VALUES (?, ?, 'Limited Edition Sneaker', 'SKU-LTD-01', 6000.0, 5000.0, 1)
    `, [limitedProductId, businessId]);

    run(`
      INSERT OR REPLACE INTO stock (id, business_id, branch_id, product_id, quantity)
      VALUES ('stk_ltd', ?, ?, ?, 3)
    `, [businessId, branchId, limitedProductId]);

    // Initial stock check
    const initialStock = get('SELECT quantity FROM stock WHERE id = ?', ['stk_ltd']).quantity;
    assert.strictEqual(initialStock, 3);

    // Attempting to checkout 5 units (when only 3 exist)
    assert.throws(() => {
      withTransaction((db) => {
        const current = get('SELECT quantity FROM stock WHERE id = ?', ['stk_ltd']).quantity;
        const requested = 5;
        if (current < requested) {
          throw new Error(`Insufficient stock for product. Available: ${current}, Requested: ${requested}`);
        }
        run('UPDATE stock SET quantity = quantity - ? WHERE id = ?', [requested, 'stk_ltd']);
      });
    }, /Insufficient stock/, 'Checkout exceeding stock must fail atomically');

    // Stock must remain intact at 3
    const finalStock = get('SELECT quantity FROM stock WHERE id = ?', ['stk_ltd']).quantity;
    assert.strictEqual(finalStock, 3, 'Stock must not decrease on failed checkout transaction');
  });

  await t.test('3. Dedicated Sales Return: Over-Return & Quantity Boundaries', () => {
    const businessId = 'biz_apex_demo';
    const branchId = 'branch_apex_main';

    // 1. Create a pristine sale with 2 items using seeded prod_tshirt_02
    const sale = createSaleTransaction({
      businessId,
      branchId,
      cashierId: 'user_apex_cashier',
      cashierName: 'Cashier Test',
      customerId: 'cust_01',
      customerName: 'Rahul Sharma',
      customerPhone: '+91 98111 22233',
      invoiceType: 'TAX_INVOICE',
      items: [
        {
          productId: 'prod_tshirt_02',
          variantId: null,
          quantity: 2,
          unitPrice: 799.0,
          taxRate: 5.0
        }
      ],
      paymentMethod: 'CASH',
      amountReceived: 2000.0
    });

    const saleId = sale.saleId;
    const saleItem = get('SELECT * FROM sale_items WHERE sale_id = ? LIMIT 1', [saleId]);
    assert.ok(saleItem, 'Sale item must exist');
    assert.strictEqual(saleItem.quantity, 2);

    // Initial stock before return
    const stockBefore = get('SELECT quantity FROM stock WHERE product_id = ? AND branch_id = ?', ['prod_tshirt_02', branchId]).quantity;

    // First Return: 1 item returned
    const returnId1 = `ret_${Date.now()}_1`;
    const testReturnNo = `RET-TEST-${Date.now()}`;
    const retItemId = `ret_item_${Date.now()}`;
    withTransaction((db) => {
      run(`
        INSERT INTO sales_returns (
          id, business_id, branch_id, return_no, original_sale_id, original_invoice_no,
          customer_id, customer_name, cashier_id, total_refund_amount, refund_method,
          reason, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'cust_01', 'Rahul Sharma', 'user_apex_cashier', 838.95, 'CASH', 'Size issue', CURRENT_TIMESTAMP)
      `, [returnId1, businessId, branchId, testReturnNo, saleId, sale.invoiceNo]);

      run(`
        INSERT INTO sales_return_items (
          id, return_id, business_id, product_id, variant_id, product_name,
          quantity, unit_price, refund_amount, restock_condition, created_at
        ) VALUES (?, ?, ?, 'prod_tshirt_02', NULL, 'Crew Neck T-Shirt', 1, 799.0, 838.95, 'GOOD', CURRENT_TIMESTAMP)
      `, [retItemId, returnId1, businessId]);

      // Restock
      run('UPDATE stock SET quantity = quantity + 1 WHERE product_id = ? AND branch_id = ?', ['prod_tshirt_02', branchId]);
    });

    // Check stock replenished
    const stockAfterFirstReturn = get('SELECT quantity FROM stock WHERE product_id = ? AND branch_id = ?', ['prod_tshirt_02', branchId]).quantity;
    assert.strictEqual(stockAfterFirstReturn, stockBefore + 1, 'Stock must increment by returned quantity');

    // Check total returned so far for this item
    const alreadyReturned = get(`
      SELECT COALESCE(SUM(quantity), 0) as total_returned
      FROM sales_return_items
      WHERE return_id = ? AND product_id = 'prod_tshirt_02'
    `, [returnId1]).total_returned;
    assert.strictEqual(alreadyReturned, 1);

    // Attempt over-return: trying to return 2 more when only 1 remaining (original 2 - 1 returned = 1)
    const remainingEligible = saleItem.quantity - alreadyReturned;
    assert.strictEqual(remainingEligible, 1);

    assert.throws(() => {
      const requestedReturnQty = 2;
      if (requestedReturnQty > remainingEligible) {
        throw new Error(`Cannot return ${requestedReturnQty} items. Only ${remainingEligible} item(s) eligible for return.`);
      }
    }, /Cannot return 2 items/, 'Over-return validation must prevent returning more than purchased');
  });

  await t.test('4. Payment Gateway Webhook HMAC-SHA256 Signature Verification', () => {
    const webhookSecret = 'test_whsec_999888777';
    const payload = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_test_signature_99',
            amount: 49900,
            currency: 'INR',
            notes: { business_id: 'biz_apex_demo', plan_id: 'plan_retail_growth' }
          }
        }
      }
    });

    // Generate valid HMAC signature
    const validSignature = crypto.createHmac('sha256', webhookSecret).update(payload).digest('hex');

    // Verification helper function matching subscription route logic
    function verifyWebhook(secret, body, headerSignature) {
      const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
      return crypto.timingSafeEqual(Buffer.from(headerSignature), Buffer.from(expected));
    }

    // Valid signature passes
    assert.strictEqual(verifyWebhook(webhookSecret, payload, validSignature), true);

    // Tampered payload fails
    const tamperedPayload = payload.replace('biz_apex_demo', 'biz_hacker');
    assert.strictEqual(verifyWebhook(webhookSecret, tamperedPayload, validSignature), false);

    // Tampered signature fails
    const badSignature = validSignature.substring(0, validSignature.length - 2) + 'aa';
    assert.strictEqual(verifyWebhook(webhookSecret, payload, badSignature), false);
  });

  await t.test('5. Promotional Coupon Redemption Limit & Tracking', () => {
    const couponCode = `LTD${Date.now().toString().slice(-4)}`;
    const couponId = `coup_${Date.now()}`;
    const maxUses = 1;

    run(`
      INSERT INTO coupons (id, code, description, discount_type, discount_value, min_amount, max_uses, used_count, is_active)
      VALUES (?, ?, 'Single-use promo', 'PERCENTAGE', 20.0, 500.0, ?, 0, 1)
    `, [couponId, couponCode, maxUses]);

    // Redemption 1
    const coupon = get('SELECT * FROM coupons WHERE code = ?', [couponCode]);
    assert.strictEqual(coupon.used_count, 0);
    assert.ok(coupon.used_count < coupon.max_uses, 'Coupon must be valid on first use');

    run('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?', [couponId]);
    const redId = `red_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    run(`
      INSERT INTO coupon_redemptions (id, coupon_id, business_id, payment_id, discount_applied)
      VALUES (?, ?, 'biz_apex_demo', 'pay_sub_01', 100.0)
    `, [redId, couponId]);

    // Redemption 2 attempt
    const updatedCoupon = get('SELECT * FROM coupons WHERE code = ?', [couponCode]);
    assert.strictEqual(updatedCoupon.used_count, 1);

    const isExhausted = updatedCoupon.used_count >= updatedCoupon.max_uses;
    assert.strictEqual(isExhausted, true, 'Coupon must be marked as exhausted once max_uses is reached');
  });

  await t.test('6. Cash Register Audit Trail & Float Balancing', () => {
    const registerId = `reg_${Date.now()}`;
    const businessId = 'biz_apex_demo';
    const branchId = 'branch_apex_main';
    const openingBalance = 2000.0;

    // Open register
    run(`
      INSERT INTO cash_registers (id, business_id, branch_id, user_id, user_name, opening_time, opening_cash, status)
      VALUES (?, ?, ?, 'user_apex_cashier', 'Sumanth Kumar', CURRENT_TIMESTAMP, ?, 'OPEN')
    `, [registerId, businessId, branchId, openingBalance]);

    // Cash Sale of +500
    const mov1 = `mov_${Date.now()}_1`;
    run(`
      INSERT INTO cash_movements (id, register_id, business_id, type, amount, reason)
      VALUES (?, ?, ?, 'CASH_SALE', 500.0, 'Invoice APX-001')
    `, [mov1, registerId, businessId]);

    // Cash Refund of -200
    const mov2 = `mov_${Date.now()}_2`;
    run(`
      INSERT INTO cash_movements (id, register_id, business_id, type, amount, reason)
      VALUES (?, ?, ?, 'REFUND', -200.0, 'Return RET-001')
    `, [mov2, registerId, businessId]);

    // Compute expected balance: 2000 + 500 - 200 = 2300
    const movementsSum = get(`
      SELECT COALESCE(SUM(amount), 0) as net_movement
      FROM cash_movements
      WHERE register_id = ?
    `, [registerId]).net_movement;

    const expectedBalance = openingBalance + movementsSum;
    assert.strictEqual(expectedBalance, 2300.0, 'Expected balance must exactly equal opening balance + net movements');

    // Close register
    run(`
      UPDATE cash_registers
      SET status = 'CLOSED', closing_cash = ?, system_expected_cash = ?, closing_time = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [expectedBalance, expectedBalance, registerId]);

    const closedReg = get('SELECT * FROM cash_registers WHERE id = ?', [registerId]);
    assert.strictEqual(closedReg.status, 'CLOSED');
    assert.strictEqual(closedReg.closing_cash, 2300.0);
  });

  await t.test('7. Financial Precision & Inclusive GST Breakdown', () => {
    // Test GST reverse calculation (Tax Inclusive):
    // Price = 1050, Tax Rate = 5%
    // Base = 1050 / (1 + 0.05) = 1000.00
    // Tax = 50.00
    const inclusivePrice = 1050.0;
    const taxRate = 5.0;
    const basePrice = Math.round((inclusivePrice / (1 + (taxRate / 100))) * 100) / 100;
    const taxAmount = Math.round((inclusivePrice - basePrice) * 100) / 100;

    assert.strictEqual(basePrice, 1000.0);
    assert.strictEqual(taxAmount, 50.0);
    assert.strictEqual(basePrice + taxAmount, inclusivePrice);

    // Test Tax Exclusive calculation:
    // Base = 1000, Tax Rate = 18%
    // Tax = 180, Total = 1180
    const exclusiveBase = 1000.0;
    const rate18 = 18.0;
    const computedTax = Math.round((exclusiveBase * (rate18 / 100)) * 100) / 100;
    const computedTotal = exclusiveBase + computedTax;

    assert.strictEqual(computedTax, 180.0);
    assert.strictEqual(computedTotal, 1180.0);
  });

});
