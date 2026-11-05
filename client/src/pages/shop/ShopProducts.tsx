import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Barcode,
  Edit2,
  AlertTriangle,
  Boxes,
  Check,
  X,
  Filter,
  RefreshCw
} from 'lucide-react';
import { Product } from '../../types';
import { api } from '../../services/api';
import { useBranding } from '../../context/BrandingContext';

export const ShopProducts: React.FC = () => {
  const { branding } = useBranding();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // New Product Modal
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [form, setForm] = useState({
    name: '',
    sku: '',
    barcode: '',
    category_id: '',
    unit: 'PCS',
    purchase_price: 0,
    selling_price: 0,
    mrp: 0,
    tax_rate: 18.0,
    min_stock_alert: 5,
    initial_stock: 10
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      let endpoint = `/products?search=${encodeURIComponent(search)}`;
      if (selectedCategory) endpoint += `&categoryId=${selectedCategory}`;
      if (lowStockOnly) endpoint += `&lowStockOnly=true`;

      const res: any = await api.get(endpoint);
      if (res.success) {
        setProducts(res.data);
      }
    } catch (err) {
      console.error('[Products Error]:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res: any = await api.get('/products/meta/categories');
      if (res.success) setCategories(res.data);
    } catch (err) {}
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [selectedCategory, lowStockOnly]);

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      if (editingProduct) {
        const res: any = await api.put(`/products/${editingProduct.id}`, form);
        if (res.success) {
          setShowModal(false);
          setEditingProduct(null);
          fetchProducts();
        } else {
          setErrorMsg(res.message);
        }
      } else {
        const res: any = await api.post('/products', form);
        if (res.success) {
          setShowModal(false);
          setForm({
            name: '',
            sku: '',
            barcode: '',
            category_id: '',
            unit: 'PCS',
            purchase_price: 0,
            selling_price: 0,
            mrp: 0,
            tax_rate: 18.0,
            min_stock_alert: 5,
            initial_stock: 10
          });
          fetchProducts();
        } else {
          setErrorMsg(res.message);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Operation failed.');
    }
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setForm({
      name: p.name,
      sku: p.sku,
      barcode: p.barcode || '',
      category_id: p.category_id || '',
      unit: p.unit || 'PCS',
      purchase_price: p.purchase_price,
      selling_price: p.selling_price,
      mrp: p.mrp,
      tax_rate: p.tax_rate,
      min_stock_alert: p.min_stock_alert,
      initial_stock: 0
    });
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Product Catalog & SKU Management
          </h1>
          <p className="text-xs text-slate-500">
            Define selling prices, MRP, HSN codes, GST tax rates, units, and inventory thresholds
          </p>
        </div>

        <button
          onClick={() => {
            setEditingProduct(null);
            setForm({
              name: '',
              sku: `SKU-${Date.now().toString().slice(-5)}`,
              barcode: `890${Date.now().toString().slice(-9)}`,
              category_id: categories[0]?.id || '',
              unit: 'PCS',
              purchase_price: 100,
              selling_price: 250,
              mrp: 299,
              tax_rate: 18.0,
              min_stock_alert: 5,
              initial_stock: 20
            });
            setShowModal(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchProducts()}
            placeholder="Search by product name, SKU, or barcode..."
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <button
          onClick={() => setLowStockOnly(!lowStockOnly)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
            lowStockOnly
              ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950 dark:border-rose-800'
              : 'bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          <span>Low Stock Only</span>
        </button>
      </div>

      {/* Products Table */}
      <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Item / SKU</th>
                <th className="py-3 px-4">Barcode</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Selling Price / MRP</th>
                <th className="py-3 px-4">GST Tax</th>
                <th className="py-3 px-4">Current Stock</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No products found. Click "+ Add New Product" to populate your catalog.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isLow = (p.current_stock ?? 0) <= p.min_stock_alert;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900 dark:text-white">{p.name}</p>
                        <p className="text-[10px] font-mono text-slate-400">{p.sku}</p>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">{p.barcode || '-'}</td>
                      <td className="py-3 px-4 capitalize text-slate-600 dark:text-slate-300">
                        {p.category_name || 'General'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {branding.currencySymbol}{p.selling_price}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          MRP: {branding.currencySymbol}{p.mrp}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                        {p.tax_rate}% GST
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isLow
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                        }`}>
                          {p.current_stock ?? 0} {p.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-black text-slate-900 dark:text-white mb-1">
              {editingProduct ? 'Edit Catalog Product' : 'Add New Product'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter SKU, barcode, unit prices, and initial shelf quantity.
            </p>

            {errorMsg && (
              <div className="mb-4 p-2.5 rounded-xl bg-red-50 text-red-700 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Product Title</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Slim Fit Denim Jeans"
                  className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">SKU Code</label>
                  <input
                    type="text"
                    required
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-xs font-mono bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Barcode / EAN</label>
                  <input
                    type="text"
                    value={form.barcode}
                    onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-xs font-mono bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={form.selling_price}
                    onChange={(e) => setForm({ ...form, selling_price: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border text-xs font-bold bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Maximum Retail Price</label>
                  <input
                    type="number"
                    required
                    value={form.mrp}
                    onChange={(e) => setForm({ ...form, mrp: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">GST Tax Rate (%)</label>
                  <select
                    value={form.tax_rate}
                    onChange={(e) => setForm({ ...form, tax_rate: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
                  >
                    <option value={0}>0% (Exempt)</option>
                    <option value={5}>5% (Apparel/Grocery)</option>
                    <option value={12}>12% (Standard)</option>
                    <option value={18}>18% (Electronics/Services)</option>
                    <option value={28}>28% (Luxury)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Unit of Measure</label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="PCS">Pieces (PCS)</option>
                    <option value="KG">Kilograms (KG)</option>
                    <option value="PAIR">Pairs (PAIR)</option>
                    <option value="MTR">Meters (MTR)</option>
                    <option value="BOX">Boxes (BOX)</option>
                  </select>
                </div>
              </div>

              {!editingProduct && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Opening Stock Quantity</label>
                  <input
                    type="number"
                    value={form.initial_stock}
                    onChange={(e) => setForm({ ...form, initial_stock: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border text-xs font-bold bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
