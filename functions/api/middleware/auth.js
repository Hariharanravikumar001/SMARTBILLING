'use strict';

const jwt = require('jsonwebtoken');
const { get, run } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'universal_billing_saas_secure_jwt_secret_2026';

function signToken(payload, expiresIn = '24h') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

/**
 * Middleware: Verify Super Admin / Platform User token
 */
function requirePlatformAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded || decoded.type !== 'PLATFORM') {
    return res.status(401).json({ success: false, message: 'Invalid or expired platform token.' });
  }

  const user = get('SELECT id, name, email, role, is_active FROM platform_users WHERE id = ?', [decoded.id]);
  if (!user || !user.is_active) {
    return res.status(403).json({ success: false, message: 'Platform user account is inactive or not found.' });
  }

  req.platformUser = user;
  next();
}

/**
 * Middleware: Verify Shopkeeper / Business User token and bind tenant context
 */
function requireBusinessAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded || decoded.type !== 'BUSINESS') {
    return res.status(401).json({ success: false, message: 'Invalid or expired business session token.' });
  }

  // Validate business status
  const business = get('SELECT id, name, slug, email, status, industry_type FROM businesses WHERE id = ?', [decoded.businessId]);
  if (!business) {
    return res.status(404).json({ success: false, message: 'Business tenant not found.' });
  }

  if (business.status === 'SUSPENDED') {
    return res.status(403).json({ success: false, message: 'This business account has been suspended by platform administration. Contact support.' });
  }

  // Validate user status
  const user = get('SELECT id, business_id, branch_id, name, email, role, is_active FROM business_users WHERE id = ? AND business_id = ?', [decoded.id, decoded.businessId]);
  if (!user || !user.is_active) {
    return res.status(403).json({ success: false, message: 'User account is inactive or revoked.' });
  }

  // Enforce Tenant Context across entire request
  req.businessId = business.id;
  req.business = business;
  req.user = user;
  req.branchId = req.headers['x-branch-id'] || user.branch_id;

  next();
}

/**
 * Middleware: Verify specific business user roles
 */
function requireBusinessRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User context missing.' });
    }
    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: role '${req.user.role}' is not authorized to perform this operation.`
      });
    }
    next();
  };
}

module.exports = {
  signToken,
  verifyToken,
  requirePlatformAuth,
  requireBusinessAuth,
  requireBusinessRole
};
