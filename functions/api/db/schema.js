'use strict';

const { db } = require('./index');

function initSchema() {
  console.log('[Database] Applying multi-tenant schema DDL...');

  db.exec(`
    -- 1. PLATFORM CONFIGURATION & USERS
    CREATE TABLE IF NOT EXISTS platform_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      description TEXT,
      is_public INTEGER DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS platform_users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Platform Administrator',
      mfa_enabled INTEGER DEFAULT 0,
      mfa_secret TEXT,
      phone TEXT,
      is_active INTEGER DEFAULT 1,
      last_login_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      business_id TEXT,
      actor_type TEXT NOT NULL, -- 'PLATFORM_USER' | 'BUSINESS_USER' | 'SYSTEM' | 'WEBHOOK'
      actor_id TEXT,
      actor_name TEXT,
      action TEXT NOT NULL,
      resource TEXT NOT NULL,
      resource_id TEXT,
      ip_address TEXT,
      details TEXT, -- JSON
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 2. TENANTS (BUSINESSES) & BRANCHES
    CREATE TABLE IF NOT EXISTS businesses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      gstin TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      pincode TEXT,
      currency TEXT DEFAULT 'INR',
      currency_symbol TEXT DEFAULT '₹',
      status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'TRIAL', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'PENDING'
      industry_type TEXT DEFAULT 'retail', -- 'grocery', 'clothing', 'electronics', 'hardware', 'restaurant', 'pharmacy', 'retail'
      logo_url TEXT,
      account_manager TEXT,
      internal_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS business_branches (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      is_main INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS business_users (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      branch_id TEXT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      pin TEXT, -- 4 or 6 digit quick login PIN
      role TEXT NOT NULL DEFAULT 'Cashier', -- 'Owner', 'Business Administrator', 'Manager', 'Cashier', 'Accountant', 'Stock Manager', 'Salesperson'
      phone TEXT,
      is_active INTEGER DEFAULT 1,
      last_login_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (branch_id) REFERENCES business_branches(id) ON DELETE SET NULL,
      UNIQUE(business_id, email)
    );

    CREATE TABLE IF NOT EXISTS business_settings (
      business_id TEXT PRIMARY KEY,
      tax_type TEXT DEFAULT 'GST', -- 'GST', 'VAT', 'NONE'
      default_tax_rate REAL DEFAULT 18.0,
      enable_cgst_sgst INTEGER DEFAULT 1,
      invoice_prefix TEXT DEFAULT 'INV',
      invoice_footer TEXT DEFAULT 'Thank you for your business!',
      terms_conditions TEXT,
      thermal_printer_width TEXT DEFAULT '80mm', -- '58mm', '80mm'
      enable_loyalty INTEGER DEFAULT 1,
      loyalty_points_per_100 REAL DEFAULT 1.0,
      loyalty_redemption_rate REAL DEFAULT 1.0, -- 1 point = ₹1
      enable_barcode_scanner INTEGER DEFAULT 1,
      exchange_period_days INTEGER DEFAULT 15,
      allow_credit_sales INTEGER DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS onboarding_records (
      business_id TEXT PRIMARY KEY,
      step_store_details INTEGER DEFAULT 0,
      step_tax_configured INTEGER DEFAULT 0,
      step_first_product INTEGER DEFAULT 0,
      step_first_sale INTEGER DEFAULT 0,
      step_printer_setup INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    -- 3. SUBSCRIPTION PLANS & ENTITLEMENTS
    CREATE TABLE IF NOT EXISTS subscription_plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL, -- 'Monthly', 'Quarterly', 'Half-yearly', 'Yearly', 'Enterprise'
      billing_interval TEXT NOT NULL, -- 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'
      duration_days INTEGER NOT NULL,
      price_inr REAL NOT NULL,
      original_price_inr REAL,
      is_active INTEGER DEFAULT 1,
      is_popular INTEGER DEFAULT 0,
      trial_days INTEGER DEFAULT 14,
      max_users INTEGER DEFAULT 2,
      max_branches INTEGER DEFAULT 1,
      max_products INTEGER DEFAULT 500,
      max_invoices_per_month INTEGER DEFAULT 1000,
      max_devices INTEGER DEFAULT 2,
      max_storage_mb INTEGER DEFAULT 500,
      features_json TEXT, -- JSON array of feature strings
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'TRIAL', -- 'TRIAL', 'ACTIVE', 'GRACE_PERIOD', 'EXPIRED', 'CANCELLED'
      start_date DATETIME NOT NULL,
      expires_at DATETIME NOT NULL,
      trial_end_at DATETIME,
      grace_end_at DATETIME,
      auto_renew INTEGER DEFAULT 1,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
    );

    CREATE TABLE IF NOT EXISTS subscription_payments (
      id TEXT PRIMARY KEY,
      subscription_id TEXT,
      business_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'INR',
      gateway TEXT NOT NULL, -- 'RAZORPAY', 'CASHFREE', 'MANUAL'
      gateway_order_id TEXT,
      gateway_payment_id TEXT,
      gateway_signature TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'
      receipt_number TEXT,
      failure_reason TEXT,
      metadata TEXT, -- JSON
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      discount_type TEXT NOT NULL, -- 'PERCENTAGE', 'FIXED'
      discount_value REAL NOT NULL,
      min_amount REAL DEFAULT 0,
      max_discount REAL,
      valid_from DATETIME,
      valid_to DATETIME,
      max_uses INTEGER DEFAULT 100,
      used_count INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS coupon_redemptions (
      id TEXT PRIMARY KEY,
      coupon_id TEXT NOT NULL,
      business_id TEXT NOT NULL,
      payment_id TEXT,
      discount_applied REAL NOT NULL,
      redeemed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (coupon_id) REFERENCES coupons(id),
      FOREIGN KEY (business_id) REFERENCES businesses(id)
    );

    CREATE TABLE IF NOT EXISTS payment_webhooks (
      id TEXT PRIMARY KEY,
      gateway TEXT NOT NULL,
      event_type TEXT NOT NULL,
      event_id TEXT UNIQUE,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PROCESSED', -- 'RECEIVED', 'PROCESSED', 'FAILED', 'IGNORED'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 4. PRODUCTS, CATEGORIES, BRANDS & INVENTORY
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS brands (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      sku TEXT NOT NULL,
      barcode TEXT,
      category_id TEXT,
      brand_id TEXT,
      unit TEXT DEFAULT 'PCS', -- 'PCS', 'KG', 'MTR', 'LTR', 'BOX', 'PACK'
      purchase_price REAL DEFAULT 0.0,
      selling_price REAL NOT NULL,
      mrp REAL NOT NULL,
      wholesale_price REAL,
      tax_rate REAL DEFAULT 18.0, -- GST % (0, 5, 12, 18, 28)
      hsn_code TEXT,
      min_stock_alert INTEGER DEFAULT 5,
      is_active INTEGER DEFAULT 1,
      has_variants INTEGER DEFAULT 0,
      industry_data TEXT, -- JSON for industry fields: size, color, imei, batch_no, expiry_date, weight, warranty_months
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
      FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL,
      UNIQUE(business_id, sku)
    );

    CREATE TABLE IF NOT EXISTS product_variants (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      variant_name TEXT NOT NULL, -- e.g. "Size: L / Color: Blue"
      sku TEXT NOT NULL,
      barcode TEXT,
      size TEXT,
      color TEXT,
      price_delta REAL DEFAULT 0.0,
      purchase_price REAL,
      selling_price REAL,
      mrp REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE(business_id, sku)
    );

    CREATE TABLE IF NOT EXISTS stock (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      variant_id TEXT,
      quantity REAL NOT NULL DEFAULT 0,
      batch_no TEXT,
      expiry_date DATE,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (branch_id) REFERENCES business_branches(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
      UNIQUE(business_id, branch_id, product_id, variant_id)
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      variant_id TEXT,
      change_qty REAL NOT NULL,
      balance_qty REAL NOT NULL,
      type TEXT NOT NULL, -- 'SALE', 'EXCHANGE_IN', 'EXCHANGE_OUT', 'RETURN', 'PURCHASE', 'ADJUSTMENT', 'TRANSFER', 'DEFECTIVE'
      reason TEXT,
      ref_id TEXT, -- sale_id, exchange_id, return_id, purchase_id
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    -- 5. CUSTOMERS & LOYALTY
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      gstin TEXT,
      address TEXT,
      credit_limit REAL DEFAULT 0.0,
      outstanding_balance REAL DEFAULT 0.0,
      loyalty_points REAL DEFAULT 0.0,
      customer_group TEXT DEFAULT 'Retail',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      UNIQUE(business_id, phone)
    );

    CREATE TABLE IF NOT EXISTS customer_loyalty_ledger (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      points_change REAL NOT NULL,
      reason TEXT NOT NULL,
      ref_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    -- 6. POS SALES & INVOICES
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      invoice_no TEXT NOT NULL,
      customer_id TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      cashier_id TEXT,
      cashier_name TEXT,
      invoice_type TEXT DEFAULT 'TAX_INVOICE', -- 'TAX_INVOICE', 'BILL_OF_SUPPLY', 'ESTIMATE', 'PROFORMA'
      subtotal REAL NOT NULL,
      tax_amount REAL NOT NULL,
      cgst_amount REAL DEFAULT 0.0,
      sgst_amount REAL DEFAULT 0.0,
      igst_amount REAL DEFAULT 0.0,
      discount_amount REAL DEFAULT 0.0,
      delivery_charge REAL DEFAULT 0.0,
      round_off REAL DEFAULT 0.0,
      grand_total REAL NOT NULL,
      payment_method TEXT NOT NULL, -- 'CASH', 'UPI', 'CARD', 'SPLIT', 'CREDIT'
      payment_details TEXT, -- JSON for split payments {cash: 500, upi: 300}
      payment_status TEXT NOT NULL DEFAULT 'PAID', -- 'PAID', 'PARTIAL', 'DUE'
      cash_tendered REAL,
      change_due REAL,
      loyalty_points_earned REAL DEFAULT 0.0,
      loyalty_points_redeemed REAL DEFAULT 0.0,
      is_held INTEGER DEFAULT 0,
      hold_reference TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (branch_id) REFERENCES business_branches(id) ON DELETE CASCADE,
      UNIQUE(business_id, invoice_no)
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      business_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      variant_id TEXT,
      product_name TEXT NOT NULL,
      sku TEXT NOT NULL,
      barcode TEXT,
      quantity REAL NOT NULL,
      unit TEXT DEFAULT 'PCS',
      unit_price REAL NOT NULL,
      tax_rate REAL DEFAULT 0.0,
      tax_amount REAL DEFAULT 0.0,
      discount_amount REAL DEFAULT 0.0,
      total_amount REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    -- 7. DEDICATED PRODUCT EXCHANGE MODULE
    CREATE TABLE IF NOT EXISTS exchanges (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      exchange_no TEXT NOT NULL,
      original_sale_id TEXT NOT NULL,
      original_invoice_no TEXT NOT NULL,
      customer_id TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      cashier_id TEXT,
      cashier_name TEXT,
      return_subtotal REAL NOT NULL,
      replacement_subtotal REAL NOT NULL,
      diff_amount REAL NOT NULL, -- positive = customer pays; negative = store refunds
      payment_method TEXT, -- CASH, UPI, CARD, STORE_CREDIT
      payment_status TEXT NOT NULL DEFAULT 'COMPLETED',
      cash_register_id TEXT,
      reason TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (branch_id) REFERENCES business_branches(id) ON DELETE CASCADE,
      FOREIGN KEY (original_sale_id) REFERENCES sales(id),
      UNIQUE(business_id, exchange_no)
    );

    CREATE TABLE IF NOT EXISTS exchange_items (
      id TEXT PRIMARY KEY,
      exchange_id TEXT NOT NULL,
      business_id TEXT NOT NULL,
      item_type TEXT NOT NULL, -- 'RETURN' (item brought back) or 'REPLACEMENT' (item given out)
      product_id TEXT NOT NULL,
      variant_id TEXT,
      product_name TEXT NOT NULL,
      sku TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      tax_rate REAL DEFAULT 0.0,
      tax_amount REAL DEFAULT 0.0,
      total_amount REAL NOT NULL,
      condition TEXT DEFAULT 'GOOD', -- 'GOOD' (restock) or 'DEFECTIVE' (quarantine/writeoff)
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (exchange_id) REFERENCES exchanges(id) ON DELETE CASCADE,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    -- 8. SALES RETURNS (REGULAR)
    CREATE TABLE IF NOT EXISTS sales_returns (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      return_no TEXT NOT NULL,
      original_sale_id TEXT NOT NULL,
      original_invoice_no TEXT NOT NULL,
      customer_id TEXT,
      customer_name TEXT,
      cashier_id TEXT,
      total_refund_amount REAL NOT NULL,
      refund_method TEXT NOT NULL, -- 'CASH', 'UPI', 'CREDIT_NOTE'
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (original_sale_id) REFERENCES sales(id),
      UNIQUE(business_id, return_no)
    );

    CREATE TABLE IF NOT EXISTS sales_return_items (
      id TEXT PRIMARY KEY,
      return_id TEXT NOT NULL,
      business_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      variant_id TEXT,
      product_name TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      refund_amount REAL NOT NULL,
      restock_condition TEXT DEFAULT 'GOOD',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (return_id) REFERENCES sales_returns(id) ON DELETE CASCADE
    );

    -- 9. PURCHASES & SUPPLIERS
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      company_name TEXT,
      gstin TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      outstanding_payable REAL DEFAULT 0.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      supplier_id TEXT NOT NULL,
      supplier_invoice_no TEXT,
      purchase_date DATE NOT NULL,
      subtotal REAL NOT NULL,
      tax_amount REAL NOT NULL,
      total_amount REAL NOT NULL,
      paid_amount REAL DEFAULT 0.0,
      balance_amount REAL DEFAULT 0.0,
      payment_status TEXT NOT NULL DEFAULT 'PAID', -- 'PAID', 'PARTIAL', 'DUE'
      payment_method TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS purchase_items (
      id TEXT PRIMARY KEY,
      purchase_id TEXT NOT NULL,
      business_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      variant_id TEXT,
      product_name TEXT NOT NULL,
      quantity REAL NOT NULL,
      purchase_price REAL NOT NULL,
      tax_rate REAL DEFAULT 0.0,
      total_amount REAL NOT NULL,
      FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE
    );

    -- 10. CASH REGISTERS & SHIFTS
    CREATE TABLE IF NOT EXISTS cash_registers (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      opening_time DATETIME NOT NULL,
      closing_time DATETIME,
      opening_cash REAL NOT NULL,
      closing_cash REAL,
      system_expected_cash REAL,
      difference REAL,
      status TEXT NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'CLOSED'
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cash_movements (
      id TEXT PRIMARY KEY,
      register_id TEXT NOT NULL,
      business_id TEXT NOT NULL,
      type TEXT NOT NULL, -- 'CASH_IN', 'CASH_OUT', 'SALE', 'EXCHANGE_COLLECT', 'EXCHANGE_REFUND', 'EXPENSE'
      amount REAL NOT NULL,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (register_id) REFERENCES cash_registers(id) ON DELETE CASCADE
    );

    -- 11. EXPENSES & ACCOUNTING
    CREATE TABLE IF NOT EXISTS expense_categories (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      category_id TEXT,
      category_name TEXT,
      amount REAL NOT NULL,
      payment_method TEXT DEFAULT 'CASH',
      reference_no TEXT,
      description TEXT,
      expense_date DATE NOT NULL,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE SET NULL
    );

    -- 12. ZOHO INTEGRATIONS & SUPPORT TICKETS
    CREATE TABLE IF NOT EXISTS zoho_connections (
      id TEXT PRIMARY KEY,
      service TEXT NOT NULL, -- 'CRM', 'DESK', 'CATALYST'
      client_id TEXT,
      client_secret TEXT,
      refresh_token TEXT,
      access_token TEXT,
      token_expires_at DATETIME,
      api_domain TEXT DEFAULT 'https://www.zohoapis.com',
      desk_org_id TEXT,
      desk_department_id TEXT,
      is_active INTEGER DEFAULT 0,
      last_synced_at DATETIME,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS zoho_field_mappings (
      id TEXT PRIMARY KEY,
      service TEXT NOT NULL, -- 'CRM' or 'DESK'
      module_name TEXT NOT NULL, -- 'Leads', 'Accounts', 'Tickets'
      internal_field TEXT NOT NULL,
      zoho_field TEXT NOT NULL,
      direction TEXT DEFAULT 'BI_DIRECTIONAL' -- 'OUTBOUND', 'INBOUND', 'BI_DIRECTIONAL'
    );

    CREATE TABLE IF NOT EXISTS zoho_sync_logs (
      id TEXT PRIMARY KEY,
      service TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      status TEXT NOT NULL, -- 'SUCCESS', 'FAILED', 'RETRY_PENDING'
      request_payload TEXT,
      response_data TEXT,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS support_tickets (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      business_name TEXT,
      ticket_number TEXT,
      zoho_ticket_id TEXT,
      category TEXT NOT NULL, -- 'Billing issue', 'Printing issue', 'Login issue', 'Inventory issue', 'Payment issue', 'Subscription issue', 'Technical problem', 'Feature request', 'Other'
      priority TEXT DEFAULT 'Medium', -- 'Low', 'Medium', 'High', 'Urgent'
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT DEFAULT 'Open', -- 'Open', 'In Progress', 'Resolved', 'Closed'
      customer_email TEXT,
      assigned_agent TEXT,
      replies_json TEXT, -- JSON array of reply objects
      rating INTEGER,
      rating_comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    -- 13. SOFTWARE VERSION & RELEASE MANAGEMENT
    CREATE TABLE IF NOT EXISTS software_versions (
      id TEXT PRIMARY KEY,
      version_tag TEXT UNIQUE NOT NULL, -- e.g. 'v1.4.0'
      release_name TEXT NOT NULL,
      release_notes TEXT NOT NULL,
      is_critical INTEGER DEFAULT 0,
      release_date DATE NOT NULL,
      min_compatible_version TEXT,
      is_deployed INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS feature_flags (
      id TEXT PRIMARY KEY,
      flag_key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      is_enabled_globally INTEGER DEFAULT 1,
      target_plans_json TEXT, -- JSON array of plan IDs enabled for
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- INDEXES FOR MULTI-TENANT ISOLATION AND PERFORMANCE
    CREATE INDEX IF NOT EXISTS idx_products_biz ON products(business_id);
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(business_id, barcode);
    CREATE INDEX IF NOT EXISTS idx_products_sku ON products(business_id, sku);
    CREATE INDEX IF NOT EXISTS idx_stock_biz_branch ON stock(business_id, branch_id);
    CREATE INDEX IF NOT EXISTS idx_sales_biz_invoice ON sales(business_id, invoice_no);
    CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(business_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_exchanges_biz ON exchanges(business_id, exchange_no);
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(business_id, phone);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_biz ON subscriptions(business_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_biz ON audit_logs(business_id);
  `);

  console.log('[Database] Schema initialized successfully.');
}

module.exports = {
  initSchema
};
