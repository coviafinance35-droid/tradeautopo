import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const defaults = {
  enabled: false,
  leader_wallet: '',
  allocation_pct: 100,
  max_trade_sol: 0.05,
  max_daily_sol: 1,
  slippage_bps: 500,
  copy_buys: true,
  copy_sells: true,
}

function validWallet(value: unknown) {
  return typeof value === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const [{ data: settings, error: settingsError }, { data: events, error: eventsError }] = await Promise.all([
    supabase.from('copy_trade_settings').select('enabled, leader_wallet, allocation_pct, max_trade_sol, max_daily_sol, slippage_bps, copy_buys, copy_sells').eq('user_id', user.id).maybeSingle(),
    supabase.from('copy_trade_events').select('id, leader_wallet, source_signature, action, mint, symbol, source_amount_sol, copied_amount_sol, status, error_message, source_block_time, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(25),
  ])
  if (settingsError || eventsError) return NextResponse.json({ error: 'Unable to load copy-trade data.' }, { status: 500 })
  return NextResponse.json({ settings: settings ?? defaults, events: events ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  try {
    const body = await request.json()
    if (!validWallet(body.leaderWallet)) return NextResponse.json({ error: 'Enter a valid Solana leader wallet address.' }, { status: 400 })
    const settings = {
      user_id: user.id,
      enabled: Boolean(body.enabled),
      leader_wallet: body.leaderWallet,
      allocation_pct: Number(body.allocationPct),
      max_trade_sol: Number(body.maxTradeSol),
      max_daily_sol: Number(body.maxDailySol),
      slippage_bps: Number(body.slippageBps),
      copy_buys: Boolean(body.copyBuys),
      copy_sells: Boolean(body.copySells),
      updated_at: new Date().toISOString(),
    }
    if (![settings.allocation_pct, settings.max_trade_sol, settings.max_daily_sol].every(Number.isFinite) || settings.allocation_pct <= 0 || settings.allocation_pct > 100 || settings.max_trade_sol <= 0 || settings.max_trade_sol > 100 || settings.max_daily_sol <= 0 || settings.max_daily_sol > 1000 || settings.slippage_bps < 50 || settings.slippage_bps > 3000) {
      return NextResponse.json({ error: 'Copy-trade limits are outside the allowed safety range.' }, { status: 400 })
    }
    const { data, error } = await supabase.from('copy_trade_settings').upsert(settings, { onConflict: 'user_id' }).select('enabled, leader_wallet, allocation_pct, max_trade_sol, max_daily_sol, slippage_bps, copy_buys, copy_sells').single()
    if (error) return NextResponse.json({ error: 'Unable to save copy-trade settings.' }, { status: 500 })
    return NextResponse.json({ settings: data })
  } catch {
    return NextResponse.json({ error: 'Invalid copy-trade request.' }, { status: 400 })
  }
}
