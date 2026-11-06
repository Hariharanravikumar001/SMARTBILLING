import React, { useState, useEffect } from 'react';
import { Shield, Search, RefreshCw, Filter, Clock, User, HardDrive } from 'lucide-react';
import { api } from '../../services/api';

interface AuditLog {
  id: string;
  business_id?: string;
  actor_type: string;
  actor_id?: string;
  actor_name?: string;
  action: string;
  resource: string;
  resource_id?: string;
  ip_address?: string;
  details?: string;
  created_at: string;
}

export const AdminAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/admin/audit-logs');
      const data = res.data?.data || res.data || [];
      if (Array.isArray(data)) {
        setLogs(data);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      (log.actor_name && log.actor_name.toLowerCase().includes(search.toLowerCase())) ||
      (log.action && log.action.toLowerCase().includes(search.toLowerCase())) ||
      (log.resource && log.resource.toLowerCase().includes(search.toLowerCase())) ||
      (log.details && log.details.toLowerCase().includes(search.toLowerCase()));

    const matchesFilter = filterAction === 'ALL' || log.action === filterAction;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            Platform Security & Audit Logs
          </h1>
          <p className="text-xs text-slate-500">
            Immutable chronological ledger of authentication, tenant state modifications, billing, and system activities
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search logs by actor, action, resource..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-xs focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-xs font-semibold"
          >
            <option value="ALL">All Actions</option>
            <option value="LOGIN">LOGIN</option>
            <option value="CREATE_BUSINESS">CREATE_BUSINESS</option>
            <option value="UPDATE_STATUS">UPDATE_STATUS</option>
            <option value="ACTIVATE_SUBSCRIPTION">ACTIVATE_SUBSCRIPTION</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-3 pl-4">Timestamp</th>
                <th className="p-3">Actor / Principal</th>
                <th className="p-3">Action</th>
                <th className="p-3">Target Resource</th>
                <th className="p-3">Details / Context</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 pl-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-bold text-slate-900 dark:text-white">
                          {log.actor_name || 'System Principal'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({log.actor_type})
                        </span>
                      </div>
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                        log.action.includes('LOGIN') ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' :
                        log.action.includes('ACTIVATE') ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                        log.action.includes('UPDATE') ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {log.action}
                      </span>
                    </td>

                    <td className="p-3 whitespace-nowrap text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                      <div className="flex items-center gap-1">
                        <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                        <span>{log.resource} {log.resource_id ? `#${log.resource_id.slice(-6)}` : ''}</span>
                      </div>
                    </td>

                    <td className="p-3 max-w-xs truncate text-slate-500 font-mono text-[11px]" title={log.details || ''}>
                      {log.details ? log.details : '—'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    {loading ? 'Loading audit logs...' : 'No audit log records match your filter.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
