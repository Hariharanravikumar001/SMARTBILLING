export type Role =
  | 'Super Admin'
  | 'Platform Administrator'
  | 'Technical Administrator'
  | 'Owner'
  | 'Business Administrator'
  | 'Manager'
  | 'Cashier'
  | 'Accountant'
  | 'Stock Manager'
  | 'Salesperson';

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: string;
  mfa_enabled?: boolean;
}

export interface Business {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  gstin?: string;
  currency: string;
  currency_symbol: string;
  status: 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'PENDING';
  industry_type: string;
  logo_url?: string;
}

export interface BusinessBranch {
  id: string;
  name: string;
  code: string;
  phone?: string;
  address?: string;
  is_main: number;
}

export interface BusinessUser {
  id: string;
  name: string;
  email: string;
  role: string;
  branchId?: string;
  branchName?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  billing_interval: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY';
  duration_days: number;
  price_inr: number;
  original_price_inr?: number;
  is_active: number;
  is_popular: number;
  trial_days: number;
  max_users: number;
  max_branches: number;
  max_products: number;
  max_invoices_per_month: number;
  max_devices: number;
  max_storage_mb: number;
  features: string[];
}

export interface Subscription {
  id: string;
  business_id: string;
  plan_id: string;
  plan_name: string;
  status: 'TRIAL' | 'ACTIVE' | 'GRACE_PERIOD' | 'EXPIRED' | 'CANCELLED';
  start_date: string;
  expires_at: string;
  remainingDays: number;
  isExpired: boolean;
  features: string[];
  max_users: number;
  max_branches: number;
  max_products: number;
  max_invoices_per_month: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  category_id?: string;
  category_name?: string;
  brand_id?: string;
  brand_name?: string;
  unit: string;
  purchase_price: number;
  selling_price: number;
  mrp: number;
  wholesale_price?: number;
  tax_rate: number;
  hsn_code?: string;
  min_stock_alert: number;
  is_active: number;
  has_variants: number;
  current_stock?: number;
  industry_data?: string;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  product_id: string;
  variant_name: string;
  sku: string;
  barcode?: string;
  size?: string;
  color?: string;
  selling_price: number;
  mrp: number;
  current_stock?: number;
}

export interface CartItem {
  productId: string;
  variantId?: string;
  productName: string;
  variantName?: string;
  sku: string;
  barcode?: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  currentStock?: number;
}

export interface Sale {
  id: string;
  invoice_no: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  cashier_id?: string;
  cashier_name?: string;
  invoice_type: string;
  subtotal: number;
  tax_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  discount_amount: number;
  delivery_charge: number;
  round_off: number;
  grand_total: number;
  payment_method: 'CASH' | 'UPI' | 'CARD' | 'SPLIT' | 'CREDIT';
  payment_status: string;
  cash_tendered?: number;
  change_due?: number;
  created_at: string;
}

export interface SaleItem {
  id: string;
  product_id: string;
  variant_id?: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
}

export interface Exchange {
  id: string;
  exchange_no: string;
  original_sale_id: string;
  original_invoice_no: string;
  customer_name?: string;
  cashier_name?: string;
  return_subtotal: number;
  replacement_subtotal: number;
  diff_amount: number;
  payment_method?: string;
  payment_status: string;
  reason?: string;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  gstin?: string;
  address?: string;
  credit_limit: number;
  outstanding_balance: number;
  loyalty_points: number;
  customer_group: string;
}

export interface Supplier {
  id: string;
  name: string;
  company_name?: string;
  gstin?: string;
  phone?: string;
  email?: string;
  address?: string;
  outstanding_payable: number;
}

export interface CashRegister {
  id: string;
  opening_time: string;
  closing_time?: string;
  opening_cash: number;
  closing_cash?: number;
  system_expected_cash?: number;
  difference?: number;
  status: 'OPEN' | 'CLOSED';
  notes?: string;
}

export interface SupportTicket {
  id: string;
  ticket_number: string;
  zoho_ticket_id?: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  subject: string;
  description: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  customer_email?: string;
  replies?: Array<{
    id: string;
    sender: string;
    senderType: 'CUSTOMER' | 'AGENT';
    message: string;
    createdAt: string;
  }>;
  rating?: number;
  created_at: string;
}

export interface PlatformBranding {
  appName: string;
  companyName: string;
  logoUrl: string;
  primaryColor: string;
  supportEmail: string;
  supportPhone: string;
  currency: string;
  currencySymbol: string;
  allowPublicRegistration: boolean;
  maintenanceMode: boolean;
}
