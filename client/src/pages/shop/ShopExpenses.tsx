import React, { useState, useEffect } from 'react';
import { Receipt, Plus, Search, Calendar, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';

export const ShopExpenses: React.FC = () => {
  const { branding } = useBranding();
  const { activeBranch } = useAuth();

  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [form, setForm] = useState({
    categoryName: 'Electricity & Utilities',
    amount: '',
    paymentMethod: 'CASH',
    description: '',
    expenseDate: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [expRes, catRes]: any = await Promise.all([
        api.get('/expenses'),
        api.get('/expenses/categories')
      ]);

      if (expRes.success) setExpenses(expRes.data);
      if (catRes.success) setCategories(catRes.data);
    } catch (err) {
      console.error('[Expenses Error]:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeBranch]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res: any = await api.post('/expenses', form);
      if (res.success) {
        setShowAddModal(false);
        setForm({
          categoryName: 'Electricity & Utilities',
          amount: '',
          paymentMethod: 'CASH',
          description: '',
          expenseDate: new Date().toISOString().split('T')[0]
        });
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Expense recording failed.');
    }
  };

  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Store Operating Expenses
          </h1>
          <p className="text-xs text-slate-500">
            Log store overheads, utilities, tea/refreshments, rent, packaging, and drawer cash deductions
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Record Expense Voucher</span>
        </button>
      </div>

      {/* Summary Card */}
      <div className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm max-w-sm">
        <span className="text-xs font-semibold text-slate-400 block mb-1">Total Recorded Expenses</span>
        <p className="text-2xl font-black text-slate-900 dark:text-white">
          {branding.currencySymbol}{totalExpenses.toLocaleString()}
        </p>
        <p className="text-[11px] text-slate-400 mt-1">{expenses.length} expense vouchers logged</p>
      </div>

      {/* Expenses Table */}
      <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Created By</th>
                <th className="py-3 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No operating expenses recorded yet.
                  </td>
                </tr>
              ) : (
                expenses.map((e) => (
                  <tr key={e.id}>
                    <td className="py-3 px-4 font-mono text-slate-500">{e.expense_date}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{e.category_name}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{e.description || '-'}</td>
                    <td className="py-3 px-4 font-mono text-[11px]">{e.payment_method}</td>
                    <td className="py-3 px-4 text-slate-500">{e.created_by}</td>
                    <td className="py-3 px-4 font-black text-right text-rose-600">
                      {branding.currencySymbol}{e.amount}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="font-black text-base text-slate-900 dark:text-white mb-1">
              Record Expense Voucher
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              If paid via Cash, active drawer cash will be deducted automatically.
            </p>

            <form onSubmit={handleAddExpense} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                <select
                  value={form.categoryName}
                  onChange={(e) => setForm({ ...form, categoryName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
                >
                  <option value="Electricity & Utilities">Electricity & Utilities</option>
                  <option value="Tea & Staff Refreshments">Tea & Staff Refreshments</option>
                  <option value="Packaging & Bags">Packaging & Carry Bags</option>
                  <option value="Store Rent">Store Rent</option>
                  <option value="Cleaning & Maintenance">Cleaning & Maintenance</option>
                  <option value="Miscellaneous">Miscellaneous</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Amount ({branding.currencySymbol})</label>
                <input
                  type="number"
                  required
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="e.g. 250"
                  className="w-full px-3 py-2 rounded-xl border text-xs font-bold bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Payment Method</label>
                <select
                  value={form.paymentMethod}
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
                >
                  <option value="CASH">Cash (Deduct from Cash Register)</option>
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="BANK_TRANSFER">Bank Account</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Paid tea vendor for 15 cups"
                  className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                >
                  Record Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
