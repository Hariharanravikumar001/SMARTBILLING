import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Boxes,
  Printer,
  Trash2,
  ShieldCheck,
  Check,
  AlertCircle
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';

export const ShopExchange: React.FC = () => {
  const { business, activeBranch, businessUser } = useAuth();
  const { branding } = useBranding();

  // Invoice Search
  const [invoiceQuery, setInvoiceQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [originalSale, setOriginalSale] = useState<any>(null);
  const [originalItems, setOriginalItems] = useState<any[]>([]);
  const [policy, setPolicy] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Return Selection
  const [returnedItems, setReturnedItems] = useState<any[]>([]);

  // Replacement Selection
  const [replacementQuery, setReplacementQuery] = useState('');
  const [catalogResults, setCatalogResults] = useState<any[]>([]);
  const [replacementItems, setReplacementItems] = useState<any[]>([]);

  // Exchange Parameters
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD'>('CASH');
  const [reason, setReason] = useState('Customer requested size/model exchange');
  const [notes, setNotes] = useState('');

  // Process / Slip Result
  const [isProcessing, setIsProcessing] = useState(false);
  const [exchangeReceipt, setExchangeReceipt] = useState<any>(null);
  const [recentExchanges, setRecentExchanges] = useState<any[]>([]);

  useEffect(() => {
    fetchRecentExchanges();
  }, [activeBranch]);

  const fetchRecentExchanges = async () => {
    try {
      const res: any = await api.get('/exchange/history');
      if (res.success) setRecentExchanges(res.data);
    } catch (err) {}
  };

  const handleSearchInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceQuery.trim()) return;

    setIsSearching(true);
    setErrorMsg(null);
    setOriginalSale(null);
    setReturnedItems([]);
    setReplacementItems([]);

    try {
      const res: any = await api.get(`/exchange/search-invoice?invoiceNo=${encodeURIComponent(invoiceQuery.trim())}`);
      if (res.success && res.data) {
        setOriginalSale(res.data.sale);
        setOriginalItems(res.data.items);
        setPolicy(res.data.policy);
      } else {
        setErrorMsg(res.message || 'Invoice not found.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Invoice lookup failed.');
    } finally {
      setIsSearching(false);
    }
  };

  // Toggle or select item to return by unique invoice line item ID
  const handleToggleReturnItem = (item: any) => {
    const existingIndex = returnedItems.findIndex(r => (r.saleItemId && item.id) ? r.saleItemId === item.id : r.productId === item.product_id);
    if (existingIndex > -1) {
      setReturnedItems(returnedItems.filter((_, idx) => idx !== existingIndex));
    } else {
      setReturnedItems([
        ...returnedItems,
        {
          saleItemId: item.id,
          productId: item.product_id,
          variantId: item.variant_id || null,
          productName: item.variant_name ? `${item.product_name} (${item.variant_name})` : item.product_name,
          unitPrice: item.unit_price,
          taxRate: item.tax_rate,
          quantity: 1,
          condition: 'GOOD' // 'GOOD' or 'DEFECTIVE'
        }
      ]);
    }
  };

  const updateReturnCondition = (index: number, condition: 'GOOD' | 'DEFECTIVE') => {
    const updated = [...returnedItems];
    updated[index].condition = condition;
    setReturnedItems(updated);
  };

  // Search catalog for replacements
  const searchReplacements = async (q: string) => {
    setReplacementQuery(q);
    if (q.trim().length === 0) {
      setCatalogResults([]);
      return;
    }
    try {
      const res: any = await api.get(`/pos/lookup?q=${encodeURIComponent(q)}`);
      const payload = res.data?.data || res.data || res;
      if (payload && payload.products) {
        setCatalogResults(payload.products);
      } else if (Array.isArray(payload)) {
        setCatalogResults(payload);
      }
    } catch (err) {}
  };

  // Add replacement product with variant support
  const addReplacementItem = (product: any, variant?: any) => {
    const price = variant ? (variant.selling_price || product.selling_price) : product.selling_price;
    const name = variant ? `${product.name} (${variant.variant_name || variant.size || variant.color || 'Variant'})` : product.name;
    setReplacementItems([
      ...replacementItems,
      {
        productId: product.id,
        variantId: variant ? variant.id : null,
        productName: name,
        unitPrice: price,
        taxRate: product.tax_rate || 0,
        quantity: 1
      }
    ]);
    setReplacementQuery('');
    setCatalogResults([]);
  };

  const removeReplacementItem = (index: number) => {
    setReplacementItems(replacementItems.filter((_, idx) => idx !== index));
  };

  // Calculate Differential Amounts
  // Return Subtotal (Gross value with tax)
  const returnSubtotal = returnedItems.reduce((acc, item) => {
    const raw = item.quantity * item.unitPrice;
    return acc + raw + ((raw * item.taxRate) / 100);
  }, 0);

  // Replacement Subtotal (Gross value with tax)
  const replacementSubtotal = replacementItems.reduce((acc, item) => {
    const raw = item.quantity * item.unitPrice;
    return acc + raw + ((raw * item.taxRate) / 100);
  }, 0);

  const roundedReturn = Math.round(returnSubtotal * 100) / 100;
  const roundedReplacement = Math.round(replacementSubtotal * 100) / 100;
  const diffAmount = Math.round((roundedReplacement - roundedReturn) * 100) / 100;

  // Process Exchange
  const handleProcessExchange = async () => {
    if (returnedItems.length === 0) {
      setErrorMsg('Please select at least 1 item to return.');
      return;
    }
    if (replacementItems.length === 0) {
      setErrorMsg('Please select at least 1 replacement product.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const payload = {
        originalInvoiceNo: originalSale.invoice_no,
        returnedItems,
        replacementItems,
        paymentMethod,
        reason,
        notes
      };

      const res: any = await api.post('/exchange/process', payload);
      if (res.success && res.data) {
        setExchangeReceipt({
          ...res.data,
          originalSale,
          returnedItems,
          replacementItems,
          business,
          branch: activeBranch,
          cashierName: businessUser?.name
        });

        // Reset Form
        setOriginalSale(null);
        setReturnedItems([]);
        setReplacementItems([]);
        setInvoiceQuery('');
        fetchRecentExchanges();
      } else {
        setErrorMsg(res.message || 'Exchange failed.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Exchange transaction failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Dedicated Product Exchange Engine
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
              Isolated Module
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Process item-for-item differential exchanges, restock good items, quarantine defective goods, and reconcile cash movements atomically.
          </p>
        </div>
      </div>

      {/* Step 1: Invoice Search Bar */}
      <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm">
        <form onSubmit={handleSearchInvoice} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={invoiceQuery}
              onChange={(e) => setInvoiceQuery(e.target.value)}
              placeholder="Enter Original Invoice Number (e.g. APX-2026-0001)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50"
          >
            <span>{isSearching ? 'Verifying Invoice...' : 'Lookup Invoice'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {errorMsg && (
          <div className="mt-3 p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Step 2 & 3: Two-Column Exchange Workspace (When invoice is found) */}
      {originalSale && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Original Items to Return */}
          <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Step 1: Select Items To Return</span>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Invoice {originalSale.invoice_no} ({originalSale.customer_name || 'Walk-in'})
                </h3>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                policy?.isEligible ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
              }`}>
                {policy?.isEligible ? `Eligible (${policy.daysElapsed}d / ${policy.maxDays}d max)` : 'Policy Expired'}
              </span>
            </div>

            <div className="space-y-2">
              {originalItems.map((item) => {
                const isSelected = returnedItems.some(r => r.productId === item.product_id);
                const retItem = returnedItems.find(r => r.productId === item.product_id);

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/30'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleReturnItem(item)}
                          className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                        />
                        <div>
                          <p className="font-bold text-xs text-slate-900 dark:text-white">{item.product_name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {branding.currencySymbol}{item.unit_price} × {item.quantity} (+{item.tax_rate}% GST)
                          </p>
                        </div>
                      </div>
                      <span className="font-black text-xs text-slate-900 dark:text-white">
                        {branding.currencySymbol}{Math.round(item.total_amount)}
                      </span>
                    </div>

                    {/* Condition Selector if item selected */}
                    {isSelected && retItem && (
                      <div className="mt-3 pt-2 border-t border-blue-200 dark:border-blue-800/50 flex items-center justify-between text-xs">
                        <span className="text-[10px] text-slate-500 font-semibold">Restock Condition:</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => updateReturnCondition(returnedItems.indexOf(retItem), 'GOOD')}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              retItem.condition === 'GOOD'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-600'
                            }`}
                          >
                            Good (Restock)
                          </button>
                          <button
                            type="button"
                            onClick={() => updateReturnCondition(returnedItems.indexOf(retItem), 'DEFECTIVE')}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              retItem.condition === 'DEFECTIVE'
                                ? 'bg-rose-600 text-white'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-600'
                            }`}
                          >
                            Defective (Quarantine)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl flex justify-between items-center text-xs font-bold">
              <span>Return Credit Value:</span>
              <span className="text-blue-600 text-sm font-black">
                {branding.currencySymbol}{roundedReturn}
              </span>
            </div>
          </div>

          {/* Right: Replacement Item Selection */}
          <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Step 2: Choose Replacement Item</span>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Store Inventory Search</h3>
            </div>

            {/* Quick Catalog Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={replacementQuery}
                onChange={(e) => searchReplacements(e.target.value)}
                placeholder="Scan replacement barcode or search catalog..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800"
              />

              {catalogResults.length > 0 && (
                <div className="absolute top-11 left-0 right-0 z-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 text-xs">
                  {catalogResults.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => addReplacementItem(p)}
                      className="p-2.5 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer flex justify-between items-center"
                    >
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{p.name}</p>
                        <p className="text-[10px] text-slate-400">Stock: {p.current_stock ?? 0}</p>
                      </div>
                      <span className="font-bold text-blue-600">{branding.currencySymbol}{p.selling_price}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Replacement Items List */}
            <div className="space-y-2 min-h-[120px]">
              {replacementItems.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                  No replacement items chosen yet. Search catalog above.
                </div>
              ) : (
                replacementItems.map((item, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold">{item.productName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {branding.currencySymbol}{item.unitPrice} (+{item.taxRate}% GST)
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs">
                        {branding.currencySymbol}{Math.round(item.unitPrice * (1 + (item.taxRate / 100)))}
                      </span>
                      <button onClick={() => removeReplacementItem(idx)} className="p-1 text-slate-400 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl flex justify-between items-center text-xs font-bold">
              <span>Replacement Total Value:</span>
              <span className="text-blue-600 text-sm font-black">
                {branding.currencySymbol}{roundedReplacement}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Differential Summary & Settlement Card */}
      {originalSale && returnedItems.length > 0 && replacementItems.length > 0 && (
        <div className="bg-white dark:bg-slate-850 rounded-2xl border-2 border-blue-600 p-6 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-white">
                Exchange Differential Calculation
              </h3>
              <p className="text-xs text-slate-500">
                Formula: Replacement Total ({branding.currencySymbol}{roundedReplacement}) - Return Credit ({branding.currencySymbol}{roundedReturn})
              </p>
            </div>

            {/* Differential Status Callout */}
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-400 block uppercase">Balance Due</span>
              <span className={`text-2xl font-black ${
                diffAmount > 0 ? 'text-amber-600' : (diffAmount < 0 ? 'text-emerald-600' : 'text-blue-600')
              }`}>
                {diffAmount > 0
                  ? `+ ${branding.currencySymbol}${diffAmount} (Customer Pays)`
                  : diffAmount < 0
                  ? `- ${branding.currencySymbol}${Math.abs(diffAmount)} (Store Refunds)`
                  : 'Even Exchange (₹0)'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Payment / Refund Channel</label>
              <select
                value={paymentMethod}
                onChange={(e: any) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800"
              >
                <option value="CASH">Cash Drawer</option>
                <option value="UPI">UPI / Digital QR</option>
                <option value="CARD">Credit / Debit Card</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Exchange Reason</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional customer notes..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={handleProcessExchange}
              disabled={isProcessing}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-500/25 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>{isProcessing ? 'Executing Transaction...' : 'Commit Exchange & Print Voucher'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Exchange Print Voucher Modal */}
      {exchangeReceipt && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-2">
                <RefreshCw className="w-6 h-6" />
              </div>
              <h3 className="font-black text-base">{exchangeReceipt.business?.name || branding.appName}</h3>
              <p className="text-[10px] text-slate-500">PRODUCT EXCHANGE VOUCHER</p>
              <p className="text-[10px] font-mono text-slate-500">Exchange #: {exchangeReceipt.exchangeNo}</p>
              <p className="text-[10px] font-mono text-slate-400">Ref Invoice: {exchangeReceipt.originalInvoiceNo}</p>
            </div>

            <div className="text-xs space-y-2 font-mono">
              <div>
                <p className="font-bold text-[10px] uppercase text-slate-500">Returned Goods:</p>
                {exchangeReceipt.returnedItems?.map((r: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-slate-700">
                    <span>{r.productName} ({r.condition})</span>
                    <span>{branding.currencySymbol}{Math.round(r.unitPrice * (1 + (r.taxRate / 100)))}</span>
                  </div>
                ))}
              </div>

              <div>
                <p className="font-bold text-[10px] uppercase text-slate-500">Replacement Goods Issued:</p>
                {exchangeReceipt.replacementItems?.map((p: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-slate-700">
                    <span>{p.productName}</span>
                    <span>{branding.currencySymbol}{Math.round(p.unitPrice * (1 + (p.taxRate / 100)))}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-dashed border-slate-300 pt-2 text-xs space-y-1 font-mono">
              <div className="flex justify-between font-black text-sm">
                <span>Net Differential:</span>
                <span className={exchangeReceipt.diffAmount > 0 ? 'text-amber-600' : 'text-blue-600'}>
                  {branding.currencySymbol}{exchangeReceipt.diffAmount}
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Action:</span>
                <span>{exchangeReceipt.actionType}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow"
              >
                <Printer className="w-4 h-4" />
                <span>Print Slip (80mm)</span>
              </button>
              <button
                onClick={() => setExchangeReceipt(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Exchanges History Table */}
      <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-3">
          Exchange Audit Ledger & History
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold text-[10px] uppercase">
                <th className="pb-2">Exchange #</th>
                <th className="pb-2">Original Invoice</th>
                <th className="pb-2">Customer</th>
                <th className="pb-2">Items Returned / Issued</th>
                <th className="pb-2">Differential Amount</th>
                <th className="pb-2">Cashier</th>
                <th className="pb-2">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentExchanges.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400">
                    No exchanges recorded yet.
                  </td>
                </tr>
              ) : (
                recentExchanges.map((ex) => (
                  <tr key={ex.id} className="text-slate-700 dark:text-slate-300">
                    <td className="py-2.5 font-mono font-bold text-blue-600">{ex.exchange_no}</td>
                    <td className="py-2.5 font-mono text-slate-400">{ex.original_invoice_no}</td>
                    <td className="py-2.5 font-semibold">{ex.customer_name || 'Walk-in'}</td>
                    <td className="py-2.5">{ex.return_item_count} ret / {ex.replacement_item_count} rep</td>
                    <td className="py-2.5 font-bold">
                      {ex.diff_amount > 0 ? `+ ₹${ex.diff_amount}` : ex.diff_amount < 0 ? `- ₹${Math.abs(ex.diff_amount)}` : '₹0'}
                    </td>
                    <td className="py-2.5">{ex.cashier_name}</td>
                    <td className="py-2.5 text-slate-400 font-mono text-[11px]">
                      {new Date(ex.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
