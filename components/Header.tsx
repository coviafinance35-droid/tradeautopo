'use client';

import React from 'react';
import { Shield, AlertTriangle, Play, Pause, Lock, Unlock } from 'lucide-react';
import { BotStateSummary } from '@/lib/types';
import { formatAddress, formatSol } from '@/lib/formatters';

interface HeaderProps {
  summary: BotStateSummary | null;
  onEmergencyStop: () => void;
  onResumeEmergency: () => void;
  onToggleAutoBuy: () => void;
  onOpenAuth: () => void;
  isAuthenticated: boolean;
}

export function Header({
  summary,
  onEmergencyStop,
  onResumeEmergency,
  onToggleAutoBuy,
  onOpenAuth,
  isAuthenticated,
}: HeaderProps) {
  const isEmergency = summary?.emergencyStopped;
  const autoBuy = summary?.autoBuyEnabled;
  const isLive = summary?.tradingMode === 'live';

  return (
    <header className="sticky top-0 z-40 w-full bg-[#090d16]/95 backdrop-blur-md border-b border-slate-800/80 pt-safe transition-colors">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Zone 1: Wordmark & Live Connection indicator */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Shield className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold tracking-tight text-white text-base">LaunchGuard</span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded uppercase tracking-wider ${
                isLive ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'
              }`}>
                {isLive ? 'Live' : 'Paper'}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-400 tabular-nums">
              <span>{summary ? formatSol(summary.wallet.availableSol, 3) : '...'}</span>
              <span>·</span>
              <span className="text-slate-500 font-mono">{summary ? formatAddress(summary.wallet.publicKey, 3) : '...'}</span>
            </div>
          </div>
        </div>

        {/* Zone 2: Auto-Buy Quick Toggle & Status */}
        <div className="hidden sm:flex items-center gap-3">
          <button
            onClick={onToggleAutoBuy}
            className={`min-h-[38px] px-3 py-1 text-xs font-medium rounded-lg border transition-all flex items-center gap-1.5 ${
              autoBuy
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            {autoBuy ? <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/20" /> : <Pause className="w-3.5 h-3.5" />}
            <span>Auto-Buy {autoBuy ? 'Active' : 'Off'}</span>
          </button>
        </div>

        {/* Zone 3: Primary Action & Emergency Stop */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenAuth}
            title={isAuthenticated ? 'Owner Authenticated' : 'Owner Sign In'}
            className="min-h-[44px] min-w-[44px] p-2 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 active:scale-95 transition-all"
            aria-label="Owner Authentication"
          >
            {isAuthenticated ? (
              <Unlock className="w-4 h-4 text-emerald-400" />
            ) : (
              <Lock className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {isEmergency ? (
            <button
              onClick={onResumeEmergency}
              className="min-h-[44px] px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-semibold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5"
            >
              <span>Resume Bot</span>
            </button>
          ) : (
            <button
              onClick={onEmergencyStop}
              className="min-h-[44px] px-3.5 py-1.5 bg-rose-600/90 hover:bg-rose-500 active:scale-95 text-white font-semibold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Emergency Stop</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
