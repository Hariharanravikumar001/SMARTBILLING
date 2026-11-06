import React, { useState } from 'react';
import {
  ShieldCheck,
  Store,
  KeyRound,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { api } from '../services/api';

interface LoginPageProps {
  onNavigate: (view: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { loginPlatform, loginBusiness } = useAuth();
  const { branding } = useBranding();

  const [activeTab, setActiveTab] = useState<'SHOP' | 'ADMIN'>('SHOP');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (activeTab === 'ADMIN') {
        const res: any = await api.post('/auth/platform/login', { email, password });
        if (res.success && res.token && res.user) {
          loginPlatform(res.token, res.user);
        } else {
          setError(res.message || 'Platform login failed.');
        }
      } else if (activeTab === 'SHOP') {
        const res: any = await api.post('/auth/business/login', { email, password });
        if (res.success && res.token && res.user && res.business) {
          loginBusiness(res.token, res.user, res.business, res.branches || []);
        } else {
          setError(res.message || 'Business login failed.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Network error occurred. Please check server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/25 mb-3">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Sign in to {branding.appName}
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Access your Shop POS terminal or Central SaaS administration
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 shadow-xl rounded-3xl border border-slate-200/80 dark:border-slate-800 sm:px-10">
          {/* Mode Switcher Tabs (Website: Shopkeeper & Super Admin only) */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6 text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setActiveTab('SHOP'); setError(null); }}
              className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'SHOP'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Shopkeeper Portal</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('ADMIN'); setError(null); }}
              className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'ADMIN'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Super Admin</span>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {activeTab === 'ADMIN' ? 'Platform Administrator Email' : 'Shopkeeper Business Email'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={activeTab === 'ADMIN' ? 'admin@universalbilling.io' : 'owner@apex.com'}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <span>{isLoading ? 'Verifying Credentials...' : 'Authenticate & Enter'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Cashier / Manager Notice */}
          <div className="mt-5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-center">
            <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
              Cashier & Store Staff Login
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Cashiers and Managers log in exclusively inside the downloaded Desktop POS Software using their Name and 6-digit PIN.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('terminal')}
              className="mt-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
            >
              Launch Desktop Software Terminal &rarr;
            </button>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-500">
              New store?{' '}
              <button
                type="button"
                onClick={() => onNavigate('register')}
                className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
              >
                Register store & get software
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
