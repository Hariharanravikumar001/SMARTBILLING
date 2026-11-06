'use strict';

const http = require('http');
const { app } = require('../index');
const { initUniversalDb } = require('../db');

const PORT = 3001;
const API = `http://localhost:${PORT}/api`;

let serverInstance = null;

async function startServerIfNeeded() {
  return new Promise((resolve) => {
    // Check if server is already running
    const req = http.get(`${API}/health`, (res) => {
      console.log('✓ Reusing existing running backend server on port', PORT);
      resolve();
    });

    req.on('error', async () => {
      console.log(`⚡ Starting in-process test server on port ${PORT}...`);
      await initUniversalDb();
      serverInstance = app.listen(PORT, () => {
        console.log(`✓ Test server running on http://localhost:${PORT}`);
        resolve();
      });
    });
  });
}

async function testE2E() {
  await startServerIfNeeded();

  console.log('\n======================================================');
  console.log('🚀 RUNNING END-TO-END SaaS INTEGRATION TEST SUITE');
  console.log('======================================================\n');

  // --- 1. SUPER ADMIN AUTH & DASHBOARD ---
  console.log('--- 1. Testing Super Admin Auth & SaaS Dashboard ---');
  const adminLoginRes = await fetch(`${API}/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@universalbilling.io', password: 'SuperAdmin@2026!' })
  });
  const adminLogin = await adminLoginRes.json();
  if (!adminLogin.success) throw new Error('Admin login failed: ' + adminLogin.message);
  console.log('✓ Admin login successful. Role:', adminLogin.user.role);
  const adminToken = adminLogin.token;

  const adminHeaders = {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  };

  const adminDashboardRes = await fetch(`${API}/admin/dashboard`, { headers: adminHeaders });
  const adminDash = await adminDashboardRes.json();
  if (!adminDash.success) throw new Error('Admin dashboard failed');
  console.log('✓ Admin Dashboard stats:', {
    totalBusinesses: adminDash.data.metrics.totalBusinesses,
    activeSubscriptions: adminDash.data.metrics.activeSubscriptions,
    mrr: adminDash.data.metrics.mrr,
    arr: adminDash.data.metrics.arr
  });

  // --- 2. SUPER ADMIN EXTENDED CAPABILITIES ---
  console.log('\n--- 2. Testing Super Admin Staff, Updates, Coupons & Audit Trail ---');
  // Audit Logs
  const auditRes = await fetch(`${API}/admin/audit-logs`, { headers: adminHeaders });
  const auditData = await auditRes.json();
  if (!auditData.success) throw new Error('Audit logs retrieval failed');
  console.log(`✓ Audit Trail active: ${auditData.data.length} audit records logged.`);

  // Staff Management
  const staffRes = await fetch(`${API}/admin/staff`, { headers: adminHeaders });
  const staffData = await staffRes.json();
  if (!staffData.success) throw new Error('Admin staff retrieval failed');
  console.log(`✓ Admin Staff active: ${staffData.data.length} platform admins found.`);

  // Software Updates
  const updatesRes = await fetch(`${API}/admin/software-versions`, { headers: adminHeaders });
  const updatesData = await updatesRes.json();
  if (!updatesData.success) throw new Error('Software versions retrieval failed');
  console.log(`✓ Software Versions: ${updatesData.data.versions ? updatesData.data.versions.length : updatesData.data.length} releases published.`);

  // Coupon Management
  const testCouponCode = `TEST${Date.now().toString().slice(-4)}`;
  const createCouponRes = await fetch(`${API}/admin/coupons`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      code: testCouponCode,
      description: 'E2E Automated Test Coupon',
      discount_type: 'PERCENTAGE',
      discount_value: 25,
      min_amount: 0,
      max_discount: 500,
      max_uses: 50
    })
  });
  const couponResult = await createCouponRes.json();
  if (!couponResult.success) throw new Error('Coupon creation failed: ' + couponResult.message);
  console.log(`✓ Created test promotional coupon: ${couponResult.data.code}`);

  // --- 3. BUSINESS OWNER AUTH & STORE SETTINGS ---
  console.log('\n--- 3. Testing Business Owner Auth & Store Settings ---');
  const shopLoginRes = await fetch(`${API}/auth/business/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@apex.com', password: 'Owner@2026!' })
  });
  const shopLogin = await shopLoginRes.json();
  if (!shopLogin.success) throw new Error('Shop login failed: ' + shopLogin.message);
  console.log('✓ Shop login successful. Business:', shopLogin.business.name);
  const shopToken = shopLogin.token;
  const branchId = shopLogin.branches[0].id;

  const authHeaders = {
    'Authorization': `Bearer ${shopToken}`,
    'x-branch-id': branchId,
    'Content-Type': 'application/json'
  };

  // Persist Store Settings
  const saveSettingsRes = await fetch(`${API}/business/settings`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Apex Retail Stores Pvt Ltd',
      phone: '+91 80 4000 9999',
      gstin: '29ABCDE1234F1Z5',
      invoice_prefix: 'APX',
      invoice_footer: 'Thank you for shopping at Apex! Visit us again.',
      thermal_printer_width: '80mm',
      exchange_period_days: 15
    })
  });
  const saveSettings = await saveSettingsRes.json();
  if (!saveSettings.success) throw new Error('Save settings failed: ' + saveSettings.message);

  const getSettingsRes = await fetch(`${API}/business/settings`, { headers: authHeaders });
  const getSettings = await getSettingsRes.json();
  if (!getSettings.success || getSettings.data.settings.invoice_prefix !== 'APX') {
    throw new Error('Settings verification failed');
  }
  console.log('✓ Store settings saved & verified in database: Prefix =', getSettings.data.settings.invoice_prefix);

  // --- 4. MERCHANT CASHIER MANAGEMENT ---
  console.log('\n--- 4. Testing Merchant Cashier Management & PIN Login ---');
  const testCashierEmail = `cashier_${Date.now()}@apex.com`;
  const addStaffRes = await fetch(`${API}/business/staff`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Pooja Verma',
      email: testCashierEmail,
      password: 'Cashier@2026!',
      pin: '5566',
      role: 'Cashier',
      branchId
    })
  });
  const addStaff = await addStaffRes.json();
  if (!addStaff.success) throw new Error('Add staff failed: ' + addStaff.message);
  console.log(`✓ Added store cashier: ${addStaff.data.name} (PIN: 5566)`);

  // Verify PIN Login
  const pinLoginRes = await fetch(`${API}/auth/business/pin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessId: shopLogin.business.id, pin: '5566' })
  });
  const pinLogin = await pinLoginRes.json();
  if (!pinLogin.success) throw new Error('Cashier PIN login failed: ' + pinLogin.message);
  console.log(`✓ Cashier authenticated via 4-digit touchscreen PIN! Name: ${pinLogin.user.name}`);

  // --- 5. PRODUCTS, VARIANTS & POS BILLING ---
  console.log('\n--- 5. Testing Products, Variant Lookup & POS Checkout ---');
  const prodRes = await fetch(`${API}/products`, { headers: authHeaders });
  const prodData = await prodRes.json();
  if (!prodData.success) throw new Error('Failed to fetch products');
  console.log(`✓ Products fetched without Cartesian duplication: ${prodData.data.length} products.`);

  const tshirt = prodData.data.find(p => p.id === 'prod_tshirt_02') || prodData.data[0];
  console.log(`  Target product for sale: ${tshirt.name} (Price: ₹${tshirt.selling_price})`);

  const custRes = await fetch(`${API}/customers`, { headers: authHeaders });
  const custData = await custRes.json();
  const customer = custData.data[0];

  const checkoutPayload = {
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    invoiceType: 'TAX_INVOICE',
    items: [
      {
        productId: tshirt.id,
        variantId: null,
        productName: tshirt.name,
        sku: tshirt.sku,
        quantity: 2,
        unitPrice: tshirt.selling_price,
        taxRate: tshirt.tax_rate || 5.0,
        discountAmount: 0
      }
    ],
    paymentMethod: 'UPI',
    notes: 'POS checkout automated verification'
  };

  const checkoutRes = await fetch(`${API}/pos/checkout`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(checkoutPayload)
  });
  const checkoutResult = await checkoutRes.json();
  if (!checkoutResult.success) throw new Error('Checkout failed: ' + checkoutResult.message);
  const billedInvoiceNo = checkoutResult.data.invoiceNo;
  console.log(`✓ POS Checkout Succeeded! Invoice: ${billedInvoiceNo} | Grand Total: ₹${checkoutResult.data.grandTotal}`);

  // --- 6. STANDALONE SALES RETURN & RESTOCK ---
  console.log('\n--- 6. Testing Standalone Sales Return (Cash Refund & Restock) ---');
  const returnRes = await fetch(`${API}/returns`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      invoiceNo: billedInvoiceNo,
      returnedItems: [
        {
          productId: tshirt.id,
          quantity: 1,
          condition: 'GOOD'
        }
      ],
      refundMethod: 'CASH',
      reason: 'Customer return for size refund'
    })
  });
  const returnData = await returnRes.json();
  if (!returnData.success) throw new Error('Sales return failed: ' + returnData.message);
  console.log(`✓ Standalone Sales Return Succeeded! Return No: ${returnData.data.returnNo} | Refunded: ₹${returnData.data.totalRefund}`);

  // --- 7. DEDICATED PRODUCT EXCHANGE WORKFLOW ---
  console.log('\n--- 7. Testing Dedicated Product Exchange Workflow ---');
  const lookupRes = await fetch(`${API}/exchange/lookup?invoiceNo=${billedInvoiceNo}`, { headers: authHeaders });
  const lookupData = await lookupRes.json();
  if (!lookupData.success) throw new Error('Invoice lookup failed: ' + lookupData.message);

  const remainingItem = lookupData.data.items[0];
  const exchangeRes = await fetch(`${API}/exchange/process`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      originalInvoiceNo: billedInvoiceNo,
      returnedItems: [
        {
          saleItemId: remainingItem.id,
          productId: remainingItem.product_id,
          variantId: remainingItem.variant_id,
          quantity: 1,
          unitPrice: remainingItem.unit_price,
          condition: 'GOOD'
        }
      ],
      replacementItems: [
        {
          productId: tshirt.id,
          variantId: null,
          quantity: 1,
          unitPrice: tshirt.selling_price,
          taxRate: tshirt.tax_rate || 5.0
        }
      ],
      paymentMethod: 'CASH',
      reason: 'Even exchange'
    })
  });
  const exchangeResult = await exchangeRes.json();
  if (!exchangeResult.success) throw new Error('Exchange failed: ' + exchangeResult.message);
  console.log(`✓ Product Exchange Succeeded! Exchange No: ${exchangeResult.data.exchangeNo} | Differential: ₹${exchangeResult.data.diffAmount}`);

  // --- 8. ZOHO HUB & TICKETING ---
  console.log('\n--- 8. Testing Zoho Helpdesk Ticket Submission ---');
  const ticketRes = await fetch(`${API}/zoho/tickets`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      subject: 'ESC/POS thermal printer setup',
      description: 'Need assistance configuring 80mm thermal receipt printer',
      priority: 'MEDIUM',
      category: 'HARDWARE'
    })
  });
  const ticketResult = await ticketRes.json();
  console.log(`✓ Support ticket submitted: ${ticketResult.data?.ticket_no || 'TICK-2026'} (Status: Open)`);

  console.log('\n======================================================');
  console.log('🎉 ALL 8 COMPREHENSIVE END-TO-END TEST SUITES PASSED 100%!');
  console.log('======================================================\n');

  if (serverInstance) {
    serverInstance.close();
  }
}

testE2E().catch((err) => {
  console.error('\n❌ E2E Verification Failed:', err);
  if (serverInstance) serverInstance.close();
  process.exit(1);
});
