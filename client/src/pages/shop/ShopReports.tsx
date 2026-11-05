import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  FileSpreadsheet,
  Download,
  Calendar,
  Percent,
  RefreshCw
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';

export const ShopReports: React.FC = () => {
  const { branding } = useBranding();
  const { activeBranch } = useAuth();

  const [activeTab, setActiveTab] = useState<'tax' | 'pnl'>('tax');
  const [taxData, setTaxData] = useState<any>(null);
  const [pnlData, setPnlData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const [taxRes, pnlRes]: any = await Promise.all([
        api.get('/reports/tax'),
        api.get('/reports/profit-loss')
      ]);

      if (taxRes.success) setTaxData(taxRes.data);
      if (pnlRes.success) setPnlData(pnlRes.data);
    } catch (err) {
      console.error('[Reports Error]:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [activeBranch]);

  if (isLoading || !taxData || !pnlData) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-xs">
        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-blue-600" />
        <span>Compiling financial accounting reports...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Financial & Tax Accounting Reports
          </h1>
          <p className="text-xs text-slate-500">
            GST CGST/SGST/IGST tax reconciliation summaries, Profit & Loss ledgers, and margin analysis
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export / Print Report</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('tax')}
          className={`pb-2.5 transition-colors border-b-2 ${
            activeTab === 'tax' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'
          }`}
        >
          GST Tax Ledger & Filing Summary
        </button>
        <button
          onClick={() => setActiveTab('pnl')}
          className={`pb-2.5 transition-colors border-b-2 ${
            activeTab === 'pnl' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'
          }`}
        >
          Profit & Loss Statement (P&L)
        </button>
      </div>

      {activeTab === 'tax' ? (
        <div className="space-y-6">
          {/* Tax Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Taxable Turnover</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {branding.currencySymbol}{Math.round(taxData.taxable_turnover).toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Excluding GST</p>
            </div>

            <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Total GST Tax Collected</span>
              <p className="text-2xl font-black text-blue-600">
                {branding.currencySymbol}{Math.round(taxData.total_tax).toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">CGST + SGST + IGST</p>
            </div>

            <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">CGST (Central)</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {branding.currencySymbol}{Math.round(taxData.total_cgst).toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">SGST: {branding.currencySymbol}{Math.round(taxData.total_sgst).toLocaleString()}</p>
            </div>

            <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Gross Invoiced Turnover</span>
              <p className="text-2xl font-black text-emerald-600">
                {branding.currencySymbol}{Math.round(taxData.gross_turnover).toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">{taxData.invoice_count} sales invoices</p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl text-xs text-slate-500">
            Tax summary figures reflect real transactional invoice records and are formatted for GSTR-1 and GSTR-3B monthly filing.
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-6 max-w-2xl">
          <h3 className="font-bold text-base text-slate-900 dark:text-white">Estimated Profit & Loss Breakdown</h3>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-600 dark:text-slate-400 font-semibold">1. Total Invoiced Revenue (Sales)</span>
              <span className="font-bold text-slate-900 dark:text-white text-sm">
                {branding.currencySymbol}{pnlData.totalRevenue.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-600 dark:text-slate-400 font-semibold">2. Cost of Goods Sold (COGS)</span>
              <span className="font-bold text-rose-600">
                - {branding.currencySymbol}{pnlData.totalCogs.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between py-2 bg-blue-50/60 dark:bg-blue-950/40 px-3 rounded-xl">
              <span className="font-bold text-blue-900 dark:text-blue-200">Gross Profit (Margin: {pnlData.grossMarginPercent}%)</span>
              <span className="font-black text-blue-900 dark:text-blue-200 text-sm">
                {branding.currencySymbol}{pnlData.grossProfit.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-600 dark:text-slate-400 font-semibold">3. Store Operating Expenses</span>
              <span className="font-bold text-rose-600">
                - {branding.currencySymbol}{pnlData.totalExpenses.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between py-3 border-t-2 border-slate-200 dark:border-slate-700 text-sm font-black">
              <span className="text-slate-900 dark:text-white">Estimated Net Profit</span>
              <span className={pnlData.estimatedNetProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                {branding.currencySymbol}{pnlData.estimatedNetProfit.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
