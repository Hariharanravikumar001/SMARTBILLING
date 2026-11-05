import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  Award,
  Wallet,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { Customer } from '../../types';
import { api } from '../../services/api';
import { useBranding } from '../../context/BrandingContext';

export const ShopCustomers: React.FC = () => {
  const { branding } = useBranding();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // New Customer Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    phone: '',
    email: '',
    gstin: '',
    credit_limit: 5000
  });

  // Settle Due Modal
  const [settleCustomer, setSettleCustomer] = useState<Customer | null>(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleMethod, setSettleMethod] = useState<'CASH' | 'UPI'>('CASH');

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const res: any = await api.get(`/customers?search=${encodeURIComponent(search)}`);
      if (res.success) {
        setCustomers(res.data);
      }
    } catch (err) {
      console.error('[Customers Error]:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res: any = await api.post('/customers', addForm);
      if (res.success) {
        setShowAddModal(false);
        setAddForm({ name: '', phone: '', email: '', gstin: '', credit_limit: 5000 });
        fetchCustomers();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create customer.');
    }
  };

  const handleSettleDue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleCustomer) return;
    try {
      const res: any = await api.post(`/customers/${settleCustomer.id}/settle-due`, {
        amount: parseFloat(settleAmount),
        paymentMethod: settleMethod
      });
      if (res.success) {
        setSettleCustomer(null);
        setSettleAmount('');
        fetchCustomers();
      }
    } catch (err: any) {
      alert(err.message || 'Settlement failed.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Customer Directory & Loyalty Ledger
          </h1>
          <p className="text-xs text-slate-500">
            Customer credit dues, purchase history tracking, and loyalty reward points
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchCustomers()}
          placeholder="Search customers by name, phone number, or email..."
          className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      {/* Customers Table */}
      <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Loyalty Points</th>
                <th className="py-3 px-4">Credit Limit</th>
                <th className="py-3 px-4">Outstanding Balance</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No customers found. Click "+ Add New Customer" to register walk-ins.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {c.name}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold">{c.phone}</p>
                      <p className="text-[10px] text-slate-400">{c.email || '-'}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                        <Award className="w-3.5 h-3.5" />
                        <span>{c.loyalty_points} pts</span>
                      </span>
                    </td>
                    <td className="py-3 px-4">{branding.currencySymbol}{c.credit_limit}</td>
                    <td className="py-3 px-4">
                      <span className={`font-black ${c.outstanding_balance > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                        {branding.currencySymbol}{c.outstanding_balance}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {c.outstanding_balance > 0 && (
                        <button
                          onClick={() => {
                            setSettleCustomer(c);
                            setSettleAmount(String(c.outstanding_balance));
                          }}
                          className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold border border-emerald-200"
                        >
                          Settle Dues
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="font-black text-base text-slate-900 dark:text-white mb-1">
              Add New Customer
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter customer contact information and credit parameters.
            </p>

            <form onSubmit={handleAddCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="e.g. Suresh Menon"
                  className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={addForm.phone}
                  onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                  placeholder="+91 98450 12345"
                  className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email (Optional)</label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  placeholder="suresh@gmail.com"
                  className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Credit Limit ({branding.currencySymbol})</label>
                <input
                  type="number"
                  value={addForm.credit_limit}
                  onChange={(e) => setAddForm({ ...addForm, credit_limit: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border text-xs font-bold bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                >
                  Add Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Due Modal */}
      {settleCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="font-black text-base text-slate-900 dark:text-white mb-1">
              Settle Customer Dues
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Recording settlement for {settleCustomer.name} (Balance: {branding.currencySymbol}{settleCustomer.outstanding_balance})
            </p>

            <form onSubmit={handleSettleDue} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Amount Paid ({branding.currencySymbol})</label>
                <input
                  type="number"
                  required
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs font-bold bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Payment Method</label>
                <select
                  value={settleMethod}
                  onChange={(e: any) => setSettleMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
                >
                  <option value="CASH">Cash Drawer</option>
                  <option value="UPI">UPI / QR Code</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setSettleCustomer(null)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                >
                  Confirm Settlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
