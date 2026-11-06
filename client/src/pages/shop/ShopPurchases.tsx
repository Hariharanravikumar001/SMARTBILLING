import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  Building,
  CheckCircle2,
  Boxes,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { Supplier } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';

export const ShopPurchases: React.FC = () => {
  const { branding } = useBranding();
  const { activeBranch } = useAuth();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'purchases' | 'suppliers'>('purchases');
  const [isLoading, setIsLoading] = useState(true);

  // New Supplier Modal
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    company_name: '',
    gstin: '',
    phone: '',
    email: '',
    address: ''
  });

  // New Purchase Modal
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [purchaseForm, setPurchaseForm] = useState({
    supplierId: '',
    supplierInvoiceNo: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    productId: '',
    quantity: 10,
    purchasePrice: 100,
    taxRate: 18.0,
    paidAmount: 1000
  });

  const handleProductChange = (prodId: string) => {
    const p = products.find(prod => prod.id === prodId);
    setPurchaseForm({
      ...purchaseForm,
      productId: prodId,
      purchasePrice: p?.purchase_price !== undefined ? p.purchase_price : purchaseForm.purchasePrice,
      taxRate: p?.tax_rate !== undefined ? p.tax_rate : 18.0
    });
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [supRes, purRes, prodRes]: any = await Promise.all([
        api.get('/suppliers'),
        api.get('/suppliers/purchases'),
        api.get('/products')
      ]);

      if (supRes.success) setSuppliers(supRes.data);
      if (purRes.success) setPurchases(purRes.data);
      if (prodRes.success) setProducts(prodRes.data);
    } catch (err) {
      console.error('[Purchases Error]:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeBranch]);

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res: any = await api.post('/suppliers', supplierForm);
      if (res.success) {
        setShowSupplierModal(false);
        setSupplierForm({ name: '', company_name: '', gstin: '', phone: '', email: '', address: '' });
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Creation failed.');
    }
  };

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res: any = await api.post('/suppliers/purchases', {
        supplierId: purchaseForm.supplierId,
        supplierInvoiceNo: purchaseForm.supplierInvoiceNo,
        purchaseDate: purchaseForm.purchaseDate,
        items: [
          {
            productId: purchaseForm.productId,
            quantity: purchaseForm.quantity,
            purchasePrice: purchaseForm.purchasePrice,
            taxRate: parseFloat(String(purchaseForm.taxRate)) || 0
          }
        ],
        paidAmount: purchaseForm.paidAmount
      });

      if (res.success) {
        setShowPurchaseModal(false);
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Purchase recording failed.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Purchases & Supplier Payables
          </h1>
          <p className="text-xs text-slate-500">
            Record incoming vendor shipments, auto-increment inventory stock, and track payable dues
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSupplierModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Supplier Profile</span>
          </button>
          <button
            onClick={() => {
              setPurchaseForm({
                supplierId: suppliers[0]?.id || '',
                supplierInvoiceNo: `SUP-INV-${Date.now().toString().slice(-4)}`,
                purchaseDate: new Date().toISOString().split('T')[0],
                productId: products[0]?.id || '',
                quantity: 20,
                purchasePrice: 150,
                taxRate: products[0]?.tax_rate ?? 18.0,
                paidAmount: 3000
              });
              setShowPurchaseModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Record Goods Inward (Stock-In)</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('purchases')}
          className={`pb-2.5 transition-colors border-b-2 ${
            activeTab === 'purchases' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'
          }`}
        >
          Purchase Invoices ({purchases.length})
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`pb-2.5 transition-colors border-b-2 ${
            activeTab === 'suppliers' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'
          }`}
        >
          Registered Suppliers ({suppliers.length})
        </button>
      </div>

      {activeTab === 'purchases' ? (
        <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Paid</th>
                  <th className="py-3 px-4">Balance Payable</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {purchases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No purchase orders recorded yet.
                    </td>
                  </tr>
                ) : (
                  purchases.map((p) => (
                    <tr key={p.id}>
                      <td className="py-3 px-4 font-mono font-bold text-blue-600">
                        {p.supplier_invoice_no || p.id}
                      </td>
                      <td className="py-3 px-4 font-bold">{p.supplier_name}</td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{p.purchase_date}</td>
                      <td className="py-3 px-4 font-bold">{branding.currencySymbol}{p.total_amount}</td>
                      <td className="py-3 px-4 text-emerald-600 font-semibold">{branding.currencySymbol}{p.paid_amount}</td>
                      <td className="py-3 px-4 font-black text-rose-600">{branding.currencySymbol}{p.balance_amount}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.payment_status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {p.payment_status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Supplier / Firm</th>
                  <th className="py-3 px-4">GSTIN</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Outstanding Payable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {suppliers.map((s) => (
                  <tr key={s.id}>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900 dark:text-white">{s.name}</p>
                      <p className="text-[10px] text-slate-400">{s.company_name}</p>
                    </td>
                    <td className="py-3 px-4 font-mono">{s.gstin || '-'}</td>
                    <td className="py-3 px-4">{s.phone || '-'}</td>
                    <td className="py-3 px-4">{s.email || '-'}</td>
                    <td className="py-3 px-4 font-black text-rose-600">
                      {branding.currencySymbol}{s.outstanding_payable}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="font-black text-base text-slate-900 dark:text-white mb-1">
              Add New Supplier
            </h3>
            <form onSubmit={handleCreateSupplier} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Supplier Name</label>
                <input
                  type="text"
                  required
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Company / Mill Name</label>
                <input
                  type="text"
                  value={supplierForm.company_name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, company_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">GSTIN</label>
                <input
                  type="text"
                  value={supplierForm.gstin}
                  onChange={(e) => setSupplierForm({ ...supplierForm, gstin: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-xl border text-xs font-mono bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone</label>
                <input
                  type="tel"
                  value={supplierForm.phone}
                  onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Purchase Modal */}
      {showPurchaseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="font-black text-base text-slate-900 dark:text-white mb-1">
              Record Goods Inward (Stock-In)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Adding inventory to {activeBranch?.name}. Stock quantities will increase automatically.
            </p>

            <form onSubmit={handleCreatePurchase} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Supplier</label>
                  <select
                    required
                    value={purchaseForm.supplierId}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, supplierId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="">Select Supplier...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Invoice #</label>
                  <input
                    type="text"
                    required
                    value={purchaseForm.supplierInvoiceNo}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, supplierInvoiceNo: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-xs font-mono bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Product</label>
                <select
                  required
                  value={purchaseForm.productId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
                >
                  <option value="">Select Catalog Item...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} (Tax: {p.tax_rate ?? 18}%)</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={purchaseForm.quantity}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border text-xs font-bold bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Cost ({branding.currencySymbol})</label>
                  <input
                    type="number"
                    required
                    value={purchaseForm.purchasePrice}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, purchasePrice: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border text-xs font-bold bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">GST Tax Slab</label>
                  <select
                    value={purchaseForm.taxRate}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, taxRate: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border text-xs font-bold bg-slate-50 dark:bg-slate-800"
                  >
                    <option value={0}>0% (Exempt)</option>
                    <option value={5}>5% (Apparel/Food)</option>
                    <option value={12}>12% (Standard)</option>
                    <option value={18}>18% (General)</option>
                    <option value={28}>28% (Luxury)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Paid Amount</label>
                  <input
                    type="number"
                    value={purchaseForm.paidAmount}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, paidAmount: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPurchaseModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                >
                  Commit Inward Shipment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
