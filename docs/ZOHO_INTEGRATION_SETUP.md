# UNIVERSAL BILLING SAAS - ZOHO INTEGRATIONS GUIDE
## Zoho CRM & Zoho Desk Step-by-Step Configuration

## 1. Overview of Zoho Ecosystem Role

Universal Billing SaaS integrates with Zoho in two distinct, decoupled pipelines:

1. **Zoho CRM (SaaS Prospect & Business Pipeline)**:
   - When a new merchant signs up for a free trial or purchases a subscription, their lead is pushed to your central SaaS Zoho CRM.
   - Converts trial users into CRM Accounts & Deals for sales tracking.
   - **Boundary Enforcement**: Retail store customers of your shopkeeper tenants are **NEVER** pushed to the SaaS company CRM. Shopkeeper customer data remains strictly isolated.

2. **Zoho Desk (In-App Merchant Support Hub)**:
   - When a shopkeeper or cashier encounters an issue, they submit a support ticket directly inside their app (`/app/support`).
   - The ticket is dispatched to your Zoho Desk ticketing queue.
   - Agents reply in Zoho Desk, and responses sync back into the shopkeeper's in-app ticket conversation thread.

---

## 2. Step 1: Create Zoho OAuth 2.0 Credentials

1. Go to the [Zoho API Console](https://api-console.zoho.com/).
2. Click **Add Client** and choose **Server-based Applications**.
3. Fill in the client details:
   - **Client Name**: `Universal Billing SaaS Hub`
   - **Homepage URL**: `https://your-domain.catalystserverless.com`
   - **Authorized Redirect URIs**: `https://your-domain.catalystserverless.com/server/api/zoho/oauth/callback`
4. Click **Create**. You will receive:
   - **Client ID** (e.g. `1000.XXXXX...`)
   - **Client Secret** (e.g. `YYYYY...`)

---

## 3. Step 2: Authorize Required Scopes & Generate Refresh Token

Use the **Self-Client** tab in the Zoho API Console to generate an authorization code:

### Required Scopes:
```
ZohoCRM.modules.leads.CREATE,ZohoCRM.modules.leads.READ,ZohoCRM.modules.accounts.CREATE,Desk.tickets.ALL,Desk.contacts.ALL,Desk.search.READ
```

1. Select **Scope**: paste the scopes above.
2. Select **Time Duration**: `10 minutes`.
3. Click **Generate Code** and copy the resulting code (`1000.xxxx...`).
4. Exchange the code for a permanent `refresh_token` using cURL or Postman:

```bash
curl -X POST https://accounts.zoho.com/oauth/v2/token \
  -d "grant_type=authorization_code" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "redirect_uri=https://your-domain.catalystserverless.com/server/api/zoho/oauth/callback" \
  -d "code=GENERATED_CODE"
```

Save the `refresh_token` returned in the JSON payload.

---

## 4. Step 3: Find your Zoho Desk Portal / Org ID

1. Log into your [Zoho Desk](https://desk.zoho.com) console.
2. Click **Setup (Gear Icon)** in the top right corner.
3. Under **Developer Space**, click **API**.
4. Locate the **Org ID** (an 8 or 9 digit number, e.g. `800123456`).

---

## 5. Step 4: Configure in Super Admin Console

1. Log into the platform console as Super Admin (`admin@universalbilling.io`).
2. Navigate to **Zoho Integration Hub** (`/admin/zoho`).
3. Enter the credentials:
   - **Zoho Client ID**
   - **Zoho Client Secret**
   - **Zoho Refresh Token**
   - **Zoho Desk Org ID**
4. Click **Save & Test Connection**.

---

## 6. Offline Queue & Graceful Fallback Architecture

If credentials have not yet been provided or during temporary Zoho API downtime:
- All SaaS signup events and support tickets are recorded locally in the database.
- An entry is logged in `zoho_sync_logs` with status `QUEUED` or `AWAITING_CONFIG`.
- Merchants and platform admins experience zero disruptions or crashes.
- Once credentials are configured and saved, platform administrators can click **Run Manual Sync** from `/admin/zoho` to flush the sync queue into Zoho CRM and Zoho Desk.
