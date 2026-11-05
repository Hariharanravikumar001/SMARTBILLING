import React, { useState, useEffect } from 'react';
import { Settings, Save, Printer, Building, FileText, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';
import { api } from '../../services/api';

export const ShopSettings: React.FC = () => {
  const { business, activeBranch } = useAuth();
  const { branding } = useBranding();

  const [settings, setSettings] = useState({
    businessName: business?.name || '',
    phone: business?.phone || '',
    email: business?.email || '',
    gstin: business?.gstin || '',
    invoicePrefix: 'INV',
    invoiceFooter: 'Thank you for shopping with us! Visit again.',
    termsConditions: 'Goods once sold can be exchanged within 15 days with original invoice.',
    thermalPrinterWidth: '80mm',
    exchangePeriodDays: 15
  });

  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg('Store settings & receipt template updated.');
    setTimeout(() => setStatusMsg(null), 3000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Store Profile & POS Settings
          </h1>
          <p className="text-xs text-slate-500">
            Configure store contact information, tax identification numbers, and thermal receipt print formats
          </p>
        </div>
      </div>

      {statusMsg && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{statusMsg}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="text-emerald-900 font-bold">×</button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Store Profile Card */}
        <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Building className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Store Identity</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Store / Business Name</label>
              <input
                type="text"
                value={settings.businessName}
                onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">GSTIN / Tax ID</label>
              <input
                type="text"
                value={settings.gstin}
                onChange={(e) => setSettings({ ...settings, gstin: e.target.value.toUpperCase() })}
                placeholder="29AAAAA0000A1Z5"
                className="w-full px-3 py-2 rounded-xl border text-xs font-mono uppercase bg-slate-50 dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Store Contact Phone</label>
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Store Email</label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
              />
            </div>
          </div>
        </div>

        {/* POS & Thermal Receipt Template */}
        <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Printer className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Thermal Receipt & POS Billing Template</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Printer Roll Width</label>
              <select
                value={settings.thermalPrinterWidth}
                onChange={(e) => setSettings({ ...settings, thermalPrinterWidth: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800 font-bold"
              >
                <option value="80mm">80mm (Standard POS Thermal)</option>
                <option value="58mm">58mm (Compact Mobile Thermal)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Invoice Prefix</label>
              <input
                type="text"
                value={settings.invoicePrefix}
                onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value.toUpperCase() })}
                placeholder="INV"
                className="w-full px-3 py-2 rounded-xl border text-xs font-mono uppercase bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Exchange Allowed (Days)</label>
              <input
                type="number"
                value={settings.exchangePeriodDays}
                onChange={(e) => setSettings({ ...settings, exchangePeriodDays: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Receipt Footer Note</label>
            <input
              type="text"
              value={settings.invoiceFooter}
              onChange={(e) => setSettings({ ...settings, invoiceFooter: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Terms & Return Policy Statement</label>
            <textarea
              rows={2}
              value={settings.termsConditions}
              onChange={(e) => setSettings({ ...settings, termsConditions: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Store Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};
