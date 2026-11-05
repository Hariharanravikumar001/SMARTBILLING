import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { useBranding } from './context/BrandingContext';

// Layouts
import { AdminLayout } from './components/layout/AdminLayout';
import { ShopLayout } from './components/layout/ShopLayout';
import { PublicLayout } from './components/layout/PublicLayout';

// Public Pages
import { LandingPage } from './pages/LandingPage';
import { PricingPage } from './pages/PricingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

// Super Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminBusinesses } from './pages/admin/AdminBusinesses';
import { AdminPlans } from './pages/admin/AdminPlans';
import { AdminPayments } from './pages/admin/AdminPayments';
import { AdminSettings } from './pages/admin/AdminSettings';
import { AdminZoho } from './pages/admin/AdminZoho';

// Shopkeeper Pages
import { ShopPOS } from './pages/shop/ShopPOS';
import { ShopExchange } from './pages/shop/ShopExchange';
import { ShopDashboard } from './pages/shop/ShopDashboard';
import { ShopProducts } from './pages/shop/ShopProducts';
import { ShopInventory } from './pages/shop/ShopInventory';
import { ShopPurchases } from './pages/shop/ShopPurchases';
import { ShopCustomers } from './pages/shop/ShopCustomers';
import { ShopCashRegister } from './pages/shop/ShopCashRegister';
import { ShopExpenses } from './pages/shop/ShopExpenses';
import { ShopReports } from './pages/shop/ShopReports';
import { ShopSubscription } from './pages/shop/ShopSubscription';
import { ShopSupport } from './pages/shop/ShopSupport';
import { ShopSettings } from './pages/shop/ShopSettings';

export const App: React.FC = () => {
  const { authType, isLoading } = useAuth();
  const { branding, isLoading: brandingLoading } = useBranding();

  // Navigation states
  const [publicView, setPublicView] = useState<'landing' | 'pricing' | 'demo' | 'login' | 'register'>('landing');
  const [adminTab, setAdminTab] = useState<string>('dashboard');
  const [shopTab, setShopTab] = useState<string>('pos');

  if (isLoading || brandingLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-xl animate-pulse mb-3">
          UB
        </div>
        <p className="text-xs text-slate-400 font-mono">Initializing SaaS Platform Engine...</p>
      </div>
    );
  }

  // 1. SUPER ADMIN PLATFORM EXPERIENCE
  if (authType === 'PLATFORM') {
    return (
      <AdminLayout currentTab={adminTab} setCurrentTab={setAdminTab}>
        {adminTab === 'dashboard' && <AdminDashboard />}
        {adminTab === 'businesses' && <AdminBusinesses />}
        {adminTab === 'plans' && <AdminPlans />}
        {adminTab === 'payments' && <AdminPayments />}
        {adminTab === 'settings' && <AdminSettings />}
        {adminTab === 'zoho' && <AdminZoho />}
        {adminTab === 'updates' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Software Versions & Feature Flags</h2>
            <div className="p-4 bg-white dark:bg-slate-850 rounded-2xl border text-xs">
              Current Production Version: <span className="font-mono font-bold text-blue-600">v1.0.0-PROD</span>
              <p className="text-slate-400 mt-1">Multi-tenant isolation, Dedicated Product Exchange, and Zoho adapters are live.</p>
            </div>
          </div>
        )}
        {adminTab === 'staff' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Platform Staff & Roles</h2>
            <div className="p-4 bg-white dark:bg-slate-850 rounded-2xl border text-xs">
              Roles: Super Admin, Platform Administrator, Technical Administrator, DevOps, Finance Lead.
            </div>
          </div>
        )}
        {adminTab === 'audit' && <AdminDashboard />}
      </AdminLayout>
    );
  }

  // 2. SHOPKEEPER STORE BUSINESS EXPERIENCE
  if (authType === 'BUSINESS') {
    return (
      <ShopLayout currentTab={shopTab} setCurrentTab={setShopTab}>
        {shopTab === 'pos' && <ShopPOS />}
        {shopTab === 'exchange' && <ShopExchange />}
        {shopTab === 'dashboard' && <ShopDashboard onNavigate={setShopTab} />}
        {shopTab === 'products' && <ShopProducts />}
        {shopTab === 'inventory' && <ShopInventory />}
        {shopTab === 'purchases' && <ShopPurchases />}
        {shopTab === 'customers' && <ShopCustomers />}
        {shopTab === 'cash-register' && <ShopCashRegister />}
        {shopTab === 'expenses' && <ShopExpenses />}
        {shopTab === 'reports' && <ShopReports />}
        {shopTab === 'subscription' && <ShopSubscription />}
        {shopTab === 'support' && <ShopSupport />}
        {shopTab === 'settings' && <ShopSettings />}
      </ShopLayout>
    );
  }

  // 3. PUBLIC SAAS PORTAL & SIGNUP / LOGIN
  return (
    <PublicLayout currentView={publicView} setCurrentView={setPublicView as any}>
      {publicView === 'landing' && <LandingPage onNavigate={setPublicView as any} />}
      {publicView === 'pricing' && <PricingPage onNavigate={setPublicView as any} />}
      {publicView === 'demo' && <LandingPage onNavigate={setPublicView as any} />}
      {publicView === 'login' && <LoginPage onNavigate={setPublicView as any} />}
      {publicView === 'register' && <RegisterPage onNavigate={setPublicView as any} />}
    </PublicLayout>
  );
};
export default App;
