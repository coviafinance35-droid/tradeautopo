'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { BottomNav, NavTab } from '@/components/BottomNav';
import { VolumeSpikeBanner } from '@/components/VolumeSpikeBanner';
import { RadarView } from '@/components/RadarView';
import { PositionsView } from '@/components/PositionsView';
import { RiskGuardView } from '@/components/RiskGuardView';
import { SniperView } from '@/components/SniperView';
import { DocsView } from '@/components/DocsView';
import { RiskDetailModal } from '@/components/RiskDetailModal';
import { AuthModal } from '@/components/AuthModal';
import {
  BotStateSummary,
  TokenLaunch,
  Position,
  VolumeSpikeAlert,
  AuditLogEntry,
  RiskSettings,
  TradingMode,
} from '@/lib/types';

export default function Home() {
  const [currentTab, setCurrentTab] = useState<NavTab>('radar');
  const [summary, setSummary] = useState<BotStateSummary | null>(null);
  const [launches, setLaunches] = useState<TokenLaunch[]>([]);
  const [openPositions, setOpenPositions] = useState<Position[]>([]);
  const [closedPositions, setClosedPositions] = useState<Position[]>([]);
  const [volumeAlerts, setVolumeAlerts] = useState<VolumeSpikeAlert[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  const [selectedLaunch, setSelectedLaunch] = useState<TokenLaunch | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isClosingPosition, setIsClosingPosition] = useState(false);
  const [isSniping, setIsSniping] = useState(false);

  // Check owner auth session
  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/bot/auth');
      const data = await res.json();
      setIsAuthenticated(Boolean(data.authenticated));
    } catch {
      setIsAuthenticated(false);
    }
  }, []);

  // Fetch bot summary and live data
  const fetchData = useCallback(async () => {
    try {
      const [sumRes, launchRes, posRes, alertRes, auditRes] = await Promise.all([
        fetch('/api/bot/status'),
        fetch('/api/bot/launches'),
        fetch('/api/bot/positions'),
        fetch('/api/bot/volume-alerts'),
        fetch('/api/bot/audit'),
      ]);

      if (sumRes.ok) {
        const sumData = await sumRes.json();
        setSummary(sumData);
      }
      if (launchRes.ok) {
        const launchData = await launchRes.json();
        setLaunches(launchData.launches || []);
      }
      if (posRes.ok) {
        const posData = await posRes.json();
        setOpenPositions(posData.open || []);
        setClosedPositions(posData.closed || []);
      }
      if (alertRes.ok) {
        const alertData = await alertRes.json();
        setVolumeAlerts(alertData.alerts || []);
      }
      if (auditRes.ok) {
        const auditData = await auditRes.json();
        setAuditLogs(auditData.logs || []);
      }
    } catch (err) {
      console.error('Failed to poll dashboard data:', err);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const initialize = async () => {
      try {
        await checkAuth();
        if (isMounted) {
          await fetchData();
        }
      } catch (err) {
        console.error(err);
      }
    };
    initialize();

    const interval = setInterval(() => {
      if (isMounted) {
        fetchData();
      }
    }, 3500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [checkAuth, fetchData]);


  // Handlers
  const handleEmergencyStop = async () => {
    try {
      await fetch('/api/bot/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'emergency_stop' }),
      });
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResumeEmergency = async () => {
    try {
      await fetch('/api/bot/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_emergency_stop' }),
      });
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleAutoBuy = async () => {
    if (!summary) return;
    try {
      await fetch('/api/bot/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_autobuy',
          enabled: !summary.autoBuyEnabled,
        }),
      });
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSettings = async (newSettings: Partial<RiskSettings>) => {
    const res = await fetch('/api/bot/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings),
    });
    const data = await res.json();
    if (res.ok) {
      await fetchData();
      return { success: true };
    }
    return { success: false, error: data.error };
  };

  const handleClosePosition = async (positionId: string) => {
    setIsClosingPosition(true);
    try {
      await fetch('/api/bot/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positionId, reason: 'MANUAL_EXIT' }),
      });
      await fetchData();
    } finally {
      setIsClosingPosition(false);
    }
  };

  const handleExecuteSnipe = async (mint: string, solAmount: number) => {
    setIsSniping(true);
    try {
      const res = await fetch('/api/bot/manual-buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mint, solAmount }),
      });
      const data = await res.json();
      await fetchData();
      if (!res.ok) {
        return { success: false, error: data.error, launch: data.launch };
      }
      return { success: true, launch: data.launch };
    } finally {
      setIsSniping(false);
    }
  };

  const handleSwitchMode = async (mode: TradingMode, confirmation?: string) => {
    const res = await fetch('/api/bot/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'set_trading_mode',
        mode,
        confirmationWord: confirmation,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error };
    }
    await fetchData();
    return { success: true };
  };

  const handleSelectTokenFromSpike = (mint: string) => {
    const found = launches.find((l) => l.mint === mint);
    if (found) {
      setSelectedLaunch(found);
    } else {
      setCurrentTab('sniper');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#070a12] text-slate-100">
      {/* Top Header Bar */}
      <Header
        summary={summary}
        onEmergencyStop={handleEmergencyStop}
        onResumeEmergency={handleResumeEmergency}
        onToggleAutoBuy={handleToggleAutoBuy}
        onOpenAuth={() => setIsAuthOpen(true)}
        isAuthenticated={isAuthenticated}
      />

      {/* Main Content Area with Bottom Padding for Floating Tab Bar */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-4 pb-28">
        {/* Real-time Volume Spike Alert Banner */}
        <VolumeSpikeBanner
          alerts={volumeAlerts}
          onSelectToken={handleSelectTokenFromSpike}
          onDismissAlert={(id) => setVolumeAlerts((prev) => prev.filter((a) => a.id !== id))}
        />

        {/* Dynamic View rendering */}
        {currentTab === 'radar' && (
          <RadarView
            launches={launches}
            onSelectLaunch={(launch) => setSelectedLaunch(launch)}
            onRefresh={() => {
              setIsLoading(true);
              fetchData().finally(() => setIsLoading(false));
            }}
            isLoading={isLoading}
          />
        )}

        {currentTab === 'positions' && (
          <PositionsView
            openPositions={openPositions}
            closedPositions={closedPositions}
            metrics={summary?.metrics || {
              launchesDetected: 0,
              launchesRejected: 0,
              launchesApproved: 0,
              buysAttempted: 0,
              buysFilled: 0,
              totalSpentSol: 0,
              dailyLossSol: 0,
              realizedPnlSol: 0,
              unrealizedPnlSol: 0,
              remainingRiskBudgetSol: 0,
            }}
            onClosePosition={handleClosePosition}
            isClosing={isClosingPosition}
            tradingMode={summary?.tradingMode || 'live'}
          />
        )}

        {currentTab === 'risk' && summary && (
          <RiskGuardView
            settings={summary.settings}
            onSaveSettings={handleSaveSettings}
            isAuthenticated={isAuthenticated}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        )}

        {currentTab === 'sniper' && summary && (
          <SniperView
            onExecuteSnipe={handleExecuteSnipe}
            isExecuting={isSniping}
            emergencyStopped={Boolean(summary.emergencyStopped)}
            tradingMode={summary.tradingMode}
            defaultBuySol={summary.settings.maxBuySol}
          />
        )}

        {currentTab === 'docs' && summary && (
          <DocsView
            auditLogs={auditLogs}
            currentMode={summary.tradingMode}
            onSwitchMode={handleSwitchMode}
            isAuthenticated={isAuthenticated}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        )}
      </main>

      {/* iPhone Thumb-Zone Fixed Bottom Navigation Bar */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        openPositionsCount={openPositions.length}
        hasSpikes={volumeAlerts.length > 0}
      />

      {/* Risk Inspection Modal */}
      <RiskDetailModal
        launch={selectedLaunch}
        onClose={() => setSelectedLaunch(null)}
        onQuickBuy={(mint) => {
          setCurrentTab('sniper');
          handleExecuteSnipe(mint, summary?.settings.maxBuySol || 0.05);
        }}
      />

      {/* Owner Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        isAuthenticated={isAuthenticated}
        onLoginSuccess={() => setIsAuthenticated(true)}
        onLogoutSuccess={() => setIsAuthenticated(false)}
      />
    </div>
  );
}
