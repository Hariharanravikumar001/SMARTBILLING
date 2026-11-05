'use strict';

const express = require('express');
const router = express.Router();
const { get, run, all, withTransaction } = require('../db');
const { requireBusinessAuth } = require('../middleware/auth');
const { checkSubscriptionActive, checkProductLimit } = require('../middleware/entitlement');

router.use(requireBusinessAuth);
router.use(checkSubscriptionActive);

/**
 * List all products
 */
router.get('/', (req, res) => {
  const { categoryId, brandId, search, lowStockOnly } = req.query;
  const businessId = req.businessId;
  const branchId = req.branchId;

  let sql = `
    SELECT p.*, c.name as category_name, b.name as brand_name,
           COALESCE(s.quantity, 0) as current_stock
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    LEFT JOIN stock s ON (s.product_id = p.id AND s.business_id = p.business_id AND s.branch_id = ?)
    WHERE p.business_id = ?
  `;
  const params = [branchId, businessId];

  if (categoryId) {
    sql += ` AND p.category_id = ?`;
    params.push(categoryId);
  }
  if (brandId) {
    sql += ` AND p.brand_id = ?`;
    params.push(brandId);
  }
  if (search) {
    sql += ` AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)`;
    const term = `%${search}%`;
    params.push(term, term, term);
  }
  if (lowStockOnly === 'true') {
    sql += ` AND COALESCE(s.quantity, 0) <= p.min_stock_alert`;
  }

  sql += ` ORDER BY p.created_at DESC`;

  const products = all(sql, params);
  res.json({ success: true, data: products });
});

/**
 * Get Product by ID with variants and branch stock levels
 */
router.get('/:id', (req, res) => {
  const product = get(`
    SELECT p.*, c.name as category_name, b.name as brand_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    WHERE p.id = ? AND p.business_id = ?
  `, [req.params.id, req.businessId]);

  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found.' });
  }

  const variants = all('SELECT * FROM product_variants WHERE product_id = ? AND business_id = ?', [product.id, req.businessId]);
  const stockLevels = all(`
    SELECT s.*, br.name as branch_name
    FROM stock s
    JOIN business_branches br ON s.branch_id = br.id
    WHERE s.product_id = ? AND s.business_id = ?
  `, [product.id, req.businessId]);

  res.json({
    success: true,
    data: {
      ...product,
      variants,
      stockLevels
    }
  });
});

/**
 * Create Product (With Entitlement Limit Check)
 */
router.post('/', checkProductLimit, (req, res) => {
  const {
    name, sku, barcode, category_id, brand_id, unit = 'PCS',
    purchase_price = 0, selling_price, mrp, wholesale_price, tax_rate = 18.0,
    hsn_code, min_stock_alert = 5, initial_stock = 0, variants = [],
    industry_data
  } = req.body;

  if (!name || !sku || selling_price === undefined || mrp === undefined) {
    return res.status(400).json({ success: false, message: 'Name, SKU, Selling Price, and MRP are required.' });
  }

  const existingSku = get('SELECT id FROM products WHERE sku = ? AND business_id = ?', [sku.trim(), req.businessId]);
  if (existingSku) {
    return res.status(409).json({ success: false, message: `A product with SKU '${sku}' already exists in your store.` });
  }

  const result = withTransaction((db) => {
    const productId = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const hasVariants = variants.length > 0 ? 1 : 0;

    run(`
      INSERT INTO products (
        id, business_id, name, sku, barcode, category_id, brand_id, unit,
        purchase_price, selling_price, mrp, wholesale_price, tax_rate, hsn_code,
        min_stock_alert, has_variants, industry_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      productId, req.businessId, name, sku.trim(), barcode || null, category_id || null,
      brand_id || null, unit, parseFloat(purchase_price) || 0, parseFloat(selling_price),
      parseFloat(mrp), wholesale_price ? parseFloat(wholesale_price) : null,
      parseFloat(tax_rate) || 0, hsn_code || null, parseInt(min_stock_alert, 10) || 5,
      hasVariants, industry_data ? JSON.stringify(industry_data) : null
    ]);

    // Insert Variants if provided
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      const variantId = `var_${productId}_${i + 1}`;
      run(`
        INSERT INTO product_variants (
          id, business_id, product_id, variant_name, sku, barcode, size, color,
          purchase_price, selling_price, mrp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        variantId, req.businessId, productId, v.variant_name || `Variant ${i + 1}`,
        v.sku || `${sku}-V${i + 1}`, v.barcode || null, v.size || null, v.color || null,
        v.purchase_price || purchase_price, v.selling_price || selling_price, v.mrp || mrp
      ]);
    }

    // Set Initial Stock in current active branch
    const initQty = parseFloat(initial_stock) || 0;
    if (initQty > 0) {
      const stockId = `stock_${req.businessId}_${req.branchId}_${productId}_base`;
      run(`
        INSERT INTO stock (id, business_id, branch_id, product_id, quantity)
        VALUES (?, ?, ?, ?, ?)
      `, [stockId, req.businessId, req.branchId, productId, initQty]);

      run(`
        INSERT INTO stock_movements (id, business_id, branch_id, product_id, change_qty, balance_qty, type, reason, created_by)
        VALUES (?, ?, ?, ?, ?, ?, 'PURCHASE', 'Initial Opening Stock', ?)
      `, [`sm_${Date.now()}`, req.businessId, req.branchId, productId, initQty, initQty, req.user.name]);
    }

    return { productId };
  });

  res.status(201).json({ success: true, message: 'Product created successfully.', data: result });
});

/**
 * Update Product
 */
router.put('/:id', (req, res) => {
  const {
    name, barcode, category_id, brand_id, unit, purchase_price,
    selling_price, mrp, wholesale_price, tax_rate, hsn_code, min_stock_alert, is_active,
    industry_data
  } = req.body;

  const product = get('SELECT id FROM products WHERE id = ? AND business_id = ?', [req.params.id, req.businessId]);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found.' });
  }

  run(`
    UPDATE products
    SET name = COALESCE(?, name),
        barcode = COALESCE(?, barcode),
        category_id = COALESCE(?, category_id),
        brand_id = COALESCE(?, brand_id),
        unit = COALESCE(?, unit),
        purchase_price = COALESCE(?, purchase_price),
        selling_price = COALESCE(?, selling_price),
        mrp = COALESCE(?, mrp),
        wholesale_price = COALESCE(?, wholesale_price),
        tax_rate = COALESCE(?, tax_rate),
        hsn_code = COALESCE(?, hsn_code),
        min_stock_alert = COALESCE(?, min_stock_alert),
        is_active = COALESCE(?, is_active),
        industry_data = COALESCE(?, industry_data),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND business_id = ?
  `, [
    name, barcode, category_id, brand_id, unit, purchase_price,
    selling_price, mrp, wholesale_price, tax_rate, hsn_code, min_stock_alert,
    is_active !== undefined ? (is_active ? 1 : 0) : null,
    industry_data ? JSON.stringify(industry_data) : null,
    req.params.id, req.businessId
  ]);

  res.json({ success: true, message: 'Product updated successfully.' });
});

/**
 * Categories & Brands Endpoints
 */
router.get('/meta/categories', (req, res) => {
  const categories = all('SELECT * FROM categories WHERE business_id = ? ORDER BY name ASC', [req.businessId]);
  res.json({ success: true, data: categories });
});

router.post('/meta/categories', (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Category name is required.' });

  const id = `cat_${Date.now()}`;
  run('INSERT INTO categories (id, business_id, name, description) VALUES (?, ?, ?, ?)', [id, req.businessId, name, description || null]);
  res.status(201).json({ success: true, data: { id, name } });
});

router.get('/meta/brands', (req, res) => {
  const brands = all('SELECT * FROM brands WHERE business_id = ? ORDER BY name ASC', [req.businessId]);
  res.json({ success: true, data: brands });
});

router.post('/meta/brands', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Brand name is required.' });

  const id = `brand_${Date.now()}`;
  run('INSERT INTO brands (id, business_id, name) VALUES (?, ?, ?)', [id, req.businessId, name]);
  res.status(201).json({ success: true, data: { id, name } });
});

module.exports = router;
