'use strict';

const express = require('express');
const router = express.Router();
const { get, run, all, withTransaction } = require('../db');
const { requireBusinessAuth } = require('../middleware/auth');
const { checkSubscriptionActive } = require('../middleware/entitlement');

router.use(requireBusinessAuth);
router.use(checkSubscriptionActive);

/**
 * Get Current Active Register Shift
 */
router.get('/current', (req, res) => {
  const register = get(`
    SELECT * FROM cash_registers
    WHERE business_id = ? AND branch_id = ? AND status = 'OPEN'
    ORDER BY opening_time DESC LIMIT 1
  `, [req.businessId, req.branchId]);

  if (!register) {
    return res.json({ success: true, hasOpenShift: false, data: null });
  }

  // Calculate live movements since opening
  const movements = all('SELECT * FROM cash_movements WHERE register_id = ? ORDER BY created_at DESC', [register.id]);
  const netMovement = movements.reduce((acc, m) => acc + m.amount, 0);
  const currentExpectedCash = Math.round((register.opening_cash + netMovement) * 100) / 100;

  res.json({
    success: true,
    hasOpenShift: true,
    data: {
      ...register,
      movements,
      currentExpectedCash
    }
  });
});

/**
 * Open Register Shift
 */
router.post('/open', (req, res) => {
  const { openingCash = 0, notes } = req.body;

  // Check if register already open
  const existing = get(`
    SELECT id FROM cash_registers
    WHERE business_id = ? AND branch_id = ? AND status = 'OPEN'
  `, [req.businessId, req.branchId]);

  if (existing) {
    return res.status(400).json({ success: false, message: 'A cash register shift is already open for this branch.' });
  }

  const id = `reg_${Date.now()}`;
  const openAmt = parseFloat(openingCash) || 0;

  run(`
    INSERT INTO cash_registers (id, business_id, branch_id, user_id, user_name, opening_time, opening_cash, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', ?)
  `, [id, req.businessId, req.branchId, req.user.id, req.user.name, new Date().toISOString(), openAmt, notes || '']);

  res.status(201).json({ success: true, message: 'Cash register shift opened.', registerId: id });
});

/**
 * Close Register Shift (Reconciliation)
 */
router.post('/close', (req, res) => {
  const { closingCash, notes } = req.body;
  if (closingCash === undefined) {
    return res.status(400).json({ success: false, message: 'Counted closing cash amount is required.' });
  }

  const register = get(`
    SELECT * FROM cash_registers
    WHERE business_id = ? AND branch_id = ? AND status = 'OPEN'
    ORDER BY opening_time DESC LIMIT 1
  `, [req.businessId, req.branchId]);

  if (!register) {
    return res.status(404).json({ success: false, message: 'No active open cash register found to close.' });
  }

  const movements = all('SELECT amount FROM cash_movements WHERE register_id = ?', [register.id]);
  const netMovement = movements.reduce((acc, m) => acc + m.amount, 0);
  const systemExpected = Math.round((register.opening_cash + netMovement) * 100) / 100;
  const counted = parseFloat(closingCash) || 0;
  const diff = Math.round((counted - systemExpected) * 100) / 100;

  run(`
    UPDATE cash_registers
    SET closing_time = ?,
        closing_cash = ?,
        system_expected_cash = ?,
        difference = ?,
        status = 'CLOSED',
        notes = COALESCE(?, notes)
    WHERE id = ?
  `, [new Date().toISOString(), counted, systemExpected, diff, notes || null, register.id]);

  res.json({
    success: true,
    message: 'Shift closed and cash reconciled.',
    reconciliation: {
      openingCash: register.opening_cash,
      systemExpected,
      countedClosingCash: counted,
      difference: diff,
      isBalanced: diff === 0
    }
  });
});

/**
 * Manual Cash-In / Cash-Out
 */
router.post('/movement', (req, res) => {
  const { type, amount, reason } = req.body;
  if (!['CASH_IN', 'CASH_OUT'].includes(type) || !amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ success: false, message: 'Valid type (CASH_IN/CASH_OUT) and positive amount required.' });
  }

  const register = get(`
    SELECT id FROM cash_registers
    WHERE business_id = ? AND branch_id = ? AND status = 'OPEN'
    ORDER BY opening_time DESC LIMIT 1
  `, [req.businessId, req.branchId]);

  if (!register) {
    return res.status(400).json({ success: false, message: 'Cannot add cash movement without an active open shift.' });
  }

  const amt = parseFloat(amount);
  const signedAmt = type === 'CASH_IN' ? amt : -amt;

  run(`
    INSERT INTO cash_movements (id, register_id, business_id, type, amount, reason)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [`cm_${Date.now()}`, register.id, req.businessId, type, signedAmt, reason || `Manual ${type}`]);

  res.json({ success: true, message: `Cash movement recorded (${type}).` });
});

module.exports = router;
