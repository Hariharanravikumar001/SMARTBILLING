'use strict';

const express = require('express');
const router = express.Router();
const { get, run, all } = require('../db');
const { requireBusinessAuth } = require('../middleware/auth');
const { checkSubscriptionActive } = require('../middleware/entitlement');

router.use(requireBusinessAuth);
router.use(checkSubscriptionActive);

/**
 * List Expense Categories
 */
router.get('/categories', (req, res) => {
  const categories = all('SELECT * FROM expense_categories WHERE business_id = ? ORDER BY name ASC', [req.businessId]);
  res.json({ success: true, data: categories });
});

router.post('/categories', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Name is required.' });

  const id = `expcat_${Date.now()}`;
  run('INSERT INTO expense_categories (id, business_id, name) VALUES (?, ?, ?)', [id, req.businessId, name]);
  res.status(201).json({ success: true, data: { id, name } });
});

/**
 * List Expenses
 */
router.get('/', (req, res) => {
  const { fromDate, toDate } = req.query;
  let sql = 'SELECT * FROM expenses WHERE business_id = ?';
  const params = [req.businessId];

  if (fromDate) {
    sql += ' AND expense_date >= ?';
    params.push(fromDate);
  }
  if (toDate) {
    sql += ' AND expense_date <= ?';
    params.push(toDate);
  }

  sql += ' ORDER BY expense_date DESC, created_at DESC LIMIT 100';
  const expenses = all(sql, params);
  res.json({ success: true, data: expenses });
});

/**
 * Record Daily Expense
 */
router.post('/', (req, res) => {
  const { categoryId, categoryName, amount, paymentMethod = 'CASH', referenceNo, description, expenseDate } = req.body;
  const amt = parseFloat(amount);
  if (!amt || amt <= 0) {
    return res.status(400).json({ success: false, message: 'Valid expense amount required.' });
  }

  const id = `exp_${Date.now()}`;
  run(`
    INSERT INTO expenses (
      id, business_id, branch_id, category_id, category_name, amount,
      payment_method, reference_no, description, expense_date, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, req.businessId, req.branchId, categoryId || null, categoryName || 'General',
    amt, paymentMethod, referenceNo || null, description || '',
    expenseDate || new Date().toISOString().split('T')[0], req.user.name
  ]);

  // If cash expense, record movement in open cash register
  if (paymentMethod === 'CASH') {
    const activeReg = get(`
      SELECT id FROM cash_registers
      WHERE business_id = ? AND branch_id = ? AND status = 'OPEN'
      ORDER BY opening_time DESC LIMIT 1
    `, [req.businessId, req.branchId]);

    if (activeReg) {
      run(`
        INSERT INTO cash_movements (id, register_id, business_id, type, amount, reason)
        VALUES (?, ?, ?, 'EXPENSE', ?, ?)
      `, [`cm_${Date.now()}`, activeReg.id, req.businessId, -amt, `Expense: ${description || categoryName}`]);
    }
  }

  res.status(201).json({ success: true, message: 'Expense recorded.', expenseId: id });
});

module.exports = router;
