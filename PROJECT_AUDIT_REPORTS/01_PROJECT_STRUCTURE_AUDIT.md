# 01. Project Structure Audit

**Project:** Universal Billing and POS SaaS (SMARTBILLING)  
**Auditor:** Senior Software Architect, Security Auditor & Full-Stack Lead  
**Audit Date:** November 6, 2026  
**Status:** Audit Complete — No Fixes Applied  

---

## Executive Summary

The project follows a decoupled multi-package monorepo architecture with a React 18 / TypeScript / Vite frontend located in `client/` and an Express.js backend hosted inside Zoho Catalyst Advanced I/O function under `functions/api/`. While the overarching architecture separates presentation and business logic, several structural anomalies exist: an orphaned duplicate repository directory caused by an external Catalyst CLI pull, duplicate static asset directories, inconsistent build scripts, and lack of root-level workspace dependency orchestration.

---

## Detailed Structure Findings

```
d:\project\billing\
├── .catalystrc                          [Zoho Catalyst configuration]
├── .git/                                [Git repository metadata]
├── .gitignore                           [Top-level gitignore]
├── catalyst.json                        [Catalyst project mapping]
├── package.json                         [Top-level package orchestrator]
├── package-lock.json                    [Top-level lockfile]
├── README.md                            [Project documentation]
├── SMARTBILLING/                        [DEFECT: Orphaned nested project folder]
│   └── functions/
├── client/                              [Frontend React 18 + TS application]
│   ├── index.html                       [Vite entry HTML]
│   ├── package.json                     [Frontend dependencies & scripts]
│   ├── tsconfig.json                    [TypeScript configuration]
│   ├── vite.config.ts                   [Vite build configuration]
│   ├── public/                          [Static assets]
│   │   ├── client-package.json          [Catalyst Web Client package config]
│   │   └── manifest.json                [PWA Manifest]
│   └── src/                             [Source code]
│       ├── App.tsx                      [Router and view dispatcher]
│       ├── main.tsx                     [React root render]
│       ├── contexts/                    [Auth and Branding contexts]
│       ├── pages/                       [Admin, Shop, Public views]
│       ├── services/                    [API client Axios wrappers]
│       └── types/                       [TypeScript definitions]
└── functions/
    └── api/                             [Backend Express REST API]
        ├── index.js                     [Express app & Catalyst entry]
        ├── catalyst-config.json         [Catalyst function runtime config]
        ├── package.json                 [Backend dependencies]
        ├── db/                          [SQLite / sql.js database layer]
        ├── middleware/                  [Auth, RBAC, tenant & rate limiter]
        ├── routes/                      [Express route modules]
        ├── services/                    [Exchange, Zoho & payment services]
        └── tests/                       [Jest unit & integration tests]
```

---

## Identified Issues & Defects

### Issue ID: STRUCT-001
- **Issue Title:** Orphaned Nested Catalyst Directory (`d:\project\billing\SMARTBILLING`)
- **File Path:** `d:\project\billing\SMARTBILLING/`
- **Component / Function Name:** Monorepo Directory Tree
- **Description:** During a previous `catalyst pull` CLI execution, the CLI cloned the remote Catalyst project into a subfolder named `SMARTBILLING`. This created duplicate function files and an obsolete directory tree that is tracked or untracked alongside the main repository.
- **Why It Is a Problem:** Developers and automated tools may accidentally edit files inside `SMARTBILLING/functions/` instead of `functions/api/`, leading to lost edits, confusion, and git repository bloat.
- **Severity:** MEDIUM
- **Recommended Solution:** Safely remove `SMARTBILLING/` directory from the root workspace after verifying no unique untracked changes reside in it. Ensure `.gitignore` ignores any temporary Catalyst pull folders.
- **Dependencies:** None.
- **Testing Required:** Directory verification: `Test-Path d:\project\billing\SMARTBILLING`.

---

### Issue ID: STRUCT-002
- **Issue Title:** Redundant Static Asset Directories (`functions/api/public` vs `client/dist`)
- **File Path:** `functions/api/index.js` (Lines 37-41), `functions/api/public/`
- **Component / Function Name:** Static Middleware Server
- **Description:** `functions/api/index.js` serves static files from `path.join(__dirname, 'public')`. However, the React frontend is deployed either directly via Catalyst Web Client Hosting (`client/dist`) or built to `client/dist`. In some builds, `client/dist` is manually copied to `functions/api/public`, creating duplicate artifacts and inconsistent version serving.
- **Why It Is a Problem:** If `client/` is updated and built, but `functions/api/public/` is not refreshed, users hitting the serverless Express static endpoint receive stale HTML/JS bundles. It also increases the Catalyst function deployment zip payload unnecessarily (pushing close to Catalyst's upload limits).
- **Severity:** HIGH
- **Recommended Solution:** Standardize deployment: use Catalyst Web Client Hosting for frontend assets (`client/dist`), and configure Express only as a pure REST API returning JSON, removing the duplicate `functions/api/public` static bundle from the function zip.
- **Dependencies:** `catalyst.json`, `client/vite.config.ts`.
- **Testing Required:** Verify API returns JSON 404 for missing routes rather than serving `index.html` fallback when used purely as an API gateway.

---

### Issue ID: STRUCT-003
- **Issue Title:** Root Package.json Missing Synchronized Workspace Build Scripts
- **File Path:** `package.json`
- **Component / Function Name:** NPM Script Orchestration
- **Description:** Root `package.json` contains scripts like `build`, `test`, and `deploy`. However, it lacks npm/yarn/pnpm workspace declarations. Running `npm install` at the root does not install `client/node_modules` or `functions/api/node_modules`.
- **Why It Is a Problem:** Continuous Integration (CI) and new developers cloning the repository fail to build because running `npm install` leaves `client` and `functions/api` without their required dependencies.
- **Severity:** MEDIUM
- **Recommended Solution:** Add npm workspaces to root `package.json`: `"workspaces": ["client", "functions/api"]`, and update scripts:
  `"build": "npm run build --workspace=client && npm run build --workspace=functions/api"`.
- **Dependencies:** `package.json`, `client/package.json`, `functions/api/package.json`.
- **Testing Required:** Clean clone test: `rm -rf node_modules && npm install && npm run build`.

---

### Issue ID: STRUCT-004
- **Issue Title:** Inconsistent Environment Variable Discovery Across Runtimes
- **File Path:** `functions/api/index.js` (Line 15), `functions/api/db/index.js` (Line 18)
- **Component / Function Name:** Environment Config Loader
- **Description:** Backend relies on `dotenv.config()` called in `index.js`. However, when routes or DB modules are imported directly (e.g., in unit tests or CLI migration scripts), `dotenv` may not be initialized if `index.js` is not the entry point. Furthermore, Zoho Catalyst functions inject environment variables via Catalyst console rather than local `.env` files.
- **Why It Is a Problem:** In local CLI migrations or standalone testing, DB paths or JWT secrets fallback to insecure defaults (e.g., `'secret'`) or undefined values.
- **Severity:** MEDIUM
- **Recommended Solution:** Create a centralized `config.js` module in `functions/api/config.js` that executes `dotenv.config()` once and exports validated configuration constants with strict runtime fallbacks.
- **Dependencies:** `dotenv`, all routes and services.
- **Testing Required:** Run tests via `node functions/api/tests/exchange.test.js` without calling `index.js`.

---

### Issue ID: STRUCT-005
- **Issue Title:** Missing `.env.example` in Root and Sub-packages
- **File Path:** `d:\project\billing\.env.example` (Missing)
- **Component / Function Name:** Environment Variable Documentation
- **Description:** There is no `.env.example` template documenting the required environment variables: `JWT_SECRET`, `PORT`, `CATALYST_PROJECT_ID`, `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_ORG_ID`, `CASHFREE_APP_ID`, `RAZORPAY_KEY_ID`.
- **Why It Is a Problem:** Developers deploying to staging or production cannot determine which configuration keys are required without digging through multiple source code files.
- **Severity:** LOW
- **Recommended Solution:** Add comprehensive `.env.example` files in both the project root and `functions/api/`.
- **Dependencies:** None.
- **Testing Required:** Verify all variables in `config.js` match `.env.example`.
