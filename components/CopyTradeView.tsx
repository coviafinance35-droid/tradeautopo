'use client'

import { useEffect, useState } from 'react'
import { Copy, RefreshCw, ShieldCheck, Zap } from 'lucide-react'

type Settings = { enabled: boolean; leader_wallet: string; allocation_pct: number; max_trade_sol: number; max_daily_sol: number; slippage_bps: number; copy_buys: boolean; copy_sells: boolean }
type Event = { id: string; action: string; mint: string; symbol?: string; copied_amount_sol?: number; status: string; created_at: string; source_signature: string }

const initial: Settings = { enabled: false, leader_wallet: '', allocation_pct: 100, max_trade_sol: 0.05, max_daily_sol: 1, slippage_bps: 500, copy_buys: true, copy_sells: true }

export function CopyTradeView() {
  const [settings, setSettings] = useState<Settings>(initial)
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function load() {
    setLoading(true)
    const response = await fetch('/api/copy-trade')
    const data = await response.json()
    if (response.ok) { setSettings({ ...initial, ...data.settings }); setEvents(data.events ?? []) }
    else setMessage(data.error ?? 'Sign in to configure copy trading.')
    setLoading(false)
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, 0)
    const poller = window.setInterval(() => { void load() }, 10000)
    return () => {
      window.clearTimeout(timer)
      window.clearInterval(poller)
    }
  }, [])

  async function save() {
    setSaving(true); setMessage('')
    const response = await fetch('/api/copy-trade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: settings.enabled, leaderWallet: settings.leader_wallet.trim(), allocationPct: settings.allocation_pct, maxTradeSol: settings.max_trade_sol, maxDailySol: settings.max_daily_sol, slippageBps: settings.slippage_bps, copyBuys: settings.copy_buys, copySells: settings.copy_sells }) })
    const data = await response.json()
    setMessage(response.ok ? 'Mirroring configuration saved.' : data.error ?? 'Unable to save configuration.')
    if (response.ok) setSettings({ ...settings, ...data.settings })
    setSaving(false)
  }

  return <section className="space-y-4">
    <div className="flex items-start justify-between"><div><p className="text-xs uppercase tracking-[0.22em] text-cyan-400">Autonomous execution</p><h2 className="mt-1 text-2xl font-semibold text-white">Copy trade mirroring</h2><p className="mt-1 text-sm text-slate-400">Watch one leader wallet and mirror approved buys and sells within your limits.</p></div><button onClick={load} className="rounded-lg border border-slate-700 p-2 text-slate-300" aria-label="Refresh copy trade events"><RefreshCw className="h-4 w-4" /></button></div>
    <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.06] p-4"><div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-cyan-300" /><div><p className="font-medium text-slate-100">Risk controls stay in charge</p><p className="text-xs text-slate-400">Mirrored orders are capped by allocation, per-trade, daily, and slippage limits.</p></div></div></div>
    <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <label className="flex items-center justify-between rounded-xl border border-slate-800 p-3"><span><span className="block text-sm font-medium text-slate-100">Enable mirroring</span><span className="text-xs text-slate-500">Only starts monitoring after save</span></span><input type="checkbox" checked={settings.enabled} onChange={e => setSettings({ ...settings, enabled: e.target.checked })} className="h-5 w-5 accent-cyan-400" /></label>
      <label className="text-xs text-slate-400">Leader wallet<input value={settings.leader_wallet} onChange={e => setSettings({ ...settings, leader_wallet: e.target.value })} placeholder="Solana wallet address" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400" /></label>
      <div className="grid grid-cols-2 gap-3">{([['allocation_pct','Allocation %'],['max_trade_sol','Max trade SOL'],['max_daily_sol','Daily cap SOL'],['slippage_bps','Slippage bps']] as const).map(([key,label]) => <label key={key} className="text-xs text-slate-400">{label}<input type="number" value={settings[key]} onChange={e => setSettings({ ...settings, [key]: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400" /></label>)}</div>
      <div className="flex gap-4 text-sm text-slate-300"><label><input type="checkbox" checked={settings.copy_buys} onChange={e => setSettings({ ...settings, copy_buys: e.target.checked })} className="mr-2 accent-cyan-400" />Copy buys</label><label><input type="checkbox" checked={settings.copy_sells} onChange={e => setSettings({ ...settings, copy_sells: e.target.checked })} className="mr-2 accent-cyan-400" />Copy sells</label></div>
      <button onClick={save} disabled={saving || loading} className="flex items-center justify-center gap-2 rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50"><Zap className="h-4 w-4" />{saving ? 'Saving...' : 'Save mirroring rules'}</button>{message && <p className="text-xs text-slate-400">{message}</p>}
    </div>
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"><div className="mb-3 flex items-center justify-between"><h3 className="font-medium text-white">Recent mirrored activity</h3><span className="text-xs text-slate-500">{loading ? 'Loading...' : `${events.length} events`}</span></div>{events.length === 0 ? <p className="text-sm text-slate-500">No mirrored trades recorded yet.</p> : <div className="space-y-2">{events.map(event => <div key={event.id} className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-2"><div className="flex items-center gap-2"><Copy className="h-4 w-4 text-slate-500" /><span className={event.action === 'BUY' ? 'text-emerald-300' : 'text-rose-300'}>{event.action}</span><span className="text-sm text-slate-300">{event.symbol ?? event.mint.slice(0, 8)}</span></div><span className="text-xs text-slate-500">{event.status}</span></div>)}</div>}</div>
  </section>
}
