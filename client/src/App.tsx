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
import { AdminAuditLogs } from './pages/admin/AdminAuditLogs';
import { AdminStaff } from './pages/admin/AdminStaff';
import { AdminSoftwareUpdates } from './pages/admin/AdminSoftwareUpdates';
import { AdminCoupons } from './pages/admin/AdminCoupons';

// Shopkeeper Pages
import { ShopPOS } from './pages/shop/ShopPOS';
import { ShopExchange } from './pages/shop/ShopExchange';
import { ShopReturns } from './pages/shop/ShopReturns';
import { ShopStaff } from './pages/shop/ShopStaff';
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
import { ShopSoftwareDownload } from './pages/shop/ShopSoftwareDownload';
import { SoftwareTerminalLogin } from './pages/SoftwareTerminalLogin';

export const App: React.FC = () => {
  const { authType, isLoading, logout } = useAuth();
  const { branding, isLoading: brandingLoading } = useBranding();

  // Navigation states: Support desktop software launcher mode (?mode=software)
  const isSoftwareLauncher = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'software';
  const [publicView, setPublicView] = useState<'landing' | 'pricing' | 'demo' | 'login' | 'register' | 'terminal'>(
    isSoftwareLauncher ? 'terminal' : 'landing'
  );
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
        {adminTab === 'coupons' && <AdminCoupons />}
        {adminTab === 'payments' && <AdminPayments />}
        {adminTab === 'updates' && <AdminSoftwareUpdates />}
        {adminTab === 'staff' && <AdminStaff />}
        {adminTab === 'zoho' && <AdminZoho />}
        {adminTab === 'audit' && <AdminAuditLogs />}
        {adminTab === 'settings' && <AdminSettings />}
      </AdminLayout>
    );
  }

  // 2. SHOPKEEPER STORE BUSINESS EXPERIENCE
  if (authType === 'BUSINESS') {
    return (
      <ShopLayout currentTab={shopTab} setCurrentTab={setShopTab}>
        {shopTab === 'pos' && <ShopPOS />}
        {shopTab === 'exchange' && <ShopExchange />}
        {shopTab === 'returns' && <ShopReturns />}
        {shopTab === 'dashboard' && <ShopDashboard onNavigate={setShopTab} />}
        {shopTab === 'products' && <ShopProducts />}
        {shopTab === 'inventory' && <ShopInventory />}
        {shopTab === 'purchases' && <ShopPurchases />}
        {shopTab === 'customers' && <ShopCustomers />}
        {shopTab === 'staff' && <ShopStaff />}
        {shopTab === 'cash-register' && <ShopCashRegister />}
        {shopTab === 'expenses' && <ShopExpenses />}
        {shopTab === 'reports' && <ShopReports />}
        {shopTab === 'subscription' && <ShopSubscription />}
        {shopTab === 'software-download' && (
          <ShopSoftwareDownload
            onNavigateToPricing={() => setShopTab('subscription')}
            onLaunchTerminal={() => {
              logout();
              setPublicView('terminal');
            }}
          />
        )}
        {shopTab === 'support' && <ShopSupport />}
        {shopTab === 'settings' && <ShopSettings />}
      </ShopLayout>
    );
  }

  // Dedicated In-Store Desktop Terminal View (Unified 6-digit PIN login for Shopkeeper, Manager, Cashier)
  if (publicView === 'terminal') {
    return <SoftwareTerminalLogin onExitTerminal={() => setPublicView('landing')} />;
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
