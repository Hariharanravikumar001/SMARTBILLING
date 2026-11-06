# 12. Security and Vulnerability Audit Report

**Project:** Universal Billing and POS SaaS (SMARTBILLING)  
**Auditor:** Principal Application Security Architect & Penetration Tester  
**Audit Date:** November 6, 2026  
**Status:** Audit Complete — No Fixes Applied  

---

## Executive Summary

A comprehensive, non-destructive security audit was executed across authentication mechanisms, tenant boundary controls, data isolation filters, session token generation, and API parameter bindings.

The application exhibits **strong defense against SQL injection via universal parameterized query bindings.** However, our audit revealed **critical vulnerabilities regarding hardcoded JWT secret fallbacks, plaintext cashier PIN storage without rate limiting, permissive CORS reflection, and missing HTTP security headers.**

---

## Threat Matrix & Security Profile

| Security Vector | Implementation Mechanism | Assessed Level | Threat Severity |
| :--- | :--- | :--- | :--- |
| **SQL Injection** | Parameterized queries (`?`) in all routes | **Resilient** | SAFE |
| **Password Hashing** | `bcryptjs` with salt rounds | **Resilient** | SAFE |
| **Multi-Tenant Isolation** | Scoped queries by `req.businessId` | **Protected** | LOW RISK |
| **JWT Secret Hardcoding** | Hardcoded default fallback in `auth.js` | **Vulnerable** | CRITICAL |
| **Cashier PIN Security** | Stored in plaintext; no rate limiting | **Vulnerable** | HIGH |
| **CORS Configuration** | `origin: true` (reflects any origin) | **Permissive** | MEDIUM |
| **Security Headers** | Helmet / CSP / HSTS / X-Frame-Options | **Missing** | MEDIUM |
| **Input Validation** | Ad-hoc manual JS checks | **Partial** | MEDIUM |

---

## Detailed Findings & Defects

### Issue ID: SEC-001
- **Issue Title:** Hardcoded Default JWT Secret Exposes Token Forgery
- **File Path:** `functions/api/middleware/auth.js` (Line 6)
- **Component / Function Name:** `auth.js` -> `JWT_SECRET`
- **Description:** JWT secret initialization falls back to a public string:
  ```javascript
  const JWT_SECRET = process.env.JWT_SECRET || 'universal_billing_saas_secure_jwt_secret_2026';
  ```
  If the application is deployed without explicitly specifying `JWT_SECRET` in Zoho Catalyst environment settings, all issued tokens are signed with this publicly known string.
- **Why It Is a Problem:** An external attacker reading the open-source repository can forge signed JWT tokens with `{ type: 'PLATFORM', id: 'admin_01' }`, acquiring total Super Admin platform privileges.
- **Severity:** CRITICAL
- **Recommended Solution:** Enforce mandatory startup validation: if `process.env.NODE_ENV === 'production'` and `process.env.JWT_SECRET` is not set or equals the default fallback, immediately throw an error and refuse to start the server.
- **Dependencies:** `functions/api/middleware/auth.js`.
- **Testing Required:** Start application in production mode without `JWT_SECRET`; verify server exits with configuration error.

---

### Issue ID: SEC-002
- **Issue Title:** Plaintext Cashier PINs Stored in Database Without Brute-Force Rate Limiting
- **File Path:** `functions/api/routes/auth.js` (Lines 133-143)
- **Component / Function Name:** `POST /business/pin-login`
- **Description:** Touchscreen cashiers authenticate using a 4-digit PIN. The query matches raw input:
  ```sql
  SELECT * FROM business_users WHERE business_id = ? AND pin = ? AND is_active = 1
  ```
  PINs are saved unhashed in column `business_users.pin`. Moreover, the `/business/pin-login` endpoint contains **no rate limiter or account lockout**.
- **Why It Is a Problem:**
  1. A 4-digit PIN has only 10,000 combinations. An attacker with network access can script a brute-force attack in seconds without being blocked.
  2. Database leaks expose all cashier PINs instantly.
- **Severity:** HIGH
- **Recommended Solution:**
  1. Hash PINs with `bcryptjs` or a salted SHA-256 before storage.
  2. Add IP/business rate limiting (e.g. max 5 failed attempts per 15 minutes before temporary lockout).
- **Dependencies:** `express-rate-limit`, `functions/api/routes/auth.js`.
- **Testing Required:** Send 6 rapid incorrect PIN attempts; verify the 6th attempt returns `429 Too Many Requests`.

---

### Issue ID: SEC-003
- **Issue Title:** Unvalidated `x-branch-id` Header Injection
- **File Path:** `functions/api/middleware/auth.js` (Line 79)
- **Component / Function Name:** `requireBusinessAuth`
- **Description:** The middleware assigns the active branch using:
  ```javascript
  req.branchId = req.headers['x-branch-id'] || user.branch_id;
  ```
  It does not verify whether the ID in `x-branch-id` actually exists within `business_branches` for `business_id = req.businessId`.
- **Why It Is a Problem:** A cashier could supply an arbitrary or invalid branch ID string, leading to unlinked stock movements or silent data anomalies.
- **Severity:** MEDIUM
- **Recommended Solution:** Verify `req.headers['x-branch-id']` against `business_branches` where `business_id = req.businessId`. If invalid, fallback to `user.branch_id` or reject with `400 Bad Request`.
- **Dependencies:** `functions/api/middleware/auth.js`.
- **Testing Required:** Pass `x-branch-id: non_existent_branch`; verify middleware falls back to user default branch.

---

### Issue ID: SEC-004
- **Issue Title:** Permissive CORS Configuration and Missing Helmet Security Headers
- **File Path:** `functions/api/index.js` (Line 21)
- **Component / Function Name:** Express Security Middleware
- **Description:** The backend sets:
  ```javascript
  app.use(cors({ origin: true, credentials: true }));
  ```
  And does not include `helmet` middleware for standard HTTP defense headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Content-Security-Policy`).
- **Why It Is a Problem:** The application is vulnerable to clickjacking attacks inside malicious iframes and MIME-sniffing exploits.
- **Severity:** MEDIUM
- **Recommended Solution:** Include `helmet()` with strict frameguard and configure CORS to allow only trusted merchant domains and Catalyst client origins.
- **Dependencies:** `helmet`, `cors`.
- **Testing Required:** Inspect response headers; verify presence of `X-Frame-Options` and `X-Content-Type-Options`.
