# 07. Zoho Desk Audit Report

**Project:** Universal Billing and POS SaaS (SMARTBILLING)  
**Auditor:** Principal Enterprise Integrations Architect & Helpdesk Engineer  
**Audit Date:** November 6, 2026  
**Status:** Audit Complete — No Fixes Applied  

---

## Executive Summary

The platform provides an integrated customer support helpdesk module in both the Merchant Portal (`/app/help`) and Super Admin Portal (`/admin/zoho`). The stated design is to allow merchants to log issues, track tickets, submit replies, and rate resolutions, with bi-directional synchronization to Zoho Desk.

Our audit confirms that **the Zoho Desk integration is an internal simulation. Local tickets are created and stored in SQLite `support_tickets`, but outbound REST calls to Zoho Desk APIs are completely stubbed, inbound webhooks do not exist, and ticket replies never reach Zoho Desk agents.**

---

## Detailed Integration Assessment

| Helpdesk Capability | Implementation Path | Realized Status | Technical Evidence |
| :--- | :--- | :--- | :--- |
| **Local Ticket Persistence** | `functions/api/services/zohoService.js:178` | **FUNCTIONAL** | Tickets saved in SQLite `support_tickets` table |
| **Outbound Ticket Push** | `POST https://desk.zoho.com/api/v1/tickets` | **STUBBED** | Generates fake `zd_${Date.now()}` ticket ID |
| **Department ID Routing** | `deskPayload.departmentId` | **PARTIAL** | Reads `conn.desk_department_id` but never transmits |
| **Ticket Thread / Replies** | `POST /tickets/{id}/comments` | **LOCAL ONLY** | Appends to `replies_json` in DB; no Desk sync |
| **Attachments Upload** | Multipart Form / Desk Attachments API | **MISSING** | No file upload support in UI or backend |
| **Ticket Rating / CSAT** | `POST /tickets/{id}/feedback` | **LOCAL ONLY** | Updates SQLite column; no Desk sync |
| **Inbound Webhook Sync** | `/api/zoho/desk/webhook` | **MISSING** | Agent responses in Zoho Desk never sync back to shop |
| **Retry Queue Consumer** | Scheduled Worker | **MISSING** | Records in `AWAITING_CONNECTION` never auto-sync |

---

## Detailed Findings & Defects

### Issue ID: DESK-001
- **Issue Title:** Mocked Ticket Creation to Zoho Desk (No Real HTTP Dispatch)
- **File Path:** `functions/api/services/zohoService.js` (Lines 212-218)
- **Component / Function Name:** `ZohoService.createSupportTicket()`
- **Description:** When the connection is marked active, the code executes:
  ```javascript
  const zohoTicketId = `zd_${Date.now()}`;
  run('UPDATE support_tickets SET zoho_ticket_id = ? WHERE id = ?', [zohoTicketId, ticketId]);
  run(`
    INSERT INTO zoho_sync_logs (id, service, action, entity_type, entity_id, status, request_payload, response_data)
    VALUES (?, 'DESK', 'CREATE_TICKET', 'Ticket', ?, 'SUCCESS', ?, ?)
  `, [logId, ticketId, JSON.stringify(deskPayload), JSON.stringify({ id: zohoTicketId })]);
  ```
  No HTTP request is made to Zoho Desk's `https://desk.zoho.com/api/v1/tickets` endpoint.
- **Why It Is a Problem:** Support staff logged into the company's Zoho Desk portal will never receive tickets submitted by merchants from their POS/shop dashboard.
- **Severity:** CRITICAL
- **Recommended Solution:** Implement real outbound HTTP POST via `axios`:
  ```javascript
  const res = await axios.post(`${this.deskBaseUrl}/tickets`, deskPayload, {
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      orgId: conn.desk_org_id
    }
  });
  const zohoTicketId = res.data.id;
  ```
- **Dependencies:** `zohoService.js`, real OAuth token manager.
- **Testing Required:** Create ticket in `/app/help`; verify ticket appears in Zoho Desk agent queue with matching subject and department.

---

### Issue ID: DESK-002
- **Issue Title:** Ticket Replies Disconnected from Zoho Desk Comments API
- **File Path:** `functions/api/services/zohoService.js` (Lines 232-254)
- **Component / Function Name:** `ZohoService.addTicketReply()`
- **Description:** When a merchant replies to an ongoing support ticket in the UI, `addTicketReply` updates only the local JSON column `support_tickets.replies_json`. It does not send the comment to Zoho Desk.
- **Why It Is a Problem:** Conversations are one-sided. Support engineers working in Zoho Desk cannot read follow-ups, diagnostic information, or clarifications sent by merchants.
- **Severity:** HIGH
- **Recommended Solution:** Dispatch an HTTP POST to `${this.deskBaseUrl}/tickets/${ticket.zoho_ticket_id}/comments` with `{ content: message, isPublic: true }`.
- **Dependencies:** `zohoService.js`.
- **Testing Required:** Submit reply from shopkeeper portal; verify comment appears in Zoho Desk ticket activity thread.

---

### Issue ID: DESK-003
- **Issue Title:** Missing Inbound Zoho Desk Webhook Receiver for Status & Agent Replies
- **File Path:** `functions/api/routes/` (Missing webhook route)
- **Component / Function Name:** Zoho Desk Webhook Controller
- **Description:** When a support agent in Zoho Desk updates a ticket status to "In Progress", "On Hold", or "Resolved", or writes a response to the customer, Zoho Desk sends a webhook notification. There is no route in the backend (e.g. `/api/zoho/desk/webhook`) to receive these events.
- **Why It Is a Problem:** In the merchant dashboard, tickets remain permanently in their initial "Open" status, and agent replies never appear in the merchant's chat thread.
- **Severity:** HIGH
- **Recommended Solution:** Create `POST /api/webhooks/zoho-desk` with secret token verification to update `support_tickets.status` and append agent messages to `replies_json`.
- **Dependencies:** `functions/api/routes/webhooks.js`.
- **Testing Required:** Send simulated Zoho Desk ticket update payload; verify ticket status in DB changes to "Resolved".

---

### Issue ID: DESK-004
- **Issue Title:** Missing File Attachment Upload Support
- **File Path:** `client/src/pages/shop/ShopHelp.tsx`, `functions/api/services/zohoService.js`
- **Component / Function Name:** Support Ticket Form
- **Description:** Merchants troubleshooting receipt printer issues, barcode scanner faults, or invoice discrepancies have no ability to attach screenshots or error logs.
- **Why It Is a Problem:** Support resolution times increase drastically because agents cannot inspect error screenshots or receipt samples.
- **Severity:** MEDIUM
- **Recommended Solution:** Add file input in `ShopHelp.tsx`, multipart handler in backend, and stream file to Zoho Desk Attachments API.
- **Dependencies:** `multer` or base64 upload handler.
- **Testing Required:** Attach a PNG screenshot to a support ticket; verify attachment is accessible.
