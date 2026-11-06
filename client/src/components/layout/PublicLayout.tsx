import React from 'react';
import { ShieldCheck, ArrowRight, Phone, Mail, Sparkles, Monitor } from 'lucide-react';
import { useBranding } from '../../context/BrandingContext';

interface PublicLayoutProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  children: React.ReactNode;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({
  currentView,
  setCurrentView,
  children
}) => {
  const { branding } = useBranding();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100">
      {/* SaaS Public Header */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => setCurrentView('landing')}
          >
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-lg text-slate-900 dark:text-white tracking-tight leading-none block">
                {branding.appName}
              </span>
              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 tracking-wider uppercase">
                Universal POS & ERP Platform
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <button
              onClick={() => setCurrentView('landing')}
              className={`hover:text-blue-600 transition-colors ${currentView === 'landing' ? 'text-blue-600 font-semibold' : 'text-slate-600 dark:text-slate-300'}`}
            >
              Overview
            </button>
            <button
              onClick={() => setCurrentView('pricing')}
              className={`hover:text-blue-600 transition-colors ${currentView === 'pricing' ? 'text-blue-600 font-semibold' : 'text-slate-600 dark:text-slate-300'}`}
            >
              Pricing & Plans
            </button>
            <button
              onClick={() => setCurrentView('demo')}
              className={`hover:text-blue-600 transition-colors ${currentView === 'demo' ? 'text-blue-600 font-semibold' : 'text-slate-600 dark:text-slate-300'}`}
            >
              Request Demo
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentView('terminal')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>POS Terminal</span>
            </button>

            <button
              onClick={() => setCurrentView('login')}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-white transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => setCurrentView('register')}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <span>14-Day Free Trial</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Public Page View */}
      <main className="flex-1">
        {children}
      </main>

      {/* SaaS Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-10 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="font-bold text-white text-sm">{branding.appName}</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed mb-3">
              Production multi-tenant SaaS billing, high-speed POS, dedicated product exchanges, and inventory intelligence.
            </p>
            <p className="text-slate-500 text-[11px]">© {new Date().getFullYear()} {branding.companyName}. All rights reserved.</p>
          </div>

          <div>
            <h4 className="text-white font-semibold text-xs mb-3">Industry Solutions</h4>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li>Apparel & Footwear (Variants & Exchanges)</li>
              <li>Supermarket & Grocery (Weighing Scales)</li>
              <li>Electronics & Mobile (Serial & IMEI)</li>
              <li>Hardware & Material Stores</li>
              <li>Pharmacies & Medical Stores</li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-xs mb-3">SaaS Architecture</h4>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li>Zoho Catalyst Serverless Function</li>
              <li>Transactional ACID Database Engine</li>
              <li>HMAC Payment Webhook Guard</li>
              <li>Zoho CRM & Zoho Desk Integration</li>
              <li>Responsive Offline PWA</li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-xs mb-3">Get in Touch</h4>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-blue-400" />
                <span>{branding.supportEmail}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-blue-400" />
                <span>{branding.supportPhone}</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
