import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  RefreshCw
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';

export const ShopCashRegister: React.FC = () => {
  const { business, activeBranch, businessUser } = useAuth();
  const { branding } = useBranding();

  const [registerData, setRegisterData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Shift Modal State
  const [openingCashInput, setOpeningCashInput] = useState('2000');
  const [closingCashInput, setClosingCashInput] = useState('');
  const [reconciliationResult, setReconciliationResult] = useState<any>(null);

  // Manual Movement Modal
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [moveType, setMoveType] = useState<'CASH_IN' | 'CASH_OUT'>('CASH_IN');
  const [moveAmount, setMoveAmount] = useState('');
  const [moveReason, setMoveReason] = useState('');

  const fetchRegister = async () => {
    setIsLoading(true);
    try {
      const res: any = await api.get('/cash-register/current');
      if (res.success) {
        setRegisterData(res.data);
      }
    } catch (err) {
      console.error('[Cash Register Error]:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRegister();
  }, [activeBranch]);

  const handleOpenShift = async () => {
    try {
      const res: any = await api.post('/cash-register/open', {
        openingCash: parseFloat(openingCashInput) || 0
      });
      if (res.success) {
        fetchRegister();
      }
    } catch (err: any) {
      alert(err.message || 'Opening shift failed.');
    }
  };

  const handleCloseShift = async () => {
    if (!closingCashInput) {
      alert('Please enter the physical closing cash counted.');
      return;
    }
    try {
      const res: any = await api.post('/cash-register/close', {
        closingCash: parseFloat(closingCashInput) || 0
      });
      if (res.success) {
        setReconciliationResult(res.reconciliation);
        fetchRegister();
      }
    } catch (err: any) {
      alert(err.message || 'Shift closing failed.');
    }
  };

  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res: any = await api.post('/cash-register/movement', {
        type: moveType,
        amount: parseFloat(moveAmount),
        reason: moveReason
      });
      if (res.success) {
        setShowMovementModal(false);
        setMoveAmount('');
        setMoveReason('');
        fetchRegister();
      }
    } catch (err: any) {
      alert(err.message || 'Movement failed.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-xs">
        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-blue-600" />
        <span>Loading cash register status...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Cash Drawer & Daily Shift Management
          </h1>
          <p className="text-xs text-slate-500">
            Shift opening float, live transaction audit, manual cash-in/out, and physical cash reconciliation
          </p>
        </div>

        {registerData && (
          <button
            onClick={() => setShowMovementModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Record Cash In / Out</span>
          </button>
        )}
      </div>

      {/* Reconciliation Success Modal */}
      {reconciliationResult && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Shift Closed & Reconciled Successfully!</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700 dark:text-slate-300">
            <div>Opening Float: <span className="font-bold">{branding.currencySymbol}{reconciliationResult.openingCash}</span></div>
            <div>Expected Cash: <span className="font-bold">{branding.currencySymbol}{reconciliationResult.systemExpected}</span></div>
            <div>Counted Cash: <span className="font-bold">{branding.currencySymbol}{reconciliationResult.countedClosingCash}</span></div>
            <div>
              Difference:{' '}
              <span className={`font-black ${reconciliationResult.difference === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {branding.currencySymbol}{reconciliationResult.difference}
              </span>
            </div>
          </div>
        </div>
      )}

      {!registerData ? (
        // Open Shift State
        <div className="bg-white dark:bg-slate-850 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 shadow-sm max-w-md mx-auto text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            <Unlock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-lg text-slate-900 dark:text-white">Cash Register is Closed</h3>
            <p className="text-xs text-slate-500 mt-1">
              Please enter opening cash float to start a new cashier shift at {activeBranch?.name}.
            </p>
          </div>

          <div className="text-left">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Opening Cash Float ({branding.currencySymbol})
            </label>
            <input
              type="number"
              value={openingCashInput}
              onChange={(e) => setOpeningCashInput(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-base font-bold text-center bg-slate-50 dark:bg-slate-800"
            />
          </div>

          <button
            onClick={handleOpenShift}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
          >
            Open Cashier Shift
          </button>
        </div>
      ) : (
        // Active Open Shift Live Dashboard
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 block mb-1">Opening Cash Float</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {branding.currencySymbol}{registerData.opening_cash}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Opened at {new Date(registerData.opening_time).toLocaleTimeString()}</p>
            </div>

            <div className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 block mb-1">Live Expected Cash in Drawer</span>
              <p className="text-2xl font-black text-blue-600">
                {branding.currencySymbol}{registerData.currentExpectedCash}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Includes sales, exchanges & cash-in/out</p>
            </div>

            <div className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 block mb-1">Close & Reconcile Shift</span>
                <input
                  type="number"
                  placeholder="Enter counted cash..."
                  value={closingCashInput}
                  onChange={(e) => setClosingCashInput(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border text-xs font-bold bg-slate-50 dark:bg-slate-800 mb-2"
                />
              </div>
              <button
                onClick={handleCloseShift}
                className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
              >
                End Shift & Close Drawer
              </button>
            </div>
          </div>

          {/* Drawer Movements List */}
          <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-3">
              Drawer Cash Movements (Active Shift)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-[10px] uppercase font-semibold">
                    <th className="pb-2">Time</th>
                    <th className="pb-2">Type</th>
                    <th className="pb-2">Amount</th>
                    <th className="pb-2">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {registerData.movements?.map((m: any) => (
                    <tr key={m.id}>
                      <td className="py-2.5 font-mono text-[11px] text-slate-400">
                        {new Date(m.created_at).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 font-bold uppercase text-[10px]">{m.type}</td>
                      <td className={`py-2.5 font-black ${m.amount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {m.amount > 0 ? `+ ${branding.currencySymbol}${m.amount}` : `- ${branding.currencySymbol}${Math.abs(m.amount)}`}
                      </td>
                      <td className="py-2.5 text-slate-500">{m.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Manual Movement Modal */}
      {showMovementModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="font-black text-base text-slate-900 dark:text-white mb-1">
              Drawer Movement (Cash In / Cash Out)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Add float money or record cash withdrawal for bank deposit.
            </p>

            <form onSubmit={handleAddMovement} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMoveType('CASH_IN')}
                    className={`py-2 rounded-xl text-xs font-bold border ${
                      moveType === 'CASH_IN' ? 'bg-emerald-600 text-white' : 'bg-slate-50 dark:bg-slate-800'
                    }`}
                  >
                    Cash In (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMoveType('CASH_OUT')}
                    className={`py-2 rounded-xl text-xs font-bold border ${
                      moveType === 'CASH_OUT' ? 'bg-rose-600 text-white' : 'bg-slate-50 dark:bg-slate-800'
                    }`}
                  >
                    Cash Out (-)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Amount</label>
                <input
                  type="number"
                  required
                  value={moveAmount}
                  onChange={(e) => setMoveAmount(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full px-3 py-2 rounded-xl border text-xs font-bold bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Reason</label>
                <input
                  type="text"
                  required
                  value={moveReason}
                  onChange={(e) => setMoveReason(e.target.value)}
                  placeholder="e.g. Added change coins / Bank deposit"
                  className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowMovementModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                >
                  Record Movement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
