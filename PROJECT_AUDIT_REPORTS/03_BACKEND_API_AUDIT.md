# 03. Backend API Audit Report

**Project:** Universal Billing and POS SaaS (SMARTBILLING)  
**Auditor:** Principal Backend Architect, API Security Specialist & Database Engineer  
**Audit Date:** November 6, 2026  
**Status:** Audit Complete — No Fixes Applied  

---

## Executive Summary

The backend API is implemented in Express.js under `functions/api/` with modular routing across `auth`, `admin`, `pos`, `products`, `inventory`, `invoices`, `customers`, `suppliers`, `expenses`, `reports`, `exchanges`, and `zoho`.

The audit reveals significant logic defects: Cartesian product multiplication in catalog endpoints, database constraint crashes during stock updates, missing backend endpoints for advertised frontend features, and variant-lookup blindspots in exchange workflows.

---

## Detailed Findings & Defects

### Issue ID: BE-001
- **Issue Title:** Cartesian Duplication of Products in Catalog and POS Lookups
- **File Path:** `functions/api/routes/products.js` (Line 26) & `functions/api/routes/pos.js` (Lines 29, 46)
- **Component / Function Name:** `GET /api/products` & `GET /api/pos/lookup`
- **Description:** Products are fetched using:
  ```sql
  SELECT p.*, s.quantity as stock_qty, s.rack_location
  FROM products p
  LEFT JOIN stock s ON (s.product_id = p.id AND s.branch_id = ?)
  WHERE p.business_id = ?
  ```
  When a product has variants (e.g. Size S, M, L, XL), table `stock` contains one row per variant with `variant_id != null`. Because the query joins on `s.product_id = p.id` without grouping or matching `s.variant_id IS NULL`, SQLite returns $N$ identical product rows for $N$ variants.
- **Why It Is a Problem:** A store with 100 apparel items and 4 sizes each displays 400 redundant items in the POS screen, confusing cashiers and cluttering catalog views.
- **Severity:** HIGH
- **Recommended Solution:** Use `SUM(s.quantity) AS stock_qty` with `GROUP BY p.id`, or left join only on `(s.product_id = p.id AND s.branch_id = ? AND s.variant_id IS NULL)` while querying variants in a nested array.
- **Dependencies:** `routes/products.js`, `routes/pos.js`.
- **Testing Required:** Create a product with 3 variants; query `GET /api/products`; verify exactly one product entity is returned with total aggregate stock.

---

### Issue ID: BE-002
- **Issue Title:** Stock Upsert SQLite Crash on Composite Key Conflict
- **File Path:** `functions/api/routes/inventory.js` (Lines 142, 163) & `functions/api/routes/suppliers.js` (Line 131)
- **Component / Function Name:** Stock Transfer & Purchase Receiving
- **Description:** Inventory updates use:
  ```sql
  INSERT INTO stock (id, business_id, branch_id, product_id, variant_id, quantity, ...)
  VALUES (?, ?, ?, ?, ?, ?, ...)
  ON CONFLICT(id) DO UPDATE SET quantity = quantity + ?
  ```
  However, in `schema.js`, the composite unique constraint on `stock` is:
  `UNIQUE(business_id, branch_id, product_id, variant_id)`.
  When a new generated `uuid` is passed as `id` for an existing product/variant/branch combination, `ON CONFLICT(id)` is not triggered. Instead, SQLite raises:
  `SQLITE_CONSTRAINT: UNIQUE constraint failed: stock.business_id, stock.branch_id, stock.product_id, stock.variant_id`.
- **Why It Is a Problem:** Stock transfers between branches and purchase order receptions crash with unhandled 500 internal server errors whenever stock already exists in the target branch.
- **Severity:** CRITICAL
- **Recommended Solution:** Replace `ON CONFLICT(id)` with `ON CONFLICT(business_id, branch_id, product_id, variant_id) DO UPDATE SET quantity = quantity + excluded.quantity`.
- **Dependencies:** `routes/inventory.js`, `routes/suppliers.js`.
- **Testing Required:** Execute transfer of 5 units of an item that already has an existing stock record in the destination branch; verify stock increments cleanly without 500 error.

---

### Issue ID: BE-003
- **Issue Title:** Missing Business Settings API Endpoints
- **File Path:** `functions/api/routes/` (Missing file / routes)
- **Component / Function Name:** Merchant Store Settings Controller
- **Description:** There is no route handler for `GET /api/business/settings` or `PUT /api/business/settings`. The frontend page `ShopSettings.tsx` has no backend counterpart to read or persist store profile details, GST settings, or receipt footer notes.
- **Why It Is a Problem:** Merchant configurations cannot be persisted in the database.
- **Severity:** HIGH
- **Recommended Solution:** Add route endpoints in `routes/business.js` or `routes/auth.js` to fetch and update `businesses` table columns (`legal_name`, `gstin`, `address`, `phone`, `logo_url`, `settings_json`).
- **Dependencies:** `client/src/pages/shop/ShopSettings.tsx`.
- **Testing Required:** Send `PUT /api/business/settings` with updated receipt header; query `GET /api/business/settings` and verify updated value.

---

### Issue ID: BE-004
- **Issue Title:** Missing Shopkeeper Staff & Branch Management Endpoints
- **File Path:** `functions/api/routes/` (Missing routes)
- **Component / Function Name:** Staff & Branch CRUD
- **Description:** The database schema has tables `business_users` and `branches`. However, there are no endpoints for an authenticated business owner/manager to:
  1. Add a new cashier or manager (`POST /api/business/staff`).
  2. Change cashier PINs or deactivate staff.
  3. Create a new store branch (`POST /api/branches`).
- **Why It Is a Problem:** Multi-branch retailers cannot add physical branches, and store owners cannot add cashiers without manual database intervention.
- **Severity:** HIGH
- **Recommended Solution:** Create `routes/staff.js` and `routes/branches.js` with full CRUD handlers protected by `tenantMiddleware` and `roleMiddleware(['owner', 'admin'])`.
- **Dependencies:** Database tables `business_users`, `branches`.
- **Testing Required:** Perform `POST /api/business/staff` and authenticate using created staff credentials.

---

### Issue ID: BE-005
- **Issue Title:** Admin Businesses Query Duplicates Rows on Subscription Renewals
- **File Path:** `functions/api/routes/admin.js` (Line 118)
- **Component / Function Name:** `GET /api/admin/businesses`
- **Description:** The query joins businesses and subscriptions using:
  ```sql
  SELECT b.*, s.status as sub_status, s.plan_id, s.end_date
  FROM businesses b
  LEFT JOIN subscriptions s ON b.id = s.business_id
  ```
  If a business has had 3 consecutive subscription renewals, table `subscriptions` contains 3 rows for that `business_id`. The query returns 3 identical rows for that business in the Super Admin dashboard.
- **Why It Is a Problem:** Active tenant count and tenant table listings in Super Admin display distorted and inflated metrics.
- **Severity:** MEDIUM
- **Recommended Solution:** Join against a subquery selecting only the latest subscription per business:
  ```sql
  LEFT JOIN (
    SELECT business_id, status, plan_id, end_date,
           ROW_NUMBER() OVER (PARTITION BY business_id ORDER BY created_at DESC) as rn
    FROM subscriptions
  ) s ON b.id = s.business_id AND s.rn = 1
  ```
- **Dependencies:** `routes/admin.js`.
- **Testing Required:** Insert 2 subscription rows for one business; query `GET /api/admin/businesses`; verify business appears only once.

---

### Issue ID: BE-006
- **Issue Title:** Exchange Service Disregards Variant ID on Returned Items
- **File Path:** `functions/api/services/exchangeService.js` (Line 85)
- **Component / Function Name:** `processExchange()`
- **Description:** When validating and restocking items returned during an exchange:
  ```javascript
  const originalItem = await get(
    'SELECT * FROM sale_items WHERE sale_id = ? AND product_id = ?',
    [saleId, rItem.productId]
  );
  ```
  The query matches only by `sale_id` and `product_id`. If the sale contained multiple variants of the same product, it selects the first variant, ignoring `rItem.variantId`. Furthermore, restock inventory increments `originalItem.variant_id` rather than the returned variant.
- **Why It Is a Problem:** Inventory for the wrong variant is incremented upon exchange, causing physical vs system inventory discrepancies.
- **Severity:** HIGH
- **Recommended Solution:** Lookup `sale_items` by line item ID:
  ```sql
  SELECT * FROM sale_items WHERE id = ? AND sale_id = ?
  ```
- **Dependencies:** `client/src/pages/shop/ShopExchange.tsx`, `services/exchangeService.js`.
- **Testing Required:** Create invoice with 2 variants of same shirt; exchange variant B; verify variant B inventory increases by 1 and variant A remains unchanged.

---

### Issue ID: BE-007
- **Issue Title:** Missing Pure Sales Returns Endpoints (Distinct from Exchanges)
- **File Path:** `functions/api/routes/invoices.js`, `functions/api/services/`
- **Component / Function Name:** Sales Return API
- **Description:** Tables `sales_returns` and `sales_return_items` exist in `schema.js`. However, there is no endpoint `POST /api/invoices/:id/return` or `POST /api/returns` to process a standard return for cash/credit note without picking replacement items.
- **Why It Is a Problem:** Merchants can only process returns if the customer takes a replacement product (exchange). There is no workflow to refund money or issue a credit note for returned goods.
- **Severity:** HIGH
- **Recommended Solution:** Implement `POST /api/returns` and `GET /api/returns` backed by `sales_returns` and `sales_return_items`.
- **Dependencies:** `functions/api/routes/returns.js`.
- **Testing Required:** Submit a return for 1 item with refund type 'cash'; verify cash ledger balance updates and inventory restocks.

---

### Issue ID: BE-008
- **Issue Title:** Zero-Stock Products Excluded from Inventory Listing
- **File Path:** `functions/api/routes/inventory.js` (Line 23)
- **Component / Function Name:** `GET /api/inventory`
- **Description:** Inventory query uses:
  ```sql
  SELECT s.*, p.name, p.sku, p.barcode, b.name as branch_name
  FROM stock s
  INNER JOIN products p ON s.product_id = p.id
  INNER JOIN branches b ON s.branch_id = b.id
  ```
  If a product is created but no initial stock entry has been inserted for a branch, or if all items in a branch have no stock row, the product is completely omitted from the inventory screen.
- **Why It Is a Problem:** Out-of-stock products cannot be seen or adjusted in the inventory screen.
- **Severity:** MEDIUM
- **Recommended Solution:** Start from `products p` and `LEFT JOIN stock s ON p.id = s.product_id AND s.branch_id = ?`.
- **Dependencies:** `routes/inventory.js`.
- **Testing Required:** Create a product without stock; verify it appears in inventory listing with quantity 0.
