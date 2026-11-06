import React, { useState, useEffect } from 'react';
import { Ticket, Plus, Tag, CheckCircle, Percent, DollarSign, Calendar, Trash2 } from 'lucide-react';
import { api } from '../../services/api';

export const AdminCoupons: React.FC = () => {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    code: '',
    description: '',
    discount_type: 'PERCENTAGE',
    discount_value: 20,
    min_amount: 0,
    max_discount: 1000,
    max_uses: 100
  });

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/admin/coupons');
      const data = res.data?.data || res.data || [];
      if (Array.isArray(data)) {
        setCoupons(data);
      }
    } catch (err) {
      console.error('Failed to load coupons:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res: any = await api.post('/admin/coupons', form);
      if (res.data?.success || res.success) {
        setStatusMsg(`Coupon code '${form.code.toUpperCase()}' created successfully.`);
        setShowModal(false);
        setForm({ code: '', description: '', discount_type: 'PERCENTAGE', discount_value: 20, min_amount: 0, max_discount: 1000, max_uses: 100 });
        fetchCoupons();
        setTimeout(() => setStatusMsg(null), 3000);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create coupon.');
    }
  };

  const handleToggle = async (coupon: any) => {
    try {
      await api.put(`/admin/coupons/${coupon.id}`, { is_active: !coupon.is_active });
      fetchCoupons();
    } catch (err) {}
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) return;
    try {
      await api.delete(`/admin/coupons/${id}`);
      fetchCoupons();
    } catch (err) {}
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Ticket className="w-5 h-5 text-emerald-600" />
            Promotional Coupons & Discounts
          </h1>
          <p className="text-xs text-slate-500">
            Create discount promo codes for merchant subscriptions, set maximum redemptions, and monitor usage
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>New Coupon Code</span>
        </button>
      </div>

      {statusMsg && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Coupons Table */}
      <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-3 pl-4">Coupon Code</th>
                <th className="p-3">Discount</th>
                <th className="p-3">Redemptions</th>
                <th className="p-3">Max Uses</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {coupons.length > 0 ? (
                coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 pl-4 whitespace-nowrap">
                      <div className="font-mono font-black text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{c.code}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">{c.description || 'No description'}</div>
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {c.discount_type === 'PERCENTAGE' ? `${c.discount_value}% OFF` : `₹${c.discount_value} FLAT`}
                      </span>
                    </td>

                    <td className="p-3 whitespace-nowrap font-mono">
                      {c.redemption_count || c.used_count || 0} times
                    </td>

                    <td className="p-3 whitespace-nowrap font-mono">
                      {c.max_uses}
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      <button
                        onClick={() => handleToggle(c)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer ${
                          c.is_active
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {c.is_active ? 'Active' : 'Disabled'}
                      </button>
                    </td>

                    <td className="p-3 whitespace-nowrap text-right pr-4">
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Delete Coupon"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    {loading ? 'Loading promotional coupons...' : 'No discount coupons created yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Coupon Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-850 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Ticket className="w-4 h-4 text-emerald-600" />
                Create Discount Coupon
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">×</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Coupon Code</label>
                <input
                  type="text"
                  required
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. DIWALI50 or SAVE20"
                  className="w-full px-3 py-2 rounded-xl border text-xs font-mono uppercase bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Diwali special 20% discount on all plans"
                  className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Discount Type</label>
                  <select
                    value={form.discount_type}
                    onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800 font-bold"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Discount Value</label>
                  <input
                    type="number"
                    required
                    value={form.discount_value}
                    onChange={(e) => setForm({ ...form, discount_value: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border text-xs font-bold bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Max Uses Limit</label>
                  <input
                    type="number"
                    value={form.max_uses}
                    onChange={(e) => setForm({ ...form, max_uses: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Max Discount Cap (₹)</label>
                  <input
                    type="number"
                    value={form.max_discount}
                    onChange={(e) => setForm({ ...form, max_discount: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
                  />
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
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow"
                >
                  Create Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
