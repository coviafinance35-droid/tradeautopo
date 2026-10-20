'use client';

import React, { useState } from 'react';
import {
  FileText,
  Smartphone,
  Cloud,
  ShieldCheck,
  CheckSquare,
  History,
  Lock,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { AuditLogEntry, TradingMode } from '@/lib/types';
import { formatTimeAgo } from '@/lib/formatters';

interface DocsViewProps {
  auditLogs: AuditLogEntry[];
  currentMode: TradingMode;
  onSwitchMode: (mode: TradingMode, confirmation?: string) => Promise<{ success: boolean; error?: string }>;
  isAuthenticated: boolean;
  onOpenAuth: () => void;
}

export function DocsView({
  auditLogs,
  currentMode,
  onSwitchMode,
  isAuthenticated,
  onOpenAuth,
}: DocsViewProps) {
  const [activeSection, setActiveSection] = useState<'iphone' | 'freetier' | 'security' | 'checklist' | 'audit'>('iphone');
  const [liveConfirmInput, setLiveConfirmInput] = useState('');
  const [modeError, setModeError] = useState<string | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);

  const handleModeSwitch = async (targetMode: TradingMode) => {
    if (!isAuthenticated) {
      onOpenAuth();
      return;
    }

    setModeError(null);
    setIsSwitching(true);

    try {
      const res = await onSwitchMode(targetMode, targetMode === 'live' ? liveConfirmInput : undefined);
      if (!res.success) {
        setModeError(res.error || 'Failed to switch mode');
      } else {
        setLiveConfirmInput('');
      }
    } catch (err: any) {
      setModeError(err.message || 'Error occurred');
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Segmented Section Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-xl border border-slate-800 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveSection('iphone')}
          className={`min-h-[36px] px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors ${
            activeSection === 'iphone' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          iPhone Setup
        </button>
        <button
          onClick={() => setActiveSection('freetier')}
          className={`min-h-[36px] px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors ${
            activeSection === 'freetier' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Free-Tier Guide
        </button>
        <button
          onClick={() => setActiveSection('checklist')}
          className={`min-h-[36px] px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors ${
            activeSection === 'checklist' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Live Checklist
        </button>
        <button
          onClick={() => setActiveSection('security')}
          className={`min-h-[36px] px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors ${
            activeSection === 'security' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Security Review
        </button>
        <button
          onClick={() => setActiveSection('audit')}
          className={`min-h-[36px] px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors ${
            activeSection === 'audit' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Audit Log ({auditLogs.length})
        </button>
      </div>

      {/* SECTION 1: iPhone Safari Setup */}
      {activeSection === 'iphone' && (
        <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3 text-xs">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm text-white">iPhone Safari PWA Setup Guide</h3>
          </div>
          <p className="text-slate-400 leading-relaxed">
            LaunchGuard was engineered from the ground up for one-handed iPhone Safari operation without requiring a desktop Mac or terminal.
          </p>

          <div className="space-y-2 pt-1">
            <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800">
              <span className="font-bold text-slate-200 block mb-0.5">Step 1: Open in Apple Safari</span>
              <span className="text-slate-400">Navigate to the hosted application URL in Safari on your iPhone (iOS 16+ recommended).</span>
            </div>
            <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800">
              <span className="font-bold text-slate-200 block mb-0.5">Step 2: Add to Home Screen</span>
              <span className="text-slate-400">Tap the Safari Share button (the square with an arrow pointing up), scroll down and tap <strong className="text-white">&ldquo;Add to Home Screen&rdquo;</strong>.</span>
            </div>
            <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800">
              <span className="font-bold text-slate-200 block mb-0.5">Step 3: Standalone Full-Screen Mode</span>
              <span className="text-slate-400">Launch from your iPhone home screen icon. Safari browser chrome is hidden, safe-area notches are handled automatically, and bottom thumb-zone controls remain pinned.</span>
            </div>
            <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800">
              <span className="font-bold text-slate-200 block mb-0.5">Step 4: Lock Orientation & Haptic Touch</span>
              <span className="text-slate-400">The app operates in portrait orientation with 44px+ hitboxes designed for comfortable one-thumb reach while checking new launches on the go.</span>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: Free-Tier Deployment Blueprint */}
      {activeSection === 'freetier' && (
        <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3 text-xs">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm text-white">Free-First Deployment Strategy & Realistic Disclosures</h3>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Full transparency on zero-cost hosting limitations and continuous execution worker reliability:
          </p>

          <div className="space-y-2.5 pt-1">
            <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 space-y-1">
              <div className="font-bold text-emerald-400">1. Solana RPC & WebSocket (100% Free)</div>
              <p className="text-slate-300">
                • <strong>Helius Free Tier:</strong> 1,000,000 daily credits, including Enhanced WebSockets and transaction parsing. Best free provider for Pump.fun.<br />
                • <strong>QuickNode Free:</strong> 10M monthly API credits, low-latency Solana endpoints.<br />
                • <strong>Public Mainnet RPC:</strong> <code>https://api.mainnet-beta.solana.com</code> (Subject to 429 rate limits, recommended only for dev/paper testing).
              </p>
            </div>

            <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 space-y-1">
              <div className="font-bold text-amber-400">2. Free Web & API Hosting (Vercel / Render / Cloud Run)</div>
              <p className="text-slate-300">
                • <strong>Vercel / Cloud Run Free Tier:</strong> Host the Next.js mobile web dashboard with instant global CDN.<br />
                • <strong>Limitation Disclosure:</strong> Serverless functions freeze after inactivity (no continuous background loop). LaunchGuard gracefully handles this with state hydration on requests.
              </p>
            </div>

            <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 space-y-1">
              <div className="font-bold text-cyan-400">3. Continuous 24/7 Worker Options</div>
              <p className="text-slate-300">
                • <strong>Free Monitoring Mode (Default):</strong> Evaluates launches and tracks positions while dashboard is open or on API hits.<br />
                • <strong>True 24/7 Continuous Sniper:</strong> Deploy the backend worker process on <strong>Fly.io (Free 3 VMs)</strong>, <strong>Railway</strong>, or a $5/mo VPS (Hetzner). Never trust serverless free plans for uninterrupted sub-second live sniping.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: Live Trading Checklist */}
      {activeSection === 'checklist' && (
        <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3.5 text-xs">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm text-white">Simulation to Live Trading Checklist</h3>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Strict requirements that must be met before switching from Simulation Mode to live on-chain execution:
          </p>

          <div className="space-y-2">
            {[
              'Dedicated trading wallet generated with isolated key (NEVER your personal savings wallet)',
              'Maximum 0.1 - 0.5 SOL deposited into trading wallet for testing',
              'Valid dedicated Solana RPC URL configured (Helius or QuickNode recommended)',
              'Automated safety invariant test suite passed with 100% verified checks',
              'Conservative risk rules configured (Max buy <= 0.05 SOL, Max slippage <= 5%)',
              'Owner passcode configured in environment variables to prevent unauthorized access',
              'Paper trading executed for at least 24 hours to observe rejection behavior',
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2 bg-slate-950/40 rounded-lg border border-slate-800/60">
                <div className="w-4 h-4 rounded bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <span className="text-slate-300">{item}</span>
              </div>
            ))}
          </div>

          {/* Mode Switch Card */}
          <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">Current Mode:</span>
              <span className={`font-mono font-bold uppercase ${currentMode === 'live' ? 'text-amber-400' : 'text-cyan-400'}`}>
                {currentMode}
              </span>
            </div>

            {currentMode === 'simulation' ? (
              <div className="space-y-2.5">
                <p className="text-[11px] text-slate-400">
                  To activate Live Trading, enter the required confirmation phrase: <span className="font-mono text-amber-300">CONFIRM_LIVE_TRADING</span>
                </p>
                <input
                  type="text"
                  value={liveConfirmInput}
                  onChange={(e) => setLiveConfirmInput(e.target.value)}
                  placeholder="CONFIRM_LIVE_TRADING"
                  className="w-full h-10 px-3 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                />
                {modeError && (
                  <p className="text-[11px] text-rose-400">{modeError}</p>
                )}
                <button
                  onClick={() => handleModeSwitch('live')}
                  disabled={isSwitching || liveConfirmInput !== 'CONFIRM_LIVE_TRADING'}
                  className="w-full min-h-[44px] py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Activate Live Mainnet Execution</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleModeSwitch('simulation')}
                disabled={isSwitching}
                className="w-full min-h-[44px] py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors"
              >
                Switch Back to Paper Trading (Simulation)
              </button>
            )}
          </div>
        </div>
      )}

      {/* SECTION 4: Security Review & Audit Trail */}
      {activeSection === 'security' && (
        <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3 text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm text-white">Security Architecture & Invariants</h3>
          </div>

          <div className="space-y-2.5 text-slate-300 leading-relaxed">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <strong className="text-white block mb-0.5">1. Zero Private Key Leakage</strong>
              <p className="text-slate-400">
                Private keys are strictly loaded server-side into Node.js process memory via <code>process.env</code>. They are NEVER sent to the browser, NEVER serialized into API responses, and never logged.
              </p>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <strong className="text-white block mb-0.5">2. Server-Enforced Limits</strong>
              <p className="text-slate-400">
                Financial caps (Max Buy, Max Exposure, Daily Loss) are verified directly in the Node.js execution loop. Frontend inputs cannot bypass backend invariants.
              </p>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <strong className="text-white block mb-0.5">3. Non-Overridable Hard Rejection</strong>
              <p className="text-slate-400">
                The risk engine is deterministic. AI or machine learning models may provide human explanations, but can never override a failed safety check.
              </p>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <strong className="text-white block mb-0.5">4. Idempotency & Duplicate Protection</strong>
              <p className="text-slate-400">
                In-flight mint addresses are locked in an execution set. Even if duplicate WebSocket events are delivered by RPC, only a single purchase is permitted.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: Immutable Audit Logs */}
      {activeSection === 'audit' && (
        <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3 text-xs">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm text-white">Immutable Decision & Security Audit Trail</h3>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {auditLogs.length === 0 ? (
              <p className="text-slate-500 py-4 text-center">No audit logs recorded yet.</p>
            ) : (
              auditLogs.map((log) => {
                const isCrit = log.severity === 'critical';
                const isWarn = log.severity === 'warn';
                return (
                  <div
                    key={log.id}
                    className={`p-2.5 rounded-xl border ${
                      isCrit
                        ? 'bg-rose-950/30 border-rose-800/60 text-rose-200'
                        : isWarn
                        ? 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-white">{log.title}</span>
                      <span className="text-[10px] text-slate-500 tabular-nums">
                        {formatTimeAgo(log.timestamp)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">{log.details}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
