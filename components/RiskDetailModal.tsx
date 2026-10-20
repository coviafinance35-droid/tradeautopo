'use client';

import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ExternalLink,
  Flame,
  Shield,
  Zap,
} from 'lucide-react';
import { TokenLaunch } from '@/lib/types';
import { formatAddress, formatSol, formatTimeAgo } from '@/lib/formatters';

interface RiskDetailModalProps {
  launch: TokenLaunch | null;
  onClose: () => void;
  onQuickBuy?: (mint: string) => void;
}

export function RiskDetailModal({
  launch,
  onClose,
  onQuickBuy,
}: RiskDetailModalProps) {
  const [copied, setCopied] = useState(false);

  if (!launch) return null;

  const evaluation = launch.riskEvaluation;
  const isApproved = evaluation?.decision === 'APPROVED';

  const copyMint = () => {
    navigator.clipboard.writeText(launch.mint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl max-h-[90vh] bg-[#0c1220] border border-slate-800 rounded-t-3xl sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="px-5 pt-4 pb-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isApproved ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
            }`}>
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                <span>{launch.name}</span>
                <span className="text-xs text-slate-400 font-mono">(${launch.symbol})</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Launched {formatTimeAgo(launch.creationTime)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-lg"
            aria-label="Close Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Decision Summary Card */}
          <div className={`p-4 rounded-xl border ${
            isApproved
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
              : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {isApproved ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400" />
                )}
                <span className="text-sm font-bold uppercase tracking-wider">
                  {isApproved ? 'Safety Verification Approved' : 'Rejected By Safety Rules'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">Risk Score: </span>
                <span className="text-sm font-mono font-bold text-white tabular-nums">
                  {evaluation?.score ?? 0}/100
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {evaluation?.explanation}
            </p>
          </div>

          {/* Token Mint & External Links */}
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Mint Address:</span>
              <button
                onClick={copyMint}
                className="min-h-[36px] flex items-center gap-1 font-mono text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <span>{formatAddress(launch.mint, 6)}</span>
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-xs">
              <span className="text-slate-400">Solana Explorer:</span>
              <div className="flex items-center gap-3">
                <a
                  href={`https://solscan.io/token/${launch.mint}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] text-cyan-400 hover:underline"
                >
                  <span>Solscan</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href={`https://pump.fun/${launch.mint}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] text-emerald-400 hover:underline"
                >
                  <span>Pump.fun</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-500 block">Virtual Reserves</span>
              <span className="font-mono font-bold text-slate-200 tabular-nums">
                {formatSol(launch.virtualSolReserves / 1e9, 2)}
              </span>
            </div>
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-500 block">Creator Holdings</span>
              <span className="font-mono font-bold text-slate-200 tabular-nums">
                {launch.creatorHoldingPct.toFixed(1)}%
              </span>
            </div>
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-500 block">Unique Buyers</span>
              <span className="font-mono font-bold text-slate-200 tabular-nums">
                {launch.uniqueBuyersCount} wallets
              </span>
            </div>
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-500 block">5m Trading Volume</span>
              <span className="font-mono font-bold text-slate-200 tabular-nums flex items-center gap-1">
                <span>{launch.volume5mSol.toFixed(2)} SOL</span>
                {launch.volumeSpike && <Flame className="w-3 h-3 text-orange-400 fill-orange-400/20" />}
              </span>
            </div>
          </div>

          {/* 8 Invariant Checks Breakdown */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
              Deterministic Safety Invariants ({Object.values(evaluation?.checks ?? {}).filter(c => c.pass).length}/8 Passed)
            </h4>
            <div className="space-y-2">
              {evaluation?.checks &&
                Object.entries(evaluation.checks).map(([key, check]) => (
                  <div
                    key={key}
                    className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                      check.pass
                        ? 'bg-slate-900/30 border-slate-800/80 text-slate-300'
                        : 'bg-rose-950/20 border-rose-900/40 text-rose-300'
                    }`}
                  >
                    {check.pass ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">{check.label}</span>
                        <span className={`text-[10px] font-mono ${check.pass ? 'text-emerald-400' : 'text-rose-400 font-bold'}`}>
                          {check.pass ? 'PASS' : 'FAIL'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{check.detail}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-slate-800 bg-[#090d16] flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="min-h-[44px] flex-1 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            Close
          </button>
          {onQuickBuy && (
            <button
              onClick={() => {
                onQuickBuy(launch.mint);
                onClose();
              }}
              className="min-h-[44px] flex-1 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-all shadow-md shadow-cyan-500/10 flex items-center justify-center gap-1.5"
            >
              <Zap className="w-4 h-4" />
              <span>Snipe in Terminal</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
