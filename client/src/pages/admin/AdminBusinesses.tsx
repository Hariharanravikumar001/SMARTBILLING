import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  Plus,
  CheckCircle,
  XCircle,
  Eye,
  ShieldAlert,
  Download,
  RefreshCw,
  Phone,
  Mail,
  Store
} from 'lucide-react';
import { api } from '../../services/api';
import { useBranding } from '../../context/BrandingContext';

export const AdminBusinesses: React.FC = () => {
  const { branding } = useBranding();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // New Business Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    phone: '',
    industry_type: 'retail',
    plan_id: 'plan_quarterly',
    city: 'Bengaluru',
    state: 'Karnataka'
  });

  // Selected Business View Modal
  const [selectedBiz, setSelectedBiz] = useState<any>(null);

  const fetchBusinesses = async () => {
    setIsLoading(true);
    try {
      let endpoint = `/admin/businesses?limit=100`;
      if (search) endpoint += `&search=${encodeURIComponent(search)}`;
      if (statusFilter) endpoint += `&status=${statusFilter}`;
      const res: any = await api.get(endpoint);
      if (res.success) {
        setBusinesses(res.data);
      }
    } catch (err) {
      console.error('[Admin Businesses Error]:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, [statusFilter]);

  const handleStatusToggle = async (biz: any) => {
    const newStatus = biz.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const confirm = window.confirm(`Are you sure you want to change status of '${biz.name}' to ${newStatus}?`);
    if (!confirm) return;

    try {
      const res: any = await api.patch(`/admin/businesses/${biz.id}/status`, { status: newStatus });
      if (res.success) {
        fetchBusinesses();
      }
    } catch (err: any) {
      alert(err.message || 'Status update failed.');
    }
  };

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res: any = await api.post('/admin/businesses', createForm);
      if (res.success) {
        setShowCreateModal(false);
        setCreateForm({ name: '', email: '', phone: '', industry_type: 'retail', plan_id: 'plan_quarterly', city: '', state: '' });
        fetchBusinesses();
      }
    } catch (err: any) {
      alert(err.message || 'Creation failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Tenant Business Directory
          </h1>
          <p className="text-xs text-slate-500">
            Manage enrolled businesses, staff, subscription tiers, and operational permissions
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Register Store Manually</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchBusinesses()}
            placeholder="Search by store name, email, phone, or business ID..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-xs focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="TRIAL">Trial</option>
          <option value="SUSPENDED">Suspended</option>
        </select>

        <button
          onClick={fetchBusinesses}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 transition-colors"
        >
          Filter
        </button>
      </div>

      {/* Businesses Table */}
      <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Business / ID</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Industry</th>
                <th className="py-3 px-4">Subscription Plan</th>
                <th className="py-3 px-4">Outlets / Staff</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {businesses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No businesses matching your criteria found.
                  </td>
                </tr>
              ) : (
                businesses.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900 dark:text-white">{b.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{b.id}</p>
                    </td>
                    <td className="py-3 px-4 space-y-0.5">
                      <p className="text-slate-700 dark:text-slate-300 font-medium">{b.email}</p>
                      <p className="text-[11px] text-slate-400">{b.phone}</p>
                    </td>
                    <td className="py-3 px-4 capitalize text-slate-600 dark:text-slate-400">
                      {b.industry_type || 'Retail'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                        {b.plan_name || 'Standard Tier'}
                      </span>
                      {b.subscription_expires_at && (
                        <span className="text-[10px] text-slate-400">
                          Expires: {new Date(b.subscription_expires_at).toLocaleDateString()}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{b.branch_count}</span> Outlets /{' '}
                      <span className="font-bold text-slate-800 dark:text-slate-200">{b.staff_count}</span> Staff
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          b.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : b.status === 'TRIAL'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedBiz(b)}
                          title="View Details"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleStatusToggle(b)}
                          title={b.status === 'ACTIVE' ? 'Suspend Account' : 'Reactivate Account'}
                          className={`p-1.5 rounded-lg ${
                            b.status === 'ACTIVE'
                              ? 'text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30'
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                          }`}
                        >
                          {b.status === 'ACTIVE' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Business Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">
              Register New Store Manually
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Directly provisions tenant schema, initial branches, and subscription duration.
            </p>

            <form onSubmit={handleCreateBusiness} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Store / Business Name</label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g. Phoenix Apparel"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Owner Email</label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="owner@phoenix.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="+91 98450 99887"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Retail Type</label>
                  <select
                    value={createForm.industry_type}
                    onChange={(e) => setCreateForm({ ...createForm, industry_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="clothing">Clothing & Apparel</option>
                    <option value="grocery">Grocery & Supermarket</option>
                    <option value="electronics">Electronics & Mobile</option>
                    <option value="hardware">Hardware & Materials</option>
                    <option value="retail">General Retail</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Provisioned Plan</label>
                  <select
                    value={createForm.plan_id}
                    onChange={(e) => setCreateForm({ ...createForm, plan_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="plan_monthly">Monthly Starter (₹499)</option>
                    <option value="plan_quarterly">Quarterly Growth (₹1,399)</option>
                    <option value="plan_half_yearly">Half-Yearly Pro (₹2,599)</option>
                    <option value="plan_yearly">Yearly Enterprise (₹4,999)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                >
                  Confirm Provisioning
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Business Details Inspection Modal */}
      {selectedBiz && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">{selectedBiz.name}</h3>
                <p className="text-xs text-slate-400 font-mono">Tenant ID: {selectedBiz.id}</p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                {selectedBiz.status}
              </span>
            </div>

            <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300 mb-6">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
                <div>
                  <span className="text-slate-400 block text-[10px]">Email</span>
                  <span className="font-semibold">{selectedBiz.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Phone</span>
                  <span className="font-semibold">{selectedBiz.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">GSTIN</span>
                  <span className="font-semibold">{selectedBiz.gstin || 'Not Configured'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Industry</span>
                  <span className="font-semibold capitalize">{selectedBiz.industry_type || 'Retail'}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] mb-1">Internal SaaS Notes</span>
                <p className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl text-slate-600 dark:text-slate-300 italic">
                  {selectedBiz.internal_notes || 'No internal notes added by account manager.'}
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedBiz(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
