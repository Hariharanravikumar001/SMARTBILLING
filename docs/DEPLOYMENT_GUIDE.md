# UNIVERSAL BILLING SAAS - PRODUCTION DEPLOYMENT GUIDE

## 1. Overview & Catalyst Architecture

Universal Billing SaaS is architected to deploy directly onto **Zoho Catalyst**:
- **Backend**: Zoho Catalyst Advanced I/O Function (`node18`) located in `functions/api`.
- **Frontend**: High-performance React 18 Single-Page Application (PWA) hosted on Zoho Catalyst Web Client Hosting with source configured in `client/dist`.

---

## 2. Prerequisites

1. **Zoho Catalyst CLI**:
   ```bash
   npm install -g zcatalyst-cli
   catalyst login
   ```
2. **Node.js**: Version 18.x or 20.x installed.
3. **Active Project**:
   - Project Name: `SMARTBILLING`
   - Project ID: `81697000000039001`
   - Target Environment: `Development` or `Production`

---

## 3. Configuration Files

### 3.1 `catalyst.json` (Project Root)
```json
{
  "functions": {
    "targets": [
      "api"
    ],
    "ignore": [],
    "source": "functions"
  },
  "client": {
    "source": "client/dist"
  }
}
```

### 3.2 `functions/api/catalyst-config.json`
```json
{
  "deployment": {
    "name": "api",
    "stack": "node18",
    "type": "advancedio",
    "env_variables": {}
  },
  "execution": {
    "main": "index.js"
  }
}
```

---

## 4. Local Build & Emulation

### 4.1 Step 1: Build the Frontend Client
```bash
cd client
npm install
npm run build
```
This produces optimized production assets inside `client/dist/` (including `manifest.json`, `sw.js`, and chunked JS/CSS).

### 4.2 Step 2: Install Backend Dependencies
```bash
cd ../functions/api
npm install
```

### 4.3 Step 3: Run Locally (Standalone Mode)
```bash
# Terminal 1 - Start Backend API on port 3001
cd functions/api
node index.js

# Terminal 2 - Start Frontend Vite Dev Server
cd client
npm run dev
```

### 4.4 Step 4: Emulate with Catalyst CLI
```bash
# From workspace root
catalyst serve
```

---

## 5. Production Deployment to Zoho Catalyst

To deploy the entire platform (both the Advanced I/O API function and Web Client):

```bash
# 1. Ensure client is built fresh
cd client
npm run build
cd ..

# 2. Deploy to Zoho Catalyst
catalyst deploy
```

To deploy specific targets independently:
```bash
# Deploy only backend API function
catalyst deploy --only functions:api

# Deploy only frontend client
catalyst deploy --only client
```

---

## 6. Environment Variables & Secrets Management

Configure the following secrets in the Zoho Catalyst Console (**Settings > Environment Variables / Config**):

| Variable Name | Description | Default / Example |
| :--- | :--- | :--- |
| `JWT_SECRET` | Secret key for signing platform and business JWT tokens | `ub_secret_key_prod_2026_super_secure` |
| `RAZORPAY_KEY_ID` | Razorpay API Key for subscription payments | `rzp_live_xxxxxxxxxxxxxx` |
| `RAZORPAY_KEY_SECRET`| Razorpay Secret for HMAC SHA-256 signature verification | `xxxxxxxxxxxxxxxxxxxxxxxx` |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook secret configured on Razorpay dashboard | `whsec_xxxxxxxxxxxxxxxxxx` |
| `CASHFREE_APP_ID` | Cashfree Client Application ID | `CF_APP_xxxxxxxxxxxxxxxx` |
| `CASHFREE_SECRET_KEY` | Cashfree Client Secret Key | `cfsk_xxxxxxxxxxxxxxxxxx` |
| `ZOHO_CLIENT_ID` | Zoho Developer Console OAuth 2.0 Client ID | `1000.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX` |
| `ZOHO_CLIENT_SECRET` | Zoho Developer Console OAuth 2.0 Client Secret | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `ZOHO_REFRESH_TOKEN` | OAuth Refresh token with Zoho CRM & Desk scopes | `1000.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `ZOHO_DESK_ORG_ID` | Zoho Desk Portal / Organization ID | `800123456` |

---

## 7. Custom Domain & SSL Setup

1. In the Zoho Catalyst Web Console, navigate to **Hosting > Custom Domains**.
2. Click **Add Domain** and enter your production domain (e.g., `app.universalbilling.io`).
3. Add the generated CNAME records in your DNS management provider (Cloudflare, Route53, or GoDaddy).
4. Zoho Catalyst automatically provisions and renews SSL certificates (Let's Encrypt TLS).
