'use client';

import React, { useState } from 'react';
import { X, Lock, KeyRound, AlertCircle, LogOut } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  onLoginSuccess: () => void;
  onLogoutSuccess: () => void;
}

export function AuthModal({
  isOpen,
  onClose,
  isAuthenticated,
  onLoginSuccess,
  onLogoutSuccess,
}: AuthModalProps) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/bot/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Authentication failed');
      } else {
        setPasscode('');
        onLoginSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/bot/auth', { method: 'DELETE' });
      onLogoutSuccess();
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-[#0c1220] border border-slate-800 rounded-2xl p-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-white">
            <Lock className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm">Owner Access</h3>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isAuthenticated ? (
          <div className="py-4 space-y-3">
            <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl text-xs text-emerald-300">
              You are currently signed in with authenticated owner privileges. Full control over live parameters and execution is active.
            </div>
            <button
              onClick={handleLogout}
              className="w-full min-h-[44px] py-2 text-xs font-semibold text-rose-300 bg-rose-950/30 hover:bg-rose-950/50 border border-rose-800/40 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out of Owner Session</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="py-4 space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed">
              Enter your secure LaunchGuard owner passcode to modify live risk rules or enable automated sniper orders. Default demo passcode: <span className="font-mono text-cyan-400">guard2026</span>
            </p>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1.5">
                Owner Passcode
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter passcode..."
                  className="w-full h-11 px-3 pl-9 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  autoFocus
                />
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              </div>
            </div>

            {error && (
              <div className="p-2.5 bg-rose-950/30 border border-rose-800/40 rounded-xl text-[11px] text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !passcode.trim()}
              className="w-full min-h-[44px] py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 rounded-xl transition-colors shadow-sm"
            >
              {loading ? 'Authenticating...' : 'Sign In as Owner'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
