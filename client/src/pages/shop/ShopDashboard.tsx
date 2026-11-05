import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  ShoppingCart,
  Banknote,
  QrCode,
  CreditCard,
  AlertTriangle,
  Receipt,
  Users,
  Boxes,
  ArrowUpRight,
  Clock,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';

interface ShopDashboardProps {
  onNavigate: (tab: string) => void;
}

export const ShopDashboard: React.FC<ShopDashboardProps> = ({ onNavigate }) => {
  const { business, activeBranch } = useAuth();
  const { branding } = useBranding();

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboard = async () => {
    setIsLoading(true);
    try {
      const res: any = await api.get('/reports/dashboard');
      if (res.success && res.data) {
        setDashboardData(res.data);
      }
    } catch (err) {
      console.error('[Dashboard Error]:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [activeBranch]);

  if (isLoading || !dashboardData) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-xs">
        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-blue-600" />
        <span>Loading store metrics...</span>
      </div>
    );
  }

  const { today, customerDues, lowStockCount, topProducts, recentSales, subscription } = dashboardData;

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Store Performance Overview
          </h1>
          <p className="text-xs text-slate-500">
            Real-time sales, collections, inventory health, and register reconciliation for {activeBranch?.name}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('pos')}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Open POS Terminal</span>
          </button>
          <button
            onClick={() => onNavigate('exchange')}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/20"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Product Exchange</span>
          </button>
        </div>
      </div>

      {/* Trial / Subscription Status Alert */}
      {subscription && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">{subscription.plan_name} Tier</span>
                <span className="text-[10px] uppercase font-extrabold bg-blue-800/80 px-2 py-0.5 rounded border border-blue-600">
                  {subscription.effectiveStatus}
                </span>
              </div>
              <p className="text-xs text-blue-200">
                {subscription.effectiveStatus === 'TRIAL'
                  ? `Free trial active. Expires on ${new Date(subscription.expires_at).toLocaleDateString()}`
                  : `Subscription valid until ${new Date(subscription.expires_at).toLocaleDateString()}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('subscription')}
            className="self-start sm:self-auto px-4 py-2 bg-white text-blue-900 hover:bg-blue-50 rounded-xl text-xs font-bold shadow"
          >
            Manage Subscription
          </button>
        </div>
      )}

      {/* Primary KPIs Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Today's Sales</span>
            <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {branding.currencySymbol}{today.totalSales.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">{today.invoiceCount} invoices issued today</p>
        </div>

        {/* Collections Breakdown */}
        <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Payment Channels</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Cash: {branding.currencySymbol}{today.cashSales} • UPI: {branding.currencySymbol}{today.upiSales}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Card: {branding.currencySymbol}{today.cardSales}</p>
        </div>

        {/* Customer Dues */}
        <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Customer Dues</span>
            <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {branding.currencySymbol}{customerDues.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Outstanding receivables</p>
        </div>

        {/* Low Stock Warning */}
        <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Low-Stock Alerts</span>
            <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600">
            {lowStockCount} Items
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Below minimum threshold</p>
        </div>
      </div>

      {/* Grid: Top Products & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Best-Selling Products</h3>
            <button onClick={() => onNavigate('products')} className="text-xs text-blue-600 font-bold hover:underline">
              View Catalog
            </button>
          </div>

          <div className="space-y-3">
            {topProducts.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No sales recorded yet for this branch.</p>
            ) : (
              topProducts.map((p: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 font-bold text-[10px] flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{p.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 dark:text-white block">{branding.currencySymbol}{Math.round(p.total_revenue)}</span>
                    <span className="text-[10px] text-slate-400">{p.total_qty} units sold</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Recent POS Transactions</h3>
            <button onClick={() => onNavigate('reports')} className="text-xs text-blue-600 font-bold hover:underline">
              All Sales
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-[10px] uppercase font-semibold">
                  <th className="pb-2">Invoice #</th>
                  <th className="pb-2">Customer</th>
                  <th className="pb-2">Mode</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentSales.map((s: any) => (
                  <tr key={s.id} className="text-slate-700 dark:text-slate-300">
                    <td className="py-2.5 font-mono font-bold text-blue-600">{s.invoice_no}</td>
                    <td className="py-2.5 font-semibold">{s.customer_name || 'Walk-in'}</td>
                    <td className="py-2.5 font-mono text-[10px]">{s.payment_method}</td>
                    <td className="py-2.5 font-black text-right">{branding.currencySymbol}{s.grand_total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
