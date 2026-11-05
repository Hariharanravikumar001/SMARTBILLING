'use strict';

const { get } = require('../db');

/**
 * Server-Side Entitlement Engine:
 * Validates that the active tenant has a valid subscription (TRIAL or ACTIVE)
 * and verifies usage limits before allowing resource-creating actions.
 */
function checkSubscriptionActive(req, res, next) {
  const businessId = req.businessId;
  if (!businessId) {
    return res.status(401).json({ success: false, message: 'Tenant context required.' });
  }

  const sub = get(`
    SELECT s.*, p.name as plan_name, p.max_users, p.max_branches, p.max_products,
           p.max_invoices_per_month, p.features_json
    FROM subscriptions s
    JOIN subscription_plans p ON s.plan_id = p.id
    WHERE s.business_id = ?
    ORDER BY s.expires_at DESC
    LIMIT 1
  `, [businessId]);

  if (!sub) {
    return res.status(403).json({
      success: false,
      code: 'SUBSCRIPTION_REQUIRED',
      message: 'No subscription or active trial found for this business. Please subscribe to continue.'
    });
  }

  const now = new Date();
  const expiresAt = new Date(sub.expires_at);
  const graceEndAt = sub.grace_end_at ? new Date(sub.grace_end_at) : new Date(expiresAt.getTime() + (7 * 24 * 60 * 60 * 1000));

  let effectiveStatus = sub.status;
  if (now > expiresAt) {
    if (now <= graceEndAt) {
      effectiveStatus = 'GRACE_PERIOD';
    } else {
      effectiveStatus = 'EXPIRED';
    }
  }

  // Attach subscription info to request for handlers to inspect
  req.subscription = {
    ...sub,
    effectiveStatus,
    isGracePeriod: effectiveStatus === 'GRACE_PERIOD',
    isExpired: effectiveStatus === 'EXPIRED',
    features: sub.features_json ? JSON.parse(sub.features_json) : []
  };

  // If completely expired and method is mutating (POST, PUT, DELETE), block action
  if (effectiveStatus === 'EXPIRED' && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    // Exception: Allow payment/renewal initiation routes
    if (!req.path.startsWith('/subscription')) {
      return res.status(403).json({
        success: false,
        code: 'SUBSCRIPTION_EXPIRED',
        message: 'Your subscription plan has expired. Mutating actions are disabled until renewal. Your data is safely preserved.',
        expiresAt: sub.expires_at,
        planName: sub.plan_name
      });
    }
  }

  next();
}

/**
 * Limit Checker: Product Creation Limit Guard
 */
function checkProductLimit(req, res, next) {
  const sub = req.subscription;
  if (!sub) return next();

  const countRow = get('SELECT COUNT(*) as count FROM products WHERE business_id = ?', [req.businessId]);
  const currentCount = countRow ? countRow.count : 0;

  if (currentCount >= sub.max_products) {
    return res.status(403).json({
      success: false,
      code: 'PLAN_LIMIT_REACHED',
      message: `Product limit reached (${currentCount}/${sub.max_products}). Upgrade your subscription plan to add more products.`,
      currentCount,
      maxLimit: sub.max_products
    });
  }
  next();
}

/**
 * Limit Checker: Invoices Per Month Limit Guard
 */
function checkInvoiceLimit(req, res, next) {
  const sub = req.subscription;
  if (!sub) return next();

  // Calculate current month's sales count
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const countRow = get(`
    SELECT COUNT(*) as count FROM sales
    WHERE business_id = ? AND created_at >= ?
  `, [req.businessId, startOfMonth.toISOString()]);

  const currentMonthCount = countRow ? countRow.count : 0;

  if (currentMonthCount >= sub.max_invoices_per_month) {
    return res.status(403).json({
      success: false,
      code: 'INVOICE_LIMIT_REACHED',
      message: `Monthly invoice limit reached (${currentMonthCount}/${sub.max_invoices_per_month}). Upgrade to Pro or Enterprise for higher limits.`,
      currentMonthCount,
      maxLimit: sub.max_invoices_per_month
    });
  }
  next();
}

module.exports = {
  checkSubscriptionActive,
  checkProductLimit,
  checkInvoiceLimit
};
