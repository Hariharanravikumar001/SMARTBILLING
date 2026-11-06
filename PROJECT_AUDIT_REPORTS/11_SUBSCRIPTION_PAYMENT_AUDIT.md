# 11. Subscription and Payment Audit Report

**Project:** Universal Billing and POS SaaS (SMARTBILLING)  
**Auditor:** Principal Fintech Architect, Security Auditor & Payment Specialist  
**Audit Date:** November 6, 2026  
**Status:** Audit Complete — No Fixes Applied  

---

## Executive Summary

The SaaS subscription engine manages 4 pricing tiers (Monthly, Quarterly, Half-Yearly, Yearly) with multi-gateway routing (Razorpay, Cashfree, Manual), cryptographic webhook verification, coupon discount calculation, and automated entitlement renewal.

Our audit identifies **a critical security vulnerability: `/complete-payment` permits client-side activation of subscriptions without server-side signature verification, allowing unauthorized plan activations. Furthermore, coupon redemption tracking is not recorded, and automated trial expiration lacks a background execution worker.**

---

## Subscription & Payment Capabilities Assessment

| Capability | Target Route / Component | Stated Mechanism | Audited Status | Security Rating |
| :--- | :--- | :--- | :--- | :--- |
| **Plan Catalog** | `GET /subscription/plans` | Active plan listing | **FUNCTIONAL** | Safe |
| **Usage Tracking** | `GET /subscription/my-plan` | Branch/user/invoice limits | **FUNCTIONAL** | Safe |
| **Order Initiation** | `POST /subscription/initiate-order` | Gateway order creation | **FUNCTIONAL** | Safe |
| **Client Payment Completion** | `POST /subscription/complete-payment` | Client invokes activation | **CRITICAL FLAW** | **UNAUTHENTICATED UPGRADE** |
| **Webhook Verification** | `POST /subscription/webhook/:gw` | HMAC SHA256 Signature | **PARTIAL** | Bypassed if not prod |
| **Replay Protection** | `payment_webhooks.event_id` | Unique ID ledger check | **FUNCTIONAL** | Safe |
| **Coupon Validation** | `POST /subscription/validate-coupon` | Code, expiry, max discount | **FUNCTIONAL** | Safe |
| **Coupon Ledger / Usage Limit**| `coupon_redemptions` table | Increment `used_count` | **NOT EXECUTED** | **BUG** |
| **Automated Trial Expiry** | Background Worker | Expire past-due dates | **MISSING** | Inactive |

---

## Detailed Findings & Defects

### Issue ID: SUB-001
- **Issue Title:** Unauthenticated Server-Side Subscription Activation Vulnerability
- **File Path:** `functions/api/routes/subscription.js` (Lines 220-255)
- **Component / Function Name:** `router.post('/complete-payment')`
- **Description:** When a merchant completes checkout on the frontend, the client sends:
  ```javascript
  const { orderId, paymentId, planId, gateway, amount } = req.body;
  const activation = PaymentManager.activateSubscription({ ... });
  ```
  The endpoint **never validates the Razorpay cryptographic signature** (`razorpay_signature` HMAC of `order_id|payment_id`) nor does it verify payment capture with the payment gateway REST API.
- **Why It Is a Problem:** Any authenticated merchant or malicious user can forge a `POST` request with a fake `orderId`, fake `paymentId`, and `planId: 'plan_yearly'`, immediately receiving a 365-day subscription extension for ₹0 without ever paying.
- **Severity:** CRITICAL
- **Recommended Solution:**
  1. For Razorpay, require `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature`.
  2. Verify HMAC SHA256 using `crypto.createHmac('sha256', key_secret).update(body).digest('hex')`.
  3. Reject activation if signature does not match.
  4. Alternatively, activate plans **strictly via server-side webhook events** (`POST /webhook/razorpay`), treating client-side redirect only as an acknowledgment.
- **Dependencies:** `functions/api/services/paymentAdapters/index.js`.
- **Testing Required:** Send a forged `/complete-payment` POST without valid signature; verify endpoint responds with `400 Bad Request: Invalid payment signature`.

---

### Issue ID: SUB-002
- **Issue Title:** Coupon Redemptions Table Not Updated and Usage Counter Not Incremented
- **File Path:** `functions/api/routes/subscription.js` (Lines 176-187, 220-255)
- **Component / Function Name:** Coupon Application Logic
- **Description:** When an order is initiated with a discount coupon:
  The system computes the discount, but upon payment completion, it **never increments `coupons.used_count`** and **never writes to `coupon_redemptions`**.
- **Why It Is a Problem:**
  1. `coupons.max_uses` limit is never enforced; single-use discount coupons can be reused infinitely.
  2. The Super Administrator cannot view financial audits of which merchants claimed which coupons.
- **Severity:** HIGH
- **Recommended Solution:** In `activateSubscription()`, if coupon was applied:
  ```sql
  UPDATE coupons SET used_count = used_count + 1 WHERE id = ?;
  INSERT INTO coupon_redemptions (id, coupon_id, business_id, payment_id, discount_applied) VALUES (?, ?, ?, ?, ?);
  ```
- **Dependencies:** `functions/api/services/paymentAdapters/index.js`.
- **Testing Required:** Apply single-use coupon (`max_uses = 1`); complete payment; verify coupon becomes invalid for subsequent purchases.

---

### Issue ID: SUB-003
- **Issue Title:** Lack of Automated Trial & Grace Period Expiry Background Worker
- **File Path:** `functions/api/services/` (Missing worker)
- **Component / Function Name:** Subscription State Machine
- **Description:** Subscriptions have statuses `TRIAL`, `ACTIVE`, `GRACE_PERIOD`, and `EXPIRED`. However, status transitions to `EXPIRED` only happen passively if custom middleware checks dates, or not at all.
- **Why It Is a Problem:** Stores whose 14-day free trials have elapsed continue to access the platform indefinitely if no background cron updates `status = 'EXPIRED'`.
- **Severity:** HIGH
- **Recommended Solution:** Implement a daily maintenance task that transitions elapsed subscriptions:
  ```sql
  UPDATE subscriptions SET status = 'EXPIRED' WHERE expires_at < CURRENT_TIMESTAMP AND status IN ('TRIAL', 'ACTIVE', 'GRACE_PERIOD');
  UPDATE businesses SET status = 'EXPIRED' WHERE id IN (SELECT business_id FROM subscriptions WHERE status = 'EXPIRED');
  ```
- **Dependencies:** Maintenance cron or startup hook.
- **Testing Required:** Seed a subscription with `expires_at` in the past; trigger maintenance sweep; verify business status updates to `EXPIRED`.

---

### Issue ID: SUB-004
- **Issue Title:** Unenforced Plan Downgrade Constraints
- **File Path:** `functions/api/routes/subscription.js`
- **Component / Function Name:** Plan Change Handler
- **Description:** If a merchant currently has 4 active branches and 1,500 products (Enterprise Plan) and purchases a Monthly Starter Plan (max 1 branch, 500 products), the plan is activated without checking or resolving quota violations.
- **Why It Is a Problem:** The merchant continues using enterprise resources on a low-tier subscription.
- **Severity:** MEDIUM
- **Recommended Solution:** Check current usage against target plan limits before permitting downgrade; require merchant to deactivate excess branches or archive surplus products.
- **Dependencies:** `subscription_plans` max limits.
- **Testing Required:** Attempt downgrade with 3 active branches to 1-branch plan; verify prompt requires branch deactivation.
