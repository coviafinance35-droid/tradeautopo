'use client';

import React, { useState } from 'react';
import {
  Crosshair,
  Zap,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { TokenLaunch } from '@/lib/types';
import { formatAddress, formatSol } from '@/lib/formatters';

interface SniperViewProps {
  onExecuteSnipe: (mint: string, solAmount: number) => Promise<{ success: boolean; error?: string; launch?: TokenLaunch }>;
  isExecuting: boolean;
  emergencyStopped: boolean;
  tradingMode: 'simulation' | 'live';
  defaultBuySol: number;
}

export function SniperView({
  onExecuteSnipe,
  isExecuting,
  emergencyStopped,
  tradingMode,
  defaultBuySol,
}: SniperViewProps) {
  const [mintInput, setMintInput] = useState('');
  const [solAmount, setSolAmount] = useState(defaultBuySol.toString());
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error'; txSig?: string } | null>(null);

  const presets = [0.02, 0.05, 0.10, 0.25];

  const handleSnipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mintInput.trim()) return;

    setStatusMessage(null);
    const amount = parseFloat(solAmount) || defaultBuySol;

    const res = await onExecuteSnipe(mintInput.trim(), amount);
    if (res.success) {
      setStatusMessage({
        text: `Snipe successful! Token passed all safety checks and was confirmed.`,
        type: 'success',
        txSig: res.launch?.executionTxSignature,
      });
      setMintInput('');
    } else {
      setStatusMessage({
        text: res.error || 'Snipe rejected by safety rules.',
        type: 'error',
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Intro Header */}
      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
        <div className="flex items-center gap-2 mb-1.5">
          <Crosshair className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white">Manual Sniper Terminal</h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Paste any Solana Pump.fun token mint. LaunchGuard automatically checks the bonding curve PDA, price impact, liquidity depth, and creator history before executing.
        </p>
      </div>

      {emergencyStopped && (
        <div className="p-3 bg-rose-950/40 border border-rose-800/80 rounded-xl text-xs text-rose-200 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          <span>Manual buys are blocked while Emergency Stop is engaged.</span>
        </div>
      )}

      {/* Sniper Form */}
      <form onSubmit={handleSnipe} className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1.5">
            Token Mint Address
          </label>
          <input
            type="text"
            value={mintInput}
            onChange={(e) => setMintInput(e.target.value)}
            placeholder="e.g. 7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b96nnm3v"
            className="w-full h-12 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            disabled={emergencyStopped || isExecuting}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Purchase Amount (SOL)
            </label>
            <span className="text-[11px] text-slate-400">
              Mode: <strong className="text-cyan-400">{tradingMode.toUpperCase()}</strong>
            </span>
          </div>

          <div className="relative mb-2">
            <input
              type="number"
              step="0.01"
              min="0.001"
              max="5.0"
              value={solAmount}
              onChange={(e) => setSolAmount(e.target.value)}
              className="w-full h-11 px-3 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
              disabled={emergencyStopped || isExecuting}
            />
            <span className="absolute right-3 top-3 text-xs text-slate-500 font-mono">SOL</span>
          </div>

          {/* Quick preset buttons */}
          <div className="grid grid-cols-4 gap-1.5">
            {presets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setSolAmount(preset.toString())}
                className={`min-h-[36px] py-1 text-xs font-mono rounded-lg border transition-colors ${
                  parseFloat(solAmount) === preset
                    ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {preset} SOL
              </button>
            ))}
          </div>
        </div>

        {/* Status result */}
        {statusMessage && (
          <div
            className={`p-3.5 rounded-xl text-xs space-y-1.5 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/30 border border-emerald-500/30 text-emerald-200'
                : 'bg-rose-950/30 border border-rose-500/30 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="font-semibold">{statusMessage.text}</span>
            </div>
            {statusMessage.txSig && (
              <div className="text-[11px] text-slate-400 pt-1 font-mono">
                Signature: {formatAddress(statusMessage.txSig, 8)}
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        <button
          type="submit"
          disabled={emergencyStopped || isExecuting || !mintInput.trim()}
          className="w-full min-h-[48px] py-2.5 px-4 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 active:scale-[0.99] text-slate-950 font-bold text-sm rounded-xl transition-all shadow-lg shadow-cyan-500/10 flex items-center justify-center gap-2"
        >
          {isExecuting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Running pre-flight checks...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              <span>Execute Pre-flight & Buy Token</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
