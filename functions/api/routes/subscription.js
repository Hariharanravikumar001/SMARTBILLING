'use strict';

const express = require('express');
const router = express.Router();
const { get, run, all } = require('../db');
const { requireBusinessAuth } = require('../middleware/auth');
const { PaymentManager } = require('../services/paymentAdapters');
const zohoService = require('../services/zohoService');

/**
 * Public Webhook Endpoint (No Auth header required, validated via HMAC signature)
 */
router.post('/webhook/:gateway', (req, res) => {
  const gateway = req.params.gateway.toUpperCase();
  const signature = req.headers['x-razorpay-signature'] || req.headers['x-cashfree-signature'] || req.headers['signature'];
  const eventId = req.headers['x-razorpay-event-id'] || req.body.event_id || `evt_${Date.now()}`;
  const eventType = req.body.event || req.body.type || 'payment.captured';

  console.log(`[Webhook] Received incoming ${gateway} webhook event: ${eventType}`);

  try {
    const result = PaymentManager.processWebhookEvent({
      gateway,
      eventId,
      eventType,
      payload: req.body,
      rawBody: JSON.stringify(req.body),
      signature
    });

    res.json({ success: true, result });
  } catch (error) {
    console.error(`[Webhook] Error processing ${gateway} webhook:`, error.message);
    res.status(400).json({ success: false, message: error.message });
  }
});

// All subsequent routes require active business session
router.use(requireBusinessAuth);

/**
 * Get My Subscription Details, Usage & Limits
 */
router.get('/my-plan', (req, res) => {
  const businessId = req.businessId;

  const sub = get(`
    SELECT s.*, p.name as plan_name, p.billing_interval, p.price_inr,
           p.max_users, p.max_branches, p.max_products, p.max_invoices_per_month,
           p.max_devices, p.max_storage_mb, p.features_json
    FROM subscriptions s
    JOIN subscription_plans p ON s.plan_id = p.id
    WHERE s.business_id = ?
    ORDER BY s.expires_at DESC LIMIT 1
  `, [businessId]);

  if (!sub) {
    return res.status(404).json({ success: false, message: 'No subscription record found.' });
  }

  // Calculate actual usage
  const usedUsers = get('SELECT COUNT(*) as count FROM business_users WHERE business_id = ?', [businessId])?.count || 0;
  const usedBranches = get('SELECT COUNT(*) as count FROM business_branches WHERE business_id = ?', [businessId])?.count || 0;
  const usedProducts = get('SELECT COUNT(*) as count FROM products WHERE business_id = ?', [businessId])?.count || 0;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const usedInvoicesThisMonth = get('SELECT COUNT(*) as count FROM sales WHERE business_id = ? AND created_at >= ?', [businessId, startOfMonth.toISOString()])?.count || 0;

  // Calculate remaining days
  const now = new Date();
  const expiresAt = new Date(sub.expires_at);
  const remainingDays = Math.max(0, Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)));

  // Payment history
  const payments = all(`
    SELECT * FROM subscription_payments
    WHERE business_id = ?
    ORDER BY created_at DESC LIMIT 10
  `, [businessId]);

  res.json({
    success: true,
    data: {
      subscription: {
        ...sub,
        features: sub.features_json ? JSON.parse(sub.features_json) : [],
        remainingDays,
        isExpired: now > expiresAt
      },
      usage: {
        users: { used: usedUsers, limit: sub.max_users },
        branches: { used: usedBranches, limit: sub.max_branches },
        products: { used: usedProducts, limit: sub.max_products },
        monthlyInvoices: { used: usedInvoicesThisMonth, limit: sub.max_invoices_per_month }
      },
      paymentHistory: payments
    }
  });
});

/**
 * List Available Subscription Plans for Upgrade / Renewal
 */
router.get('/plans', (req, res) => {
  const plans = all('SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY price_inr ASC');
  const formatted = plans.map(p => ({
    ...p,
    features: p.features_json ? JSON.parse(p.features_json) : []
  }));

  res.json({ success: true, data: formatted });
});

/**
 * Validate Coupon Code
 */
router.post('/validate-coupon', (req, res) => {
  const { code, planId } = req.body;
  if (!code || !planId) {
    return res.status(400).json({ success: false, message: 'Coupon code and target plan are required.' });
  }

  const coupon = get('SELECT * FROM coupons WHERE code = ? AND is_active = 1', [code.trim().toUpperCase()]);
  if (!coupon) {
    return res.status(404).json({ success: false, message: 'Invalid or inactive coupon code.' });
  }

  const plan = get('SELECT price_inr FROM subscription_plans WHERE id = ?', [planId]);
  if (!plan) {
    return res.status(404).json({ success: false, message: 'Selected plan not found.' });
  }

  let discount = 0;
  if (coupon.discount_type === 'PERCENTAGE') {
    discount = (plan.price_inr * coupon.discount_value) / 100;
    if (coupon.max_discount && discount > coupon.max_discount) {
      discount = coupon.max_discount;
    }
  } else {
    discount = coupon.discount_value;
  }

  const finalPrice = Math.max(0, plan.price_inr - discount);

  res.json({
    success: true,
    data: {
      code: coupon.code,
      discountAmount: Math.round(discount * 100) / 100,
      originalPrice: plan.price_inr,
      finalPrice: Math.round(finalPrice * 100) / 100,
      description: coupon.description
    }
  });
});

/**
 * Initiate Subscription Payment Order (Razorpay / Cashfree)
 */
router.post('/initiate-order', async (req, res) => {
  const { planId, gateway = 'RAZORPAY', couponCode } = req.body;
  if (!planId) {
    return res.status(400).json({ success: false, message: 'Plan ID is required.' });
  }

  const plan = get('SELECT * FROM subscription_plans WHERE id = ?', [planId]);
  if (!plan) {
    return res.status(404).json({ success: false, message: 'Selected subscription plan not found.' });
  }

  let payableAmount = plan.price_inr;

  // Apply coupon if valid
  if (couponCode) {
    const coupon = get('SELECT * FROM coupons WHERE code = ? AND is_active = 1', [couponCode.trim().toUpperCase()]);
    if (coupon) {
      let discount = coupon.discount_type === 'PERCENTAGE'
        ? (payableAmount * coupon.discount_value) / 100
        : coupon.discount_value;
      if (coupon.max_discount && discount > coupon.max_discount) {
        discount = coupon.max_discount;
      }
      payableAmount = Math.max(0, payableAmount - discount);
    }
  }

  try {
    const adapter = PaymentManager.getAdapter(gateway);
    const order = await adapter.createOrder({
      amount: payableAmount,
      currency: 'INR',
      receipt: `sub_${req.businessId.slice(-6)}_${Date.now().toString().slice(-4)}`,
      notes: {
        businessId: req.businessId,
        planId: plan.id,
        planName: plan.name
      }
    });

    res.json({
      success: true,
      data: {
        ...order,
        planId: plan.id,
        planName: plan.name,
        amount: payableAmount
      }
    });
  } catch (error) {
    console.error('[Payment Initiate Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Payment initiation failed.' });
  }
});

/**
 * Complete Payment & Activate Plan (Sandbox / Instant Verification)
 */
router.post('/complete-payment', (req, res) => {
  const { orderId, paymentId, planId, gateway = 'RAZORPAY', amount } = req.body;
  if (!orderId || !planId) {
    return res.status(400).json({ success: false, message: 'Order ID and Plan ID are required.' });
  }

  try {
    const activation = PaymentManager.activateSubscription({
      businessId: req.businessId,
      planId,
      gateway,
      orderId,
      paymentId: paymentId || `pay_${Date.now()}`,
      amount: parseFloat(amount)
    });

    // Sync status with Zoho CRM
    zohoService.syncBusinessCustomer({
      businessId: req.businessId,
      name: req.business.name,
      email: req.business.email,
      phone: req.business.phone,
      planName: planId,
      status: 'ACTIVE'
    }).catch(err => console.error('[Zoho CRM] Update error:', err.message));

    res.json({
      success: true,
      message: 'Subscription payment verified and plan activated!',
      data: activation
    });
  } catch (error) {
    console.error('[Payment Completion Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Activation failed.' });
  }
});

module.exports = router;
