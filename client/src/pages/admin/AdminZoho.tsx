import React, { useState, useEffect } from 'react';
import { HelpCircle, Save, CheckCircle2, Clock, AlertCircle, RefreshCw, KeyRound, ExternalLink } from 'lucide-react';
import { api } from '../../services/api';

export const AdminZoho: React.FC = () => {
  const [zohoStatus, setZohoStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [crmForm, setCrmForm] = useState({
    clientId: '',
    clientSecret: '',
    refreshToken: ''
  });
  const [deskForm, setDeskForm] = useState({
    clientId: '',
    clientSecret: '',
    refreshToken: '',
    deskOrgId: '',
    deskDepartmentId: ''
  });
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const res: any = await api.get('/admin/zoho/status');
      if (res.success) {
        setZohoStatus(res.data);
      }
    } catch (err) {
      console.error('[Admin Zoho Error]:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleConnectCRM = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res: any = await api.post('/admin/zoho/connect', {
        service: 'CRM',
        ...crmForm
      });
      if (res.success) {
        setStatusMsg('Zoho CRM credentials connected successfully.');
        fetchStatus();
      }
    } catch (err: any) {
      alert(err.message || 'Connection failed.');
    }
  };

  const handleConnectDesk = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res: any = await api.post('/admin/zoho/connect', {
        service: 'DESK',
        ...deskForm
      });
      if (res.success) {
        setStatusMsg('Zoho Desk credentials connected successfully.');
        fetchStatus();
      }
    } catch (err: any) {
      alert(err.message || 'Connection failed.');
    }
  };

  if (isLoading || !zohoStatus) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-xs">
        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-blue-600" />
        <span>Loading Zoho connection monitors...</span>
      </div>
    );
  }

  const { crm, desk, syncLogs } = zohoStatus;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Zoho CRM & Zoho Desk Central Hub
          </h1>
          <p className="text-xs text-slate-500">
            Enterprise OAuth 2.0 integration for SaaS prospect pipelines, customer sync, and shopkeeper support tickets
          </p>
        </div>

        <button
          onClick={fetchStatus}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Monitor</span>
        </button>
      </div>

      {statusMsg && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center justify-between">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg(null)} className="text-emerald-900 font-bold">×</button>
        </div>
      )}

      {/* Connection Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Zoho CRM Card */}
        <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs">
                CRM
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Zoho CRM Integration</h3>
                <p className="text-[11px] text-slate-400">Captures SaaS demo leads & signups</p>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              crm.is_active
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
            }`}>
              {crm.is_active ? 'Active & Synced' : 'Awaiting Connection'}
            </span>
          </div>

          <form onSubmit={handleConnectCRM} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">OAuth Client ID</label>
              <input
                type="text"
                required
                value={crmForm.clientId}
                onChange={(e) => setCrmForm({ ...crmForm, clientId: e.target.value })}
                placeholder="1000.XXXXXXXXXXXXXXXXXXXXXXXX"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-mono bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">OAuth Client Secret</label>
              <input
                type="password"
                required
                value={crmForm.clientSecret}
                onChange={(e) => setCrmForm({ ...crmForm, clientSecret: e.target.value })}
                placeholder="••••••••••••••••••••"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-mono bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">OAuth Refresh Token</label>
              <input
                type="password"
                required
                value={crmForm.refreshToken}
                onChange={(e) => setCrmForm({ ...crmForm, refreshToken: e.target.value })}
                placeholder="1000.XXXXXXXXXXXXXXXXXXXXXXXX.XXXXX"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-mono bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
            >
              Update Zoho CRM Credentials
            </button>
          </form>
        </div>

        {/* Zoho Desk Card */}
        <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                DESK
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Zoho Desk Integration</h3>
                <p className="text-[11px] text-slate-400">Routes in-app customer tickets to support</p>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              desk.is_active
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
            }`}>
              {desk.is_active ? 'Active & Synced' : 'Awaiting Connection'}
            </span>
          </div>

          <form onSubmit={handleConnectDesk} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Desk Org ID</label>
                <input
                  type="text"
                  value={deskForm.deskOrgId}
                  onChange={(e) => setDeskForm({ ...deskForm, deskOrgId: e.target.value })}
                  placeholder="60000000"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-mono bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Department ID</label>
                <input
                  type="text"
                  value={deskForm.deskDepartmentId}
                  onChange={(e) => setDeskForm({ ...deskForm, deskDepartmentId: e.target.value })}
                  placeholder="81600000"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-mono bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">OAuth Client ID</label>
              <input
                type="text"
                required
                value={deskForm.clientId}
                onChange={(e) => setDeskForm({ ...deskForm, clientId: e.target.value })}
                placeholder="1000.XXXXXXXXXXXXXXXXXXXXXXXX"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-mono bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">OAuth Refresh Token</label>
              <input
                type="password"
                required
                value={deskForm.refreshToken}
                onChange={(e) => setDeskForm({ ...deskForm, refreshToken: e.target.value })}
                placeholder="1000.XXXXXXXXXXXXXXXXXXXXXXXX"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-mono bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
            >
              Update Zoho Desk Credentials
            </button>
          </form>
        </div>
      </div>

      {/* Central Sync Logs Table */}
      <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-3">
          Synchronization Event Queue & Audit History
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold">
                <th className="pb-2">Timestamp</th>
                <th className="pb-2">Service</th>
                <th className="pb-2">Action</th>
                <th className="pb-2">Entity ID</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Diagnostics / Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {syncLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    No sync events in queue.
                  </td>
                </tr>
              ) : (
                syncLogs.map((log: any) => (
                  <tr key={log.id} className="text-slate-700 dark:text-slate-300">
                    <td className="py-2.5 font-mono text-[11px] text-slate-400">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 font-bold">{log.service}</td>
                    <td className="py-2.5 font-mono text-[11px]">{log.action}</td>
                    <td className="py-2.5 font-mono text-[11px] text-slate-500">{log.entity_id || '-'}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.status === 'SUCCESS'
                          ? 'bg-emerald-100 text-emerald-800'
                          : log.status === 'AWAITING_CONNECTION'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 font-mono text-[10px] text-slate-400 truncate max-w-xs">
                      {log.error_message || log.request_payload || '-'}
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
