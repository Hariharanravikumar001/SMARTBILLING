'use strict';

const express = require('express');
const router = express.Router();
const { get, all } = require('../db');
const { requireBusinessAuth } = require('../middleware/auth');
const { checkSubscriptionActive } = require('../middleware/entitlement');
const { processExchangeTransaction } = require('../services/exchangeService');

router.use(requireBusinessAuth);
router.use(checkSubscriptionActive);

/**
 * Search Original Invoice for Exchange
 */
router.get(['/search-invoice', '/lookup'], (req, res) => {
  const { invoiceNo } = req.query;
  if (!invoiceNo) {
    return res.status(400).json({ success: false, message: 'Please provide an invoice number.' });
  }

  const sale = get(`
    SELECT * FROM sales
    WHERE business_id = ? AND invoice_no = ? AND is_held = 0
  `, [req.businessId, invoiceNo.trim()]);

  if (!sale) {
    return res.status(404).json({ success: false, message: `Invoice '${invoiceNo}' not found.` });
  }

  const items = all(`
    SELECT * FROM sale_items WHERE sale_id = ?
  `, [sale.id]);

  // Check exchange policy
  const settings = get('SELECT exchange_period_days FROM business_settings WHERE business_id = ?', [req.businessId]);
  const maxDays = (settings && settings.exchange_period_days) || 15;
  const saleDate = new Date(sale.created_at);
  const diffDays = Math.ceil((new Date() - saleDate) / (1000 * 60 * 60 * 24));
  const isEligible = diffDays <= maxDays;

  res.json({
    success: true,
    data: {
      sale,
      items,
      policy: {
        maxDays,
        daysElapsed: diffDays,
        isEligible
      }
    }
  });
});

/**
 * Process Dedicated Product Exchange
 */
router.post('/process', (req, res) => {
  const {
    originalInvoiceNo,
    returnedItems,
    replacementItems,
    paymentMethod = 'CASH',
    reason = 'Customer exchange request',
    notes = ''
  } = req.body;

  try {
    const result = processExchangeTransaction({
      businessId: req.businessId,
      branchId: req.branchId,
      cashierId: req.user.id,
      cashierName: req.user.name,
      originalInvoiceNo,
      returnedItems,
      replacementItems,
      paymentMethod,
      reason,
      notes
    });

    res.status(201).json({
      success: true,
      message: 'Exchange processed successfully.',
      data: result
    });
  } catch (error) {
    console.error('[Exchange Process Error]:', error);
    res.status(400).json({ success: false, message: error.message || 'Exchange transaction failed.' });
  }
});

/**
 * List Exchange History
 */
router.get('/history', (req, res) => {
  const { limit = 50 } = req.query;
  const exchanges = all(`
    SELECT e.*,
           (SELECT COUNT(*) FROM exchange_items WHERE exchange_id = e.id AND item_type = 'RETURN') as return_item_count,
           (SELECT COUNT(*) FROM exchange_items WHERE exchange_id = e.id AND item_type = 'REPLACEMENT') as replacement_item_count
    FROM exchanges e
    WHERE e.business_id = ?
    ORDER BY e.created_at DESC
    LIMIT ?
  `, [req.businessId, parseInt(limit, 10)]);

  res.json({ success: true, data: exchanges });
});

/**
 * Get Specific Exchange Details
 */
router.get('/:id', (req, res) => {
  const exchange = get('SELECT * FROM exchanges WHERE id = ? AND business_id = ?', [req.params.id, req.businessId]);
  if (!exchange) {
    return res.status(404).json({ success: false, message: 'Exchange record not found.' });
  }

  const items = all('SELECT * FROM exchange_items WHERE exchange_id = ?', [exchange.id]);
  const branch = get('SELECT * FROM business_branches WHERE id = ?', [exchange.branch_id]);

  res.json({
    success: true,
    data: {
      exchange,
      items,
      branch,
      business: req.business
    }
  });
});

module.exports = router;
