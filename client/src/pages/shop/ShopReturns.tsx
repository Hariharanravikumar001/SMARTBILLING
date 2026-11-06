import React, { useState, useEffect } from 'react';
import { RotateCcw, Search, CheckCircle2, AlertTriangle, ArrowLeft, Printer, DollarSign, FileText } from 'lucide-react';
import { useBranding } from '../../context/BrandingContext';
import { api } from '../../services/api';

export const ShopReturns: React.FC = () => {
  const { branding } = useBranding();

  // Mode: 'list' or 'new'
  const [viewMode, setViewMode] = useState<'list' | 'new'>('list');
  const [recentReturns, setRecentReturns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Search & New Return Form
  const [searchInvoice, setSearchInvoice] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any | null>(null);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [refundMethod, setRefundMethod] = useState<'CASH' | 'UPI' | 'CREDIT_NOTE'>('CASH');
  const [returnReason, setReturnReason] = useState('Customer Return');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [completedReturn, setCompletedReturn] = useState<any | null>(null);

  const fetchRecentReturns = async () => {
    setIsLoading(true);
    try {
      const res: any = await api.get('/returns');
      const data = res.data?.data || res.data || [];
      if (Array.isArray(data)) {
        setRecentReturns(data);
      }
    } catch (err) {
      console.error('Failed to load sales returns:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentReturns();
  }, []);

  const handleSearchInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInvoice.trim()) return;

    setIsSearching(true);
    setErrorMsg(null);
    setInvoiceData(null);
    setSelectedItems([]);

    try {
      const res: any = await api.get(`/exchange/search-invoice?invoiceNo=${encodeURIComponent(searchInvoice.trim())}`);
      const data = res.data?.data || res.data || res;
      if (data && data.sale) {
        setInvoiceData(data);
      } else {
        setErrorMsg(`Invoice '${searchInvoice}' not found.`);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Invoice search failed.');
    } finally {
      setIsSearching(false);
    }
  };

  const toggleItem = (item: any) => {
    const existingIndex = selectedItems.findIndex(i => i.saleItemId === item.id);
    if (existingIndex > -1) {
      setSelectedItems(selectedItems.filter((_, idx) => idx !== existingIndex));
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          saleItemId: item.id,
          productId: item.product_id,
          productName: item.product_name,
          quantity: 1,
          maxQty: item.quantity,
          unitPrice: item.unit_price,
          taxAmount: item.tax_amount / item.quantity,
          condition: 'GOOD'
        }
      ]);
    }
  };

  const updateItemQty = (saleItemId: string, qty: number) => {
    setSelectedItems(selectedItems.map(item => {
      if (item.saleItemId === saleItemId) {
        return { ...item, quantity: Math.min(item.maxQty, Math.max(1, qty)) };
      }
      return item;
    }));
  };

  const updateItemCondition = (saleItemId: string, condition: 'GOOD' | 'DEFECTIVE') => {
    setSelectedItems(selectedItems.map(item => {
      if (item.saleItemId === saleItemId) {
        return { ...item, condition };
      }
      return item;
    }));
  };

  const totalRefundAmount = selectedItems.reduce((acc, item) => {
    const itemTotal = (item.quantity * item.unitPrice) + (item.quantity * item.taxAmount);
    return acc + itemTotal;
  }, 0);

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      setErrorMsg('Please select at least one item to return.');
      return;
    }

    try {
      const res: any = await api.post('/returns', {
        invoiceNo: invoiceData.sale.invoice_no,
        returnedItems: selectedItems,
        refundMethod,
        reason: returnReason
      });

      const data = res.data?.data || res.data;
      setCompletedReturn(data);
      setStatusMsg(`Return ${data.returnNo} processed successfully.`);
      fetchRecentReturns();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to process return.');
    }
  };

  const resetForm = () => {
    setInvoiceData(null);
    setSelectedItems([]);
    setSearchInvoice('');
    setCompletedReturn(null);
    setErrorMsg(null);
    setViewMode('list');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-rose-600" />
            Sales Returns & Credit Notes
          </h1>
          <p className="text-xs text-slate-500">
            Process pure customer returns for cash refunds or credit notes without mandatory replacement items
          </p>
        </div>

        {viewMode === 'list' ? (
          <button
            onClick={() => { setViewMode('new'); setCompletedReturn(null); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-500/20"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Process New Return</span>
          </button>
        ) : (
          <button
            onClick={resetForm}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Returns List</span>
          </button>
        )}
      </div>

      {statusMsg && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{statusMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Mode 1: Recent Returns List */}
      {viewMode === 'list' && (
        <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Recent Sales Returns Ledger</h3>
            <span className="text-xs text-slate-400">{recentReturns.length} records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-3 pl-4">Return No</th>
                  <th className="p-3">Original Invoice</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Refund Amount</th>
                  <th className="p-3">Refund Method</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {recentReturns.length > 0 ? (
                  recentReturns.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 pl-4 font-mono font-bold text-rose-600">
                        {r.return_no}
                      </td>
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-300">
                        {r.original_invoice_no}
                      </td>
                      <td className="p-3">
                        {r.customer_name || 'Walk-in Customer'}
                      </td>
                      <td className="p-3 font-black text-slate-900 dark:text-white">
                        {branding.currencySymbol}{Math.round(r.total_refund_amount)}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.refund_method === 'CASH' ? 'bg-amber-50 text-amber-700' :
                          r.refund_method === 'CREDIT_NOTE' ? 'bg-blue-50 text-blue-700' :
                          'bg-emerald-50 text-emerald-700'
                        }`}>
                          {r.refund_method}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400 font-mono text-[11px]">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      {isLoading ? 'Loading returns...' : 'No sales returns recorded yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mode 2: Process Return */}
      {viewMode === 'new' && !completedReturn && (
        <div className="space-y-6 max-w-4xl">
          {/* Step A: Invoice Search */}
          <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">1. Search Original Tax Invoice</h3>
            <form onSubmit={handleSearchInvoice} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Enter invoice number (e.g. INV-2026-0001)..."
                  value={searchInvoice}
                  onChange={(e) => setSearchInvoice(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border text-xs font-mono uppercase bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow transition-all"
              >
                {isSearching ? 'Searching...' : 'Find Invoice'}
              </button>
            </form>
          </div>

          {/* Step B: Invoice Items & Return Configuration */}
          {invoiceData && (
            <form onSubmit={handleSubmitReturn} className="space-y-6">
              <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b pb-3 border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400">Original Invoice</span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      {invoiceData.sale.invoice_no} ({new Date(invoiceData.sale.created_at).toLocaleDateString()})
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500">Customer:</span>
                    <div className="font-bold text-xs">{invoiceData.sale.customer_name || 'Walk-in'}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Select Items to Return:
                  </label>

                  <div className="space-y-2">
                    {invoiceData.items.map((item: any) => {
                      const isSelected = selectedItems.some(i => i.saleItemId === item.id);
                      const currentSelected = selectedItems.find(i => i.saleItemId === item.id);

                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isSelected
                              ? 'border-rose-500 bg-rose-50/30 dark:bg-rose-950/20'
                              : 'border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleItem(item)}
                              className="rounded text-rose-600 w-4 h-4 cursor-pointer"
                            />
                            <div>
                              <div className="font-bold text-xs text-slate-900 dark:text-white">{item.product_name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                Purchased: {item.quantity} × {branding.currencySymbol}{item.unit_price} (+tax)
                              </div>
                            </div>
                          </div>

                          {isSelected && currentSelected && (
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className="text-slate-500 text-[11px]">Qty:</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={item.quantity}
                                  value={currentSelected.quantity}
                                  onChange={(e) => updateItemQty(item.id, parseInt(e.target.value, 10))}
                                  className="w-16 px-2 py-1 rounded-lg border text-xs font-bold bg-white dark:bg-slate-800"
                                />
                              </div>

                              <select
                                value={currentSelected.condition}
                                onChange={(e) => updateItemCondition(item.id, e.target.value as any)}
                                className="px-2 py-1 rounded-lg border text-xs font-bold bg-white dark:bg-slate-800"
                              >
                                <option value="GOOD">Good (Restock Shelf)</option>
                                <option value="DEFECTIVE">Defective (Quarantine)</option>
                              </select>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Step C: Refund Method & Commit */}
              <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Refund Mode
                    </label>
                    <select
                      value={refundMethod}
                      onChange={(e) => setRefundMethod(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border text-xs font-bold bg-slate-50 dark:bg-slate-800"
                    >
                      <option value="CASH">Cash Refund (Drawer Pay-Out)</option>
                      <option value="UPI">UPI / Digital Transfer</option>
                      <option value="CREDIT_NOTE">Store Credit Note</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Return Reason
                    </label>
                    <input
                      type="text"
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                      placeholder="e.g. Size mismatch, defective packaging"
                      className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-slate-500">Total Refund Due Customer:</span>
                    <div className="text-xl font-black text-rose-600">
                      {branding.currencySymbol}{Math.round(totalRefundAmount)}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={selectedItems.length === 0}
                    className="w-full sm:w-auto px-6 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-500/20"
                  >
                    Confirm & Issue Refund
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Completed Return Modal / Receipt */}
      {completedReturn && (
        <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm max-w-lg mx-auto text-center space-y-4">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Return Voucher / Credit Note Issued
          </h3>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl font-mono text-xs text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Return Number:</span>
              <span className="font-bold">{completedReturn.returnNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Original Invoice:</span>
              <span>{completedReturn.originalInvoiceNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Refund Method:</span>
              <span className="font-bold">{completedReturn.refundMethod}</span>
            </div>
            <div className="flex justify-between font-bold text-sm border-t pt-2 border-slate-200">
              <span>Total Refunded:</span>
              <span className="text-rose-600">{branding.currencySymbol}{completedReturn.totalRefund}</span>
            </div>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Print Return Receipt</span>
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
