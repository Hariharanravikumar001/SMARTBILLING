import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  RefreshCw,
  Package,
  Boxes,
  Truck,
  Users,
  Wallet,
  Receipt,
  BarChart3,
  CreditCard,
  LifeBuoy,
  Settings,
  LogOut,
  Building,
  Store,
  Clock,
  RotateCcw,
  UserCheck,
  Sparkles,
  Download
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';
import { InstallAppModal } from '../common/InstallAppModal';

interface ShopLayoutProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  children: React.ReactNode;
  hasOpenShift?: boolean;
}

export const ShopLayout: React.FC<ShopLayoutProps> = ({
  currentTab,
  setCurrentTab,
  children,
  hasOpenShift = true
}) => {
  const { business, businessUser, branches, activeBranch, setActiveBranch, logout } = useAuth();
  const { branding } = useBranding();
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [showInstallModal, setShowInstallModal] = React.useState(false);

  React.useEffect(() => {
    const handlePrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handlePrompt);
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt);
  }, []);

  const triggerInstallPrompt = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  const navItems = [
    { id: 'pos', label: 'POS Billing', icon: ShoppingCart, highlight: true },
    { id: 'exchange', label: 'Product Exchange', icon: RefreshCw, badge: 'Dedicated' },
    { id: 'returns', label: 'Sales Returns', icon: RotateCcw },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Products & Catalog', icon: Package },
    { id: 'inventory', label: 'Inventory & Stock', icon: Boxes },
    { id: 'purchases', label: 'Purchases & Suppliers', icon: Truck },
    { id: 'customers', label: 'Customers & Loyalty', icon: Users },
    { id: 'staff', label: 'Staff & Cashiers', icon: UserCheck },
    { id: 'cash-register', label: 'Cash Register & Shifts', icon: Wallet },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'reports', label: 'Reports & P&L', icon: BarChart3 },
    { id: 'subscription', label: 'My Subscription', icon: CreditCard },
    { id: 'support', label: 'Help & Support', icon: LifeBuoy },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden font-sans">
      {/* Shopkeeper Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 flex-shrink-0">
        {/* Store Title & Branch Selector */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow">
              <Store className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-bold text-white text-sm truncate leading-tight">
                {business?.name || branding.appName}
              </h1>
              <p className="text-[11px] text-slate-400 capitalize">{business?.industry_type || 'Retail'} Store</p>
            </div>
          </div>

          {/* Branch Dropdown */}
          {branches.length > 0 && (
            <div className="mt-2">
              <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
                <Building className="w-3 h-3" /> Branch
              </label>
              <select
                value={activeBranch?.id || ''}
                onChange={(e) => {
                  const target = branches.find(b => b.id === e.target.value);
                  if (target) setActiveBranch(target);
                }}
                className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.is_main ? '(Main)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : item.highlight
                    ? 'text-blue-300 hover:text-white hover:bg-blue-900/40 bg-blue-950/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Install Desktop POS App Button in Sidebar */}
        <div className="p-3 border-t border-slate-800">
          <button
            onClick={() => {
              if (deferredPrompt) {
                triggerInstallPrompt();
              } else {
                setShowInstallModal(true);
              }
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-800 hover:bg-slate-700/80 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold transition-all shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install Desktop App</span>
          </button>
        </div>

        {/* Shift & User Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/70">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${hasOpenShift ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-[11px] font-medium text-slate-300">
                {hasOpenShift ? 'Shift Open' : 'Shift Closed'}
              </span>
            </div>
            <span className="text-[10px] font-semibold text-blue-400 bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-900/50">
              {businessUser?.role}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="truncate mr-2">
              <p className="text-xs font-semibold text-white truncate">{businessUser?.name}</p>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-14 bg-white dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-slate-800 dark:text-white capitalize">
              {currentTab === 'pos' ? 'Point of Sale' : currentTab.replace('-', ' ')}
            </h2>
            <span className="text-xs text-slate-400 font-medium">| {activeBranch?.name}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span>{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            </div>

            <button
              onClick={() => {
                if (deferredPrompt) {
                  triggerInstallPrompt();
                } else {
                  setShowInstallModal(true);
                }
              }}
              title="Download Desktop & POS App"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Desktop App</span>
            </button>

            <button
              onClick={() => setCurrentTab('subscription')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs font-medium shadow-sm hover:opacity-95 transition-opacity"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Plan Status</span>
            </button>
          </div>
        </header>

        {/* View Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>

      {/* Install App Guidance Modal */}
      <InstallAppModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        deferredPrompt={deferredPrompt}
        onInstallPrompt={triggerInstallPrompt}
      />
    </div>
  );
};
