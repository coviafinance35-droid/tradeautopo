'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ExternalLink,
  Flame,
  Search,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { TokenLaunch } from '@/lib/types';
import { formatAddress, formatSol, formatTimeAgo } from '@/lib/formatters';

interface RadarViewProps {
  launches: TokenLaunch[];
  onSelectLaunch: (launch: TokenLaunch) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export function RadarView({
  launches,
  onSelectLaunch,
  onRefresh,
  isLoading,
}: RadarViewProps) {
  const [filter, setFilter] = useState<'all' | 'approved' | 'rejected' | 'spikes'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedMint, setCopiedMint] = useState<string | null>(null);

  const copyToClipboard = (mint: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(mint);
    setCopiedMint(mint);
    setTimeout(() => setCopiedMint(null), 2000);
  };

  const filteredLaunches = launches.filter((l) => {
    if (filter === 'approved' && l.riskEvaluation?.decision !== 'APPROVED') return false;
    if (filter === 'rejected' && l.riskEvaluation?.decision !== 'REJECTED') return false;
    if (filter === 'spikes' && !l.volumeSpike) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        l.name.toLowerCase().includes(q) ||
        l.symbol.toLowerCase().includes(q) ||
        l.mint.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Search & Filter Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by token name, symbol, or mint..."
            className="w-full h-10 px-3 pl-9 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="min-h-[40px] px-3 py-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs text-slate-300 flex items-center justify-center gap-1.5 transition-colors self-end sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Segmented Filter Bar - Zero-Pill Discipline */}
      <div className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-xl border border-slate-800/80 overflow-x-auto">
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
            filter === 'all'
              ? 'bg-slate-800 text-white font-semibold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          All ({launches.length})
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`flex-1 min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
            filter === 'approved'
              ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Approved ({launches.filter((l) => l.riskEvaluation?.decision === 'APPROVED').length})
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={`flex-1 min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
            filter === 'rejected'
              ? 'bg-rose-950/40 border border-rose-500/30 text-rose-300 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Rejected ({launches.filter((l) => l.riskEvaluation?.decision === 'REJECTED').length})
        </button>
        <button
          onClick={() => setFilter('spikes')}
          className={`flex-1 min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors flex items-center justify-center gap-1 ${
            filter === 'spikes'
              ? 'bg-orange-950/40 border border-orange-500/30 text-orange-300 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Spikes ({launches.filter((l) => l.volumeSpike).length})</span>
        </button>
      </div>

      {/* Launches Feed List */}
      {filteredLaunches.length === 0 ? (
        <div className="p-8 text-center bg-slate-900/30 border border-slate-800/80 rounded-2xl">
          <Filter className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-slate-300">No token launches match your filter</h4>
          <p className="text-xs text-slate-500 mt-1">Listening for new Pump.fun creation events on the network...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLaunches.map((launch) => {
            const isApproved = launch.riskEvaluation?.decision === 'APPROVED';
            const evaluation = launch.riskEvaluation;

            return (
              <div
                key={launch.mint}
                onClick={() => onSelectLaunch(launch)}
                className="group p-4 bg-slate-900/50 hover:bg-slate-900/90 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl transition-all cursor-pointer active:scale-[0.99]"
              >
                {/* Header Row: Symbol, Name, Time, Decision */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                        {launch.name}
                      </h4>
                      <span className="text-xs font-mono font-medium text-slate-400">
                        ${launch.symbol}
                      </span>
                      {launch.volumeSpike && (
                        <span className="text-[10px] font-semibold text-orange-400 flex items-center gap-0.5">
                          <Flame className="w-3 h-3 fill-orange-400/20" />
                          <span>Spike</span>
                        </span>
                      )}
                    </div>
                    {/* Unboxed Metadata Line with typographic separators */}
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                      <span className="tabular-nums">{formatTimeAgo(launch.creationTime)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{formatSol(launch.virtualSolReserves / 1e9, 1)} liq</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{launch.uniqueBuyersCount} buyers</span>
                    </div>
                  </div>

                  {/* Decision Tag */}
                  <div className="shrink-0 flex items-center gap-1.5">
                    {isApproved ? (
                      <div className="flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Pass</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-rose-400 text-xs font-semibold">
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </div>
                    )}
                    <span className="text-xs font-mono font-bold text-slate-300 tabular-nums">
                      {evaluation?.score ?? 0}
                    </span>
                  </div>
                </div>

                {/* Mint Address Row & Quick Action Links */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[11px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-400">
                      {formatAddress(launch.mint, 4)}
                    </span>
                    <button
                      onClick={(e) => copyToClipboard(launch.mint, e)}
                      title="Copy Mint Address"
                      className="min-h-[30px] min-w-[30px] flex items-center justify-center text-slate-500 hover:text-cyan-400 transition-colors"
                      aria-label="Copy Mint"
                    >
                      {copiedMint === launch.mint ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <a
                      href={`https://pump.fun/${launch.mint}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-slate-400 hover:text-emerald-400 flex items-center gap-0.5"
                    >
                      <span>Pump.fun</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                    <span className="text-cyan-400 font-medium">Inspect →</span>
                  </div>
                </div>

                {/* Rejection Notice if rejected */}
                {!isApproved && evaluation?.rejectionReasons && evaluation.rejectionReasons.length > 0 && (
                  <div className="mt-2 text-[11px] text-rose-300/90 leading-tight">
                    {evaluation.rejectionReasons[0]}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
