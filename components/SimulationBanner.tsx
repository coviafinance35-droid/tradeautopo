'use client';

import React from 'react';
import { Info, ShieldAlert, Zap } from 'lucide-react';
import { TradingMode } from '@/lib/types';

interface SimulationBannerProps {
  mode: TradingMode;
  emergencyStopped: boolean;
  onClearEmergency?: () => void;
  onSwitchModeRequest?: () => void;
}

export function SimulationBanner({
  mode,
  emergencyStopped,
  onClearEmergency,
  onSwitchModeRequest,
}: SimulationBannerProps) {
  if (emergencyStopped) {
    return (
      <div className="bg-rose-950/80 border-b border-rose-800/80 px-4 py-2 text-rose-200 text-xs flex items-center justify-between gap-3 animate-fade-in">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="font-semibold tracking-wide">
            EMERGENCY STOP ENGAGED: All new purchases blocked. Existing positions remain monitored.
          </span>
        </div>
        {onClearEmergency && (
          <button
            onClick={onClearEmergency}
            className="min-h-[32px] px-2.5 py-1 text-[11px] font-bold bg-rose-800 hover:bg-rose-700 text-white rounded transition-colors whitespace-nowrap shrink-0"
          >
            Clear Stop
          </button>
        )}
      </div>
    );
  }

  if (mode === 'simulation') {
    return (
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2 text-xs flex items-center justify-between gap-2 text-slate-300">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="truncate">
            <strong className="text-cyan-300 font-medium">SIMULATION MODE (Paper Trading):</strong> Real bonding curve math & mock balances. Zero real SOL at risk.
          </span>
        </div>
        {onSwitchModeRequest && (
          <button
            onClick={onSwitchModeRequest}
            className="text-[11px] font-medium text-slate-400 hover:text-cyan-300 underline underline-offset-2 whitespace-nowrap shrink-0"
          >
            Switch to Live
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-amber-950/70 border-b border-amber-800/80 px-4 py-2 text-xs flex items-center justify-between gap-2 text-amber-200">
      <div className="flex items-center gap-2">
        <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span className="truncate">
          <strong className="text-amber-300 font-bold">LIVE TRADING ACTIVE:</strong> Executing real transactions with trading wallet on Solana mainnet.
        </span>
      </div>
      {onSwitchModeRequest && (
        <button
          onClick={onSwitchModeRequest}
          className="text-[11px] font-medium text-amber-300 hover:text-white underline underline-offset-2 whitespace-nowrap shrink-0"
        >
          Return to Paper
        </button>
      )}
    </div>
  );
}
