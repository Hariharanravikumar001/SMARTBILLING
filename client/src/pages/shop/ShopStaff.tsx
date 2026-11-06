import React, { useState, useEffect } from 'react';
import { Users, Plus, KeyRound, CheckCircle2, Shield, UserCheck, XCircle, Building } from 'lucide-react';
import { api } from '../../services/api';

export const ShopStaff: React.FC = () => {
  const [staff, setStaff] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    pin: '1234',
    role: 'Cashier',
    branchId: '',
    phone: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [staffRes, branchRes]: any = await Promise.all([
        api.get('/business/staff'),
        api.get('/business/branches')
      ]);

      const staffData = staffRes.data?.data || staffRes.data || [];
      const branchData = branchRes.data?.data || branchRes.data || [];

      if (Array.isArray(staffData)) setStaff(staffData);
      if (Array.isArray(branchData)) setBranches(branchData);
    } catch (err) {
      console.error('Failed to load store staff:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);

    try {
      const res: any = await api.post('/business/staff', form);
      if (res.data?.success || res.success) {
        setStatusMsg(`Staff member '${form.name}' added with 4-digit PIN.`);
        setShowModal(false);
        setForm({ name: '', email: '', password: '', pin: '1234', role: 'Cashier', branchId: '', phone: '' });
        fetchData();
        setTimeout(() => setStatusMsg(null), 3500);
      } else {
        setErrorMsg(res.data?.message || 'Failed to add staff member.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Network error.');
    }
  };

  const handleDeactivate = async (id: string, name: string) => {
    if (!window.confirm(`Deactivate access for ${name}?`)) return;
    try {
      await api.delete(`/business/staff/${id}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Deactivation failed.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Store Staff & Cashier PINs
          </h1>
          <p className="text-xs text-slate-500">
            Create employee profiles, assign store branches, configure touchscreen 4-digit POS PINs, and grant role permissions
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add Staff / Cashier</span>
        </button>
      </div>

      {statusMsg && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Staff Table */}
      <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-3 pl-4">Staff Member</th>
                <th className="p-3">Store Branch</th>
                <th className="p-3">Role</th>
                <th className="p-3">Status</th>
                <th className="p-3">Last Login</th>
                <th className="p-3 text-right pr-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {staff.length > 0 ? (
                staff.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 pl-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900 dark:text-white">{s.name}</div>
                      <div className="text-[11px] text-slate-400">{s.email}</div>
                    </td>

                    <td className="p-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        <span>{s.branch_name || 'Main Branch'}</span>
                      </div>
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {s.role}
                      </span>
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      {s.is_active ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                          <UserCheck className="w-3.5 h-3.5" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-500">
                          <XCircle className="w-3.5 h-3.5" />
                          Inactive
                        </span>
                      )}
                    </td>

                    <td className="p-3 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                      {s.last_login_at ? new Date(s.last_login_at).toLocaleString() : 'Never'}
                    </td>

                    <td className="p-3 whitespace-nowrap text-right pr-4">
                      {s.role !== 'Owner' && s.is_active === 1 && (
                        <button
                          onClick={() => handleDeactivate(s.id, s.name)}
                          className="text-[11px] font-bold text-rose-600 hover:text-rose-800"
                        >
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    {loading ? 'Loading staff directory...' : 'No staff profiles found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-850 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Add Employee / Cashier
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">×</button>
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Employee Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Work Email (Login ID)</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="ramesh@mystore.com"
                  className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Min 6 characters"
                    className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Touchscreen PIN</label>
                  <input
                    type="text"
                    maxLength={4}
                    required
                    value={form.pin}
                    onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '') })}
                    placeholder="4 Digits (e.g. 1234)"
                    className="w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold text-center tracking-widest bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Assigned Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800 font-bold"
                  >
                    <option value="Cashier">Cashier</option>
                    <option value="Manager">Store Manager</option>
                    <option value="Stock Clerk">Stock Clerk</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Store Branch</label>
                  <select
                    value={form.branchId}
                    onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="">Default Branch</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow"
                >
                  Create Staff Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
