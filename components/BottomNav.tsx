'use client';

import React from 'react';
import { Radar, Briefcase, ShieldCheck, Crosshair, FileText, Copy } from 'lucide-react';

export type NavTab = 'radar' | 'positions' | 'risk' | 'sniper' | 'copy' | 'docs';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  openPositionsCount: number;
  hasSpikes: boolean;
}

export function BottomNav({
  currentTab,
  onSelectTab,
  openPositionsCount,
  hasSpikes,
}: BottomNavProps) {
  const tabs = [
    {
      id: 'radar' as NavTab,
      label: 'Radar',
      icon: Radar,
      badge: hasSpikes ? '!' : undefined,
    },
    {
      id: 'positions' as NavTab,
      label: 'Positions',
      icon: Briefcase,
      badge: openPositionsCount > 0 ? String(openPositionsCount) : undefined,
    },
    {
      id: 'risk' as NavTab,
      label: 'Risk Guard',
      icon: ShieldCheck,
    },
    {
      id: 'sniper' as NavTab,
      label: 'Sniper',
      icon: Crosshair,
    },
    {
      id: 'copy' as NavTab,
      label: 'Copy Trade',
      icon: Copy,
    },
    {
      id: 'docs' as NavTab,
      label: 'System & Docs',
      icon: FileText,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#090d16]/95 backdrop-blur-md border-t border-slate-800/80 pb-safe transition-all">
      <div className="max-w-md mx-auto grid grid-cols-6 items-center h-16 px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`relative min-h-[44px] min-w-[44px] py-1 flex flex-col items-center justify-center rounded-xl transition-all ${
                isActive
                  ? 'text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {tab.badge && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 text-[9px] font-bold bg-cyan-500 text-slate-950 rounded-full flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-1 truncate max-w-[64px]">
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 bg-cyan-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
