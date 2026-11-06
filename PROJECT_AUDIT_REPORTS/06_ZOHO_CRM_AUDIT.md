# 06. Zoho CRM Audit Report

**Project:** Universal Billing and POS SaaS (SMARTBILLING)  
**Auditor:** Principal Enterprise Integrations Architect & CRM Specialist  
**Audit Date:** November 6, 2026  
**Status:** Audit Complete — No Fixes Applied  

---

## Executive Summary

The project includes an integration module designed to synchronize SaaS website demo requests (as Leads) and paying merchants (as Accounts and Contacts) to Zoho CRM. The administrative interface provides a credential management panel at `/admin/zoho`.

Our in-depth source code audit reveals that **the Zoho CRM integration is currently an internal simulation (stubbed mock). The backend does not dispatch real outbound HTTP requests to Zoho Accounts or CRM REST endpoints, lacks multi-DC region support (.in vs .com), and has no inbound webhook ingestion.**

---

## Integration Architecture & Status

| Capability | Target Endpoint | Code Location | Status | Verified Reality |
| :--- | :--- | :--- | :--- | :--- |
| **OAuth Token Refresh** | `accounts.zoho.com/oauth/v2/token` | `zohoService.js:51-78` | **STUBBED** | Generates mock token string without network dispatch |
| **Lead Generation** | `/crm/v2/Leads` | `zohoService.js:87-133` | **STUBBED** | Writes simulated success directly to `zoho_sync_logs` |
| **Account Sync** | `/crm/v2/Accounts` | `zohoService.js:138-163` | **STUBBED** | Writes simulated success directly to `zoho_sync_logs` |
| **Contact Sync** | `/crm/v2/Contacts` | — | **MISSING** | No contact association implemented |
| **Duplicate Detection** | Search API | `zohoService.js` | **MISSING** | No duplicate check by email before sync |
| **CRM Webhook Receiver** | `/api/zoho/crm/webhook` | — | **MISSING** | No inbound webhook endpoint exists |
| **DC Region Switching** | `.in`, `.com`, `.eu` | `zohoService.js:7` | **HARDCODED** | Defaults to `.com`, incompatible with Indian accounts |

---

## Detailed Findings & Defects

### Issue ID: CRM-001
- **Issue Title:** Stubbed Zoho OAuth Token Refresh (No Outbound HTTP Dispatch)
- **File Path:** `functions/api/services/zohoService.js` (Lines 65-76)
- **Component / Function Name:** `ZohoService.getValidAccessToken()`
- **Description:** When obtaining an active OAuth token using the stored `refresh_token`, the implementation does not call Zoho's OAuth token endpoint. Instead, the code reads:
  ```javascript
  // In a live production environment with valid tokens:
  // Call Zoho Accounts OAuth token endpoint: https://accounts.zoho.com/oauth/v2/token
  // In local sandbox / testing without live keys:
  const mockToken = `zoho_${service.toLowerCase()}_tok_${Date.now()}`;
  const newExpiresAt = new Date(Date.now() + 3600000).toISOString();
  ```
- **Why It Is a Problem:** Even if the Super Administrator inputs legitimate Zoho OAuth Client ID, Client Secret, and Refresh Token in the `/admin/zoho` interface, the system will never request an authentic bearer token from Zoho Accounts. Live synchronization is completely inactive.
- **Severity:** CRITICAL
- **Recommended Solution:** Implement real outbound HTTP POST request via `axios` or native `fetch`:
  ```javascript
  const params = new URLSearchParams({
    refresh_token: conn.refresh_token,
    client_id: conn.client_id,
    client_secret: conn.client_secret,
    grant_type: 'refresh_token'
  });
  const res = await axios.post(`${accountsBaseUrl}/oauth/v2/token`, params);
  const { access_token, expires_in } = res.data;
  ```
- **Dependencies:** `axios`, `functions/api/services/zohoService.js`.
- **Testing Required:** Supply test Zoho Refresh Token and verify authentic Zoho bearer token received.

---

### Issue ID: CRM-002
- **Issue Title:** Mocked Lead Creation Without REST API Call to Zoho CRM
- **File Path:** `functions/api/services/zohoService.js` (Lines 117-125)
- **Component / Function Name:** `ZohoService.syncDemoRequestAsLead()`
- **Description:** In `syncDemoRequestAsLead`:
  ```javascript
  try {
    const token = await this.getValidAccessToken('CRM');
    // If live: POST https://www.zohoapis.com/crm/v2/Leads with token
    run(`
      INSERT INTO zoho_sync_logs (...)
      VALUES (?, 'CRM', 'CREATE_LEAD', 'Lead', ?, 'SUCCESS', ?, ?)
    `, [logId, email, JSON.stringify(payload), JSON.stringify({ zoho_id: `lead_${Date.now()}` })]);
    return { success: true, leadId: `lead_${Date.now()}` };
  }
  ```
  The comment explicitly acknowledges that live API dispatch is commented out. The method returns a mock `lead_173000...` ID and marks the sync log as `SUCCESS`.
- **Why It Is a Problem:** Marketing and sales leads submitting demo requests never appear in the enterprise Zoho CRM system.
- **Severity:** HIGH
- **Recommended Solution:** Dispatch real `axios.post(`${this.crmBaseUrl}/Leads`, { data: [payload] }, { headers: { Authorization: `Zoho-oauthtoken ${token}` } })`.
- **Dependencies:** Real token acquisition (Issue CRM-001).
- **Testing Required:** Trigger public demo request form; inspect response payload and verify record creation in target CRM.

---

### Issue ID: CRM-003
- **Issue Title:** Hardcoded `.com` Domain Breaks Indian (`.in`) Zoho DC Accounts
- **File Path:** `functions/api/services/zohoService.js` (Lines 7-8)
- **Component / Function Name:** `ZohoService.constructor()`
- **Description:** API domain is configured as:
  ```javascript
  this.crmBaseUrl = process.env.ZOHO_CRM_API_URL || 'https://www.zohoapis.com/crm/v2';
  ```
  Zoho enforces strict regional Data Center isolation. Indian organizations registered under `.in` accounts cannot authenticate against `accounts.zoho.com` or `zohoapis.com`; they must target `accounts.zoho.in` and `zohoapis.in`.
- **Why It Is a Problem:** Indian businesses and Catalyst accounts deploying this software receive `INVALID_OAUTH_CLIENT` or `401 Unauthorized` errors.
- **Severity:** HIGH
- **Recommended Solution:** Add Data Center region selector (`IN`, `US`, `EU`, `AU`) in `/admin/zoho` and dynamically build the base URL:
  `accounts.zoho.${dc}` and `zohoapis.${dc}`.
- **Dependencies:** `client/src/pages/admin/AdminZoho.tsx`, `zoho_connections` table.
- **Testing Required:** Connect an Indian Zoho CRM account (`dc=in`); verify successful token exchange.

---

### Issue ID: CRM-004
- **Issue Title:** Missing Duplicate Detection & Email Lookup
- **File Path:** `functions/api/services/zohoService.js` (Lines 87-133)
- **Component / Function Name:** `syncDemoRequestAsLead()`
- **Description:** Submitting demo requests does not query Zoho CRM's Search API (`/crm/v2/Leads/search?email=...`) or specify `duplicate_check_fields: ['Email']`.
- **Why It Is a Problem:** If a user submits multiple inquiries, multiple duplicate Lead records will be spawned in Zoho CRM.
- **Severity:** MEDIUM
- **Recommended Solution:** Add `duplicate_check_fields: ["Email"]` to the payload and configure trigger actions.
- **Dependencies:** `zohoService.js`.
- **Testing Required:** Submit identical email twice; confirm CRM merges or updates rather than duplicating.
