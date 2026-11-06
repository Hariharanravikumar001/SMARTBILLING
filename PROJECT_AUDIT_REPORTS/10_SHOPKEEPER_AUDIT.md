# 10. Shopkeeper Portal Audit Report

**Project:** Universal Billing and POS SaaS (SMARTBILLING)  
**Auditor:** Retail POS Solutions Specialist & Full-Stack QA Lead  
**Audit Date:** November 6, 2026  
**Status:** Audit Complete — No Fixes Applied  

---

## Executive Summary

The Shopkeeper Portal (`/app/*`) provides merchant workflows spanning POS quick-billing, inventory stock control, supplier procurement, customer loyalty, expense tracking, and GST reporting.

The audit identifies **several critical operational defects: the "Save Settings" form fails to persist changes, variant-enabled products cannot be properly billed or exchanged in POS, stock transfers trigger SQLite unique constraint aborts, purchase invoices hardcode 18% GST regardless of product tax slabs, pure sales returns have no interface, and cashier/branch management tools are completely absent.**

---

## Detailed Module Evaluation

| Shopkeeper Module | Route / Component | Primary Actions | Verified Operational Status |
| :--- | :--- | :--- | :--- |
| **Dashboard** | `/app` (`ShopDashboard.tsx`) | Metrics, low-stock, recent sales | **FUNCTIONAL** |
| **POS Quick Billing** | `/app/pos` (`ShopPOS.tsx`) | Barcode, cart, multi-pay, print | **DEFECTIVE** (Variant selection absent; search mismatch) |
| **Catalog / Products** | `/app/products` (`ShopProducts.tsx`) | Add/Edit items, HSN, price slabs | **PARTIAL** (Missing delete/deactivate) |
| **Inventory Control** | `/app/inventory` (`ShopInventory.tsx`)| Stock adjustments, transfers | **CRITICAL BUG** (Composite key upsert crash) |
| **Sales Invoices** | `/app/invoices` (`ShopInvoices.tsx`) | History, print, void invoice | **FUNCTIONAL** |
| **Product Exchanges** | `/app/exchange` (`ShopExchange.tsx`)| Return item for replacement | **DEFECTIVE** (Line item collision on variants) |
| **Sales Returns** | None | Refund / credit note without exchange | **MISSING MODULE** |
| **Purchases** | `/app/purchases` (`ShopPurchases.tsx`)| Vendor billing, stock intake | **DEFECTIVE** (Hardcoded 18% GST; upsert bug) |
| **Suppliers** | `/app/suppliers` (`ShopSuppliers.tsx`)| Vendor list, payables ledger | **FUNCTIONAL** |
| **Customers & CRM** | `/app/customers` (`ShopCustomers.tsx`)| Credit limits, loyalty balance | **FUNCTIONAL** |
| **Cashier / Staff** | None | Add cashiers, set 4-digit PINs | **MISSING MODULE** |
| **Branch Management** | Header Switcher only | Add new physical branches | **MISSING MODULE** |
| **Expenses & Outflow** | `/app/expenses` (`ShopExpenses.tsx`) | Petty cash & operating costs | **FUNCTIONAL** |
| **Cash Drawer / Register**| None (`cash_registers` in DB) | Opening float, shift close | **MISSING UI** |
| **Business Settings** | `/app/settings` (`ShopSettings.tsx`) | Store info, GSTIN, receipt terms | **DEAD BUTTON** (Save makes no API call) |
| **Reports & Analytics** | `/app/reports` (`ShopReports.tsx`) | Sales, GSTR-1, P&L, stock aging | **FUNCTIONAL** |
| **Help & Support** | `/app/help` (`ShopHelp.tsx`) | Submit tickets, view replies | **PARTIAL** (Zoho Desk push stubbed) |

---

## Detailed Findings & Defects

### Issue ID: SHOP-001
- **Issue Title:** Shop Settings Form Save Button Does Not Persist Data (Mock Action)
- **File Path:** `client/src/pages/shop/ShopSettings.tsx` (Lines 25-29)
- **Component / Function Name:** `ShopSettings.tsx` -> `handleSave()`
- **Description:** Clicking "Save Store Settings" only displays a temporary frontend alert banner without executing an HTTP request.
- **Why It Is a Problem:** Store owners cannot configure their business legal name, GSTIN, address, receipt headers, thermal printer dimensions, or loyalty rates. Settings reset on page refresh.
- **Severity:** HIGH
- **Recommended Solution:** Connect `handleSave` to `PUT /api/business/settings` and load saved settings on mount.
- **Dependencies:** Backend route `PUT /api/business/settings` (Issue BE-003).
- **Testing Required:** Update store address; refresh page; verify address persists.

---

### Issue ID: SHOP-002
- **Issue Title:** Inability to Select Variants During POS Checkout
- **File Path:** `client/src/pages/shop/ShopPOS.tsx` (Lines 95-125)
- **Component / Function Name:** `ShopPOS.tsx` -> `addToCart()`
- **Description:** Adding an item to the POS cart hardcodes `variantId: null`. Multi-variant retail stores (clothing sizes, shoe sizes, colors) cannot bill specific variant items.
- **Why It Is a Problem:** The checkout either deducts from the wrong inventory pool or is rejected by backend stock validation.
- **Severity:** CRITICAL
- **Recommended Solution:** Trigger variant selector popup when an item with `has_variants === 1` is clicked in the POS grid.
- **Dependencies:** `client/src/pages/shop/ShopPOS.tsx`.
- **Testing Required:** Click multi-variant product; select 'Size M'; verify item added to cart contains `variantId`.

---

### Issue ID: SHOP-003
- **Issue Title:** Inventory Stock Transfer and Adjustment Crashes with SQLite Constraint Error
- **File Path:** `functions/api/routes/inventory.js` (Lines 90, 140, 161)
- **Component / Function Name:** Stock Adjustment & Transfer Handlers
- **Description:** Inventory upsert uses `ON CONFLICT(id) DO UPDATE`. When an existing stock record is targeted with a generated new ID, SQLite throws `SQLITE_CONSTRAINT: UNIQUE constraint failed: stock.business_id, stock.branch_id, stock.product_id, stock.variant_id`.
- **Why It Is a Problem:** Shopkeepers are unable to transfer stock between branches or adjust inventory counts after stocktaking.
- **Severity:** CRITICAL
- **Recommended Solution:** Change conflict target to `ON CONFLICT(business_id, branch_id, product_id, variant_id) DO UPDATE SET quantity = excluded.quantity`.
- **Dependencies:** `routes/inventory.js`.
- **Testing Required:** Transfer 10 items from Branch A to Branch B; verify balance updates smoothly without 500 error.

---

### Issue ID: SHOP-004
- **Issue Title:** Hardcoded 18% GST on Purchase Invoices Violates Tax Regulations
- **File Path:** `client/src/pages/shop/ShopPurchases.tsx` (Line 99)
- **Component / Function Name:** `ShopPurchases.tsx` -> `addItem()`
- **Description:** Purchase items added to supplier invoices are forced to `taxRate: 18.0`, regardless of whether the product is 0% (essential food), 5% (garments under ₹1000), or 28% (luxury/automotive).
- **Why It Is a Problem:** Financial purchase registers, GSTR-2 Input Tax Credit (ITC) reconciliation, and gross supplier payables will be mathematically incorrect.
- **Severity:** HIGH
- **Recommended Solution:** Populate `taxRate` from the selected product's `tax_rate` attribute and make the field editable per invoice item.
- **Dependencies:** `ShopPurchases.tsx`.
- **Testing Required:** Create purchase invoice for 5% GST item; verify tax amount calculates at 5%.

---

### Issue ID: SHOP-005
- **Issue Title:** Complete Lack of Cashier and Staff Management Interface
- **File Path:** `client/src/pages/shop/` (Missing file)
- **Component / Function Name:** Merchant Staff Controller
- **Description:** Merchants have no interface to invite store cashiers, define roles (`Cashier`, `Manager`, `Stock Clerk`), or assign 4-digit quick-login PINs.
- **Why It Is a Problem:** Store owners cannot create credentials for staff members to operate the cash counter.
- **Severity:** HIGH
- **Recommended Solution:** Implement `ShopStaff.tsx` allowing store owners to add staff, assign branches, set PINs, and deactivate accounts.
- **Dependencies:** Backend routes `/api/business/staff` (Issue BE-004).
- **Testing Required:** Add a cashier with PIN 1234; log in via Cashier PIN login screen; verify role permissions.

---

### Issue ID: SHOP-006
- **Issue Title:** Missing Standalone Sales Returns Screen (Credit Note / Cash Refund)
- **File Path:** `client/src/pages/shop/` (Missing file)
- **Component / Function Name:** Returns Controller
- **Description:** While product exchange is supported in `ShopExchange.tsx`, there is no interface to process standard returns where a customer returns goods for a cash refund or store credit note without purchasing replacement goods.
- **Why It Is a Problem:** Merchants must perform unnatural workarounds or negative sales when a customer simply returns an item for a refund.
- **Severity:** HIGH
- **Recommended Solution:** Build `ShopReturns.tsx` allowing invoice lookup, return item selection, restocking condition choice, and cash/credit refund issuance.
- **Dependencies:** Backend routes `/api/returns` (Issue BE-007).
- **Testing Required:** Return an item from invoice; verify customer receives cash refund and stock increments by returned quantity.

---

### Issue ID: SHOP-007
- **Issue Title:** Cash Drawer Shift Management UI Missing
- **File Path:** `client/src/pages/shop/` (Missing file)
- **Component / Function Name:** Cash Drawer Management
- **Description:** Database tables `cash_registers` and `cash_movements` exist, but there is no frontend screen for cashiers to enter opening float, log petty cash withdrawals, or perform end-of-day register reconciliation.
- **Why It Is a Problem:** Cash shortages and physical drawer discrepancies cannot be tracked against POS sales.
- **Severity:** MEDIUM
- **Recommended Solution:** Implement `ShopRegister.tsx` to handle Open Shift, Pay-In/Pay-Out, and Close Shift with cash reconciliation.
- **Dependencies:** Backend register routes.
- **Testing Required:** Open register with ₹2,000 float; complete ₹5,000 cash sales; close shift; verify expected cash is ₹7,000.
