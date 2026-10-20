'use client';

import React, { useState } from 'react';
import {
  Shield,
  Save,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { RiskSettings } from '@/lib/types';
import { TestSuiteReport } from '@/lib/risk/tests';

interface RiskGuardViewProps {
  settings: RiskSettings;
  onSaveSettings: (settings: Partial<RiskSettings>) => Promise<{ success: boolean; error?: string }>;
  isAuthenticated: boolean;
  onOpenAuth: () => void;
}

export function RiskGuardView({
  settings: initialSettings,
  onSaveSettings,
  isAuthenticated,
  onOpenAuth,
}: RiskGuardViewProps) {
  const [form, setForm] = useState<RiskSettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Test Suite Runner state
  const [testReport, setTestReport] = useState<TestSuiteReport | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const handleInputChange = (key: keyof RiskSettings, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      onOpenAuth();
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);
    try {
      const res = await onSaveSettings(form);
      if (res.success) {
        setSaveMessage({ text: 'Risk rules validated and saved to backend persistent store.', type: 'success' });
      } else {
        setSaveMessage({ text: res.error || 'Validation error', type: 'error' });
      }
    } catch (err: any) {
      setSaveMessage({ text: err.message || 'Failed to save', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const runLiveTestSuite = async () => {
    setIsRunningTests(true);
    try {
      const res = await fetch('/api/bot/test-suite', { method: 'POST' });
      const data: TestSuiteReport = await res.json();
      setTestReport(data);
    } catch (err) {
      console.error('Test suite error:', err);
    } finally {
      setIsRunningTests(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Risk Engine Invariant Banner */}
      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
        <div className="flex items-center gap-2 mb-1.5">
          <Shield className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white">01. Deterministic Safety Engine</h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Every newly detected launch is subjected to 8 quantitative invariant rules. If a single rule fails, the purchase is permanently blocked on the backend.
        </p>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSave} className="space-y-4">
        {/* Section A: Capital & Financial Exposure Limits */}
        <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3.5">
          <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
            Capital Ceilings & Loss Budget
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-300 font-medium block mb-1">
                Max SOL Per Purchase (Buy Size)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.005"
                  min="0.001"
                  max="5.0"
                  value={form.maxBuySol}
                  onChange={(e) => handleInputChange('maxBuySol', parseFloat(e.target.value) || 0)}
                  className="w-full h-11 px-3 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
                />
                <span className="absolute right-3 top-3 text-xs text-slate-500 font-mono">SOL</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Default: 0.05 SOL</span>
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">
                Max Total Open Exposure
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.05"
                  min="0.01"
                  max="20.0"
                  value={form.maxOpenExposureSol}
                  onChange={(e) => handleInputChange('maxOpenExposureSol', parseFloat(e.target.value) || 0)}
                  className="w-full h-11 px-3 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
                />
                <span className="absolute right-3 top-3 text-xs text-slate-500 font-mono">SOL</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Ceiling across all active trades</span>
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">
                Max Daily Loss Limit
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="10.0"
                  value={form.maxDailyLossSol}
                  onChange={(e) => handleInputChange('maxDailyLossSol', parseFloat(e.target.value) || 0)}
                  className="w-full h-11 px-3 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
                />
                <span className="absolute right-3 top-3 text-xs text-slate-500 font-mono">SOL</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Hard circuit breaker</span>
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">
                Max Concurrent Positions
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={form.maxConcurrentPositions}
                onChange={(e) => handleInputChange('maxConcurrentPositions', parseInt(e.target.value) || 1)}
                className="w-full h-11 px-3 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Parallel active trades limit</span>
            </div>
          </div>
        </div>

        {/* Section B: Execution & Curve Safety Filters */}
        <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3.5">
          <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
            Curve & Execution Filters
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-300 font-medium block mb-1">
                Max Slippage (Basis Points)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="50"
                  max="3000"
                  step="50"
                  value={form.maxSlippageBps}
                  onChange={(e) => handleInputChange('maxSlippageBps', parseInt(e.target.value) || 500)}
                  className="w-full h-11 px-3 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
                />
                <span className="absolute right-3 top-3 text-xs text-slate-500 font-mono">BPS</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">500 bps = 5.0% slippage ceiling</span>
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">
                Min Bonding Curve Liquidity
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="10"
                  max="50"
                  value={form.minLiquiditySol}
                  onChange={(e) => handleInputChange('minLiquiditySol', parseFloat(e.target.value) || 28)}
                  className="w-full h-11 px-3 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
                />
                <span className="absolute right-3 top-3 text-xs text-slate-500 font-mono">SOL</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Normal initial virtual reserve is 30 SOL</span>
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">
                Min Unique Independent Buyers
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={form.minUniqueBuyers}
                onChange={(e) => handleInputChange('minUniqueBuyers', parseInt(e.target.value) || 3)}
                className="w-full h-11 px-3 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Filters out single-wallet wash trades</span>
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">
                Max Creator Holding %
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={form.maxCreatorHoldingPct}
                  onChange={(e) => handleInputChange('maxCreatorHoldingPct', parseFloat(e.target.value) || 15)}
                  className="w-full h-11 px-3 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
                />
                <span className="absolute right-3 top-3 text-xs text-slate-500 font-mono">%</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Blocks instant developer dump risk</span>
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">
                Take Profit Target %
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="5"
                  max="500"
                  value={form.takeProfitPct}
                  onChange={(e) => handleInputChange('takeProfitPct', parseFloat(e.target.value) || 35)}
                  className="w-full h-11 px-3 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
                />
                <span className="absolute right-3 top-3 text-xs text-slate-500 font-mono">%</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Automated sell when gain reached</span>
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">
                Stop Loss Target %
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="5"
                  max="80"
                  value={form.stopLossPct}
                  onChange={(e) => handleInputChange('stopLossPct', parseFloat(e.target.value) || 15)}
                  className="w-full h-11 px-3 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
                />
                <span className="absolute right-3 top-3 text-xs text-slate-500 font-mono">%</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Automated stop loss trigger</span>
            </div>
          </div>
        </div>

        {/* Feedback message */}
        {saveMessage && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              saveMessage.type === 'success'
                ? 'bg-emerald-950/30 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/30 border border-rose-500/30 text-rose-300'
            }`}
          >
            {saveMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{saveMessage.text}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSaving}
          className="w-full min-h-[48px] py-2.5 px-4 bg-cyan-400 hover:bg-cyan-300 active:scale-[0.99] text-slate-950 font-bold text-sm rounded-xl transition-all shadow-lg shadow-cyan-500/10 flex items-center justify-center gap-2"
        >
          {isAuthenticated ? <Save className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          <span>{isSaving ? 'Validating on Server...' : isAuthenticated ? 'Save Risk Parameters' : 'Sign In as Owner to Edit'}</span>
        </button>
      </form>

      {/* Automated Unit & Security Test Suite Runner */}
      <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Automated Safety & Security Test Suite
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Executes live tests verifying all 8 rejection rules, circuit breakers, and zero-key leak invariants.
            </p>
          </div>
          <button
            onClick={runLiveTestSuite}
            disabled={isRunningTests}
            className="min-h-[40px] px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs font-bold text-white rounded-xl transition-all flex items-center gap-1.5 shrink-0"
          >
            <Play className={`w-3.5 h-3.5 ${isRunningTests ? 'animate-spin' : ''}`} />
            <span>{isRunningTests ? 'Testing...' : 'Run Test Suite'}</span>
          </button>
        </div>

        {testReport && (
          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">
                Suite Result: {testReport.passedTests}/{testReport.totalTests} Passed
              </span>
              <span className={`font-mono font-bold ${testReport.allPassed ? 'text-emerald-400' : 'text-rose-400'}`}>
                {testReport.allPassed ? '100% INVARIANTS VERIFIED' : 'FAILURES DETECTED'}
              </span>
            </div>

            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {testReport.results.map((t) => (
                <div
                  key={t.id}
                  className="p-2 bg-slate-950/60 rounded-lg border border-slate-800/60 text-[11px] flex items-start gap-2"
                >
                  {t.passed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{t.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono tabular-nums">{t.durationMs}ms</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{t.details}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
