# 08. Database Audit Report

**Project:** Universal Billing and POS SaaS (SMARTBILLING)  
**Auditor:** Principal Database Architect & Data Integrity Engineer  
**Audit Date:** November 6, 2026  
**Status:** Audit Complete — No Fixes Applied  

---

## Executive Summary

The database architecture is built on a multi-tenant relational schema implemented in SQLite (`functions/api/db/schema.js`), running under a dual driver (`node:sqlite` or `sql.js` WASM). The schema spans **32 tables**, enforcing foreign keys, cascade deletes, and composite business keys.

The audit identifies **critical upsert key mismatches in inventory tables, complete absence of secondary performance indexes on high-throughput transaction tables, lack of soft-deletion columns, and potential floating-point rounding hazards in financial totals.**

---

## Database Schema & Multi-Tenant Isolation Analysis

| Schema Layer | Table Count | Multi-Tenant Key | Cascade Policy | Isolation Status |
| :--- | :--- | :--- | :--- | :--- |
| **Platform Management** | 3 (`platform_settings`, `platform_users`, `audit_logs`) | N/A (Global) | N/A | **Isolated** (Super Admin only) |
| **Tenant Entities** | 4 (`businesses`, `business_branches`, `business_users`, `business_settings`) | `business_id` / `id` | `ON DELETE CASCADE` | **Enforced** |
| **Subscriptions & Billing** | 5 (`subscription_plans`, `subscriptions`, `subscription_payments`, `coupons`, `coupon_redemptions`) | `business_id` | `ON DELETE CASCADE` | **Enforced** |
| **Catalog & Stock** | 5 (`categories`, `brands`, `products`, `product_variants`, `stock`, `stock_movements`) | `business_id` | `ON DELETE CASCADE` | **Enforced** |
| **CRM & Helpdesk** | 4 (`zoho_connections`, `zoho_field_mappings`, `zoho_sync_logs`, `support_tickets`) | `business_id` (tickets) | System-level | **Enforced** |
| **POS Sales & Exchanges** | 6 (`sales`, `sale_items`, `exchanges`, `exchange_items`, `sales_returns`, `sales_return_items`) | `business_id` | `ON DELETE CASCADE` | **Enforced** |
| **Accounting & Expenses** | 5 (`suppliers`, `purchases`, `purchase_items`, `expense_categories`, `expenses`, `cash_registers`) | `business_id` | `ON DELETE CASCADE` | **Enforced** |

---

## Detailed Findings & Defects

### Issue ID: DB-001
- **Issue Title:** Upsert Conflict Target Mismatch in Stock Table
- **File Path:** `functions/api/db/schema.js` (Line 309) vs `functions/api/routes/inventory.js` (Line 92, 142)
- **Component / Function Name:** `stock` DDL vs Inventory Upsert Queries
- **Description:** In `schema.js`, the composite unique constraint is defined as:
  ```sql
  UNIQUE(business_id, branch_id, product_id, variant_id)
  ```
  However, queries in `inventory.js` and `suppliers.js` attempt to upsert using:
  ```sql
  ON CONFLICT(id) DO UPDATE SET quantity = ...
  ```
  If a row already exists with a different `id` (e.g. from initial seed data or generated `uuid`), SQLite evaluates the composite constraint first and aborts with:
  `SQLITE_CONSTRAINT: UNIQUE constraint failed: stock.business_id, stock.branch_id, stock.product_id, stock.variant_id`.
- **Why It Is a Problem:** Purchase receiving, branch transfers, and stock adjustments fail catastrophically during runtime.
- **Severity:** CRITICAL
- **Recommended Solution:** Align upsert statements to explicitly target the business composite key:
  ```sql
  ON CONFLICT(business_id, branch_id, product_id, variant_id)
  DO UPDATE SET quantity = excluded.quantity, updated_at = CURRENT_TIMESTAMP
  ```
- **Dependencies:** `functions/api/routes/inventory.js`, `functions/api/routes/suppliers.js`.
- **Testing Required:** Execute stock transfer for an existing item; confirm successful upsert without SQLITE_CONSTRAINT failure.

---

### Issue ID: DB-002
- **Issue Title:** Missing Performance Indexes on Core Transaction & Lookup Tables
- **File Path:** `functions/api/db/schema.js`
- **Component / Function Name:** Index Definitions
- **Description:** There are **zero explicit secondary indexes** defined in `schema.js`. Key transaction queries perform full table scans:
  - POS barcode search: `SELECT * FROM products WHERE business_id = ? AND barcode = ?` (Scans entire product table).
  - Invoice lookup: `SELECT * FROM sales WHERE business_id = ? AND invoice_no = ?`.
  - Sales report range: `SELECT * FROM sales WHERE business_id = ? AND created_at BETWEEN ? AND ?`.
  - Sale items join: `SELECT * FROM sale_items WHERE sale_id = ?`.
- **Why It Is a Problem:** While performant on small seed databases, querying tables with 20,000+ sales or products causes POS scanning latency and high server CPU usage.
- **Severity:** HIGH
- **Recommended Solution:** Add targeted compound indexes in `schema.js`:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(business_id, barcode);
  CREATE INDEX IF NOT EXISTS idx_products_sku ON products(business_id, sku);
  CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(business_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
  CREATE INDEX IF NOT EXISTS idx_stock_lookup ON stock(business_id, branch_id, product_id, variant_id);
  CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(business_id, phone);
  ```
- **Dependencies:** `functions/api/db/schema.js`.
- **Testing Required:** Execute `EXPLAIN QUERY PLAN` on POS lookup query; verify `SEARCH TABLE products USING INDEX idx_products_barcode`.

---

### Issue ID: DB-003
- **Issue Title:** Lack of Soft Deletion (`deleted_at`) on Master Records
- **File Path:** `functions/api/db/schema.js` (`products`, `customers`, `suppliers`, `expenses`)
- **Component / Function Name:** Table Definitions
- **Description:** Master records (`products`, `customers`, `suppliers`) only possess `is_active` flags or no deletion tracking at all. Hard-deleting a product or customer that has foreign key references in historical `sale_items` triggers foreign key integrity errors or nullifies sales historical records.
- **Why It Is a Problem:** Historical invoices lose customer reference data, and past sales reports can no longer identify the purchased product if deleted.
- **Severity:** MEDIUM
- **Recommended Solution:** Standardize soft-deletion pattern across master tables: add `deleted_at DATETIME` column and filter active queries with `WHERE deleted_at IS NULL`.
- **Dependencies:** `schema.js`, CRUD routes.
- **Testing Required:** Delete a customer with historical sales; verify customer is hidden from POS autocomplete while historical invoices retain customer name.

---

### Issue ID: DB-004
- **Issue Title:** Floating-Point `REAL` Column Storage for Financial Balances
- **File Path:** `functions/api/db/schema.js` (`sales.grand_total`, `sales.tax_amount`, `customers.outstanding_balance`)
- **Component / Function Name:** Column Data Types
- **Description:** Financial amounts are stored as SQLite `REAL` (IEEE 754 64-bit floating point).
- **Why It Is a Problem:** Performing SQL aggregations like `SUM(grand_total)` or consecutive tax additions can accumulate floating-point representation drift (e.g. `104.99999999999999` instead of `105.00`), causing minor fractional cent/paisa balance mismatches in ledger audits.
- **Severity:** LOW
- **Recommended Solution:** Enforce standard rounding at the application layer (`Math.round(val * 100) / 100`) before persistence, or store currency in integer minor units (paise/cents).
- **Dependencies:** Financial calculation utilities.
- **Testing Required:** Run 1,000 fractional tax transactions; verify sum matches exact arithmetic total.
