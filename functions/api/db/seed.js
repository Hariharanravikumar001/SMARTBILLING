'use strict';

const bcrypt = require('bcryptjs');
const { db, get, run } = require('./index');

function seedDatabase() {
  console.log('[Database] Checking seed data...');

  // Check if platform settings exist
  const existingSetting = get('SELECT key FROM platform_settings WHERE key = ?', ['app_name']);
  if (!existingSetting) {
    console.log('[Database] Seeding platform configuration...');
    const defaultSettings = [
      ['app_name', 'Universal Billing SaaS', 'general', 'Platform working brand name', 1],
      ['company_name', 'Universal SaaS Technologies Inc.', 'general', 'Operating legal entity', 1],
      ['logo_url', '/brand-logo.svg', 'branding', 'Platform brand logo URL', 1],
      ['primary_color', '#0c87eb', 'branding', 'Platform primary brand color', 1],
      ['support_email', 'support@universalbilling.io', 'support', 'Central SaaS support email', 1],
      ['support_phone', '+91 80 4000 8800', 'support', 'Central SaaS customer care number', 1],
      ['currency', 'INR', 'billing', 'Platform default currency code', 1],
      ['currency_symbol', '₹', 'billing', 'Currency symbol for display', 1],
      ['default_trial_days', '14', 'billing', 'Default trial period duration in days', 1],
      ['grace_period_days', '7', 'billing', 'Grace period after expiration before strict lock', 0],
      ['razorpay_enabled', '1', 'payment', 'Enable Razorpay payment gateway', 0],
      ['razorpay_key_id', 'rzp_test_placeholder_key', 'payment', 'Razorpay Public Key ID', 0],
      ['cashfree_enabled', '1', 'payment', 'Enable Cashfree payment gateway', 0],
      ['cashfree_app_id', 'cf_test_placeholder_id', 'payment', 'Cashfree App ID', 0],
      ['allow_public_registration', '1', 'general', 'Allow self-serve business signups', 1],
      ['maintenance_mode', '0', 'system', 'Set platform in maintenance mode', 1]
    ];

    const stmt = db.prepare(`
      INSERT INTO platform_settings (key, value, category, description, is_public)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const s of defaultSettings) {
      stmt.run(...s);
    }
  }

  // Check if super admin user exists
  const existingAdmin = get('SELECT id FROM platform_users WHERE email = ?', ['admin@universalbilling.io']);
  if (!existingAdmin) {
    console.log('[Database] Seeding Super Admin user...');
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('SuperAdmin@2026!', salt);

    run(`
      INSERT INTO platform_users (id, name, email, password_hash, role, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `, ['user_admin_01', 'Chief Administrator', 'admin@universalbilling.io', hash, 'Super Admin', 1]);

    const opsHash = bcrypt.hashSync('PlatformOps@2026!', salt);
    run(`
      INSERT INTO platform_users (id, name, email, password_hash, role, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `, ['user_admin_02', 'DevOps & Technical Lead', 'ops@universalbilling.io', opsHash, 'Technical Administrator', 1]);
  }

  // Check subscription plans
  const existingPlan = get('SELECT id FROM subscription_plans WHERE id = ?', ['plan_monthly']);
  if (!existingPlan) {
    console.log('[Database] Seeding default configurable subscription plans...');
    const plans = [
      {
        id: 'plan_monthly',
        name: 'Monthly Starter',
        billing_interval: 'MONTHLY',
        duration_days: 30,
        price_inr: 499,
        original_price_inr: 699,
        is_active: 1,
        is_popular: 0,
        trial_days: 14,
        max_users: 2,
        max_branches: 1,
        max_products: 500,
        max_invoices_per_month: 1000,
        max_devices: 2,
        max_storage_mb: 500,
        features: JSON.stringify([
          'POS High-Speed Billing',
          'Product Exchange & Returns',
          'Inventory Tracking',
          'GST & Non-GST Invoicing',
          'Thermal & A4 Receipts',
          '1 Store Location / 2 Staff'
        ])
      },
      {
        id: 'plan_quarterly',
        name: 'Quarterly Growth',
        billing_interval: 'QUARTERLY',
        duration_days: 90,
        price_inr: 1399,
        original_price_inr: 1899,
        is_active: 1,
        is_popular: 1,
        trial_days: 14,
        max_users: 5,
        max_branches: 2,
        max_products: 2500,
        max_invoices_per_month: 5000,
        max_devices: 5,
        max_storage_mb: 2000,
        features: JSON.stringify([
          'All Starter Features',
          'Up to 2 Branch Stores',
          'Cash Register & Shift Mgmt',
          'Supplier & Purchase Orders',
          'Customer Loyalty & Points',
          'Expenses & Profit/Loss'
        ])
      },
      {
        id: 'plan_half_yearly',
        name: 'Half-Yearly Pro',
        billing_interval: 'HALF_YEARLY',
        duration_days: 180,
        price_inr: 2599,
        original_price_inr: 3499,
        is_active: 1,
        is_popular: 0,
        trial_days: 14,
        max_users: 10,
        max_branches: 4,
        max_products: 10000,
        max_invoices_per_month: 20000,
        max_devices: 10,
        max_storage_mb: 5000,
        features: JSON.stringify([
          'All Growth Features',
          'Up to 4 Branch Stores',
          'Multi-Branch Stock Transfers',
          'Batch & Expiry Date Mgmt',
          'WhatsApp / SMS Alerts',
          'Zoho Desk Priority Support'
        ])
      },
      {
        id: 'plan_yearly',
        name: 'Yearly Enterprise Value',
        billing_interval: 'YEARLY',
        duration_days: 365,
        price_inr: 4999,
        original_price_inr: 7999,
        is_active: 1,
        is_popular: 0,
        trial_days: 14,
        max_users: 25,
        max_branches: 10,
        max_products: 999999,
        max_invoices_per_month: 999999,
        max_devices: 25,
        max_storage_mb: 20000,
        features: JSON.stringify([
          'All Pro Features',
          'Unlimited Invoices & Products',
          'Up to 10 Branches / Warehouses',
          'IMEI & Serial Number Tracking',
          'Zoho CRM & Desk Integration',
          'Dedicated Account Support',
          'Custom Invoice Templates'
        ])
      }
    ];

    const planStmt = db.prepare(`
      INSERT INTO subscription_plans (
        id, name, billing_interval, duration_days, price_inr, original_price_inr,
        is_active, is_popular, trial_days, max_users, max_branches, max_products,
        max_invoices_per_month, max_devices, max_storage_mb, features_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const p of plans) {
      planStmt.run(
        p.id, p.name, p.billing_interval, p.duration_days, p.price_inr, p.original_price_inr,
        p.is_active, p.is_popular, p.trial_days, p.max_users, p.max_branches, p.max_products,
        p.max_invoices_per_month, p.max_devices, p.max_storage_mb, p.features
      );
    }
  }

  // Seed coupons
  const existingCoupon = get('SELECT id FROM coupons WHERE code = ?', ['WELCOME50']);
  if (!existingCoupon) {
    run(`
      INSERT INTO coupons (id, code, description, discount_type, discount_value, min_amount, max_discount, max_uses, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, ['cpn_01', 'WELCOME50', '50% off on first subscription purchase', 'PERCENTAGE', 50.0, 400, 2000, 500, 1]);

    run(`
      INSERT INTO coupons (id, code, description, discount_type, discount_value, min_amount, max_discount, max_uses, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, ['cpn_02', 'SAVE1000', 'Flat ₹1,000 off on Yearly plans', 'FIXED', 1000.0, 4500, 1000, 200, 1]);
  }

  // Check demo business
  const existingBiz = get('SELECT id FROM businesses WHERE id = ?', ['biz_apex_demo']);
  if (!existingBiz) {
    console.log('[Database] Seeding demo business & shopkeeper credentials...');
    run(`
      INSERT INTO businesses (
        id, name, slug, email, phone, gstin, address, city, state, pincode,
        currency, currency_symbol, status, industry_type, account_manager, internal_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'biz_apex_demo',
      'Apex Retail & Apparel',
      'apex-retail',
      'owner@apexretail.com',
      '+91 98450 12345',
      '29AAAAA0000A1Z5',
      '#42 Commercial Street, Tasker Town',
      'Bengaluru',
      'Karnataka',
      '560001',
      'INR',
      '₹',
      'ACTIVE',
      'clothing',
      'Chief Administrator',
      'Flagship demo retail store showcasing apparel variants, POS billing & dedicated exchanges.'
    ]);

    // Branches
    run(`
      INSERT INTO business_branches (id, business_id, name, code, phone, address, is_main, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, ['branch_apex_main', 'biz_apex_demo', 'Main Store - Commercial Street', 'BR-01', '+91 98450 12345', 'Commercial St, Bengaluru', 1, 1]);

    run(`
      INSERT INTO business_branches (id, business_id, name, code, phone, address, is_main, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, ['branch_apex_outlet', 'biz_apex_demo', 'Express Outlet - Indiranagar', 'BR-02', '+91 98450 67890', '100ft Rd, Indiranagar', 0, 1]);

    // Business Settings
    run(`
      INSERT INTO business_settings (
        business_id, tax_type, default_tax_rate, enable_cgst_sgst, invoice_prefix,
        invoice_footer, terms_conditions, thermal_printer_width, enable_loyalty,
        loyalty_points_per_100, exchange_period_days
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'biz_apex_demo',
      'GST',
      12.0,
      1,
      'APX',
      'Thank you for shopping at Apex Retail! Visit again.',
      'Exchange allowed within 15 days with original invoice. Defective items will be replaced or refunded.',
      '80mm',
      1,
      2.0,
      15
    ]);

    // Business Users
    const salt = bcrypt.genSaltSync(10);
    const ownerHash = bcrypt.hashSync('Owner@2026!', salt);
    run(`
      INSERT INTO business_users (id, business_id, branch_id, name, email, password_hash, pin, role, phone, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, ['user_apex_owner', 'biz_apex_demo', 'branch_apex_main', 'Vikramaditya Rao', 'owner@apex.com', ownerHash, '1234', 'Owner', '+91 98450 12345', 1]);

    const cashierHash = bcrypt.hashSync('Cashier@2026!', salt);
    run(`
      INSERT INTO business_users (id, business_id, branch_id, name, email, password_hash, pin, role, phone, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, ['user_apex_cashier', 'biz_apex_demo', 'branch_apex_main', 'Sumanth Kumar', 'cashier@apex.com', cashierHash, '9999', 'Cashier', '+91 98450 54321', 1]);

    // Active Yearly Subscription
    const now = new Date();
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 360);

    run(`
      INSERT INTO subscriptions (
        id, business_id, plan_id, status, start_date, expires_at, auto_renew, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, ['sub_apex_01', 'biz_apex_demo', 'plan_yearly', 'ACTIVE', now.toISOString(), expiry.toISOString(), 1, 'Active Yearly Enterprise Value tier.']);

    // Record demo payment
    run(`
      INSERT INTO subscription_payments (
        id, subscription_id, business_id, plan_id, amount, gateway, gateway_order_id, gateway_payment_id, status, receipt_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, ['spay_apex_01', 'sub_apex_01', 'biz_apex_demo', 'plan_yearly', 4999.0, 'RAZORPAY', 'order_demo_101', 'pay_demo_101', 'SUCCESS', 'RCPT-2026-0001']);

    // Categories
    run(`INSERT INTO categories (id, business_id, name, description) VALUES (?, ?, ?, ?)`, ['cat_apparel', 'biz_apex_demo', 'Apparel & Menswear', 'Shirts, T-shirts, Trousers']);
    run(`INSERT INTO categories (id, business_id, name, description) VALUES (?, ?, ?, ?)`, ['cat_footwear', 'biz_apex_demo', 'Footwear', 'Casual and formal shoes']);
    run(`INSERT INTO categories (id, business_id, name, description) VALUES (?, ?, ?, ?)`, ['cat_accessories', 'biz_apex_demo', 'Accessories & Electronics', 'Belts, Wallets, Smartwatches']);

    // Brands
    run(`INSERT INTO brands (id, business_id, name) VALUES (?, ?, ?)`, ['brand_oxford', 'biz_apex_demo', 'Oxford Club']);
    run(`INSERT INTO brands (id, business_id, name) VALUES (?, ?, ?)`, ['brand_urban', 'biz_apex_demo', 'Urban Walk']);

    // Products
    const products = [
      {
        id: 'prod_shirt_01',
        name: 'Classic Linen Oxford Shirt',
        sku: 'SHIRT-LINEN-01',
        barcode: '890100100101',
        category_id: 'cat_apparel',
        brand_id: 'brand_oxford',
        unit: 'PCS',
        purchase_price: 650.0,
        selling_price: 1299.0,
        mrp: 1499.0,
        wholesale_price: 950.0,
        tax_rate: 12.0,
        hsn_code: '6205',
        has_variants: 1,
        industry_data: JSON.stringify({ material: '100% Pure Linen', fit: 'Slim Fit' })
      },
      {
        id: 'prod_tshirt_02',
        name: 'Premium Crew Neck T-Shirt',
        sku: 'TSHIRT-CREW-02',
        barcode: '890100100202',
        category_id: 'cat_apparel',
        brand_id: 'brand_urban',
        unit: 'PCS',
        purchase_price: 320.0,
        selling_price: 799.0,
        mrp: 999.0,
        wholesale_price: 550.0,
        tax_rate: 5.0,
        hsn_code: '6109',
        has_variants: 0,
        industry_data: JSON.stringify({ material: 'Combed Cotton', color: 'Navy Blue', size: 'L' })
      },
      {
        id: 'prod_sneaker_03',
        name: 'Urban Glide Casual Sneakers',
        sku: 'SNEAKER-GLIDE-03',
        barcode: '890100100303',
        category_id: 'cat_footwear',
        brand_id: 'brand_urban',
        unit: 'PAIR',
        purchase_price: 1100.0,
        selling_price: 2499.0,
        mrp: 2999.0,
        wholesale_price: 1800.0,
        tax_rate: 18.0,
        hsn_code: '6404',
        has_variants: 0,
        industry_data: JSON.stringify({ size: 'UK 9', color: 'White/Grey' })
      },
      {
        id: 'prod_smartwatch_04',
        name: 'Apex Horizon AMOLED Smartwatch',
        sku: 'WATCH-HORIZON-04',
        barcode: '890100100404',
        category_id: 'cat_accessories',
        brand_id: 'brand_urban',
        unit: 'PCS',
        purchase_price: 1850.0,
        selling_price: 3499.0,
        mrp: 4999.0,
        wholesale_price: 2500.0,
        tax_rate: 18.0,
        hsn_code: '8517',
        has_variants: 0,
        industry_data: JSON.stringify({ imei_serial: 'APX-SN-998822', warranty_months: 12 })
      },
      {
        id: 'prod_leather_belt_05',
        name: 'Full-Grain Reversible Leather Belt',
        sku: 'BELT-LEATHER-05',
        barcode: '890100100505',
        category_id: 'cat_accessories',
        brand_id: 'brand_oxford',
        unit: 'PCS',
        purchase_price: 280.0,
        selling_price: 699.0,
        mrp: 899.0,
        wholesale_price: 450.0,
        tax_rate: 18.0,
        hsn_code: '4203',
        has_variants: 0,
        industry_data: JSON.stringify({ material: 'Leather', color: 'Black/Brown' })
      }
    ];

    const prodStmt = db.prepare(`
      INSERT INTO products (
        id, business_id, name, sku, barcode, category_id, brand_id, unit,
        purchase_price, selling_price, mrp, wholesale_price, tax_rate, hsn_code,
        has_variants, industry_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const p of products) {
      prodStmt.run(
        p.id, 'biz_apex_demo', p.name, p.sku, p.barcode, p.category_id, p.brand_id, p.unit,
        p.purchase_price, p.selling_price, p.mrp, p.wholesale_price, p.tax_rate, p.hsn_code,
        p.has_variants, p.industry_data
      );
    }

    // Variants for Oxford Shirt
    const variants = [
      { id: 'var_shirt_m_blue', name: 'Size: M / Color: Sky Blue', sku: 'SHIRT-LINEN-M-BLU', barcode: '890100100111', size: 'M', color: 'Sky Blue' },
      { id: 'var_shirt_l_blue', name: 'Size: L / Color: Sky Blue', sku: 'SHIRT-LINEN-L-BLU', barcode: '890100100112', size: 'L', color: 'Sky Blue' },
      { id: 'var_shirt_l_white', name: 'Size: L / Color: Crisp White', sku: 'SHIRT-LINEN-L-WHT', barcode: '890100100113', size: 'L', color: 'Crisp White' }
    ];

    for (const v of variants) {
      run(`
        INSERT INTO product_variants (
          id, business_id, product_id, variant_name, sku, barcode, size, color,
          purchase_price, selling_price, mrp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [v.id, 'biz_apex_demo', 'prod_shirt_01', v.name, v.sku, v.barcode, v.size, v.color, 650.0, 1299.0, 1499.0]);
    }

    // Initialize stock for branches
    const stockEntries = [
      ['stock_01', 'biz_apex_demo', 'branch_apex_main', 'prod_shirt_01', 'var_shirt_m_blue', 25],
      ['stock_02', 'biz_apex_demo', 'branch_apex_main', 'prod_shirt_01', 'var_shirt_l_blue', 30],
      ['stock_03', 'biz_apex_demo', 'branch_apex_main', 'prod_shirt_01', 'var_shirt_l_white', 18],
      ['stock_04', 'biz_apex_demo', 'branch_apex_main', 'prod_tshirt_02', null, 50],
      ['stock_05', 'biz_apex_demo', 'branch_apex_main', 'prod_sneaker_03', null, 20],
      ['stock_06', 'biz_apex_demo', 'branch_apex_main', 'prod_smartwatch_04', null, 15],
      ['stock_07', 'biz_apex_demo', 'branch_apex_main', 'prod_leather_belt_05', null, 40],
      // Outlet stock
      ['stock_08', 'biz_apex_demo', 'branch_apex_outlet', 'prod_tshirt_02', null, 25],
      ['stock_09', 'biz_apex_demo', 'branch_apex_outlet', 'prod_sneaker_03', null, 10]
    ];

    for (const s of stockEntries) {
      run(`
        INSERT INTO stock (id, business_id, branch_id, product_id, variant_id, quantity)
        VALUES (?, ?, ?, ?, ?, ?)
      `, s);
    }

    // Customers
    run(`
      INSERT INTO customers (id, business_id, name, phone, email, credit_limit, outstanding_balance, loyalty_points)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, ['cust_01', 'biz_apex_demo', 'Rahul Sharma', '+91 98111 22233', 'rahul.s@gmail.com', 5000.0, 0.0, 150.0]);

    run(`
      INSERT INTO customers (id, business_id, name, phone, email, credit_limit, outstanding_balance, loyalty_points)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, ['cust_02', 'biz_apex_demo', 'Priya Patel', '+91 98222 33344', 'priya.patel@outlook.com', 10000.0, 1200.0, 320.0]);

    // Supplier
    run(`
      INSERT INTO suppliers (id, business_id, name, company_name, gstin, phone, email, outstanding_payable)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, ['supp_01', 'biz_apex_demo', 'Kailash Textiles Ltd', 'Kailash Mills Surat', '24AAACK1234B1Z2', '+91 98250 99887', 'orders@kailashtextiles.com', 18500.0]);

    // Open an initial Cash Register shift
    run(`
      INSERT INTO cash_registers (id, business_id, branch_id, user_id, user_name, opening_time, opening_cash, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, ['reg_apex_01', 'biz_apex_demo', 'branch_apex_main', 'user_apex_cashier', 'Sumanth Kumar', now.toISOString(), 2500.0, 'OPEN']);

    // Seed software versions
    run(`
      INSERT INTO software_versions (id, version_tag, release_name, release_notes, is_critical, release_date, is_deployed)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      'ver_01',
      'v1.0.0-PROD',
      'Universal Billing Initial Production Launch',
      'Full Multi-tenant SaaS, POS billing with high-speed barcode checkout, Dedicated Product Exchange module, ACID transactional inventory, Zoho CRM and Zoho Desk integrations.',
      0,
      '2026-11-05',
      1
    ]);

    // Seed feature flags
    run(`
      INSERT INTO feature_flags (id, flag_key, name, description, is_enabled_globally)
      VALUES (?, ?, ?, ?, ?)
    `, ['flag_01', 'enable_product_exchange', 'Dedicated Product Exchange Module', 'Permit dedicated item-for-item differential exchange workflow', 1]);

    run(`
      INSERT INTO feature_flags (id, flag_key, name, description, is_enabled_globally)
      VALUES (?, ?, ?, ?, ?)
    `, ['flag_02', 'enable_thermal_printer', 'Thermal 58mm/80mm ESC/POS Printing', 'Enable direct thermal receipt generation', 1]);

    run(`
      INSERT INTO feature_flags (id, flag_key, name, description, is_enabled_globally)
      VALUES (?, ?, ?, ?, ?)
    `, ['flag_03', 'enable_zoho_sync', 'Zoho CRM & Desk Cloud Sync', 'Automate lead generation and support tickets', 1]);
  }

  console.log('[Database] Seed initialization complete.');
}

module.exports = {
  seedDatabase
};
