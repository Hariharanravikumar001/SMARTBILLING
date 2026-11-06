'use strict';

const express = require('express');
const router = express.Router();
const { get, run, all } = require('../db');
const { requireBusinessAuth } = require('../middleware/auth');
const { checkSubscriptionActive } = require('../middleware/entitlement');

router.use(requireBusinessAuth);
router.use(checkSubscriptionActive);

/**
 * List / Search Customers
 */
router.get('/', (req, res) => {
  const { search } = req.query;
  let sql = 'SELECT * FROM customers WHERE business_id = ?';
  const params = [req.businessId];

  if (search) {
    sql += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  sql += ' ORDER BY created_at DESC LIMIT 100';
  const customers = all(sql, params);
  res.json({ success: true, data: customers });
});

/**
 * Get Customer with Invoices & Loyalty
 */
router.get('/:id', (req, res) => {
  const customer = get('SELECT * FROM customers WHERE id = ? AND business_id = ?', [req.params.id, req.businessId]);
  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found.' });
  }

  const invoices = all('SELECT * FROM sales WHERE customer_id = ? ORDER BY created_at DESC LIMIT 20', [customer.id]);
  const loyaltyHistory = all('SELECT * FROM customer_loyalty_ledger WHERE customer_id = ? ORDER BY created_at DESC LIMIT 20', [customer.id]);

  res.json({
    success: true,
    data: {
      ...customer,
      invoices,
      loyaltyHistory
    }
  });
});

/**
 * Create Customer
 */
router.post('/', (req, res) => {
  const { name, phone, email, gstin, address, credit_limit = 0, customer_group = 'Retail' } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ success: false, message: 'Customer name and phone number are required.' });
  }

  const existing = get('SELECT * FROM customers WHERE phone = ? AND business_id = ?', [phone.trim(), req.businessId]);
  if (existing) {
    return res.status(200).json({ success: true, message: 'Customer already exists with this phone number.', customerId: existing.id, data: existing });
  }

  const id = `cust_${Date.now()}`;
  run(`
    INSERT INTO customers (
      id, business_id, name, phone, email, gstin, address, credit_limit, customer_group
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, req.businessId, name, phone.trim(), email || null, gstin || null, address || null, parseFloat(credit_limit) || 0, customer_group]);

  const newCustomer = {
    id,
    business_id: req.businessId,
    name,
    phone: phone.trim(),
    email: email || null,
    gstin: gstin || null,
    address: address || null,
    credit_limit: parseFloat(credit_limit) || 0,
    loyalty_points: 0,
    outstanding_due: 0,
    customer_group
  };

  res.status(201).json({ success: true, message: 'Customer added successfully.', customerId: id, data: newCustomer });
});

/**
 * Settle Customer Credit Dues
 */
router.post('/:id/settle-due', (req, res) => {
  const { amount, paymentMethod = 'CASH', notes } = req.body;
  const payAmt = parseFloat(amount);
  if (!payAmt || payAmt <= 0) {
    return res.status(400).json({ success: false, message: 'Valid payment amount required.' });
  }

  const customer = get('SELECT * FROM customers WHERE id = ? AND business_id = ?', [req.params.id, req.businessId]);
  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found.' });
  }

  const newBalance = Math.max(0, customer.outstanding_balance - payAmt);
  run('UPDATE customers SET outstanding_balance = ? WHERE id = ?', [newBalance, customer.id]);

  // Record cash movement if cash settlement
  if (paymentMethod === 'CASH') {
    const activeReg = get(`
      SELECT id FROM cash_registers
      WHERE business_id = ? AND branch_id = ? AND status = 'OPEN'
      ORDER BY opening_time DESC LIMIT 1
    `, [req.businessId, req.branchId]);

    if (activeReg) {
      run(`
        INSERT INTO cash_movements (id, register_id, business_id, type, amount, reason)
        VALUES (?, ?, ?, 'CASH_IN', ?, ?)
      `, [`cm_${Date.now()}`, activeReg.id, req.businessId, payAmt, `Due settlement by ${customer.name}`]);
    }
  }

  res.json({ success: true, message: 'Customer dues settled.', remainingBalance: newBalance });
});

module.exports = router;
