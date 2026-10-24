'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  YAxis,
  Tooltip,
} from 'recharts';


interface SparklineChartProps {
  priceHistory?: { timestamp: number; price: number }[];
  entryPrice: number;
  currentPrice: number;
  isProfit: boolean;
  symbol: string;
}

export function SparklineChart({
  priceHistory = [],
  entryPrice,
  currentPrice,
  isProfit,
  symbol,
}: SparklineChartProps) {
  const isMounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const chartData = React.useMemo(() => {

    if (!priceHistory || priceHistory.length === 0) {
      return [];
    }

    if (priceHistory.length === 1) {
      return [
        { label: 'Entry', price: entryPrice, pctChange: 0 },
        {
          label: 'Current',
          price: priceHistory[0].price,
          pctChange: entryPrice > 0 ? ((priceHistory[0].price - entryPrice) / entryPrice) * 100 : 0,
        },
      ];
    }

    return priceHistory.map((item, index) => {
      const pct = entryPrice > 0 ? ((item.price - entryPrice) / entryPrice) * 100 : 0;
      return {
        label: index === 0 ? 'Entry' : `+${index * 4}s`,
        price: item.price,
        pctChange: pct,
      };
    });
  }, [priceHistory, entryPrice]);

  const strokeColor = isProfit ? '#34d399' : '#fb7185';
  const gradientId = `sparkline-grad-${symbol}-${isProfit ? 'up' : 'down'}`;

  if (!isMounted || chartData.length === 0) {
    return (
      <div className="w-full h-14 bg-slate-950/30 rounded-xl flex items-center justify-center text-[10px] text-slate-600">
        Awaiting live price history
      </div>
    );
  }

  // Calculate min and max for proper vertical padding
  const prices = chartData.map((d) => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const padding = (maxPrice - minPrice) * 0.1 || minPrice * 0.05 || 0.000000001;

  return (
    <div className="w-full bg-slate-950/50 rounded-xl p-2 border border-slate-800/60">
      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1 px-1">
        <span className="font-sans font-medium flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: strokeColor }} />
          <span>Real-Time Trend Since Entry</span>
        </span>
        <span className="font-mono tabular-nums text-slate-300">
          {chartData.length} tick{chartData.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="w-full h-14">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 2 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.3} />
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <YAxis
              domain={[minPrice - padding, maxPrice + padding]}
              hide
              padding={{ top: 2, bottom: 2 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const data = payload[0].payload;
                const isItemProfit = data.pctChange >= 0;
                return (
                  <div className="bg-[#090d16] border border-slate-700/80 px-2.5 py-1.5 rounded-lg shadow-xl text-[10px] font-mono tabular-nums">
                    <div className="text-slate-400 flex items-center justify-between gap-3">
                      <span>{data.label}</span>
                      <span className={isItemProfit ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                        {isItemProfit ? '+' : ''}{data.pctChange.toFixed(2)}%
                      </span>
                    </div>
                    <div className="text-white font-semibold mt-0.5">
                      {data.price < 0.0001 ? data.price.toExponential(4) : data.price.toFixed(8)} SOL
                    </div>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke={strokeColor}
              strokeWidth={1.75}
              fill={`url(#${gradientId})`}
              isAnimationActive={false}
              dot={false}
              activeDot={{ r: 3, fill: strokeColor, stroke: '#0f172a', strokeWidth: 1.5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
