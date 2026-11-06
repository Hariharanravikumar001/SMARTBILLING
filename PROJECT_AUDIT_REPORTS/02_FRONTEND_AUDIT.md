# 02. Frontend Audit Report

**Project:** Universal Billing and POS SaaS (SMARTBILLING)  
**Auditor:** Senior Frontend Architect, QA Engineer & Accessibility Specialist  
**Audit Date:** November 6, 2026  
**Status:** Audit Complete — No Fixes Applied  

---

## Executive Summary

The frontend is a single-page application built with React 18, Vite, TypeScript, Lucide Icons, and Tailwind CSS. The interface is organized into three major layouts: `PublicLayout` (landing, pricing, login, register), `AdminLayout` (Super Admin SaaS platform controls), and `ShopLayout` (merchant POS and business controls).

While the application features modern UI components, extensive audit reveals **several critical usability defects, placeholder buttons that perform no network requests, missing variant selectors in POS and Exchanges, hardcoded financial calculations, and missing administrative views.**

---

## Detailed Findings & Defects

### Issue ID: FE-001
- **Issue Title:** "Save Settings" Button in Shopkeeper Settings Does Not Save to Backend (Mock Action)
- **File Path:** `client/src/pages/shop/ShopSettings.tsx` (Lines 25-29)
- **Component / Function Name:** `ShopSettings.tsx` -> `handleSave()`
- **Description:** When the merchant clicks "Save Store Settings" or "Save Receipt Template", the function executes:
  ```typescript
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('Store settings & receipt template updated.');
    setTimeout(() => setSuccess(''), 3000);
  };
  ```
  No network call (`api.put` or `api.post`) is made to any endpoint.
- **Why It Is a Problem:** The merchant assumes their store name, address, GSTIN, receipt header/footer, and thermal printer configurations are permanently saved. Upon refreshing the browser or logging in from another device, all configured settings revert to defaults.
- **Severity:** HIGH
- **Recommended Solution:** Connect `handleSave` to `api.put('/business/settings', formData)`. Hydrate form state from `api.get('/business/settings')` on component mount via `useEffect`.
- **Dependencies:** Backend route `PUT /api/business/settings` (see Issue BE-003).
- **Testing Required:** Modify store name, click Save, refresh page, verify persisted values.

---

### Issue ID: FE-002
- **Issue Title:** POS Catalog Fails to Allow Variant Selection (Adds null Variant ID)
- **File Path:** `client/src/pages/shop/ShopPOS.tsx` (Lines 95-125)
- **Component / Function Name:** `ShopPOS.tsx` -> `addToCart(product)`
- **Description:** When clicking a product card in the POS billing grid, the item is immediately pushed to the cart state with `variantId: null`:
  ```typescript
  setCart([...cart, {
    productId: product.id,
    variantId: null,
    name: product.name,
    ...
  }]);
  ```
  For apparel, footwear, or retail products that have variants (e.g. Size M, Size L, Color Blue), the UI presents no variant selection popup or dropdown.
- **Why It Is a Problem:** The backend rejects checkout with `400 Bad Request: Variant ID required for variant-enabled product`, or deducts stock from parent instead of the specific SKU. Cashiers cannot bill specific sizes or colors.
- **Severity:** CRITICAL
- **Recommended Solution:** When a clicked product has `has_variants === 1` or multiple variants in its data array, open a modal prompting cashier to select the specific variant before pushing to cart.
- **Dependencies:** `api.get('/pos/lookup')` variant payload structure.
- **Testing Required:** Add a multi-variant t-shirt in POS, select size 'XL', verify cart item contains valid `variantId` and barcode.

---

### Issue ID: FE-003
- **Issue Title:** POS Product Search API Payload Structure Inconsistency
- **File Path:** `client/src/pages/shop/ShopPOS.tsx` (Line 73)
- **Component / Function Name:** `ShopPOS.tsx` -> `loadProducts(search)`
- **Description:** When the search query is empty, `GET /api/pos/lookup` returns a flat array of products. When a search query is provided, `GET /api/pos/lookup?q=...` returns an object `{ products: [...], variants: [...] }`. In `ShopPOS.tsx`:
  ```typescript
  setProducts(res.data.products || res.data);
  ```
  The returned `variants` array is completely discarded, and barcode scanning matching a variant SKU fails to resolve.
- **Why It Is a Problem:** Scanning a barcode that corresponds to a variant (e.g., barcode `TSHIRT-RED-L`) returns no match in the POS frontend, blocking quick barcode billing.
- **Severity:** HIGH
- **Recommended Solution:** Harmonize backend return structure to consistently return `{ products: [...], variants: [...] }`, and update frontend `loadProducts` to store both products and variants in state or indexed lookup map.
- **Dependencies:** Backend `functions/api/routes/pos.js`.
- **Testing Required:** Scan a variant barcode in POS search box; confirm item is matched and added to cart.

---

### Issue ID: FE-004
- **Issue Title:** Product Exchange Modal Collides on Products with Multiple Variants in Invoice
- **File Path:** `client/src/pages/shop/ShopExchange.tsx` (Line 88)
- **Component / Function Name:** `ShopExchange.tsx` -> `handleToggleReturnItem()`
- **Description:** In `ShopExchange.tsx`, returning items are tracked using:
  ```typescript
  const existingIdx = returnItems.findIndex(r => r.productId === item.product_id);
  ```
  If a customer bought two different variants of the same product on the same invoice (e.g., 1 Black T-Shirt and 1 Blue T-Shirt, both `product_id: prod_01`), checking one variant overwrites or toggles the other.
- **Why It Is a Problem:** Customers cannot exchange one specific variant while keeping the other, or exchange both with different return reasons.
- **Severity:** HIGH
- **Recommended Solution:** Index `returnItems` by `item.id` (the unique `sale_items.id` primary key) rather than `product_id`.
- **Dependencies:** `sale_items` schema and backend `exchangeService.js`.
- **Testing Required:** Create an invoice with two different variants of the same product. Initiate exchange and select only the second variant; verify correct line item is targeted.

---

### Issue ID: FE-005
- **Issue Title:** Exchange Replacement Item Selector Omits Variant Selection
- **File Path:** `client/src/pages/shop/ShopExchange.tsx` (Lines 129-142)
- **Component / Function Name:** `ShopExchange.tsx` -> `addReplacementItem(p)`
- **Description:** Similar to POS billing, when selecting replacement items during an exchange:
  ```typescript
  setReplacementItems([...replacementItems, {
    productId: p.id,
    variantId: null,
    name: p.name,
    quantity: 1,
    unitPrice: p.selling_price || 0,
    taxRate: p.tax_rate || 0,
    total: p.selling_price || 0
  }]);
  ```
  `variantId` is hardcoded to `null`.
- **Why It Is a Problem:** A customer returning a Size 'M' shirt to get a Size 'L' shirt cannot have the Size 'L' variant deducted from inventory. The exchange records a parent deduction, leading to inventory discrepancies.
- **Severity:** HIGH
- **Recommended Solution:** Provide a variant dropdown or modal when adding replacement items in `ShopExchange.tsx`.
- **Dependencies:** `client/src/pages/shop/ShopExchange.tsx`.
- **Testing Required:** Perform size-for-size exchange; verify replacement item records target variant ID.

---

### Issue ID: FE-006
- **Issue Title:** Hardcoded 18% GST Tax Rate on Purchase Invoice Creation
- **File Path:** `client/src/pages/shop/ShopPurchases.tsx` (Line 99)
- **Component / Function Name:** `ShopPurchases.tsx` -> `addItem()`
- **Description:** In `ShopPurchases.tsx`, when a shopkeeper adds items to a supplier purchase invoice:
  ```typescript
  taxRate: 18.0 // Hardcoded for all items
  ```
  The product's registered tax rate (`product.tax_rate` or `product.tax_slab`) is ignored, and non-18% items (e.g. 0% milk/eggs, 5% apparel, 28% electronics) are charged at 18%.
- **Why It Is a Problem:** Purchase tax ledgers, Input Tax Credit (ITC) calculations, and GSTR-2 reconciliation will be completely erroneous, violating GST tax accounting laws.
- **Severity:** HIGH
- **Recommended Solution:** Inherit `taxRate` dynamically from selected product: `taxRate: selectedProduct.tax_rate ?? 18.0`, and allow the merchant to edit the tax rate per line item.
- **Dependencies:** `ShopPurchases.tsx`.
- **Testing Required:** Add a 5% GST item to purchase invoice; verify line item and invoice totals reflect 5% GST.

---

### Issue ID: FE-007
- **Issue Title:** Super Admin Navigation Placeholder Stubs in Main Router
- **File Path:** `client/src/App.tsx` (Lines 69-86)
- **Component / Function Name:** `App.tsx` -> Navigation Dispatcher
- **Description:** Several Super Admin routes render plain un-styled mockup divs instead of real functional components:
  - Tab `updates` (L69-77): Static text div: `Software Updates - Version management coming soon`.
  - Tab `staff` (L78-85): Static text div: `Admin Staff Management - Role assignment coming soon`.
  - Tab `audit` (L86): Renders `<AdminDashboard />` instead of an audit log viewer.
  - Tab `coupons`: No tab or component exists in Super Admin to create or expire coupons.
- **Why It Is a Problem:** Super Administrators cannot manage platform staff, view compliance audit logs, configure software release updates, or issue promotional discount coupons via the UI.
- **Severity:** HIGH
- **Recommended Solution:** Implement dedicated pages: `AdminSoftwareUpdates.tsx`, `AdminStaff.tsx`, `AdminAuditLogs.tsx`, and `AdminCoupons.tsx`.
- **Dependencies:** Backend routes `/admin/software-versions`, `/admin/staff`, `/admin/audit-logs`, `/admin/coupons`.
- **Testing Required:** Navigate to each tab and verify data is fetched and editable.

---

### Issue ID: FE-008
- **Issue Title:** Missing Pagination in Shopkeeper and Admin Tables
- **File Path:** `client/src/pages/shop/ShopInvoices.tsx`, `client/src/pages/shop/ShopProducts.tsx`, `client/src/pages/admin/AdminBusinesses.tsx`
- **Component / Function Name:** Data Tables
- **Description:** Data tables fetch all records without frontend pagination or server-side `limit`/`offset` pagination controls.
- **Why It Is a Problem:** When a merchant has 10,000 invoices or products, the browser attempts to render thousands of DOM nodes at once, causing freezing, high memory usage, and poor mobile performance.
- **Severity:** MEDIUM
- **Recommended Solution:** Implement pagination controls (`Previous`, `Page Number`, `Next`, `Page Size`) and pass `page` and `limit` query parameters to backend APIs.
- **Dependencies:** Backend pagination query support.
- **Testing Required:** Seed 500 invoices; confirm page loads in under 1 second with 25 items per page.

---

### Issue ID: FE-009
- **Issue Title:** Missing Confirmation Dialogs on Sensitive Shopkeeper Actions
- **File Path:** `client/src/pages/shop/ShopInvoices.tsx` (Void invoice), `client/src/pages/shop/ShopExpenses.tsx` (Delete expense)
- **Component / Function Name:** Action Handlers
- **Description:** Invoices can be marked as void or expenses deleted with a single click or standard browser `window.confirm()`, lacking detailed impact warnings.
- **Why It Is a Problem:** Accidental touches on touchscreens can void sales invoices or delete accounting entries without audit trail confirmation.
- **Severity:** LOW
- **Recommended Solution:** Implement a modal confirmation dialog explaining financial and inventory consequences.
- **Dependencies:** UI Modal component.
- **Testing Required:** Click 'Void Invoice'; verify confirmation modal prevents accidental submission.
