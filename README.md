# Universal Billing & Business Management SaaS
> Production-ready, multi-tenant POS, Inventory, Dedicated Product Exchange, and SaaS Management Platform built for **Zoho Catalyst** and modern retailers.

---

## 🌟 Key Highlights

- **Dynamic White-Labeling & Branding**: Platform owner can change software name, logo, primary colors, support contacts, and subscription tiers from Super Admin without code modifications.
- **Strict ACID Financial & Inventory Consistency**: Relational transactional database engine in WAL mode with atomic locking prevents double-selling, phantom invoices, and stock discrepancies.
- **Dedicated Product Exchange Workflow**: First-class, item-for-item exchange module with condition evaluation (`GOOD` vs `DEFECTIVE`), automatic differential price calculation (collect extra / refund / even), and cash drawer synchronization.
- **Two Separate Applications**:
  1. **Super Admin Console (`/admin`)**: MRR/ARR analytics, tenant management, subscription tiers, payment reconciliation, Zoho CRM/Desk central hub, and audit trails.
  2. **Shopkeeper Business App (`/app`)**: High-speed POS billing (barcode scanner, keyboard shortcuts F1-F4, hold/resume, cash/UPI/card/split), dedicated exchanges, multi-branch inventory, cash drawer shifts, and GST P&L reporting.
- **Zoho Integrations**: Centralized Zoho CRM lead pipeline for SaaS subscriptions, and in-app Zoho Desk ticketing with in-thread replies and satisfaction ratings.
- **Payment Gateways**: Razorpay and Cashfree adapters with HMAC SHA-256 signature verification and replay-proof idempotent webhook processing.
- **Mobile-Friendly PWA**: Offline asset caching, responsive mobile navigation, touchscreen-friendly POS, and 58mm/80mm thermal receipt printing.

---

## 🚀 Quick Start

### 1. Installation
```bash
# Install backend dependencies
cd functions/api && npm install

# Install frontend dependencies
cd ../../client && npm install
```

### 2. Build Frontend
```bash
# In workspace root
npm run build
```

### 3. Run Development Servers
```bash
# Start backend API (Port 3001)
npm run dev:server

# In a separate terminal, start frontend (Port 5173)
npm run dev:client
```

### 4. Run Automated Test Suites
```bash
# Run unit tests (8/8 test suites)
npm test

# Run end-to-end integration test
npm run test:e2e
```

---

## 🔐 Demonstration Credentials

| Role | Access URL | Username / Email | Password / PIN |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `http://localhost:5173/login` | `admin@universalbilling.io` | `SuperAdmin@2026!` |
| **Store Owner** | `http://localhost:5173/login` | `owner@apex.com` | `Owner@2026!` |
| **Cashier (PIN)**| `http://localhost:5173/login` | Business: `biz_apex_demo` | PIN: `9999` |

---

## 📚 Documentation Deliverables

- [Architecture & Design Specification](docs/ARCHITECTURE.md)
- [Complete REST API Reference](docs/API_REFERENCE.md)
- [Zoho Catalyst Production Deployment Guide](docs/DEPLOYMENT_GUIDE.md)
- [Zoho CRM & Desk Integration Setup Guide](docs/ZOHO_INTEGRATION_SETUP.md)
- [End-User Manual & POS Shortcut Guide](docs/USER_MANUAL.md)
