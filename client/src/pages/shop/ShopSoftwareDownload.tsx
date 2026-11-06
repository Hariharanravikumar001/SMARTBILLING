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
  RefreshCw,
  HardDrive,
  Usb,
  Printer
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
          setError(res.message || 'Failed to retrieve software download information.');
        }
      } catch (err: any) {
        setError(err.message || 'Error communicating with server.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDownloadInfo();
  }, []);

  const handleDownload = (editionId: string) => {
    if (!token) return;
    window.location.href = `/api/software/download?type=${editionId}&token=${encodeURIComponent(token)}`;
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
        <p className="text-xs">Verifying subscription license & preparing software packages...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-[11px] uppercase tracking-wider font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-900/40">
            Store Owner Software Center
          </span>
          <h1 className="text-xl font-black text-slate-900 dark:text-white mt-2">
            Download In-Store Desktop POS Software
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Select the software distribution required for your billing counters, cashier PCs, or mobile handheld POS terminals.
          </p>
        </div>

        {onLaunchTerminal && (
          <button
            onClick={onLaunchTerminal}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>Launch POS Simulator</span>
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
            Active Store Subscription Required
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {downloadInfo.message || 'Please activate or renew your subscription plan to download and license the Universal Billing Desktop POS Software for your store.'}
          </p>
          {onNavigateToPricing && (
            <button
              onClick={onNavigateToPricing}
              className="py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-2"
            >
              <span>View Plans & Complete Payment</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        /* Eligible & Ready to Download Multi-Edition Matrix */
        <div className="space-y-6">
          {/* License Status Header Bar */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-5 rounded-2xl text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white backdrop-blur-sm">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-bold leading-tight">Licensed Store: {business?.name || 'Your Store'}</p>
                <p className="text-[11px] text-blue-200">
                  Store Code: <strong className="font-mono text-white">{business?.slug || 'apex-retail'}</strong> &bull; Status: <span className="text-emerald-400 font-bold">Active Enterprise Subscription</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-blue-200">Default Terminal PIN:</span>
              <span className="font-mono font-bold bg-white/10 px-2 py-1 rounded text-xs text-emerald-400">123456</span>
            </div>
          </div>

          {/* Software Editions Matrix */}
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
              Available Software Editions for Your Counter Setup
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. Windows Installer */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4 hover:border-blue-500/50 transition-all">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <Monitor className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">Windows Desktop POS</h3>
                        <p className="text-[11px] text-slate-400">Windows 10 / 11 (64-bit)</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                      Recommended
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Full installer with automated desktop shortcut creation, direct driver pairing for 58mm/80mm ESC/POS thermal printers, USB barcode scanners, and cash drawers.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Package: .ZIP / Setup (4.8 MB)</span>
                  <button
                    onClick={() => handleDownload('windows-installer')}
                    className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-transform active:scale-95 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Windows Installer</span>
                  </button>
                </div>
              </div>

              {/* 2. Windows Portable */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4 hover:border-purple-500/50 transition-all">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                        <HardDrive className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">Windows Portable Edition</h3>
                        <p className="text-[11px] text-slate-400">Windows 7 / 8 / 10 / 11</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-900">
                      Zero Install
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Zero-installation required. Extract and run directly from a USB flash drive or counter desktop folder without requiring Windows administrator permissions.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Package: .ZIP Standalone (3.2 MB)</span>
                  <button
                    onClick={() => handleDownload('windows-portable')}
                    className="py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-transform active:scale-95 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Portable Edition</span>
                  </button>
                </div>
              </div>

              {/* 3. macOS Desktop */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4 hover:border-slate-500/50 transition-all">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                        <Laptop className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">macOS Desktop Terminal</h3>
                        <p className="text-[11px] text-slate-400">macOS Sonoma / Ventura (Universal)</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      Apple Silicon & Intel
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Native macOS binary tailored for Mac Mini, iMac, or MacBook counter billing with AirPrint, Bluetooth thermal receipt printers, and USB scanner support.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Package: .ZIP / macOS (5.1 MB)</span>
                  <button
                    onClick={() => handleDownload('macos')}
                    className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-xs transition-transform active:scale-95 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download macOS Suite</span>
                  </button>
                </div>
              </div>

              {/* 4. Android Smart POS */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4 hover:border-emerald-500/50 transition-all">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">Android Smart POS Package</h3>
                        <p className="text-[11px] text-slate-400">Sunmi / iMin / PAX / Android Tablets</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                      Handheld POS
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Designed for handheld Android POS hardware with integrated 58mm thermal printers, camera barcode scanning, touch billing, and full offline caching.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Package: .ZIP / Setup (2.9 MB)</span>
                  <button
                    onClick={() => handleDownload('android')}
                    className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-transform active:scale-95 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Android Package</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Hardware Checklist */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="font-bold text-xs text-slate-800 dark:text-white flex items-center gap-2">
              <Printer className="w-4 h-4 text-blue-500" />
              <span>Certified Retail Hardware & Peripherals</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
                <p className="font-bold text-slate-900 dark:text-white text-[11px]">Thermal Printers</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Epson, TVS, Citizen, Rugtek 58mm/80mm USB & LAN</p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
                <p className="font-bold text-slate-900 dark:text-white text-[11px]">Barcode Scanners</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Honeywell, Zebra, TVS, Datalogic 1D/2D QR</p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
                <p className="font-bold text-slate-900 dark:text-white text-[11px]">Cash Drawers</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Standard RJ-11/RJ-12 solenoid kickout triggers</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
