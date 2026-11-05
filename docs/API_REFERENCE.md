# UNIVERSAL BILLING SAAS - API REFERENCE SPECIFICATION

Base URL (Local Development): `http://localhost:3001/api`  
Base URL (Zoho Catalyst Production): `https://<catalyst-project-domain>/server/api`

---

## 1. Authentication & Session APIs

### 1.1 Super Admin Login
- **Endpoint**: `POST /auth/platform/login` (Alias: `POST /auth/admin/login`)
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "email": "admin@universalbilling.io",
    "password": "SuperAdmin@2026!"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "token": "eyJhbGciOi...",
    "user": {
      "id": "user_admin_01",
      "name": "Chief Administrator",
      "email": "admin@universalbilling.io",
      "role": "Super Admin",
      "mfa_enabled": false
    }
  }
  ```

### 1.2 Shopkeeper / Business Login
- **Endpoint**: `POST /auth/business/login`
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "email": "owner@apex.com",
    "password": "Owner@2026!"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "token": "eyJhbGciOi...",
    "user": {
      "id": "user_apex_owner",
      "name": "Vikramaditya Rao",
      "email": "owner@apex.com",
      "role": "Owner",
      "branchId": "branch_apex_main"
    },
    "business": {
      "id": "biz_apex_demo",
      "name": "Apex Retail & Apparel",
      "currency_symbol": "₹"
    },
    "branches": [
      { "id": "branch_apex_main", "name": "Main Store - Commercial Street", "code": "BR-01", "is_main": 1 }
    ]
  }
  ```

### 1.3 Quick PIN Login (Cashier / POS Touchscreen)
- **Endpoint**: `POST /auth/business/pin-login`
- **Body**:
  ```json
  {
    "businessId": "biz_apex_demo",
    "pin": "9999"
  }
  ```

### 1.4 Business Self-Serve Registration (14-Day Free Trial)
- **Endpoint**: `POST /auth/business/register`
- **Body**:
  ```json
  {
    "businessName": "New Horizon Supermarket",
    "ownerName": "Rajesh Kumar",
    "email": "rajesh@newhorizon.com",
    "phone": "+91 99887 66554",
    "password": "SecurePassword@123",
    "industryType": "grocery"
  }
  ```

---

## 2. Platform Branding & Public Configuration

### 2.1 Get Dynamic Branding Settings & Plans
- **Endpoint**: `GET /public/config`
- **Authentication**: None (Public)
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "branding": {
        "appName": "Universal Billing SaaS",
        "companyName": "Universal Systems Inc.",
        "logoUrl": "/brand-logo.svg",
        "primaryColor": "#0c87eb",
        "supportEmail": "support@universalbilling.io",
        "supportPhone": "+91 80 4000 8800",
        "currency": "INR",
        "currencySymbol": "₹"
      },
      "plans": [
        { "id": "plan_monthly", "name": "Monthly Starter", "price_inr": 499, "duration_days": 30 },
        { "id": "plan_quarterly", "name": "Quarterly Growth", "price_inr": 1399, "duration_days": 90 },
        { "id": "plan_half_yearly", "name": "Half-Yearly Pro", "price_inr": 2599, "duration_days": 180 },
        { "id": "plan_yearly", "name": "Yearly Enterprise Value", "price_inr": 4999, "duration_days": 365 }
      ]
    }
  }
  ```

---

## 3. Super Admin Platform Console APIs (`/admin`)
*All endpoints require header: `Authorization: Bearer <PLATFORM_JWT_TOKEN>`*

### 3.1 Platform Dashboard Metrics
- **Endpoint**: `GET /admin/dashboard`
- **Response**: Returns `totalBusinesses`, `activeSubscriptions`, `freeTrialAccounts`, `mrr`, `arr`, `totalCollections`, `failedPaymentsCount`, `openTickets`, `systemHealth`.

### 3.2 Tenant Business Management
- `GET /admin/businesses`: List all registered businesses with filter parameters (`?status=ACTIVE&search=Apex`).
- `POST /admin/businesses`: Manually onboard a new business tenant.
- `GET /admin/businesses/:id`: Detailed profile including branches, users, subscriptions, and usage stats.
- `PATCH /admin/businesses/:id/status`: Suspend or activate a business account (`{ "status": "SUSPENDED" }`).

### 3.3 Subscription Plan Management
- `GET /admin/plans`: List all configured subscription plans.
- `POST /admin/plans`: Create new subscription plan.
- `PUT /admin/plans/:id`: Update pricing, user limits, branch limits, and active status.

### 3.4 Payment Reconciliation & Gateways
- `GET /admin/payments`: List recent payment transactions with gateway reference and status.
- `POST /admin/payments/:id/refund`: Issue subscription refund through gateway adapter.

### 3.5 Central Zoho Integration Hub
- `GET /admin/zoho/config`: View CRM & Desk connection statuses, sync queues, and error logs.
- `POST /admin/zoho/config`: Update Zoho OAuth Client ID, Client Secret, Refresh Token, and Desk Org ID.
- `POST /admin/zoho/sync`: Trigger manual synchronization job.

---

## 4. Point-of-Sale (POS) APIs (`/pos`)
*All endpoints require: `Authorization: Bearer <BUSINESS_JWT_TOKEN>` and `x-branch-id: <BRANCH_ID>`*

### 4.1 Product & Barcode Lookup
- **Endpoint**: `GET /pos/lookup?q=890100100111`
- **Response**: Matching products with real-time stock for the active store branch.

### 4.2 Check Active Register Shift
- **Endpoint**: `GET /pos/register/active`
- **Response**: `{ "hasActiveShift": true, "data": { "id": "reg_apex_01", "opening_cash": 2500 } }`

### 4.3 Atomic Checkout & Bill Generation
- **Endpoint**: `POST /pos/checkout`
- **Body**:
  ```json
  {
    "customerId": "cust_01",
    "customerName": "Rahul Sharma",
    "customerPhone": "+91 98111 22233",
    "invoiceType": "TAX_INVOICE",
    "items": [
      {
        "productId": "prod_shirt_01",
        "variantId": "var_shirt_m_blue",
        "productName": "Classic Linen Oxford Shirt",
        "sku": "SHIRT-LINEN-M-BLU",
        "quantity": 2,
        "unitPrice": 1299.00,
        "taxRate": 12.0,
        "discountAmount": 0
      }
    ],
    "paymentMethod": "UPI",
    "paymentDetails": { "upiRef": "UPI-992384729" },
    "notes": "Walk-in store sale"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "data": {
      "saleId": "sale_1793887799_x9z",
      "invoiceNo": "APX-2026-0014",
      "grandTotal": 2909.76,
      "subtotal": 2598.00,
      "taxAmount": 311.76,
      "cgst": 155.88,
      "sgst": 155.88,
      "changeDue": 0,
      "pointsEarned": 29.0
    }
  }
  ```

---

## 5. Dedicated Product Exchange APIs (`/exchange`)

### 5.1 Search Original Invoice for Exchange Eligibility
- **Endpoint**: `GET /exchange/search-invoice?invoiceNo=APX-2026-0014`
- **Response**: Returns original sale line items, transaction date, and eligibility window validation (`isEligible: true`).

### 5.2 Atomic Product Exchange Execution
- **Endpoint**: `POST /exchange/process`
- **Body**:
  ```json
  {
    "originalInvoiceNo": "APX-2026-0014",
    "returnedItems": [
      {
        "saleItemId": "sitem_101",
        "productId": "prod_shirt_01",
        "variantId": "var_shirt_m_blue",
        "quantity": 1,
        "unitPrice": 1299.00,
        "condition": "GOOD",
        "returnReason": "Customer prefers Large size"
      }
    ],
    "replacementItems": [
      {
        "productId": "prod_shirt_01",
        "variantId": "var_shirt_l_blue",
        "quantity": 1,
        "unitPrice": 1299.00,
        "taxRate": 12.0
      }
    ],
    "paymentMethod": "CASH",
    "reason": "Size exchange"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Exchange processed successfully.",
    "data": {
      "exchangeId": "exch_1793888800_abc",
      "exchangeNo": "EXCH-2026-0008",
      "returnTotal": 1454.88,
      "replacementTotal": 1454.88,
      "diffAmount": 0,
      "actionType": "EVEN_EXCHANGE"
    }
  }
  ```

---

## 6. Zoho In-App Helpdesk APIs (`/zoho`)

### 6.1 Create In-App Support Ticket
- **Endpoint**: `POST /zoho/tickets`
- **Body**:
  ```json
  {
    "subject": "Printer configuration guidance",
    "description": "Please help configure our Bluetooth receipt printer",
    "priority": "HIGH",
    "category": "HARDWARE"
  }
  ```

### 6.2 Get Ticket Conversation Thread & Replies
- **Endpoint**: `GET /zoho/tickets/:id`

### 6.3 Rate Support Experience
- **Endpoint**: `POST /zoho/tickets/:id/rate`
- **Body**: `{ "rating": 5, "feedback": "Resolved immediately by agent." }`
