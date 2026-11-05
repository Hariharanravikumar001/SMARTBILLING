import React from 'react';
import { Check, Sparkles, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { useBranding } from '../context/BrandingContext';

interface PricingPageProps {
  onNavigate: (view: string) => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({ onNavigate }) => {
  const { branding, plans } = useBranding();

  return (
    <div className="py-16 bg-slate-50 dark:bg-slate-950 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Risk-Free 14-Day Full Access Trial</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            Transparent, Predictable Pricing
          </h1>
          <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-300">
            Choose the subscription tier tailored to your shop or multi-branch enterprise. All plans include 14 days of free trial with zero payment required upfront.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const isPopular = plan.is_popular;
            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl p-6 flex flex-col justify-between transition-all duration-200 ${
                  isPopular
                    ? 'bg-white dark:bg-slate-800 border-2 border-blue-600 shadow-xl shadow-blue-500/10 transform lg:-translate-y-2'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:shadow-lg'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full shadow-md">
                    Most Popular
                  </div>
                )}

                <div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-white">{plan.name}</h3>
                  <p className="text-xs text-slate-500 capitalize mb-4">
                    Billed {plan.billing_interval.toLowerCase().replace('_', ' ')}
                  </p>

                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
                      {branding.currencySymbol}{plan.price_inr}
                    </span>
                    {plan.original_price_inr && (
                      <span className="text-xs text-slate-400 line-through">
                        {branding.currencySymbol}{plan.original_price_inr}
                      </span>
                    )}
                    <span className="text-xs text-slate-500">/{plan.duration_days}d</span>
                  </div>

                  {/* Plan Limits Highlights */}
                  <div className="space-y-2.5 pb-6 border-b border-slate-100 dark:border-slate-800 mb-6 text-xs text-slate-700 dark:text-slate-200">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-500">Store Branches</span>
                      <span className="font-bold">{plan.max_branches}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-500">Staff Logins</span>
                      <span className="font-bold">{plan.max_users}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-500">Product Catalog</span>
                      <span className="font-bold">{plan.max_products > 100000 ? 'Unlimited' : plan.max_products.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-500">Monthly Invoices</span>
                      <span className="font-bold">{plan.max_invoices_per_month > 100000 ? 'Unlimited' : plan.max_invoices_per_month.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-2.5 mb-8">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Features Included</p>
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <button
                    onClick={() => onNavigate('register')}
                    className={`w-full py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      isPopular
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white'
                    }`}
                  >
                    <span>Start 14-Day Free Trial</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <p className="text-[10px] text-center text-slate-400 mt-2">No credit card required upfront</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Enterprise Callout */}
        <div className="mt-16 bg-gradient-to-r from-blue-900 to-indigo-950 rounded-3xl p-8 sm:p-10 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-800 text-blue-200 text-xs font-semibold mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Multi-Outlet Chain / Custom ERP</span>
            </div>
            <h3 className="text-2xl font-black">Need a Custom Multi-Location Deployment?</h3>
            <p className="text-xs sm:text-sm text-blue-200 mt-1 max-w-xl">
              Custom catalog migrations, warehouse sync, dedicated SLA, custom thermal receipt templates, and personal account management.
            </p>
          </div>
          <button
            onClick={() => onNavigate('demo')}
            className="px-6 py-3 bg-white text-blue-900 hover:bg-blue-50 rounded-xl text-xs font-extrabold shadow-md transition-all flex-shrink-0"
          >
            Talk to SaaS Architect
          </button>
        </div>
      </div>
    </div>
  );
};
