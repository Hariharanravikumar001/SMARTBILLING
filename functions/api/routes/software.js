'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { get, run, all } = require('../db');
const { verifyToken } = require('../middleware/auth');

/**
 * Helper to check business subscription status
 */
function checkSubscription(businessId) {
  const sub = get(`
    SELECT s.*, p.name as plan_name
    FROM subscriptions s
    JOIN subscription_plans p ON s.plan_id = p.id
    WHERE s.business_id = ?
    ORDER BY s.expires_at DESC LIMIT 1
  `, [businessId]);

  if (!sub) return { active: false, reason: 'No subscription found' };

  const now = new Date();
  const expiresAt = new Date(sub.expires_at);

  if (sub.status !== 'ACTIVE' || now > expiresAt) {
    return { active: false, reason: 'Subscription expired or inactive', sub };
  }

  return { active: true, sub };
}

/**
 * GET /api/software/download-info
 * Returns download eligibility, version info, and direct download links
 */
router.get('/download-info', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.startsWith('Bearer ')) ? authHeader.slice(7) : req.query.token;

  if (!token) {
    return res.status(401).json({
      success: false,
      eligible: false,
      message: 'Authentication required. Please sign in to your Shopkeeper portal.'
    });
  }

  const decoded = verifyToken(token);
  if (!decoded || decoded.type !== 'BUSINESS') {
    return res.status(403).json({
      success: false,
      eligible: false,
      message: 'Invalid session. Shopkeeper account required.'
    });
  }

  const business = get('SELECT * FROM businesses WHERE id = ?', [decoded.businessId]);
  if (!business) {
    return res.status(404).json({ success: false, eligible: false, message: 'Store not found.' });
  }

  const subCheck = checkSubscription(decoded.businessId);
  if (!subCheck.active) {
    return res.json({
      success: true,
      eligible: false,
      business: { id: business.id, name: business.name, slug: business.slug },
      message: 'Active subscription required. Please select a plan and complete payment to download the Desktop Software.',
      action: 'PAYMENT_REQUIRED'
    });
  }

  res.json({
    success: true,
    eligible: true,
    business: { id: business.id, name: business.name, slug: business.slug },
    software: {
      name: 'Universal Billing & POS Desktop Suite',
      version: '1.0.0-PROD',
      releaseDate: '2026-11-06',
      platforms: ['Windows 10/11 (64-bit)', 'macOS (Apple Silicon & Intel)', 'Linux (Ubuntu/Debian)'],
      fileName: 'UniversalBillingPOS-v1.0.0-Setup.zip',
      fileSize: '4.8 MB',
      downloadUrl: `/api/software/download?token=${encodeURIComponent(token)}`,
      terminalUrl: `/app/index.html?mode=software&store=${encodeURIComponent(business.slug)}`
    }
  });
});

/**
 * GET /api/software/download
 * Serves the real UniversalBillingPOS-v1.0.0-Setup.zip package
 */
router.get('/download', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.startsWith('Bearer ')) ? authHeader.slice(7) : req.query.token;

  if (!token) {
    return res.status(401).send('Authentication token required to download POS software.');
  }

  const decoded = verifyToken(token);
  if (!decoded || decoded.type !== 'BUSINESS') {
    return res.status(403).send('Unauthorized. Shopkeeper subscription required.');
  }

  const subCheck = checkSubscription(decoded.businessId);
  if (!subCheck.active) {
    return res.status(402).send('Payment Required: Please purchase or renew your subscription to download the software.');
  }

  const filePath = path.join(__dirname, '..', 'public', 'downloads', 'UniversalBillingPOS-v1.0.0-Setup.zip');

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Installer package is being prepared. Please try again in a moment.');
  }

  // Audit log of download
  try {
    run(`
      INSERT INTO audit_logs (id, actor_type, actor_id, actor_name, action, resource, details)
      VALUES (?, 'BUSINESS_USER', ?, ?, 'DOWNLOAD_DESKTOP_SOFTWARE', 'software_packages', ?)
    `, [`log_${Date.now()}`, decoded.id, decoded.name || 'Shopkeeper', JSON.stringify({ businessId: decoded.businessId, version: '1.0.0' })]);
  } catch (e) {
    // Non-fatal
  }

  res.download(filePath, 'UniversalBillingPOS-v1.0.0-Setup.zip');
});

module.exports = router;
