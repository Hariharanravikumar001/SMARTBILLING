# UNIVERSAL BILLING SAAS - COMPREHENSIVE USER MANUAL

## 1. Quick Start & Demonstration Credentials

For testing and demonstration, the platform comes pre-seeded with sample businesses, products, and user accounts:

| Role | Portal / Tab | Email / ID | Password / PIN | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | Super Admin | `admin@universalbilling.io` | `SuperAdmin@2026!` | Central SaaS Platform Management |
| **Store Owner** | Shopkeeper | `owner@apex.com` | `Owner@2026!` | Store Owner (Full Store Access) |
| **Cashier (PIN)**| Cashier PIN | Business: `biz_apex_demo` | PIN: `9999` | Fast POS Touchscreen Access |

---

## 2. Super Admin Guide (`/admin`)

### 2.1 Dynamic White-Labeling & Branding Settings
1. Go to **Platform Settings** (`/admin/settings`).
2. Modify:
   - **Software Name**: Changes navigation titles and browser tabs dynamically.
   - **Company Name**: Updates footer notices and legal terms.
   - **Brand Primary Color**: Updates theme accents across the UI.
   - **Support Email & Phone**: Reflected on invoice footers and contact pages.
3. Click **Save Platform Settings**. Changes apply immediately across all client sessions without recompiling or redeploying code.

### 2.2 Managing Business Tenants
1. Go to **Businesses** (`/admin/businesses`).
2. Search by business name, email, phone, or status (`ACTIVE`, `TRIAL`, `SUSPENDED`).
3. Click on any business to inspect:
   - Active subscription tier and expiration date.
   - Branch store locations and staff count.
   - Usage statistics (products created, monthly invoices generated).
4. Use **Suspend Account** to temporarily lock access, or **Reactivate** to restore access.

### 2.3 Subscription Plans & Pricing Configuration
1. Go to **Subscription Plans** (`/admin/plans`).
2. Edit default plans (Monthly ₹499, Quarterly ₹1,399, Half-Yearly ₹2,599, Yearly ₹4,999).
3. Adjust max users, max branches, max products, and monthly invoice limits.
4. Mark a plan as **Popular** to highlight it with a badge on the public pricing page.

---

## 3. Shopkeeper Operations Guide (`/app`)

### 3.1 Point-of-Sale (POS) Fast Billing (`/app/pos`)
Designed for high-speed counter operations, barcode scanners, and touchscreens:

#### Keyboard Shortcuts:
- `F1`: Jump cursor directly to Product & Barcode search input.
- `F2`: Toggle Cash / UPI payment selector.
- `F3`: Hold current bill to attend to another customer.
- `F4`: Print receipt for last completed invoice.
- `Esc`: Clear current cart or dismiss modals.
- `Enter`: Submit checkout when tendered amount matches.

#### Checkout Steps:
1. Scan item barcode or search by product name/SKU.
2. Select variant (e.g. Size: M, Color: Blue) if applicable.
3. Click or tap to increment item quantities.
4. Attach a customer (optional) to reward loyalty points or track store credit.
5. Select payment mode:
   - **CASH**: Enter cash tendered to calculate exact change due.
   - **UPI**: Displays QR code prompt and reference entry.
   - **CARD**: Records card authorization code.
   - **CREDIT**: Adds bill total to customer's outstanding balance ledger.
6. Click **Complete Checkout**. An official GST Tax Invoice is generated and the thermal print preview appears automatically.

---

### 3.2 Dedicated Product Exchange Workflow (`/app/exchange`)
Unlike simple returns, the dedicated exchange workflow handles item-for-item replacements with differential price calculation:

1. Navigate to **Product Exchange** in the sidebar.
2. Enter the customer's **Original Invoice Number** (e.g., `APX-2026-0010`) and click **Verify Invoice**.
3. The system validates the date against your store's exchange policy (default 15 days).
4. **Returned Item Selection**:
   - Check the item(s) being returned.
   - Select the return condition:
     - **GOOD**: Restocked immediately back to branch available inventory.
     - **DEFECTIVE / DAMAGED**: Quarantined to defective stock so it cannot be resold.
   - Select reason (e.g. "Size too small", "Color preference").
5. **Replacement Item Selection**:
   - Search and select replacement products or alternative sizes/variants.
6. **Automatic Differential Calculation**:
   - If Replacement > Returned: Displays **"Customer to Pay: ₹X"** and prompts for payment method.
   - If Replacement < Returned: Displays **"Store to Refund: ₹X"** and logs cash drawer withdrawal.
   - If Replacement == Returned: Displays **"Even Exchange (₹0 Difference)"**.
7. Click **Process Exchange**. Generates an official Exchange Receipt (`EXCH-YYYY-XXXX`) and updates inventory and cash drawers atomically.

---

### 3.3 Shift & Cash Drawer Management (`/app/cash-register`)
1. **Opening a Shift**:
   - Enter physical opening float cash (e.g. ₹2,500).
   - Click **Start Register Shift**.
2. **Shift Operations**:
   - Cash sales, exchange collections, and exchange refunds are logged automatically.
   - Use **Add Cash / Pay Out** to record manual drawer adjustments (e.g. taking petty cash for supplies).
3. **Closing a Shift**:
   - Enter physical cash counted in drawer.
   - The system displays expected vs counted cash with any cash variance (overage/shortage).
   - Click **Close Shift & Print Summary**.

---

### 3.4 In-App Support Hub (`/app/support`)
1. Click **Help & Support** in the navigation menu.
2. View knowledge base articles or click **Open New Support Ticket**.
3. Choose category (Billing, Hardware, POS, Inventory) and describe your request.
4. Support agents reply via Zoho Desk, and replies appear directly in your in-app conversation thread.
5. Rate resolved tickets from 1 to 5 stars.
