import React, { useState } from 'react';
import {
  ShoppingCart,
  RefreshCw,
  Boxes,
  Zap,
  Shield,
  CreditCard,
  Building,
  CheckCircle2,
  Printer,
  Sparkles,
  ArrowRight,
  Send
} from 'lucide-react';
import { useBranding } from '../context/BrandingContext';
import { api } from '../services/api';

interface LandingPageProps {
  onNavigate: (view: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const { branding, plans } = useBranding();
  const [demoForm, setDemoForm] = useState({
    name: '',
    email: '',
    phone: '',
    businessName: '',
    industry: 'retail',
    notes: ''
  });
  const [demoStatus, setDemoStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setDemoStatus(null);

    try {
      const res: any = await api.post('/zoho/demo-request', demoForm);
      if (res.success) {
        setDemoStatus('SUCCESS');
        setDemoForm({ name: '', email: '', phone: '', businessName: '', industry: 'retail', notes: '' });
      }
    } catch (err: any) {
      setDemoStatus('ERROR');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 bg-gradient-to-b from-blue-50/60 via-white to-slate-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 border-b border-slate-200/70 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100/80 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Next-Generation Universal Billing & POS SaaS Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-tight max-w-4xl mx-auto">
            Universal Billing, POS, Inventory & <span className="text-blue-600">Business ERP</span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Engineered for modern retail, apparel, electronics, and supermarkets. Featuring ultra-fast POS barcode checkout, a dedicated product exchange engine, multi-branch inventory, and integrated Zoho CRM & Desk support.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => onNavigate('register')}
              className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/25 flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
            >
              <span>Start 14-Day Free Trial</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('login')}
              className="px-6 py-3.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold shadow-sm transition-all"
            >
              Explore Live Demo
            </button>
          </div>

          {/* Quick Stats Bar */}
          <div className="mt-14 pt-8 border-t border-slate-200/80 dark:border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">&lt; 0.5s</p>
              <p className="text-xs text-slate-500">POS Checkout Latency</p>
            </div>
            <div>
              <p className="text-2xl font-black text-blue-600">100%</p>
              <p className="text-xs text-slate-500">ACID Stock Consistency</p>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">58mm & 80mm</p>
              <p className="text-xs text-slate-500">Thermal + A4 Invoices</p>
            </div>
            <div>
              <p className="text-2xl font-black text-emerald-600">PWA Ready</p>
              <p className="text-xs text-slate-500">Offline POS Mode</p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Architectural Pillars */}
      <section className="py-16 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs font-bold text-blue-600 uppercase tracking-widest">Built For Operational Excellence</h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
              Everything Your Shop & SaaS Business Demands
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">High-Speed POS Billing</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Barcode scanning, keyboard shortcuts, GST breakdown (CGST, SGST, IGST), hold & resume carts, split payments (Cash + UPI), and instant 80mm thermal receipt printing.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
                <RefreshCw className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">Dedicated Product Exchange</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                A separate exchange engine that searches original invoices, calculates price differential, auto-restocks or quarantines defective items, and updates cash drawers atomically.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
                <Boxes className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">Multi-Branch Inventory & ERP</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Track variants (size/color), stock valuation, branch-to-branch transfers, supplier purchases with automated stock-in, and low-stock alerts.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">Zoho CRM & Desk Integration</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Automatic demo lead sync to central Zoho CRM and integrated in-app Helpdesk ticketing powered by Zoho Desk with resolution ratings.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">Configurable SaaS Subscriptions</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Super Admin control over Monthly ₹499, Quarterly ₹1,399, Half-Yearly ₹2,599, and Yearly ₹4,999 plans, verified Razorpay/Cashfree webhooks, and server-side entitlement guards.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-4">
                <Printer className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">Hardware & Printing Ready</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Native support for ESC/POS USB & Bluetooth thermal printers (58mm / 80mm), USB barcode scanners, cash drawers, and A4 GST tax invoices.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Request / Contact Lead Capture Form */}
      <section className="py-16 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-10 shadow-xl border border-slate-200/80 dark:border-slate-800">
            <div className="text-center mb-8">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Connect With SaaS Specialists</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                Schedule a Tailored Demonstration
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-2">
                Inquiries are automatically synchronized to our central Zoho CRM pipeline.
              </p>
            </div>

            {demoStatus === 'SUCCESS' && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Demo inquiry received and logged into Zoho CRM! Our solutions engineer will contact you shortly.</span>
              </div>
            )}

            <form onSubmit={handleDemoSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Your Full Name</label>
                  <input
                    type="text"
                    required
                    value={demoForm.name}
                    onChange={(e) => setDemoForm({ ...demoForm, name: e.target.value })}
                    placeholder="e.g. Ramesh Varma"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Business / Store Name</label>
                  <input
                    type="text"
                    required
                    value={demoForm.businessName}
                    onChange={(e) => setDemoForm({ ...demoForm, businessName: e.target.value })}
                    placeholder="e.g. Metro Superstores"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Work Email</label>
                  <input
                    type="email"
                    required
                    value={demoForm.email}
                    onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })}
                    placeholder="ramesh@metro.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={demoForm.phone}
                    onChange={(e) => setDemoForm({ ...demoForm, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Retail Sector</label>
                  <select
                    value={demoForm.industry}
                    onChange={(e) => setDemoForm({ ...demoForm, industry: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="clothing">Apparel & Footwear</option>
                    <option value="grocery">Grocery & Supermarket</option>
                    <option value="electronics">Electronics & Mobile</option>
                    <option value="hardware">Hardware & Materials</option>
                    <option value="restaurant">Restaurant & Café</option>
                    <option value="pharmacy">Pharmacy & Health</option>
                    <option value="retail">General Retail</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Specific Requirements (Optional)</label>
                <textarea
                  rows={2}
                  value={demoForm.notes}
                  onChange={(e) => setDemoForm({ ...demoForm, notes: e.target.value })}
                  placeholder="e.g. Need 4 POS billing counters, thermal printing & inventory sync across 2 warehouses."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 text-center">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/25 inline-flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Syncing with Zoho CRM...' : 'Request Personalized Demo'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};
