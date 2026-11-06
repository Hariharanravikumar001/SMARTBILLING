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

// Available Software Editions
const SOFTWARE_EDITIONS = [
  {
    id: 'windows-installer',
    name: 'Windows Desktop POS (Recommended)',
    os: 'Windows 10 / 11 (64-bit)',
    fileName: 'UniversalBillingPOS-Windows-Installer-v1.0.0.zip',
    fileSize: '4.8 MB',
    badge: 'Most Popular',
    recommended: true,
    description: 'Full Windows installation with automated shortcut creation and auto-configuration for 58mm/80mm ESC/POS thermal receipt printers & USB laser barcode scanners.'
  },
  {
    id: 'windows-portable',
    name: 'Windows Portable Edition',
    os: 'Windows 7 / 8 / 10 / 11',
    fileName: 'UniversalBillingPOS-Windows-Portable-v1.0.0.zip',
    fileSize: '3.2 MB',
    badge: 'Zero Install',
    recommended: false,
    description: 'Standalone portable edition that runs directly from a USB stick or counter PC folder without requiring administrator rights.'
  },
  {
    id: 'macos',
    name: 'macOS Desktop Terminal Suite',
    os: 'macOS Sonoma / Ventura (Apple Silicon & Intel)',
    fileName: 'UniversalBillingPOS-macOS-v1.0.0.zip',
    fileSize: '5.1 MB',
    badge: 'Universal Binary',
    recommended: false,
    description: 'Native Mac POS application tailored for modern Mac hardware with Bluetooth thermal receipt printing and Retina touch display support.'
  },
  {
    id: 'android',
    name: 'Android POS & Smart Terminal Package',
    os: 'Android 8.0+ / Sunmi / iMin / PAX',
    fileName: 'UniversalBillingPOS-Android-v1.0.0.zip',
    fileSize: '2.9 MB',
    badge: 'Smart POS',
    recommended: false,
    description: 'Optimized for Android touchscreen POS terminals, handheld mobile billing devices, and store tablets with built-in thermal printers and camera barcode scanning.'
  }
];

/**
 * GET /api/software/download-info
 * Returns download eligibility and all software edition formats for the shopkeeper
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
      message: 'Active subscription required. Please activate or renew your plan to download the Desktop Software.',
      action: 'PAYMENT_REQUIRED'
    });
  }

  const editionsWithLinks = SOFTWARE_EDITIONS.map(ed => ({
    ...ed,
    downloadUrl: `/api/software/download?type=${ed.id}&token=${encodeURIComponent(token)}`
  }));

  res.json({
    success: true,
    eligible: true,
    business: { id: business.id, name: business.name, slug: business.slug },
    version: '1.0.0-PROD',
    releaseDate: '2026-11-06',
    editions: editionsWithLinks,
    defaultDownloadUrl: `/api/software/download?type=windows-installer&token=${encodeURIComponent(token)}`,
    terminalSimulatorUrl: `/app/index.html?mode=software&store=${encodeURIComponent(business.slug)}`
  });
});

/**
 * GET /api/software/download
 * Serves the chosen software distribution package
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

  const requestedType = req.query.type || 'windows-installer';
  const targetEdition = SOFTWARE_EDITIONS.find(e => e.id === requestedType) || SOFTWARE_EDITIONS[0];

  const filePath = path.join(__dirname, '..', 'public', 'downloads', targetEdition.fileName);

  if (!fs.existsSync(filePath)) {
    // Fallback to general zip if specific file is missing
    const fallbackPath = path.join(__dirname, '..', 'public', 'downloads', 'UniversalBillingPOS-v1.0.0-Setup.zip');
    if (fs.existsSync(fallbackPath)) {
      return res.download(fallbackPath, targetEdition.fileName);
    }
    return res.status(404).send('Requested software package is being prepared. Please try again in a moment.');
  }

  // Record audit log
  try {
    run(`
      INSERT INTO audit_logs (id, actor_type, actor_id, actor_name, action, resource, details)
      VALUES (?, 'BUSINESS_USER', ?, ?, 'DOWNLOAD_DESKTOP_SOFTWARE', 'software_packages', ?)
    `, [`log_${Date.now()}`, decoded.id, decoded.name || 'Shopkeeper', JSON.stringify({ businessId: decoded.businessId, edition: targetEdition.id, fileName: targetEdition.fileName })]);
  } catch (e) {
    // Non-fatal
  }

  res.download(filePath, targetEdition.fileName);
});

module.exports = router;
