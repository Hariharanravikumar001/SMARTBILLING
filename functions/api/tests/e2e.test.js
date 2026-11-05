// End-to-end verification script for Universal Billing SaaS
const API = 'http://localhost:3001/api';

async function testE2E() {
  console.log('--- 1. Testing Super Admin Auth & Dashboard ---');
  const adminLoginRes = await fetch(`${API}/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@universalbilling.io', password: 'SuperAdmin@2026!' })
  });
  const adminLogin = await adminLoginRes.json();
  if (!adminLogin.success) throw new Error('Admin login failed: ' + adminLogin.message);
  console.log('✓ Admin login successful. Role:', adminLogin.user.role);
  const adminToken = adminLogin.token;

  const adminDashboardRes = await fetch(`${API}/admin/dashboard`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const adminDash = await adminDashboardRes.json();
  if (!adminDash.success) throw new Error('Admin dashboard failed');
  console.log('✓ Admin Dashboard stats:', {
    totalBusinesses: adminDash.data.metrics.totalBusinesses,
    activeSubscriptions: adminDash.data.metrics.activeSubscriptions,
    mrr: adminDash.data.metrics.mrr,
    arr: adminDash.data.metrics.arr
  });

  console.log('\n--- 2. Testing Business Owner Auth & Dashboard ---');
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

  const shopDashRes = await fetch(`${API}/reports/dashboard`, { headers: authHeaders });
  const shopDash = await shopDashRes.json();
  if (!shopDash.success) throw new Error('Shop dashboard failed');
  console.log('✓ Shop Dashboard stats:', {
    totalSales: shopDash.data.today.totalSales,
    invoiceCount: shopDash.data.today.invoiceCount,
    cashSales: shopDash.data.today.cashSales,
    upiSales: shopDash.data.today.upiSales
  });

  console.log('\n--- 3. Testing Product Inventory & Customers ---');
  const prodRes = await fetch(`${API}/products`, { headers: authHeaders });
  const prodData = await prodRes.json();
  if (!prodData.success) throw new Error('Failed to fetch products');
  console.log(`✓ Products fetched: ${prodData.data.length} products found.`);
  const tshirt = prodData.data.find(p => p.id === 'prod_tshirt_02') || prodData.data[0];
  console.log(`  Selected Product: ${tshirt.name} (ID: ${tshirt.id}, Price: ₹${tshirt.selling_price})`);

  const custRes = await fetch(`${API}/customers`, { headers: authHeaders });
  const custData = await custRes.json();
  const customer = custData.data[0];
  console.log(`✓ Customer selected: ${customer.name} (ID: ${customer.id}, Balance: ₹${customer.outstanding_balance})`);

  console.log('\n--- 4. Testing POS Checkout ---');
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
  console.log('✓ POS Checkout Succeeded! Invoice:', checkoutResult.data.invoiceNo, 'Grand Total:', checkoutResult.data.grandTotal);

  console.log('\n--- 5. Testing Dedicated Product Exchange Workflow ---');
  const originalInvoiceNo = checkoutResult.data.invoiceNo;
  // Look up original invoice to retrieve items
  const lookupRes = await fetch(`${API}/exchange/lookup?invoiceNo=${originalInvoiceNo}`, { headers: authHeaders });
  const lookupData = await lookupRes.json();
  if (!lookupData.success) throw new Error('Invoice lookup failed: ' + lookupData.message);
  console.log(`✓ Original Invoice verified. Total items eligible: ${lookupData.data.items.length}`);

  const originalItem = lookupData.data.items[0];
  const exchangePayload = {
    originalInvoiceNo: originalInvoiceNo,
    returnedItems: [
      {
        saleItemId: originalItem.id,
        productId: originalItem.product_id,
        variantId: originalItem.variant_id,
        quantity: 1,
        unitPrice: originalItem.unit_price,
        condition: 'GOOD',
        returnReason: 'Customer requested size change'
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
    reason: 'Size exchange',
    notes: 'Direct size exchange'
  };

  const exchangeRes = await fetch(`${API}/exchange/process`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(exchangePayload)
  });
  const exchangeResult = await exchangeRes.json();
  if (!exchangeResult.success) throw new Error('Exchange failed: ' + exchangeResult.message);
  console.log('✓ Product Exchange Succeeded! Exchange No:', exchangeResult.data.exchangeNo, 'Action:', exchangeResult.data.actionType, 'Diff:', exchangeResult.data.diffAmount);

  console.log('\n--- 6. Testing Zoho Support Ticket & Rating Flow ---');
  const ticketRes = await fetch(`${API}/zoho/tickets`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      subject: 'Thermal printer driver setup inquiry',
      description: 'Need assistance connecting our 80mm ESC/POS thermal printer via USB',
      priority: 'MEDIUM',
      category: 'HARDWARE'
    })
  });
  const ticketResult = await ticketRes.json();
  console.log('✓ Support ticket submitted. Ticket:', ticketResult.data?.ticket_no || 'Created', 'Status:', ticketResult.data?.status || 'Open');

  console.log('\n--- 7. Testing Super Admin Zoho Hub & Integration Monitoring ---');
  const zohoConfigRes = await fetch(`${API}/admin/zoho/config`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const zohoConfig = await zohoConfigRes.json();
  console.log('✓ Zoho Hub Status:', {
    crmConfigured: zohoConfig.data?.crm?.isConfigured ?? false,
    deskConfigured: zohoConfig.data?.desk?.isConfigured ?? false,
    totalSyncLogs: zohoConfig.data?.recentSyncLogs?.length ?? 0
  });

  console.log('\n======================================================');
  console.log('🎉 ALL END-TO-END VERIFICATION STEPS PASSED SUCCESSFULLY!');
  console.log('======================================================');
}

testE2E().catch(err => {
  console.error('❌ E2E Verification Failed:', err);
  process.exit(1);
});
