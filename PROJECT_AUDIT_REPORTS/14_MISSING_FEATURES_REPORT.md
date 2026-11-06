# 14. Missing Features Report

**Project:** Universal Billing and POS SaaS (SMARTBILLING)  
**Auditor:** Principal SaaS Product Manager & Lead Systems Architect  
**Audit Date:** November 6, 2026  
**Status:** Audit Complete — No Fixes Applied  

---

## Executive Summary

This report provides an inventory of all missing, stubbed, or disconnected features across the Universal Billing and POS SaaS platform. Features are classified as either:
1. **Frontend Present, Backend Missing** (UI exists, but clicking triggers no backend action).
2. **Backend Present, Frontend Missing** (Database/routes exist, but no UI allows users to access them).
3. **Completely Missing** (Stated platform requirements that have neither frontend nor backend implementation).

---

## Comprehensive Missing Feature Inventory

| Feature Item | Category | Frontend Status | Backend API Status | Database Schema Status | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Merchant Store Settings Save** | Store Configuration | Present (`ShopSettings.tsx`) | **MISSING** | Table `business_settings` exists | CRITICAL |
| **Pure Sales Returns & Refunds** | Sales & Invoicing | **MISSING** | **MISSING** | Tables `sales_returns`, `sales_return_items` exist | HIGH |
| **Shopkeeper Staff / Cashier CRUD** | Retail Management | **MISSING** | **MISSING** | Table `business_users` exists | HIGH |
| **Shopkeeper Branch Management** | Multi-Store POS | **MISSING** (Header switch only)| **MISSING** | Table `business_branches` exists | HIGH |
| **POS Variant Selection Modal** | POS Billing | **MISSING** (Direct add null) | Present (Schema support) | Table `product_variants` exists | HIGH |
| **Exchange Variant Selector** | Returns / Exchanges| **MISSING** | Partial (`exchangeService.js`)| Table `exchange_items` exists | HIGH |
| **Super Admin Audit Logs Viewer** | Platform Compliance| **BROKEN ROUTE** (Shows dash) | Present (`/admin/audit-logs`) | Table `audit_logs` exists | HIGH |
| **Super Admin Staff Management** | Platform Admin | **STUBBED** ("Coming soon") | Present (`/admin/staff`) | Table `platform_users` exists | HIGH |
| **Super Admin Software Updates** | Version Control | **STUBBED** ("Coming soon") | Present (`/software-versions`) | Table `software_versions` exists | MEDIUM |
| **Super Admin Coupon CRUD** | Growth & Marketing | **MISSING** | **MISSING** (Validate only) | Table `coupons` exists | HIGH |
| **Cash Drawer Shift Management** | Accounting / POS | **MISSING** | Partial (`routes/cashRegister`)| Tables `cash_registers`, `cash_movements` | MEDIUM |
| **Product Delete / Deactivate** | Catalog Management | **MISSING** (UI action absent) | **MISSING** (`DELETE /:id`) | Table `products.is_active` | MEDIUM |
| **Live Zoho CRM HTTP Dispatch** | Integrations | Config UI Present | **STUBBED** (Mock response) | Table `zoho_sync_logs` exists | HIGH |
| **Live Zoho Desk HTTP Dispatch** | Integrations | Config UI Present | **STUBBED** (Mock response) | Table `support_tickets` exists | HIGH |
| **Inbound Zoho Desk Webhook** | Integrations | **MISSING** | **MISSING** | N/A | MEDIUM |
| **Payment Gateway Refund Action** | Billing & Admin | **MISSING** | **MISSING** | Table `subscription_payments` exists | MEDIUM |
| **Automated Subscription Cron** | SaaS Operations | N/A (Serverless) | **MISSING** | Column `subscriptions.status` | HIGH |

---

## Detailed Specifications of Key Missing Features

### 1. Merchant Store Settings Persistence
- **Current State:** `ShopSettings.tsx` allows entering legal name, address, GSTIN, thermal receipt template, and loyalty rates. Clicking "Save Store Settings" displays a green notification but makes no network call.
- **Required Implementation:**
  - Route: `GET /api/business/settings` and `PUT /api/business/settings`.
  - Database: Persist to `businesses` and `business_settings`.
  - Frontend: `useEffect` to load data into state, `axios.put` on submit.

### 2. Standalone Sales Returns (Credit Notes & Refunds)
- **Current State:** The system offers product exchanges (`ShopExchange.tsx`), but if a customer wishes to return an item for cash or a store credit voucher without taking a replacement, no workflow exists.
- **Required Implementation:**
  - Route: `POST /api/returns` and `GET /api/returns`.
  - Frontend: `ShopReturns.tsx` allowing cashiers to select an invoice, pick items to return, choose refund mode (Cash / Credit Note / Original Payment Method), restock inventory, and print a Credit Note.

### 3. Merchant Staff & Cashier PIN Management
- **Current State:** `auth.js` has a `/business/pin-login` endpoint, but there is no screen in the merchant portal where an owner or manager can add cashiers, set their 4-digit PINs, or revoke permissions.
- **Required Implementation:**
  - Route: `GET /api/business/staff`, `POST /api/business/staff`, `PUT /api/business/staff/:id`, `DELETE /api/business/staff/:id`.
  - Frontend: `ShopStaff.tsx` table of users, modal with fields (Name, Email, Role, Branch, PIN).

### 4. Merchant Branch Management
- **Current State:** Merchants can select branches from a dropdown in the header, but cannot add a new physical store, edit the branch address, or assign phone numbers.
- **Required Implementation:**
  - Route: `POST /api/branches`, `PUT /api/branches/:id`.
  - Frontend: `ShopBranches.tsx` or settings sub-tab.

### 5. Super Admin Functional Screens (`Staff`, `Updates`, `Audit`, `Coupons`)
- **Current State:** Four of the navigation tabs in the Super Admin sidebar either display placeholder text or redirect to the dashboard.
- **Required Implementation:**
  - `AdminStaff.tsx`: Add/edit Super Admin personnel.
  - `AdminSoftwareUpdates.tsx`: Publish release notes and version notifications.
  - `AdminAuditLogs.tsx`: Searchable security and audit log trail.
  - `AdminCoupons.tsx`: Create, edit, and deactivate promotional discount codes.
