'use client';

import React from 'react';
import { Flame, ArrowUpRight, X } from 'lucide-react';
import { VolumeSpikeAlert } from '@/lib/types';
import { formatTimeAgo } from '@/lib/formatters';

interface VolumeSpikeBannerProps {
  alerts: VolumeSpikeAlert[];
  onSelectToken: (mint: string) => void;
  onDismissAlert?: (id: string) => void;
}

export function VolumeSpikeBanner({
  alerts,
  onSelectToken,
  onDismissAlert,
}: VolumeSpikeBannerProps) {
  if (alerts.length === 0) return null;

  const topAlert = alerts[0];

  return (
    <div className="bg-gradient-to-r from-orange-950/60 via-amber-950/40 to-slate-900 border border-orange-500/30 rounded-xl p-3 mb-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shrink-0">
            <Flame className="w-4 h-4 fill-orange-400/30" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-orange-200">Volume Spike Alert:</span>
              <span className="text-xs font-semibold text-white truncate">{topAlert.name} (${topAlert.symbol})</span>
              <span className="text-[11px] font-mono font-bold text-orange-400">
                +{topAlert.surgeMultiplier.toFixed(1)}x surge
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {topAlert.currentVolumeSol.toFixed(2)} SOL in 5m · {formatTimeAgo(topAlert.timestamp)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onSelectToken(topAlert.mint)}
            className="min-h-[36px] px-2.5 py-1 text-xs font-medium text-orange-300 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 rounded-lg flex items-center gap-1 transition-colors"
          >
            <span>Inspect</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
          {onDismissAlert && (
            <button
              onClick={() => onDismissAlert(topAlert.id)}
              className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-500 hover:text-slate-300"
              aria-label="Dismiss Alert"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
