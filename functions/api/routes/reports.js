'use strict';

const express = require('express');
const router = express.Router();
const { get, run, all } = require('../db');
const { requireBusinessAuth } = require('../middleware/auth');
const { checkSubscriptionActive } = require('../middleware/entitlement');

router.use(requireBusinessAuth);
router.use(checkSubscriptionActive);

/**
 * Shopkeeper Business Dashboard Metrics
 */
router.get('/dashboard', (req, res) => {
  const businessId = req.businessId;
  const branchId = req.branchId;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();

  // Today's Sales
  const todaySales = get(`
    SELECT
      COUNT(*) as invoice_count,
      COALESCE(SUM(grand_total), 0) as total_sales,
      COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN grand_total ELSE 0 END), 0) as cash_sales,
      COALESCE(SUM(CASE WHEN payment_method = 'UPI' THEN grand_total ELSE 0 END), 0) as upi_sales,
      COALESCE(SUM(CASE WHEN payment_method = 'CARD' THEN grand_total ELSE 0 END), 0) as card_sales,
      COALESCE(SUM(tax_amount), 0) as tax_collected
    FROM sales
    WHERE business_id = ? AND branch_id = ? AND is_held = 0 AND created_at >= ?
  `, [businessId, branchId, todayIso]);

  // Today's Expenses
  const todayExpense = get(`
    SELECT COALESCE(SUM(amount), 0) as total_expense
    FROM expenses
    WHERE business_id = ? AND branch_id = ? AND expense_date >= ?
  `, [businessId, branchId, todayIso.split('T')[0]]);

  // Customer outstanding dues
  const customerDues = get(`
    SELECT COALESCE(SUM(outstanding_balance), 0) as total_dues
    FROM customers
    WHERE business_id = ?
  `, [businessId]);

  // Low stock products count
  const lowStockCount = get(`
    SELECT COUNT(*) as count
    FROM products p
    JOIN stock s ON (s.product_id = p.id AND s.branch_id = ?)
    WHERE p.business_id = ? AND s.quantity <= p.min_stock_alert
  `, [branchId, businessId])?.count || 0;

  // Best selling products (Top 5)
  const topProducts = all(`
    SELECT p.name, SUM(si.quantity) as total_qty, SUM(si.total_amount) as total_revenue
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    JOIN sales s ON si.sale_id = s.id
    WHERE si.business_id = ? AND s.branch_id = ? AND s.is_held = 0
    GROUP BY p.id
    ORDER BY total_qty DESC
    LIMIT 5
  `, [businessId, branchId]);

  // Recent transactions
  const recentSales = all(`
    SELECT id, invoice_no, customer_name, grand_total, payment_method, created_at
    FROM sales
    WHERE business_id = ? AND branch_id = ? AND is_held = 0
    ORDER BY created_at DESC
    LIMIT 8
  `, [businessId, branchId]);

  res.json({
    success: true,
    data: {
      today: {
        totalSales: todaySales.total_sales,
        invoiceCount: todaySales.invoice_count,
        cashSales: todaySales.cash_sales,
        upiSales: todaySales.upi_sales,
        cardSales: todaySales.card_sales,
        taxCollected: todaySales.tax_collected,
        totalExpenses: todayExpense.total_expense,
        estimatedProfit: Math.round((todaySales.total_sales * 0.28) * 100) / 100 // estimated gross margin proxy
      },
      customerDues: customerDues.total_dues,
      lowStockCount,
      topProducts,
      recentSales,
      subscription: req.subscription
    }
  });
});

/**
 * GST Tax Summary Report
 */
router.get('/tax', (req, res) => {
  const { fromDate, toDate } = req.query;
  const businessId = req.businessId;

  let sql = `
    SELECT
      COUNT(*) as invoice_count,
      COALESCE(SUM(subtotal), 0) as taxable_turnover,
      COALESCE(SUM(tax_amount), 0) as total_tax,
      COALESCE(SUM(cgst_amount), 0) as total_cgst,
      COALESCE(SUM(sgst_amount), 0) as total_sgst,
      COALESCE(SUM(igst_amount), 0) as total_igst,
      COALESCE(SUM(grand_total), 0) as gross_turnover
    FROM sales
    WHERE business_id = ? AND is_held = 0
  `;
  const params = [businessId];

  if (fromDate) {
    sql += ' AND created_at >= ?';
    params.push(fromDate);
  }
  if (toDate) {
    sql += ' AND created_at <= ?';
    params.push(toDate);
  }

  const taxSummary = get(sql, params);
  res.json({ success: true, data: taxSummary });
});

/**
 * Profit & Loss Report
 */
router.get('/profit-loss', (req, res) => {
  const { fromDate, toDate } = req.query;
  const businessId = req.businessId;

  // 1. Total Sales Revenue
  let salesSql = 'SELECT COALESCE(SUM(subtotal), 0) as revenue FROM sales WHERE business_id = ? AND is_held = 0';
  const salesParams = [businessId];
  if (fromDate) { salesSql += ' AND created_at >= ?'; salesParams.push(fromDate); }
  if (toDate) { salesSql += ' AND created_at <= ?'; salesParams.push(toDate); }
  const totalRevenue = get(salesSql, salesParams)?.revenue || 0;

  // 2. Cost of Goods Sold (COGS)
  let cogsSql = `
    SELECT COALESCE(SUM(si.quantity * p.purchase_price), 0) as cogs
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    JOIN sales s ON si.sale_id = s.id
    WHERE si.business_id = ? AND s.is_held = 0
  `;
  const cogsParams = [businessId];
  if (fromDate) { cogsSql += ' AND s.created_at >= ?'; cogsParams.push(fromDate); }
  if (toDate) { cogsSql += ' AND s.created_at <= ?'; cogsParams.push(toDate); }
  const totalCogs = get(cogsSql, cogsParams)?.cogs || 0;

  // 3. Operating Expenses
  let expSql = 'SELECT COALESCE(SUM(amount), 0) as expenses FROM expenses WHERE business_id = ?';
  const expParams = [businessId];
  if (fromDate) { expSql += ' AND expense_date >= ?'; expParams.push(fromDate.split('T')[0]); }
  if (toDate) { expSql += ' AND expense_date <= ?'; expParams.push(toDate.split('T')[0]); }
  const totalExpenses = get(expSql, expParams)?.expenses || 0;

  const grossProfit = Math.round((totalRevenue - totalCogs) * 100) / 100;
  const estimatedNetProfit = Math.round((grossProfit - totalExpenses) * 100) / 100;
  const grossMarginPercent = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;

  res.json({
    success: true,
    data: {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalCogs: Math.round(totalCogs * 100) / 100,
      grossProfit,
      grossMarginPercent,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      estimatedNetProfit
    }
  });
});

module.exports = router;
