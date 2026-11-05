# UNIVERSAL BILLING SAAS - ARCHITECTURE & DESIGN SPECIFICATION

## 1. System Overview

**Universal Billing SaaS** is a multi-tenant cloud-native platform providing Point-of-Sale (POS), inventory management, dedicated product exchange workflows, and business operations for multi-branch retailers. The platform operates on a dual-experience architecture:

1. **Super Admin Platform Console (`/admin`)**: Exclusively for platform owners and operations staff to manage tenants, pricing tiers, payment gateways, CRM/Desk integration monitors, software updates, and platform telemetry.
2. **Shopkeeper Business Application (`/app`)**: Dedicated merchant portal with high-speed POS billing, dedicated product exchanges, inventory transfers, shift management, customer loyalty, and real-time P&L reporting.
3. **Public SaaS Onboarding & Pricing (`/`)**: Dynamic public portal driven by server-side branding configuration where merchants can review plans and self-register for a 14-day free trial.

---

## 2. High-Level Architecture Topology

```
+--------------------------------------------------------------------------------+
|                                CLIENT LAYER (PWA)                              |
|   React 18 + TypeScript + Vite + Tailwind CSS + Lucide Icons + PWA SW & Manifest|
|                                                                                |
|   Public Portal (/)  |  Super Admin Console (/admin)  |  Shopkeeper App (/app) |
+---------------------------------------+----------------------------------------+
                                        | HTTPS / REST APIs
                                        v
+--------------------------------------------------------------------------------+
|                     ZOHO CATALYST ADVANCED I/O SERVER ENGINE                   |
|                        (Node.js 18+ Express Microservice)                      |
|                                                                                |
|  [Security & Auth Guards]     [Tenant Scoping Engine]   [Entitlement Engine]   |
|  JWT Verification & RBAC      Enforces business_id      Checks plan expiration |
|  Cashier PIN Validation       & branch_id filters       & monthly invoice cap  |
+---------------------------------------+----------------------------------------+
                                        |
           +----------------------------+----------------------------+
           |                                                         |
           v                                                         v
+---------------------------------------+  +-------------------------------------+
|        CORE BUSINESS SERVICES         |  |        EXTERNAL INTEGRATIONS        |
| - PosService (Atomic Checkout)        |  | - Razorpay Adapter (HMAC SHA-256)   |
| - ExchangeService (Differential Exch) |  | - Cashfree Adapter (HMAC SHA-256)   |
| - InventoryService (Stock Movement)   |  | - Zoho CRM Lead/Account Sync Hub    |
| - CashRegisterService (Shift Tracker) |  | - Zoho Desk In-App Support Hub      |
+---------------------------------------+  +-------------------------------------+
                                        |
                                        v
+--------------------------------------------------------------------------------+
|                  TRANSACTIONAL ACID DATABASE ENGINE (WAL MODE)                 |
|  - 30+ Relational Multi-Tenant Tables with Foreign Key Enforcement             |
|  - Write-Ahead Logging (WAL) for High Concurrent Reads & Immediate Commits     |
|  - Synchronous Atomic Locking for Zero Balance Discrepancy & Invoicing         |
+--------------------------------------------------------------------------------+
```

---

## 3. Database Architecture & Transactional Consistency

### 3.1 Strict ACID Requirement
Catalyst Data Store provides NoSQL document storage without multi-table atomic cross-document rollback capabilities. To guarantee that financial transactions, payment reconciliation, and stock levels never get out of sync, the application uses an ACID-compliant transactional relational engine configured in **WAL (Write-Ahead Logging)** mode.

### 3.2 Atomic Execution via `withTransaction`
All critical mutation operations are executed inside the atomic wrapper:

```javascript
const result = withTransaction((db) => {
  // Step 1: Sequential business invoice generation with table lock
  const invoiceNo = getNextInvoiceNumber(businessId);

  // Step 2: Validate inventory balances
  // Step 3: Insert sale header record
  // Step 4: Insert sale line items
  // Step 5: Atomically decrement stock
  // Step 6: Record stock movement audit entry
  // Step 7: Update customer loyalty ledger & credit balance
  // Step 8: Update cash drawer register movement
  // Step 9: Write immutable audit log
  return { success: true, invoiceNo, saleId };
});
```
If any step fails (such as insufficient stock, duplicate invoice constraint, or foreign key violation), the entire transaction rolls back immediately, preserving absolute data integrity.

---

## 4. Multi-Tenant Isolation & Security Model

### 4.1 Strict Business & Branch Scoping
Every merchant table includes mandatory columns:
- `business_id TEXT NOT NULL REFERENCES businesses(id)`
- `branch_id TEXT REFERENCES business_branches(id)`

All business API routes enforce:
1. `requireBusinessAuth` middleware parses the verified JWT token and populates `req.businessId`, `req.user`, and `req.business`.
2. Active branch selection is passed via the `x-branch-id` header and validated to ensure the authenticated user has access to that store branch.
3. Every database query includes parameterized `WHERE business_id = ? AND branch_id = ?` clauses. Cross-tenant leakage is impossible at both database and routing levels.

### 4.2 Data Separation between SaaS Operations and Merchants
- SaaS platform CRM prospects and tickets are stored centrally for platform administrators.
- Merchant end-customers, retail invoices, and inventory remain private to that business tenant.
- Super Admin staff cannot view or modify merchants' retail sales without explicitly logged audit trails.

---

## 5. Dedicated Product Exchange Engine

Unlike generic returns that simply refund money or issue credit notes, Universal Billing SaaS provides a **first-class dedicated product exchange workflow**:

1. **Invoice Verification**: Validates the original sale invoice number and checks the business exchange eligibility window (default: 15 days).
2. **Item-by-Item Return Evaluation**:
   - Condition `GOOD`: Restocked to available branch inventory immediately.
   - Condition `DEFECTIVE`: Diverted to a quarantined damaged goods inventory so defective items are never sold again.
3. **Replacement Item Calculation**: Calculates replacement item pricing and taxes.
4. **Differential Calculation**:
   - `Replacement Total > Returned Total`: Calculates additional cash/card/UPI collection due from customer.
   - `Replacement Total < Returned Total`: Calculates refund due back to customer.
   - `Replacement Total == Returned Total`: Even exchange recorded with zero cash movement.
5. **Cash Drawer Synchronisation**: Automatically updates active cashier shift cash balance with collected difference or cash refund.

---

## 6. Server-Side Entitlement & Subscription Engine

Tenant capabilities are gated through the server-side entitlement middleware:

1. **Plan Expiration & Grace Period**:
   - Subscriptions feature a configurable 3-day grace period.
   - Once expired, tenants are restricted to read-only mode and blocked from creating new sales or inventory entries.
2. **Resource Limits**:
   - `max_users`: Enforced when creating new staff accounts.
   - `max_branches`: Enforced during new branch creation.
   - `max_products`: Enforced on product addition.
   - `max_invoices_per_month`: Enforced at checkout.

---

## 7. Payment Gateway Integration & Webhook Idempotency

### 7.1 Provider Adapter Pattern
Supports Razorpay and Cashfree via a unified interface:
- `createOrder(orderParams)`
- `verifySignature(orderId, paymentId, signature)`
- `handleWebhook(payload, signature)`

### 7.2 Webhook Replay Protection
Webhooks are authenticated via HMAC SHA-256 signatures using configured webhook secrets. To prevent double subscription extension or duplicate billing, all webhooks are logged to the `webhook_logs` table with a unique event ID and transaction status. Duplicate webhook requests are detected and safely acknowledged with HTTP 200 without executing duplicate mutations.
