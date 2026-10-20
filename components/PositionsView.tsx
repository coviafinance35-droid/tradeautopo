'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ExternalLink,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Position, DailyMetrics } from '@/lib/types';
import { formatAddress, formatSol, formatPercent, formatTimeAgo } from '@/lib/formatters';
import { SparklineChart } from './SparklineChart';

interface PositionsViewProps {
  openPositions: Position[];
  closedPositions: Position[];
  metrics: DailyMetrics;
  onClosePosition: (positionId: string) => Promise<void>;
  isClosing: boolean;
  tradingMode: 'simulation' | 'live';
}

export function PositionsView({
  openPositions,
  closedPositions,
  metrics,
  onClosePosition,
  isClosing,
  tradingMode,
}: PositionsViewProps) {
  const [activeTab, setActiveTab] = useState<'open' | 'closed'>('open');
  const [closingId, setClosingId] = useState<string | null>(null);

  const handleSell = async (id: string) => {
    setClosingId(id);
    try {
      await onClosePosition(id);
    } finally {
      setClosingId(null);
    }
  };

  const totalUnrealized = openPositions.reduce((acc, p) => acc + p.unrealizedPnlSol, 0);
  const totalCost = openPositions.reduce((acc, p) => acc + p.costSol, 0);

  return (
    <div className="space-y-4">
      {/* Portfolio Performance Overview - High-Contrast Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">
            Unrealized P&L
          </span>
          <div className="flex items-baseline gap-1">
            <span
              className={`text-lg font-bold font-mono tabular-nums ${
                totalUnrealized >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {totalUnrealized >= 0 ? '+' : ''}{totalUnrealized.toFixed(4)} SOL
            </span>
          </div>
          <span className="text-[10px] text-slate-500 tabular-nums">
            {openPositions.length} active trade{openPositions.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">
            Realized P&L
          </span>
          <div className="flex items-baseline gap-1">
            <span
              className={`text-lg font-bold font-mono tabular-nums ${
                metrics.realizedPnlSol >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {metrics.realizedPnlSol >= 0 ? '+' : ''}{metrics.realizedPnlSol.toFixed(4)} SOL
            </span>
          </div>
          <span className="text-[10px] text-slate-500 tabular-nums">
            {closedPositions.length} closed trades
          </span>
        </div>

        <div className="p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">
            Open Exposure
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold font-mono text-slate-200 tabular-nums">
              {formatSol(totalCost, 3)}
            </span>
          </div>
          <span className="text-[10px] text-slate-500">
            Locked in current tokens
          </span>
        </div>

        <div className="p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">
            Remaining Budget
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold font-mono text-cyan-400 tabular-nums">
              {formatSol(metrics.remainingRiskBudgetSol, 3)}
            </span>
          </div>
          <span className="text-[10px] text-slate-500">
            Before daily loss limit
          </span>
        </div>
      </div>

      {/* Segmented Tab Switcher */}
      <div className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-xl border border-slate-800">
        <button
          onClick={() => setActiveTab('open')}
          className={`flex-1 min-h-[36px] py-1.5 text-xs font-medium rounded-lg transition-colors ${
            activeTab === 'open'
              ? 'bg-slate-800 text-white font-semibold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Open Positions ({openPositions.length})
        </button>
        <button
          onClick={() => setActiveTab('closed')}
          className={`flex-1 min-h-[36px] py-1.5 text-xs font-medium rounded-lg transition-colors ${
            activeTab === 'closed'
              ? 'bg-slate-800 text-white font-semibold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          History / Fills ({closedPositions.length})
        </button>
      </div>

      {/* Open Positions List */}
      {activeTab === 'open' && (
        <div className="space-y-3">
          {openPositions.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/30 border border-slate-800/80 rounded-2xl">
              <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-slate-300">No open positions</h4>
              <p className="text-xs text-slate-500 mt-1">
                Auto-buy or manual sniper purchases will appear here with live P&L and TP/SL tracking.
              </p>
            </div>
          ) : (
            openPositions.map((pos) => {
              const isProfit = pos.unrealizedPnlPercent >= 0;
              return (
                <div
                  key={pos.id}
                  className="p-4 bg-slate-900/50 border border-slate-800/80 rounded-2xl space-y-3"
                >
                  {/* Row 1: Token, Entry Time, Live PnL */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-white">{pos.name}</h4>
                        <span className="text-xs font-mono text-slate-400">${pos.symbol}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                        <span>Bought {formatTimeAgo(pos.openedAt)}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{formatAddress(pos.mint, 3)}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-slate-500">{pos.isSimulated ? 'Paper' : 'Live'}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`text-sm font-bold font-mono tabular-nums flex items-center justify-end gap-1 ${
                          isProfit ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isProfit ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        <span>{formatPercent(pos.unrealizedPnlPercent)}</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                        {pos.unrealizedPnlSol >= 0 ? '+' : ''}{pos.unrealizedPnlSol.toFixed(4)} SOL
                      </span>
                    </div>
                  </div>

                  {/* Real-time Recharts Sparkline */}
                  <SparklineChart
                    priceHistory={pos.priceHistory}
                    entryPrice={pos.entryPriceSol}
                    currentPrice={pos.currentPriceSol}
                    isProfit={isProfit}
                    symbol={pos.symbol}
                  />

                  {/* Row 2: Price Details & Cost */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-950/40 rounded-xl border border-slate-800/60 text-xs font-mono tabular-nums">

                    <div>
                      <span className="text-[10px] text-slate-500 block font-sans">Cost / Value</span>
                      <span className="text-slate-300">{pos.costSol.toFixed(3)} → {pos.currentValueSol.toFixed(3)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block font-sans">Token Amount</span>
                      <span className="text-slate-300">{pos.amountTokens.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block font-sans">TP / SL Target</span>
                      <span className="text-slate-300">+{pos.takeProfitPercent}% / -{pos.stopLossPercent}%</span>
                    </div>
                  </div>

                  {/* Row 3: Action Buttons (Manual Exit Sell & Explorer) */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-3 text-xs">
                      <a
                        href={`https://pump.fun/${pos.mint}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-emerald-400 flex items-center gap-1"
                      >
                        <span>Pump.fun</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <a
                        href={`https://solscan.io/tx/${pos.entryTxSignature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-cyan-400 flex items-center gap-1"
                      >
                        <span>Tx</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    <button
                      onClick={() => handleSell(pos.id)}
                      disabled={isClosing || closingId === pos.id}
                      className="min-h-[44px] px-4 py-1.5 text-xs font-bold text-rose-200 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 rounded-xl transition-all active:scale-95 flex items-center gap-1.5"
                    >
                      <span>{closingId === pos.id ? 'Selling...' : 'Market Sell / Exit'}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Closed Positions History */}
      {activeTab === 'closed' && (
        <div className="space-y-3">
          {closedPositions.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/30 border border-slate-800/80 rounded-2xl">
              <CheckCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-slate-300">No closed positions yet</h4>
              <p className="text-xs text-slate-500 mt-1">Completed trade exits will be permanently logged here.</p>
            </div>
          ) : (
            closedPositions.map((pos) => {
              const isProfit = pos.realizedPnlSol >= 0;
              return (
                <div
                  key={pos.id}
                  className="p-3.5 bg-slate-900/40 border border-slate-800/80 rounded-xl flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white truncate">{pos.name}</span>
                      <span className="font-mono text-slate-400">(${pos.symbol})</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Exit: {pos.exitReason || 'MANUAL_EXIT'} · Closed {pos.closedAt ? formatTimeAgo(pos.closedAt) : ''}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`font-mono font-bold tabular-nums ${
                        isProfit ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isProfit ? '+' : ''}{pos.realizedPnlSol.toFixed(4)} SOL
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Cost: {pos.costSol.toFixed(3)} SOL
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
