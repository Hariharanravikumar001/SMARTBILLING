import React, { useState, useEffect } from 'react';
import {
  Monitor,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Delete,
  Sparkles,
  ArrowLeft,
  KeyRound,
  Store,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { api } from '../services/api';

interface SoftwareTerminalLoginProps {
  onExitTerminal?: () => void;
}

export const SoftwareTerminalLogin: React.FC<SoftwareTerminalLoginProps> = ({ onExitTerminal }) => {
  const { loginBusiness } = useAuth();
  const { branding } = useBranding();

  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
  const [customName, setCustomName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);

  // Load store staff for quick-touch selection
  useEffect(() => {
    const fetchStaff = async () => {
      setIsLoadingStaff(true);
      try {
        const res: any = await api.get('/auth/store/staff');
        if (res.success && res.data) {
          setStaffList(res.data);
          if (res.data.length > 0) {
            setSelectedStaff(res.data[0]);
          }
        }
      } catch (err) {
        console.warn('Failed to load store staff list:', err);
      } finally {
        setIsLoadingStaff(false);
      }
    };
    fetchStaff();
  }, []);

  // Keyboard number listener for 6-digit PIN
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        if (pin.length < 6) {
          setPin(prev => prev + e.key);
        }
      } else if (e.key === 'Backspace') {
        setPin(prev => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        if (pin.length >= 4) {
          executePinLogin(pin);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, selectedStaff, customName]);

  const handleKeypadPress = (digit: string) => {
    setError(null);
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      if (nextPin.length === 6) {
        executePinLogin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setPin('');
    setError(null);
  };

  const executePinLogin = async (pinToSubmit: string) => {
    const targetName = selectedStaff ? selectedStaff.name : customName.trim();
    if (!targetName) {
      setError('Please select or enter your staff name.');
      return;
    }

    if (!pinToSubmit || pinToSubmit.length < 4) {
      setError('Please enter your 6-digit security PIN.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res: any = await api.post('/auth/business/pin-login', {
        name: targetName,
        pin: pinToSubmit
      });

      if (res.success && res.token && res.user && res.business) {
        loginBusiness(res.token, res.user, res.business, res.branches || []);
      } else {
        setError(res.message || 'Invalid PIN code. Please verify your 6-digit PIN.');
        setPin('');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error. Please check your credentials.');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* Top Terminal Status Bar */}
      <header className="h-14 bg-slate-900/90 border-b border-slate-800 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
            <Monitor className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-white leading-tight">
              {branding.appName} — Desktop Software Terminal
            </h1>
            <p className="text-[10px] text-slate-400">
              Hardware POS Terminal v1.0.0-PROD
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-3 py-1.5 rounded-full border border-emerald-800/60">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Terminal Online & Ready</span>
          </div>

          {onExitTerminal && (
            <button
              onClick={onExitTerminal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Portal</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Terminal View */}
      <main className="flex-1 flex flex-col md:flex-row items-stretch justify-center max-w-6xl mx-auto w-full p-4 md:p-8 gap-8">
        {/* Left Column: Staff Selectors & User Info */}
        <div className="flex-1 flex flex-col justify-center space-y-4">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-extrabold text-blue-400 bg-blue-950/60 px-2.5 py-1 rounded-md border border-blue-900/40">
              Unified In-Store Login
            </span>
            <h2 className="text-2xl font-black text-white mt-2">
              Who is operating this terminal?
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Select your staff profile (Shopkeeper, Manager, or Cashier) and enter your 6-digit security PIN.
            </p>
          </div>

          {/* Touch Staff Cards */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {isLoadingStaff ? (
              <div className="p-4 text-center text-xs text-slate-400">Loading store personnel...</div>
            ) : staffList.length > 0 ? (
              staffList.map((st) => {
                const isSelected = selectedStaff?.id === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      setSelectedStaff(st);
                      setCustomName('');
                      setPin('');
                      setError(null);
                    }}
                    className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/30'
                        : 'bg-slate-900 hover:bg-slate-850 text-slate-300 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                        isSelected ? 'bg-white text-blue-600' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {st.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-sm leading-tight">{st.name}</p>
                        <p className={`text-[11px] ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                          Role: <span className="font-semibold">{st.role}</span>
                        </p>
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-white" />}
                  </button>
                );
              })
            ) : null}
          </div>

          {/* Or Type Name Option */}
          <div className="pt-2 border-t border-slate-800">
            <label className="block text-[11px] font-bold text-slate-400 mb-1">
              Or Enter Staff / Cashier Name Manually:
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={customName}
                onChange={(e) => {
                  setCustomName(e.target.value);
                  setSelectedStaff(null);
                  setError(null);
                }}
                placeholder="e.g. Sumanth Kumar or Vikramaditya Rao"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Right Column: 6-Digit PIN Pad */}
        <div className="w-full md:w-96 flex flex-col justify-center">
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-2xl flex flex-col items-center">
            <div className="flex items-center gap-2 mb-2">
              <KeyRound className="w-4 h-4 text-blue-400" />
              <h3 className="font-bold text-sm text-white">Enter 6-Digit PIN</h3>
            </div>

            <p className="text-[11px] text-slate-400 mb-4 text-center">
              Logging in as: <strong className="text-white">{selectedStaff?.name || customName || 'Staff Member'}</strong>
            </p>

            {/* 6 PIN Indicator Dots */}
            <div className="flex items-center justify-center gap-3.5 mb-6 py-2 px-6 rounded-2xl bg-slate-950 border border-slate-800">
              {[0, 1, 2, 3, 4, 5].map((idx) => {
                const filled = pin.length > idx;
                return (
                  <span
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                      filled
                        ? 'bg-blue-500 shadow-sm shadow-blue-400 scale-110'
                        : 'bg-slate-800 border border-slate-700'
                    }`}
                  />
                );
              })}
            </div>

            {/* Error Message */}
            {error && (
              <div className="w-full mb-4 p-2.5 rounded-xl bg-red-950/50 border border-red-900/60 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{error}</span>
              </div>
            )}

            {/* Touchpad 0-9 Grid */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-xs mb-4">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleKeypadPress(digit)}
                  className="h-14 rounded-2xl bg-slate-800 hover:bg-slate-750 active:bg-blue-600 active:scale-95 text-xl font-bold text-white transition-all shadow-sm border border-slate-700/60 flex items-center justify-center"
                >
                  {digit}
                </button>
              ))}

              <button
                type="button"
                onClick={handleClear}
                className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-800 active:scale-95 text-xs font-bold text-slate-400 hover:text-white transition-all border border-slate-800 flex items-center justify-center"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                className="h-14 rounded-2xl bg-slate-800 hover:bg-slate-750 active:bg-blue-600 active:scale-95 text-xl font-bold text-white transition-all shadow-sm border border-slate-700/60 flex items-center justify-center"
              >
                0
              </button>

              <button
                type="button"
                onClick={handleBackspace}
                className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-800 active:scale-95 text-xs font-bold text-slate-400 hover:text-red-400 transition-all border border-slate-800 flex items-center justify-center"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            {/* Submit Action */}
            <button
              type="button"
              disabled={isLoading || pin.length < 4}
              onClick={() => executePinLogin(pin)}
              className="w-full max-w-xs py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-2xl text-xs font-bold shadow-lg shadow-blue-600/30 transition-all active:scale-98 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying PIN...</span>
                </>
              ) : (
                <span>Sign in to Store Terminal</span>
              )}
            </button>

            {/* Quick Demo Hint */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 text-[10px] text-slate-500 text-center w-full">
              Demo PINs: Owner: <span className="font-mono text-slate-400 font-bold">123456</span> | Manager: <span className="font-mono text-slate-400 font-bold">654321</span> | Cashier: <span className="font-mono text-slate-400 font-bold">999999</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
