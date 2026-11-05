import React, { useState, useEffect } from 'react';
import {
  Boxes,
  ArrowRightLeft,
  Sliders,
  TrendingUp,
  Search,
  Building,
  RefreshCw,
  Plus
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';

export const ShopInventory: React.FC = () => {
  const { business, activeBranch, branches } = useAuth();
  const { branding } = useBranding();

  const [stockList, setStockList] = useState<any[]>([]);
  const [valuation, setValuation] = useState<any>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'stock' | 'movements'>('stock');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Adjustment Modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    productId: '',
    adjustmentQty: 0,
    reason: 'Inventory physical count correction'
  });

  // Transfer Modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferForm, setTransferForm] = useState({
    productId: '',
    fromBranchId: activeBranch?.id || '',
    toBranchId: '',
    quantity: 1
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [stockRes, valRes, moveRes]: any = await Promise.all([
        api.get(`/inventory/stock?search=${encodeURIComponent(search)}`),
        api.get('/inventory/valuation'),
        api.get('/inventory/movements?limit=30')
      ]);

      if (stockRes.success) setStockList(stockRes.data);
      if (valRes.success) setValuation(valRes.data);
      if (moveRes.success) setMovements(moveRes.data);
    } catch (err) {
      console.error('[Inventory Error]:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeBranch]);

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res: any = await api.post('/inventory/adjust', {
        ...adjustForm,
        branchId: activeBranch?.id
      });
      if (res.success) {
        setShowAdjustModal(false);
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Adjustment failed.');
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res: any = await api.post('/inventory/transfer', transferForm);
      if (res.success) {
        setShowTransferModal(false);
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Transfer failed.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Inventory & Warehouse Operations
          </h1>
          <p className="text-xs text-slate-500">
            Stock ledger, physical count adjustments, multi-branch stock transfers, and cost valuation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdjustModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Stock Adjustment</span>
          </button>
          <button
            onClick={() => {
              setTransferForm({
                productId: stockList[0]?.product_id || '',
                fromBranchId: activeBranch?.id || '',
                toBranchId: branches.find(b => b.id !== activeBranch?.id)?.id || '',
                quantity: 5
              });
              setShowTransferModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Branch Transfer</span>
          </button>
        </div>
      </div>

      {/* Valuation Metrics Card */}
      {valuation && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Cataloged SKUs</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{valuation.totalProducts}</p>
            <p className="text-[11px] text-slate-400 mt-1">{valuation.totalUnits.toLocaleString()} units in stock</p>
          </div>
          <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Cost Valuation</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{branding.currencySymbol}{valuation.costValuation.toLocaleString()}</p>
            <p className="text-[11px] text-slate-400 mt-1">Acquisition cost</p>
          </div>
          <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Retail Valuation</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{branding.currencySymbol}{valuation.retailValuation.toLocaleString()}</p>
            <p className="text-[11px] text-slate-400 mt-1">Expected sales revenue</p>
          </div>
          <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Unrealized Gross Margin</span>
            <p className="text-2xl font-black text-emerald-600">{branding.currencySymbol}{valuation.potentialProfit.toLocaleString()}</p>
            <p className="text-[11px] text-slate-400 mt-1">Projected gross profit</p>
          </div>
        </div>
      )}

      {/* Tabs: Shelf Stock vs Audit Ledger Movements */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveSubTab('stock')}
          className={`pb-2.5 transition-colors border-b-2 ${
            activeSubTab === 'stock' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-400'
          }`}
        >
          Branch Stock Levels ({stockList.length})
        </button>
        <button
          onClick={() => setActiveSubTab('movements')}
          className={`pb-2.5 transition-colors border-b-2 ${
            activeSubTab === 'movements' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-400'
          }`}
        >
          Stock Movement Ledger (Audit)
        </button>
      </div>

      {activeSubTab === 'stock' ? (
        <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Product / SKU</th>
                  <th className="py-3 px-4">Barcode</th>
                  <th className="py-3 px-4">Purchase Cost</th>
                  <th className="py-3 px-4">Selling Price</th>
                  <th className="py-3 px-4">Quantity Available</th>
                  <th className="py-3 px-4">Stock Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {stockList.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900 dark:text-white">{s.product_name}</p>
                      <p className="text-[10px] font-mono text-slate-400">{s.sku}</p>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">{s.barcode || '-'}</td>
                    <td className="py-3 px-4">{branding.currencySymbol}{s.purchase_price}</td>
                    <td className="py-3 px-4 font-bold">{branding.currencySymbol}{s.selling_price}</td>
                    <td className="py-3 px-4 font-black text-sm">{s.quantity}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        s.quantity <= s.min_stock_alert
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                      }`}>
                        {s.quantity <= s.min_stock_alert ? 'Low Stock Alert' : 'Healthy Stock'}
                      </span>
                    </td>
                  </tr>
                ))}
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
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Movement Type</th>
                  <th className="py-3 px-4">Quantity Change</th>
                  <th className="py-3 px-4">Balance After</th>
                  <th className="py-3 px-4">Reason / Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-400">
                      {new Date(m.created_at).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-4 font-bold">{m.product_name}</td>
                    <td className="py-2.5 px-4 font-mono text-[10px] uppercase font-bold text-slate-600 dark:text-slate-300">
                      {m.type}
                    </td>
                    <td className={`py-2.5 px-4 font-black ${m.change_qty > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {m.change_qty > 0 ? `+${m.change_qty}` : m.change_qty}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-semibold">{m.balance_qty}</td>
                    <td className="py-2.5 px-4 text-slate-500 text-[11px]">{m.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-black text-slate-900 dark:text-white mb-1">
              Stock Quantity Adjustment
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter positive value to add stock (found items) or negative to deduct (damaged, lost).
            </p>

            <form onSubmit={handleAdjustSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Item</label>
                <select
                  required
                  value={adjustForm.productId}
                  onChange={(e) => setAdjustForm({ ...adjustForm, productId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
                >
                  <option value="">Select Product...</option>
                  {stockList.map(s => (
                    <option key={s.product_id} value={s.product_id}>
                      {s.product_name} (Current: {s.quantity})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Adjustment Delta (+/-)</label>
                <input
                  type="number"
                  required
                  value={adjustForm.adjustmentQty}
                  onChange={(e) => setAdjustForm({ ...adjustForm, adjustmentQty: parseFloat(e.target.value) })}
                  placeholder="e.g. +5 or -2"
                  className="w-full px-3 py-2 rounded-xl border text-xs font-bold bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Audit Reason</label>
                <input
                  type="text"
                  required
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                >
                  Apply Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Branch Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-black text-slate-900 dark:text-white mb-1">
              Branch-to-Branch Stock Transfer
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Atomically decrements source branch and increments destination branch stock.
            </p>

            <form onSubmit={handleTransferSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Product</label>
                <select
                  required
                  value={transferForm.productId}
                  onChange={(e) => setTransferForm({ ...transferForm, productId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
                >
                  {stockList.map(s => (
                    <option key={s.product_id} value={s.product_id}>
                      {s.product_name} (Avail: {s.quantity})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">From Outlet</label>
                  <select
                    value={transferForm.fromBranchId}
                    onChange={(e) => setTransferForm({ ...transferForm, fromBranchId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">To Destination</label>
                  <select
                    value={transferForm.toBranchId}
                    onChange={(e) => setTransferForm({ ...transferForm, toBranchId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Transfer Quantity</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={transferForm.quantity}
                  onChange={(e) => setTransferForm({ ...transferForm, quantity: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border text-xs font-bold bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                >
                  Confirm Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
