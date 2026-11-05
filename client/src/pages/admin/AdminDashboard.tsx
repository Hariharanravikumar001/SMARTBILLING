import React, { useState, useEffect } from 'react';
import {
  Building2,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  LifeBuoy,
  Activity,
  Calendar,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { api } from '../../services/api';
import { useBranding } from '../../context/BrandingContext';

export const AdminDashboard: React.FC = () => {
  const { branding } = useBranding();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboard = async () => {
    setIsLoading(true);
    try {
      const res: any = await api.get('/admin/dashboard');
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('[Admin Dashboard Error]:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-xs font-medium">
        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-blue-600" />
        <span>Loading production metrics from database...</span>
      </div>
    );
  }

  const { metrics, expiringSoon, recentActivities, systemHealth } = data;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            SaaS Platform Analytics
          </h1>
          <p className="text-xs text-slate-500">
            Real-time business accounts, subscription revenues, and operational telemetry
          </p>
        </div>
        <button
          onClick={fetchDashboard}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Figures</span>
        </button>
      </div>

      {/* Primary SaaS KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR */}
        <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Monthly Recurring Revenue</span>
            <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {branding.currencySymbol}{metrics.mrr.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">ARR: {branding.currencySymbol}{metrics.arr.toLocaleString()}</p>
        </div>

        {/* Total Collections */}
        <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Collections</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {branding.currencySymbol}{metrics.totalCollections.toLocaleString()}
          </p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">Verified via Razorpay / Cashfree</p>
        </div>

        {/* Total Businesses & Active */}
        <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Businesses Enrolled</span>
            <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {metrics.totalBusinesses}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
            <span className="text-emerald-500 font-bold">{metrics.activeSubscriptions} Active</span>
            <span>•</span>
            <span className="text-amber-500 font-bold">{metrics.freeTrialAccounts} Trial</span>
          </div>
        </div>

        {/* Support & Health */}
        <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Helpdesk & Support</span>
            <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-600 flex items-center justify-center">
              <LifeBuoy className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {metrics.openTickets} Open
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Total {metrics.totalTickets} tickets synced to Zoho Desk</p>
        </div>
      </div>

      {/* Expiring Soon & Telemetry Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subscriptions Expiring in Next 7 Days */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Subscriptions Expiring in Next 7 Days
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">{expiringSoon.length} businesses</span>
          </div>

          {expiringSoon.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No store subscriptions expiring in the next 7 days. All accounts are in good standing.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400">
                    <th className="pb-2 font-semibold">Business</th>
                    <th className="pb-2 font-semibold">Tier</th>
                    <th className="pb-2 font-semibold">Expiry Date</th>
                    <th className="pb-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {expiringSoon.map((b: any) => (
                    <tr key={b.id} className="text-slate-700 dark:text-slate-300">
                      <td className="py-2.5 font-bold">{b.name}</td>
                      <td className="py-2.5">{b.plan_name}</td>
                      <td className="py-2.5 text-amber-600 font-semibold">
                        {new Date(b.expires_at).toLocaleDateString()}
                      </td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Server & Engine Telemetry */}
        <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-emerald-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Platform Telemetry
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Database Engine</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{systemHealth.databaseEngine}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Runtime Stack</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">Node.js {systemHealth.nodeVersion}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Memory RSS</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{systemHealth.memoryUsageMB} MB</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Process Uptime</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{Math.round(systemHealth.uptimeSeconds / 60)} minutes</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Deployment Target</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">Zoho Catalyst Advanced I/O</span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span>Strict server-side multi-tenant isolation active across all queries.</span>
          </div>
        </div>
      </div>

      {/* Recent Activity Log */}
      <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-3">
          Platform Security & Audit Trail
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400">
                <th className="pb-2 font-semibold">Timestamp</th>
                <th className="pb-2 font-semibold">Actor</th>
                <th className="pb-2 font-semibold">Action</th>
                <th className="pb-2 font-semibold">Resource</th>
                <th className="pb-2 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentActivities.map((log: any) => (
                <tr key={log.id} className="text-slate-700 dark:text-slate-300">
                  <td className="py-2 text-slate-400 font-mono text-[11px]">
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="py-2 font-semibold">{log.actor_name || 'System'}</td>
                  <td className="py-2">
                    <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2 capitalize">{log.resource}</td>
                  <td className="py-2 text-slate-500 font-mono text-[11px] truncate max-w-xs">{log.details || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
