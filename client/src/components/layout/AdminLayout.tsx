import React from 'react';
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Layers,
  FileCode2,
  Users2,
  Settings,
  HelpCircle,
  FileSpreadsheet,
  Ticket,
  LogOut,
  ShieldCheck,
  Activity,
  Sparkles,
  Download
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';
import { InstallAppModal } from '../common/InstallAppModal';

interface AdminLayoutProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentTab,
  setCurrentTab,
  children
}) => {
  const { platformUser, logout } = useAuth();
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
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'businesses', label: 'Businesses', icon: Building2 },
    { id: 'plans', label: 'Subscription Plans', icon: Layers },
    { id: 'coupons', label: 'Coupons & Promo', icon: Ticket },
    { id: 'payments', label: 'Payment Gateway', icon: CreditCard },
    { id: 'updates', label: 'Software Updates', icon: FileCode2 },
    { id: 'staff', label: 'Platform Staff', icon: Users2 },
    { id: 'zoho', label: 'Zoho CRM & Desk', icon: HelpCircle },
    { id: 'audit', label: 'Audit Logs', icon: FileSpreadsheet },
    { id: 'settings', label: 'Platform Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-900 overflow-hidden font-sans">
      {/* Super Admin Dark Sidebar */}
      <aside className="w-64 bg-slate-950 text-slate-300 flex flex-col border-r border-slate-800 flex-shrink-0">
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-white text-sm tracking-tight leading-tight">
              {branding.appName}
            </h1>
            <span className="text-[10px] uppercase font-semibold text-blue-400 tracking-wider bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-800/50">
              Super Admin
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between">
            <div className="truncate mr-2">
              <p className="text-xs font-semibold text-slate-200 truncate">{platformUser?.name}</p>
              <p className="text-[11px] text-slate-400 truncate">{platformUser?.role}</p>
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
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-800 dark:text-white capitalize">
              {currentTab.replace('-', ' ')}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (deferredPrompt) {
                  triggerInstallPrompt();
                } else {
                  setShowInstallModal(true);
                }
              }}
              title="Download Desktop App"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Desktop App</span>
            </button>

            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-full text-xs font-medium">
              <Activity className="w-3.5 h-3.5 animate-pulse text-emerald-500" />
              <span>Production Engine Online</span>
            </div>
          </div>
        </header>

        {/* View Content */}
        <main className="flex-1 overflow-y-auto p-6">
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
