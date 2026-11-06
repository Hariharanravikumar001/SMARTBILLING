import React, { useState, useEffect } from 'react';
import {
  Download,
  Monitor,
  CheckCircle2,
  AlertCircle,
  FileCode,
  ShieldCheck,
  Zap,
  ArrowRight,
  ExternalLink,
  Laptop,
  Terminal,
  Smartphone,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';
import { api } from '../../services/api';

interface ShopSoftwareDownloadProps {
  onNavigateToPricing?: () => void;
  onLaunchTerminal?: () => void;
}

export const ShopSoftwareDownload: React.FC<ShopSoftwareDownloadProps> = ({
  onNavigateToPricing,
  onLaunchTerminal
}) => {
  const { business, businessUser } = useAuth();
  const token = typeof window !== 'undefined' ? localStorage.getItem('ub_auth_token') : null;
  const { branding } = useBranding();

  const [downloadInfo, setDownloadInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDownloadInfo = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res: any = await api.get('/software/download-info');
        if (res.success) {
          setDownloadInfo(res);
        } else {
          setError(res.message || 'Failed to retrieve download package information.');
        }
      } catch (err: any) {
        setError(err.message || 'Error communicating with server.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDownloadInfo();
  }, []);

  const handleDownloadClick = () => {
    if (!token) return;
    const downloadUrl = `/api/software/download?token=${encodeURIComponent(token)}`;
    window.location.href = downloadUrl;
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
        <p className="text-xs">Checking software license & download availability...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-[11px] uppercase tracking-wider font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-900/40">
            Shopkeeper Software Center
          </span>
          <h1 className="text-xl font-black text-slate-900 dark:text-white mt-2">
            Download Desktop POS Software
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Download and install the native in-store POS application on your store computers and cashier terminals.
          </p>
        </div>

        {onLaunchTerminal && (
          <button
            onClick={onLaunchTerminal}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>Launch Terminal in Browser</span>
          </button>
        )}
      </div>

      {/* Subscription Paywall State if not eligible */}
      {downloadInfo && !downloadInfo.eligible ? (
        <div className="p-8 rounded-3xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-center max-w-xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto font-black text-lg">
            !
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Active Subscription Required to Download
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {downloadInfo.message || 'Please activate a subscription plan to download and license the Universal Billing Desktop POS Software for your store.'}
          </p>
          {onNavigateToPricing && (
            <button
              onClick={onNavigateToPricing}
              className="py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-2"
            >
              <span>View Subscription Plans & Pay</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        /* Eligible & Ready to Download */
        <div className="space-y-6">
          {/* Main Download Card */}
          <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10 max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold backdrop-blur-sm border border-white/20">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Licensed to: {business?.name || 'Your Store'} (Active Subscription)</span>
              </div>

              <h2 className="text-2xl font-black tracking-tight">
                Universal Billing POS Desktop Suite v1.0.0
              </h2>

              <p className="text-xs text-blue-100 leading-relaxed">
                Includes the complete standalone in-store terminal suite with support for 58mm/80mm ESC/POS thermal printers, USB handheld barcode scanners, electronic cash drawers, offline bill caching, and 6-digit PIN authentication.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={handleDownloadClick}
                  className="py-3.5 px-6 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/30 flex items-center gap-2 transition-transform active:scale-95"
                >
                  <Download className="w-4 h-4 text-slate-950 stroke-[3]" />
                  <span>Download Software (.ZIP / .EXE Setup)</span>
                </button>

                <div className="text-[11px] text-blue-200">
                  <span className="font-semibold text-white">Size:</span> 4.8 MB &bull; <span className="font-semibold text-white">OS:</span> Windows 10/11, macOS, Linux
                </div>
              </div>
            </div>
          </div>

          {/* Quick 3-Step Setup Instructions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h3 className="font-bold text-xs text-slate-900 dark:text-white">Download & Extract</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Click the download button above. Extract the downloaded ZIP file to your computer (e.g. <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[10px]">C:\UniversalBillingPOS</code>).
              </p>
            </div>

            <div className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h3 className="font-bold text-xs text-slate-900 dark:text-white">Create Desktop Shortcut</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Double-click <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[10px]">Create-Desktop-Shortcut.vbs</code> or run <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[10px]">UniversalBillingPOS.bat</code> to place the app on your desktop.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h3 className="font-bold text-xs text-slate-900 dark:text-white">Login with 6-Digit PIN</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Open the software on your counter terminal. Cashiers, Managers, and Store Owners sign in using their Name and 6-digit PIN.
              </p>
            </div>
          </div>

          {/* Software Role Breakdown */}
          <div className="bg-white dark:bg-slate-850 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
              Role-Separated Dashboards Inside The Desktop Software
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <span className="font-bold text-blue-600 dark:text-blue-400 text-[11px]">CASHIER DASHBOARD</span>
                <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                  Fast barcode billing, exchanges, returns, cash register opening/closing, missing customer quick-add. Restricted from store settings & profits.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <span className="font-bold text-purple-600 dark:text-purple-400 text-[11px]">MANAGER DASHBOARD</span>
                <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                  All cashier features plus inventory adjustments, stock receipts from suppliers, drawer audit trail, daily store sales & returns reports.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">SHOPKEEPER (OWNER)</span>
                <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                  Complete master control: Gross margins & profit/loss, staff creation & 6-digit PIN resets, GST/tax settings, hardware printer configuration.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
