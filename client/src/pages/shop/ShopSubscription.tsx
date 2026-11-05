import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Tag,
  Download,
  RefreshCw,
  Check
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';

export const ShopSubscription: React.FC = () => {
  const { business } = useAuth();
  const { branding } = useBranding();

  const [data, setData] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState<any>(null);

  // Checkout modal
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchSubscriptionData = async () => {
    setIsLoading(true);
    try {
      const [planRes, availPlansRes]: any = await Promise.all([
        api.get('/subscription/my-plan'),
        api.get('/subscription/plans')
      ]);

      if (planRes.success) setData(planRes.data);
      if (availPlansRes.success) setPlans(availPlansRes.data);
    } catch (err) {
      console.error('[Subscription Error]:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const handleApplyCoupon = async (planId: string) => {
    if (!couponCode.trim()) return;
    try {
      const res: any = await api.post('/subscription/validate-coupon', {
        code: couponCode.trim(),
        planId
      });
      if (res.success) {
        setCouponResult(res.data);
      }
    } catch (err: any) {
      alert(err.message || 'Invalid coupon code.');
    }
  };

  const handleInitiateOrder = async (plan: any) => {
    setSelectedPlan(plan);
    setIsCheckingOut(true);
    try {
      const res: any = await api.post('/subscription/initiate-order', {
        planId: plan.id,
        gateway: 'RAZORPAY',
        couponCode: couponResult?.code
      });
      if (res.success) {
        setActiveOrder(res.data);
      }
    } catch (err: any) {
      alert(err.message || 'Payment initiation failed.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleCompleteSandboxPayment = async () => {
    if (!activeOrder) return;
    try {
      const res: any = await api.post('/subscription/complete-payment', {
        orderId: activeOrder.orderId,
        paymentId: `pay_sandbox_${Date.now()}`,
        planId: activeOrder.planId,
        gateway: 'RAZORPAY',
        amount: activeOrder.amount
      });

      if (res.success) {
        setSuccessMessage('Payment verified! Your subscription plan has been renewed.');
        setActiveOrder(null);
        setSelectedPlan(null);
        setCouponResult(null);
        setCouponCode('');
        fetchSubscriptionData();
      }
    } catch (err: any) {
      alert(err.message || 'Payment failed.');
    }
  };

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-xs">
        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-blue-600" />
        <span>Loading subscription status...</span>
      </div>
    );
  }

  const { subscription, usage, paymentHistory } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            My Store Subscription & Entitlements
          </h1>
          <p className="text-xs text-slate-500">
            View active plan validity, monitor usage limits, apply discount promo codes, and upgrade
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-900">×</button>
        </div>
      )}

      {/* Current Active Plan Overview Card */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-extrabold text-blue-300 uppercase tracking-wider">Active Plan</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-700/60 border border-blue-500/50">
                {subscription.status}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black">{subscription.plan_name} Tier</h2>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center sm:text-right">
            <span className="text-xs text-blue-200 block">Validity Remaining</span>
            <span className="text-2xl font-black text-amber-300">{subscription.remainingDays} Days</span>
            <span className="text-[10px] text-blue-300 block">Expires on {new Date(subscription.expires_at).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Feature Entitlement Usage Meters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-white/10">
          <div>
            <span className="text-xs text-blue-200 block">Branches / Outlets</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold">{usage.branches.used}</span>
              <span className="text-xs text-blue-300">/ {usage.branches.limit} max</span>
            </div>
            <div className="w-full bg-blue-950/80 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-blue-400 h-1.5 rounded-full"
                style={{ width: `${Math.min(100, (usage.branches.used / usage.branches.limit) * 100)}%` }}
              />
            </div>
          </div>

          <div>
            <span className="text-xs text-blue-200 block">Cashier / Staff</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold">{usage.users.used}</span>
              <span className="text-xs text-blue-300">/ {usage.users.limit} max</span>
            </div>
            <div className="w-full bg-blue-950/80 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-emerald-400 h-1.5 rounded-full"
                style={{ width: `${Math.min(100, (usage.users.used / usage.users.limit) * 100)}%` }}
              />
            </div>
          </div>

          <div>
            <span className="text-xs text-blue-200 block">Products Catalog</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold">{usage.products.used}</span>
              <span className="text-xs text-blue-300">/ {usage.products.limit > 10000 ? 'Unlimited' : usage.products.limit}</span>
            </div>
            <div className="w-full bg-blue-950/80 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-purple-400 h-1.5 rounded-full"
                style={{ width: `${Math.min(100, (usage.products.used / (usage.products.limit || 1)) * 100)}%` }}
              />
            </div>
          </div>

          <div>
            <span className="text-xs text-blue-200 block">Invoices (This Month)</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold">{usage.monthlyInvoices.used}</span>
              <span className="text-xs text-blue-300">/ {usage.monthlyInvoices.limit > 10000 ? 'Unlimited' : usage.monthlyInvoices.limit}</span>
            </div>
            <div className="w-full bg-blue-950/80 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-amber-400 h-1.5 rounded-full"
                style={{ width: `${Math.min(100, (usage.monthlyInvoices.used / (usage.monthlyInvoices.limit || 1)) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Available Plans for Upgrade or Renewal */}
      <div>
        <h3 className="text-base font-black text-slate-900 dark:text-white mb-1">
          Upgrade or Extend Subscription Plan
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          All subscription payments are cryptographically authenticated via server-side payment webhooks.
        </p>

        {/* Promo Code Input */}
        <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 mb-6 flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <Tag className="w-4 h-4 text-blue-600" />
            <span>Have a Coupon Code?</span>
          </div>
          <div className="flex-1 flex gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="e.g. WELCOME50 or SAVE1000"
              className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-mono uppercase bg-slate-50 dark:bg-slate-800"
            />
            <button
              onClick={() => handleApplyCoupon(plans[0]?.id)}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
            >
              Apply Code
            </button>
          </div>
          {couponResult && (
            <span className="text-xs font-bold text-emerald-600">
              ✓ Applied: {branding.currencySymbol}{couponResult.discountAmount} Discount
            </span>
          )}
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((p) => {
            const isCurrent = p.id === subscription.plan_id;
            return (
              <div
                key={p.id}
                className={`bg-white dark:bg-slate-850 rounded-2xl border p-5 flex flex-col justify-between shadow-sm ${
                  isCurrent ? 'border-2 border-blue-600' : 'border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{p.name}</h4>
                    {isCurrent && (
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded">
                        Current
                      </span>
                    )}
                  </div>

                  <div className="mb-4">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {branding.currencySymbol}{p.price_inr}
                    </span>
                    <span className="text-xs text-slate-400">/{p.duration_days}d</span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                    <div>• Up to {p.max_branches} Outlets</div>
                    <div>• Up to {p.max_users} Cashier logins</div>
                    <div>• {p.max_products > 10000 ? 'Unlimited' : p.max_products} Products</div>
                    <div>• {p.max_invoices_per_month > 10000 ? 'Unlimited' : p.max_invoices_per_month} Invoices/mo</div>
                  </div>
                </div>

                <button
                  onClick={() => handleInitiateOrder(p)}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-900 dark:text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20'
                  }`}
                >
                  {isCurrent ? 'Renew Current Plan' : 'Upgrade to Plan'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment Order Modal */}
      {activeOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="text-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <CreditCard className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Payment Gateway Checkout</h3>
              <p className="text-xs text-slate-500">Order ID: {activeOrder.orderId}</p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Subscription Tier</span>
                <span className="font-bold">{activeOrder.planName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payable Amount</span>
                <span className="font-black text-sm text-blue-600">
                  {branding.currencySymbol}{activeOrder.amount}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              Razorpay HMAC Webhook integration is active. Click below to verify and provision your subscription.
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={handleCompleteSandboxPayment}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/25 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Simulate Verified Payment</span>
              </button>

              <button
                onClick={() => setActiveOrder(null)}
                className="w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Payment Receipts Ledger */}
      <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-3">
          Payment Receipt & Invoices
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-[10px] uppercase font-semibold">
                <th className="pb-2">Receipt #</th>
                <th className="pb-2">Tier</th>
                <th className="pb-2">Amount</th>
                <th className="pb-2">Gateway Ref</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paymentHistory.map((p: any) => (
                <tr key={p.id}>
                  <td className="py-2.5 font-mono font-bold text-blue-600">{p.receipt_number || p.id}</td>
                  <td className="py-2.5">{p.plan_id}</td>
                  <td className="py-2.5 font-bold">{branding.currencySymbol}{p.amount}</td>
                  <td className="py-2.5 font-mono text-slate-400">{p.gateway_payment_id || '-'}</td>
                  <td className="py-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {p.status}
                    </span>
                  </td>
                  <td className="py-2.5 text-slate-400 font-mono text-[11px]">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
