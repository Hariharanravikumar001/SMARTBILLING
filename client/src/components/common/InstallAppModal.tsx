import React from 'react';
import {
  Download,
  Monitor,
  Smartphone,
  Printer,
  WifiOff,
  Zap,
  CheckCircle2,
  X
} from 'lucide-react';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onInstallPrompt: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstallPrompt
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Download Desktop & POS App</h3>
              <p className="text-xs text-slate-400">Install native standalone application on your device</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Benefits Banner */}
        <div className="grid grid-cols-3 gap-2.5 my-4">
          <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 text-center">
            <WifiOff className="w-5 h-5 text-blue-600 dark:text-blue-400 mx-auto mb-1.5" />
            <p className="text-[11px] font-bold text-slate-900 dark:text-white">Offline Ready</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Bills cache locally</p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 text-center">
            <Printer className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mx-auto mb-1.5" />
            <p className="text-[11px] font-bold text-slate-900 dark:text-white">Direct Hardware</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">USB Barcode & 80mm</p>
          </div>
          <div className="p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/40 text-center">
            <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400 mx-auto mb-1.5" />
            <p className="text-[11px] font-bold text-slate-900 dark:text-white">Ultra Fast</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Zero lag touchscreen</p>
          </div>
        </div>

        {/* Instant 1-Click Install Button if supported by browser */}
        {deferredPrompt ? (
          <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
            <p className="text-xs font-semibold mb-2">Ready for instant 1-click installation:</p>
            <button
              onClick={() => {
                onInstallPrompt();
                onClose();
              }}
              className="w-full py-2.5 px-4 bg-white text-blue-600 hover:bg-slate-50 font-bold text-xs rounded-xl shadow-sm transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Install Native Desktop Application
            </button>
          </div>
        ) : null}

        {/* Step-by-Step Instructions */}
        <div className="space-y-3 text-xs">
          <p className="font-bold text-slate-700 dark:text-slate-200">How to install on your computer or tablet:</p>

          {/* Windows / Mac / Linux (Chrome / Edge) */}
          <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/60 flex items-start gap-3">
            <Monitor className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="font-bold text-slate-900 dark:text-white">Windows PC & Mac (Chrome or Microsoft Edge):</p>
              <ol className="list-decimal list-inside space-y-0.5 text-slate-600 dark:text-slate-400 text-[11px]">
                <li>Look at the right side of the top address bar.</li>
                <li>Click the <strong>Install App icon (Monitor with arrow)</strong>.</li>
                <li>Or click browser menu (<strong>⋮</strong> or <strong>...</strong>) &rarr; <strong>"Install Universal Billing & POS"</strong>.</li>
                <li>Click <strong>Install</strong> to add to Desktop and Start Menu.</li>
              </ol>
            </div>
          </div>

          {/* Android Tablet & iPad */}
          <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/60 flex items-start gap-3">
            <Smartphone className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="font-bold text-slate-900 dark:text-white">Touchscreen POS Tablet (Android & iPad):</p>
              <ol className="list-decimal list-inside space-y-0.5 text-slate-600 dark:text-slate-400 text-[11px]">
                <li>In Chrome (Android) or Safari (iPad), tap the <strong>Menu (⋮)</strong> or <strong>Share</strong> button.</li>
                <li>Tap <strong>"Add to Home Screen"</strong> or <strong>"Install Application"</strong>.</li>
                <li>The POS icon will appear on your device home screen and open fullscreen.</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Auto-updates on launch
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 font-semibold rounded-xl transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
