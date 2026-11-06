# 15. Duplicate and Unused Code Report

**Project:** Universal Billing and POS SaaS (SMARTBILLING)  
**Auditor:** Code Quality Engineer & Senior Full-Stack Lead  
**Audit Date:** November 6, 2026  
**Status:** Audit Complete — No Fixes Applied  

---

## Executive Summary

An automated and manual inspection of the codebase was conducted to identify duplicate directory structures, orphaned files, dead database schema tables, redundant route handlers, and unused component logic.

The inspection identified **a major redundant nested directory tree (`SMARTBILLING/`), duplicate static client deployment bundles in the serverless function package, three orphaned database tables with zero application queries, and uninvoked background sync methods.**

---

## Detailed Findings

### Issue ID: DUP-001
- **Issue Title:** Redundant Nested Project Folder (`d:\project\billing\SMARTBILLING/`)
- **File Path:** `d:\project\billing\SMARTBILLING/`
- **Component / Function Name:** Repository Root
- **Description:** An external `catalyst pull` created a duplicate directory containing an older snapshot of `functions/`.
- **Why It Is a Problem:** Consumes disk space, pollutes Git tracking, and risks developer confusion when editing backend files.
- **Severity:** MEDIUM
- **Recommended Solution:** Safely remove the nested directory after confirming all active edits reside in `functions/api/`.
- **Dependencies:** None.
- **Testing Required:** `Test-Path d:\project\billing\SMARTBILLING`.

---

### Issue ID: DUP-002
- **Issue Title:** Duplicate Frontend Distribution Assets in Serverless Function Payload
- **File Path:** `functions/api/public/` vs `client/dist/`
- **Component / Function Name:** Catalyst Deployment Package
- **Description:** Static client assets compiled to `client/dist/` are duplicated inside `functions/api/public/` and served via `express.static()`.
- **Why It Is a Problem:** Doubles deployment storage requirements and introduces version discrepancy risks between Web Client Hosting and Function Hosting.
- **Severity:** MEDIUM
- **Recommended Solution:** Remove static file serving from Express; serve frontend exclusively via Zoho Catalyst Web Client Hosting.
- **Dependencies:** `catalyst.json`, `functions/api/index.js`.
- **Testing Required:** Build client; deploy to Catalyst; verify frontend loads from Web Client URL without function static middleware.

---

### Issue ID: DUP-003
- **Issue Title:** Orphaned Database Schema Tables (Zero Application References)
- **File Path:** `functions/api/db/schema.js`
- **Component / Function Name:** Relational DDL
- **Description:** The following tables are created during `initSchema()` but are never read, inserted, or updated anywhere in backend routes or frontend components:
  1. `sales_returns` and `sales_return_items` (Declared in lines 466-499; no endpoints exist).
  2. `zoho_field_mappings` (Declared in lines 624-631; no field mapping engine exists).
  3. `onboarding_records` (Declared in lines 122-133; no onboarding wizard connects to it).
- **Why It Is a Problem:** Clutters database architecture and misleads auditors into believing these features are implemented.
- **Severity:** LOW
- **Recommended Solution:** Either implement the missing business logic (for `sales_returns`) or cleanly deprecate and document unutilized tables.
- **Dependencies:** `functions/api/db/schema.js`.
- **Testing Required:** Search entire codebase for `zoho_field_mappings` to confirm zero usages.

---

### Issue ID: DUP-004
- **Issue Title:** Dead Method `syncAllPendingToZoho()` Lacking Consumer
- **File Path:** `functions/api/services/zohoService.js` (Lines 210-250)
- **Component / Function Name:** `ZohoService.syncAllPendingToZoho()`
- **Description:** The service contains a batch retry function designed to process pending sync logs. However, there are no cron tasks, background intervals, or API endpoints that invoke this method.
- **Why It Is a Problem:** Records in `zoho_sync_logs` with status `AWAITING_CONNECTION` or `FAILED` are never reprocessed.
- **Severity:** LOW
- **Recommended Solution:** Expose endpoint `POST /api/admin/zoho/sync-pending` and wire to a periodic background worker.
- **Dependencies:** `zohoService.js`, `routes/admin.js`.
- **Testing Required:** Trigger sync endpoint; verify pending rows in sync queue are executed.
