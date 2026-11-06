# 09. Super Admin Audit Report

**Project:** Universal Billing and POS SaaS (SMARTBILLING)  
**Auditor:** SaaS Platform Architect, Security Auditor & Product Lead  
**Audit Date:** November 6, 2026  
**Status:** Audit Complete — No Fixes Applied  

---

## Executive Summary

The Super Admin portal (`/admin/*`) is designed for SaaS platform administrators to supervise tenants, monitor MRR/ARR, configure pricing plans, manage payment gateways, oversee Zoho CRM/Desk integrations, and audit platform security events.

Our audit identifies **several high-severity functional gaps: four primary administrative navigation tabs are placeholder stubs or route to the wrong component, coupon management lacks an administrative UI, payment refunds cannot be triggered, and tenant listings duplicate rows on subscription renewals.**

---

## Feature Matrix & Operational Status

| Module / Screen | Route | Backend API | Frontend View | Realized Status |
| :--- | :--- | :--- | :--- | :--- |
| **SaaS Metrics & Dashboard** | `/admin` | `GET /admin/dashboard` | `AdminDashboard.tsx` | **FUNCTIONAL** |
| **Business Management** | `/admin/businesses` | `GET /admin/businesses` | `AdminBusinesses.tsx` | **PARTIAL** (Duplicate rows bug) |
| **Subscription Plans** | `/admin/plans` | `GET /admin/plans` | `AdminPlans.tsx` | **FUNCTIONAL** |
| **Subscription Operations** | `/admin/subscriptions` | `GET /admin/subscriptions` | `AdminSubscriptions.tsx`| **FUNCTIONAL** |
| **Payments Ledger** | `/admin/payments` | `GET /admin/payments` | `AdminPayments.tsx` | **PARTIAL** (No refund action) |
| **Coupon Management** | `/admin/coupons` | Table `coupons` in DB | **None** | **MISSING UI** |
| **Staff & Admin Users** | `/admin/staff` | Table `platform_users` | Placeholder div | **STUBBED (Dummy text)** |
| **Software Version Control** | `/admin/updates` | `GET /software-versions` | Placeholder div | **STUBBED (Dummy text)** |
| **Platform Audit Logs** | `/admin/audit` | `GET /admin/audit-logs` | Redirects to Dashboard | **BROKEN ROUTE** |
| **Feature Controls / Flags** | `/admin/features` | Table `feature_flags` | **None** | **MISSING UI** |
| **Zoho Integration Config** | `/admin/zoho` | `GET/POST /admin/zoho` | `AdminZoho.tsx` | **PARTIAL** (Mocked execution) |

---

## Detailed Findings & Defects

### Issue ID: SA-001
- **Issue Title:** Platform Audit Logs Tab Route Misdirected to Dashboard
- **File Path:** `client/src/App.tsx` (Line 86)
- **Component / Function Name:** `App.tsx` -> Navigation Dispatcher
- **Description:** In the routing dispatcher for Super Admin:
  ```typescript
  if (currentTab === 'audit') {
    return <AdminDashboard />;
  }
  ```
  Clicking "Audit Logs" in the Super Admin sidebar renders the main Revenue Dashboard instead of an audit log viewer.
- **Why It Is a Problem:** Platform compliance officers and Super Administrators cannot inspect user logins, data exports, permission changes, or security anomalies recorded in the SQLite `audit_logs` table.
- **Severity:** HIGH
- **Recommended Solution:** Create `AdminAuditLogs.tsx` with searchable columns (Timestamp, Actor, Role, Action, IP Address, Resource, Payload) and render it for tab `audit`.
- **Dependencies:** Backend endpoint `GET /api/admin/audit-logs`.
- **Testing Required:** Click "Audit Logs" tab; verify table of recent authentication and administrative events is rendered.

---

### Issue ID: SA-002
- **Issue Title:** Admin Staff Management Tab Renders Placeholder Text
- **File Path:** `client/src/App.tsx` (Lines 78-85)
- **Component / Function Name:** `App.tsx` -> `currentTab === 'staff'`
- **Description:** Selecting the "Staff" menu option displays:
  ```tsx
  <div className="p-8 text-center text-slate-500">
    <h3 className="text-xl font-bold">Admin Staff Management</h3>
    <p>Role assignment and permissions coming soon.</p>
  </div>
  ```
- **Why It Is a Problem:** The root administrator cannot invite secondary administrators, assign granular roles (e.g. Support Representative vs Billing Ops), or revoke access for departed employees.
- **Severity:** HIGH
- **Recommended Solution:** Implement `AdminStaff.tsx` backed by `platform_users` API endpoints (`GET /api/admin/staff`, `POST /api/admin/staff`, `DELETE /api/admin/staff/:id`).
- **Dependencies:** `client/src/pages/admin/AdminStaff.tsx`.
- **Testing Required:** Create a new admin account via UI; verify credentials authenticate successfully.

---

### Issue ID: SA-003
- **Issue Title:** Software Version Management Tab Renders Placeholder Text
- **File Path:** `client/src/App.tsx` (Lines 69-77)
- **Component / Function Name:** `App.tsx` -> `currentTab === 'updates'`
- **Description:** Selecting the "Software Updates" menu option displays static placeholder text:
  ```tsx
  <div className="p-8 text-center text-slate-500">
    <h3 className="text-xl font-bold">Software Updates</h3>
    <p>Version management and release notes coming soon.</p>
  </div>
  ```
  The database already contains a `software_versions` table and seed data (`v1.0.0`, `v1.1.0`), but the frontend does not fetch or present it.
- **Why It Is a Problem:** Super Admins cannot publish release notes, notify merchants of mandatory updates, or view version deployment statuses.
- **Severity:** MEDIUM
- **Recommended Solution:** Build `AdminSoftwareUpdates.tsx` to list, create, and deploy release notes from `GET /api/admin/software-versions`.
- **Dependencies:** `client/src/pages/admin/AdminSoftwareUpdates.tsx`.
- **Testing Required:** Open Updates tab; verify changelog and version history display correctly.

---

### Issue ID: SA-004
- **Issue Title:** Complete Absence of Coupon Management Interface
- **File Path:** `client/src/pages/admin/` (Missing file)
- **Component / Function Name:** Promotional Discount Engine
- **Description:** While the backend supports promotional coupon codes (`schema.js` tables `coupons` and `coupon_redemptions`), there is no UI view or navigation item in the Super Admin panel to create discount codes (e.g. `DIWALI50`, `WELCOME10`), set percentage vs fixed discounts, set usage limits, or view redemptions.
- **Why It Is a Problem:** Marketing campaigns and discount incentives cannot be configured without manual raw SQL database queries.
- **Severity:** HIGH
- **Recommended Solution:** Implement `AdminCoupons.tsx` with modal for creating new coupons and displaying redemption counts.
- **Dependencies:** Backend routes `GET/POST/DELETE /api/admin/coupons`.
- **Testing Required:** Create coupon `TEST50` via Super Admin; apply it during merchant checkout; verify discount is reflected.

---

### Issue ID: SA-005
- **Issue Title:** Missing Refund Execution in Payment Management
- **File Path:** `client/src/pages/admin/AdminPayments.tsx`
- **Component / Function Name:** Payment Operations
- **Description:** `AdminPayments.tsx` lists transaction records from `subscription_payments` with columns for Amount, Gateway, and Status. However, there are no action buttons to issue refunds, re-query payment gateway statuses, or inspect webhook payloads.
- **Why It Is a Problem:** Super Administrators handling customer billing disputes cannot trigger refunds or investigate failed payment webhooks.
- **Severity:** MEDIUM
- **Recommended Solution:** Add "Issue Refund" button that invokes gateway refund API and records transaction state in `subscription_payments`.
- **Dependencies:** Payment gateway refund integration.
- **Testing Required:** Click "Refund" on test payment; verify status transitions to `REFUNDED`.
