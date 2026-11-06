# 04. Zoho Catalyst Audit Report

**Project:** Universal Billing and POS SaaS (SMARTBILLING)  
**Auditor:** Senior Cloud Architect & Certified Zoho Catalyst Specialist  
**Audit Date:** November 6, 2026  
**Status:** Audit Complete — No Fixes Applied  

---

## Executive Summary

The project is hosted on Zoho Catalyst under project name **SMARTBILLING** (Project ID: `81697000000039001`) in the Indian data center (`.catalystserverless.in`). Deployment topology consists of an **Advanced I/O Node 18 Serverless Function** (`functions/api/`) and **Web Client Hosting** (`client/dist`).

While the application successfully builds and deploys to Catalyst, our audit identifies **critical architectural constraints regarding serverless ephemeral storage, absence of native Catalyst Data Store integration, missing scheduled cron functions, and unconfigured environment secrets in Catalyst console.**

---

## Configuration Assessment

| Catalyst Component | Configured File | Status | Notes |
| :--- | :--- | :--- | :--- |
| **Project Identity** | `catalyst.json`, `.catalystrc` | Configured | ID: `81697000000039001` |
| **Advanced I/O Function** | `functions/api/catalyst-config.json` | Active | Name: `api`, Stack: `node18`, Main: `index.js` |
| **Web Client Hosting** | `catalyst.json` (`client.source: "client/dist"`) | Active | Deploys static bundle with relative base `./` |
| **Data Store (Native NoSQL)** | None | **Not Utilized** | Uses embedded SQLite on `/tmp` |
| **File Store** | None | **Not Utilized** | Logos and attachments use base64/external URLs |
| **Catalyst Cron / Scheduler** | None | **Missing** | No cron jobs configured in `catalyst.json` |
| **Catalyst User Authentication** | None | **Not Utilized** | Uses custom JWT (`jsonwebtoken` + `bcryptjs`) |

---

## Detailed Findings & Defects

### Issue ID: CAT-001
- **Issue Title:** Ephemeral Serverless Filesystem Risk for Embedded Database
- **File Path:** `functions/api/db/index.js` (Lines 18-35)
- **Component / Function Name:** Database Adapter & Connection Manager
- **Description:** On Linux serverless runtimes (Zoho Catalyst container environment), the database initializes at `/tmp/billing_app.db` via `sql.js` / SQLite:
  ```javascript
  const DB_PATH = process.platform === 'win32'
    ? path.join(__dirname, '..', 'billing.db')
    : '/tmp/billing_app.db';
  ```
  Zoho Catalyst Advanced I/O functions run in stateless microVM containers. When containers idle out, scale to zero, or rotate across execution nodes, all data written to `/tmp` is wiped clean.
- **Why It Is a Problem:** In production, transactions, customer records, and invoices created by a merchant will vanish when the Catalyst container scales down or cold-starts on a new worker node.
- **Severity:** CRITICAL
- **Recommended Solution:**
  1. Migrate production persistence to **Catalyst Data Store** (Catalyst Native NoSQL / Table storage SDK: `catalyst.datastore()`), OR
  2. Connect to an external managed PostgreSQL/MySQL database via connection pooling, OR
  3. Implement automated snapshots to Catalyst File Store on transaction commits.
- **Dependencies:** `zcatalyst-sdk`, `catalyst.json`.
- **Testing Required:** Deploy function, perform write operation, force container cold restart, verify persistence.

---

### Issue ID: CAT-002
- **Issue Title:** Missing Catalyst Cron Configuration for Scheduled Maintenance
- **File Path:** `catalyst.json`
- **Component / Function Name:** Scheduled Background Jobs
- **Description:** SaaS operations require periodic background jobs:
  1. Expiring overdue subscriptions and trials (`subscriptions.end_date < CURRENT_TIMESTAMP`).
  2. Retrying failed Zoho CRM/Desk sync events queued in `zoho_sync_logs`.
  3. Daily sales rollups and low-stock alerts.
  `catalyst.json` contains no `"cron"` target or scheduled function definitions.
- **Why It Is a Problem:** Subscriptions never expire automatically unless an admin manually checks them or user logs in, and failed Zoho API calls are never retried automatically.
- **Severity:** HIGH
- **Recommended Solution:** Define a Catalyst Cron function in `catalyst.json` (e.g. `cron_worker` running every hour) that invokes backend maintenance endpoints.
- **Dependencies:** `catalyst.json`, `functions/api/services/maintenanceService.js`.
- **Testing Required:** Trigger scheduled function via Catalyst CLI `catalyst cron:execute` and verify subscription statuses update.

---

### Issue ID: CAT-003
- **Issue Title:** Serverless Execution Timeout Vulnerability on Bulk Sync
- **File Path:** `functions/api/services/zohoService.js` (Lines 210-250)
- **Component / Function Name:** `syncAllPendingToZoho()`
- **Description:** Zoho Catalyst Advanced I/O functions enforce an execution timeout limit (standard 15-30 seconds). `syncAllPendingToZoho()` loops synchronously over all pending rows in `zoho_sync_logs`, making sequential HTTP requests to Zoho CRM and Desk APIs.
- **Why It Is a Problem:** If there are 50 pending records, sequential network roundtrips to Zoho OAuth and REST APIs exceed the Catalyst container execution ceiling, resulting in a gateway timeout (504) and interrupted sync.
- **Severity:** MEDIUM
- **Recommended Solution:** Batch sync requests in chunks of 5-10 records per execution or offload to a background Event Function using Catalyst Event Bus.
- **Dependencies:** `functions/api/services/zohoService.js`.
- **Testing Required:** Queue 30 sync operations and measure total execution time against Catalyst timeout threshold.

---

### Issue ID: CAT-004
- **Issue Title:** Absence of Catalyst Client Gateway Rewrites for SPA Deep Linking
- **File Path:** `client/public/client-package.json`, `catalyst.json`
- **Component / Function Name:** Catalyst Web Client Hosting
- **Description:** In Single Page Applications (SPA), direct browser navigation to deep routes (e.g., `https://.../app/pos` or `https://.../app/inventory`) without hash routing requires the server hosting the static assets to rewrite all unmatched routes back to `index.html`.
- **Why It Is a Problem:** Refreshing the browser on any subpage returns a 404 Not Found from Catalyst static file server unless hash routing (`/#/pos`) or client-package.json rewrite rules are configured.
- **Severity:** MEDIUM
- **Recommended Solution:** Configure rewrite rules in `client-package.json`:
  ```json
  {
    "rewrites": [
      { "source": "/app/**", "destination": "/index.html" },
      { "source": "/**", "destination": "/index.html" }
    ]
  }
  ```
- **Dependencies:** `client/public/client-package.json`.
- **Testing Required:** Deploy to Catalyst; directly load `https://<domain>/app/invoices` in browser; verify page renders correctly.
