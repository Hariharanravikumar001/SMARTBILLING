import React, { useState, useEffect } from 'react';
import {
  Layers,
  Edit3,
  Plus,
  Check,
  Percent,
  Tag,
  ShieldCheck,
  Save,
  RefreshCw
} from 'lucide-react';
import { api } from '../../services/api';
import { useBranding } from '../../context/BrandingContext';

export const AdminPlans: React.FC = () => {
  const { branding, refreshBranding } = useBranding();
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const res: any = await api.get('/admin/plans');
      if (res.success) {
        setPlans(res.data);
      }
    } catch (err) {
      console.error('[Admin Plans Error]:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res: any = await api.post('/admin/plans', editingPlan);
      if (res.success) {
        setStatusMsg('Plan configurations updated successfully.');
        setEditingPlan(null);
        fetchPlans();
        refreshBranding();
      }
    } catch (err: any) {
      alert(err.message || 'Save failed.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Subscription Tier Management
          </h1>
          <p className="text-xs text-slate-500">
            Define pricing, feature limits, trial periods, and server-side entitlement rules
          </p>
        </div>

        <button
          onClick={() => {
            setEditingPlan({
              id: '',
              name: 'Custom Enterprise Tier',
              billing_interval: 'YEARLY',
              duration_days: 365,
              price_inr: 9999,
              trial_days: 14,
              max_users: 50,
              max_branches: 20,
              max_products: 50000,
              max_invoices_per_month: 50000,
              features: ['Custom ERP Integration', 'Dedicated Database Replication', '24/7 SLA Support']
            });
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Create Custom Plan</span>
        </button>
      </div>

      {statusMsg && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center justify-between">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg(null)} className="text-emerald-900 font-bold">×</button>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((p) => (
          <div
            key={p.id}
            className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">{p.name}</h3>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded uppercase">
                    {p.billing_interval}
                  </span>
                </div>
                <button
                  onClick={() => setEditingPlan({ ...p })}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                  title="Configure Plan"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>

              <div className="mb-4">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {branding.currencySymbol}{p.price_inr}
                </span>
                <span className="text-xs text-slate-400 ml-1">/ {p.duration_days} days</span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                <div className="flex justify-between">
                  <span className="text-slate-400">Free Trial</span>
                  <span className="font-semibold">{p.trial_days} Days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Branch Outlets</span>
                  <span className="font-semibold">{p.max_branches}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Staff Accounts</span>
                  <span className="font-semibold">{p.max_users}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Catalog Capacity</span>
                  <span className="font-semibold">{p.max_products > 100000 ? 'Unlimited' : p.max_products}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Monthly Invoices</span>
                  <span className="font-semibold">{p.max_invoices_per_month > 100000 ? 'Unlimited' : p.max_invoices_per_month}</span>
                </div>
              </div>

              <div className="space-y-1 text-xs text-slate-500">
                {p.features?.slice(0, 4).map((f: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    <span className="truncate">{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${p.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              <span className="text-[11px] font-semibold text-slate-500">
                {p.is_active ? 'Active on Public Pricing' : 'Disabled'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Edit / Configure Plan Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">
              Configure Subscription Plan: {editingPlan.name}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              All price changes and limit parameters take effect immediately across server-side validation.
            </p>

            <form onSubmit={handleSavePlan} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Plan Name</label>
                  <input
                    type="text"
                    required
                    value={editingPlan.name}
                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Billing Interval</label>
                  <select
                    value={editingPlan.billing_interval}
                    onChange={(e) => setEditingPlan({ ...editingPlan, billing_interval: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="HALF_YEARLY">Half-Yearly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Price (₹ INR)</label>
                  <input
                    type="number"
                    required
                    value={editingPlan.price_inr}
                    onChange={(e) => setEditingPlan({ ...editingPlan, price_inr: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Duration (Days)</label>
                  <input
                    type="number"
                    required
                    value={editingPlan.duration_days}
                    onChange={(e) => setEditingPlan({ ...editingPlan, duration_days: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Trial Period (Days)</label>
                  <input
                    type="number"
                    required
                    value={editingPlan.trial_days}
                    onChange={(e) => setEditingPlan({ ...editingPlan, trial_days: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              {/* Limits */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Entitlement Feature Limits</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Max Branches</label>
                    <input
                      type="number"
                      value={editingPlan.max_branches}
                      onChange={(e) => setEditingPlan({ ...editingPlan, max_branches: parseInt(e.target.value, 10) })}
                      className="w-full px-2 py-1.5 rounded-lg border text-xs bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Max Staff</label>
                    <input
                      type="number"
                      value={editingPlan.max_users}
                      onChange={(e) => setEditingPlan({ ...editingPlan, max_users: parseInt(e.target.value, 10) })}
                      className="w-full px-2 py-1.5 rounded-lg border text-xs bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Max Products</label>
                    <input
                      type="number"
                      value={editingPlan.max_products}
                      onChange={(e) => setEditingPlan({ ...editingPlan, max_products: parseInt(e.target.value, 10) })}
                      className="w-full px-2 py-1.5 rounded-lg border text-xs bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Max Invoices/Mo</label>
                    <input
                      type="number"
                      value={editingPlan.max_invoices_per_month}
                      onChange={(e) => setEditingPlan({ ...editingPlan, max_invoices_per_month: parseInt(e.target.value, 10) })}
                      className="w-full px-2 py-1.5 rounded-lg border text-xs bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Plan Parameters</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
