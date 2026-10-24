import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { getEngine } from '@/lib/bot/state';
import { evaluateLaunchRisk } from '@/lib/risk/engine';
import type { TokenLaunch } from '@/lib/types';

const PUMP_API = 'https://frontend-api-v3.pump.fun/coins';
const DEX_PROFILES_API = 'https://api.dexscreener.com/token-profiles/latest/v1';
const DEX_TOKENS_API = 'https://api.dexscreener.com/latest/dex/tokens';

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toLaunch(coin: Record<string, unknown>): TokenLaunch | null {
  const mint = typeof coin.mint === 'string' ? coin.mint : '';
  if (!mint) return null;

  try {
    new PublicKey(mint);
  } catch {
    return null;
  }

  const createdAt = asNumber(coin.created_timestamp, Date.now());
  const virtualSolReserves = asNumber(coin.virtual_sol_reserves, 0);
  const virtualTokenReserves = asNumber(coin.virtual_token_reserves, 0);
  const marketCapSol = asNumber(coin.market_cap, asNumber(coin.market_cap_sol, 0));
  const priceSol = virtualTokenReserves > 0
    ? (virtualSolReserves / 1e9) / virtualTokenReserves
    : 0;
  const volume = asNumber(coin.total_market_cap, 0);

  return {
    mint,
    name: typeof coin.name === 'string' ? coin.name : 'Unknown token',
    symbol: typeof coin.symbol === 'string' ? coin.symbol : 'UNKNOWN',
    description: typeof coin.description === 'string' ? coin.description : undefined,
    uri: typeof coin.uri === 'string' ? coin.uri : undefined,
    creator: typeof coin.creator === 'string' ? coin.creator : 'Unknown',
    creationTime: createdAt < 10_000_000_000 ? createdAt * 1000 : createdAt,
    bondingCurveAddress: typeof coin.bonding_curve === 'string' ? coin.bonding_curve : '',
    virtualSolReserves,
    virtualTokenReserves,
    realSolReserves: asNumber(coin.real_sol_reserves, 0),
    priceSol,
    marketCapSol,
    uniqueBuyersCount: asNumber(coin.num_participants, 0),
    txCount: asNumber(coin.total_supply, 0),
    creatorHoldingPct: 0,
    isCreatorHistoryKnown: false,
    creatorPreviousLaunches: 0,
    creatorRugCount: 0,
    volume5mSol: volume,
    volumeSpike: false,
    status: 'evaluating',
    detectedAt: Date.now(),
    isSimulated: false,
  };
}

export async function GET(req: NextRequest) {
  try {
    const engine = getEngine();
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter');
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 50), 1), 100);
    const response = await fetch(`${PUMP_API}?sort=created_timestamp&order=DESC&limit=${limit}&offset=0&includeNsfw=false`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 5 },
    });

    let remoteLaunches: TokenLaunch[] = [];
    let source = 'pump.fun';

    if (response.ok) {
      const payload = await response.json();
      remoteLaunches = (Array.isArray(payload) ? payload : payload.coins || [])
        .map((coin: Record<string, unknown>) => toLaunch(coin))
        .filter((launch: TokenLaunch | null): launch is TokenLaunch => Boolean(launch));
    }

    if (remoteLaunches.length === 0) {
      const profilesResponse = await fetch(DEX_PROFILES_API, { next: { revalidate: 5 } });
      if (!profilesResponse.ok) throw new Error(`Live token feed returned ${profilesResponse.status}`);
      const profiles = await profilesResponse.json() as Array<Record<string, unknown>>;
      const addresses = profiles
        .filter((profile) => profile.chainId === 'solana' && typeof profile.tokenAddress === 'string')
        .slice(0, limit)
        .map((profile) => profile.tokenAddress as string);
      const pairsResponse = await fetch(`${DEX_TOKENS_API}/${addresses.join(',')}`, { next: { revalidate: 5 } });
      if (!pairsResponse.ok) throw new Error(`Solana market feed returned ${pairsResponse.status}`);
      const pairsPayload = await pairsResponse.json() as { pairs?: Array<Record<string, unknown>> };
      remoteLaunches = (pairsPayload.pairs || []).map((pair) => {
        const base = (pair.baseToken || {}) as Record<string, unknown>;
        const liquidity = (pair.liquidity || {}) as Record<string, unknown>;
        const volume = (pair.volume || {}) as Record<string, unknown>;
        return toLaunch({
          mint: base.address,
          name: base.name,
          symbol: base.symbol,
          creator: 'Dexscreener market source',
          created_timestamp: asNumber(pair.pairCreatedAt, Date.now()),
          virtual_sol_reserves: asNumber(liquidity.usd, 0) * 1e6,
          virtual_token_reserves: 1e9,
          real_sol_reserves: asNumber(liquidity.usd, 0) / 150,
          market_cap: asNumber((pair.fdv ?? pair.marketCap), 0) / 150,
          total_market_cap: asNumber(volume.h24, 0) / 150,
          num_participants: 0,
          total_supply: 0,
        });
      }).filter((launch): launch is TokenLaunch => Boolean(launch));
      source = 'dexscreener-solana';
    }

    const settings = engine.getSummary().settings;
    const liveLaunches: TokenLaunch[] = remoteLaunches.map((launch: TokenLaunch) => {
      const riskEvaluation = evaluateLaunchRisk(launch, {
        settings,
        wallet: engine.getSummary().wallet,
        metrics: engine.getSummary().metrics,
        openPositions: engine.getPositions().filter((position) => position.status === 'OPEN'),
        lastTradeTime: 0,
        knownBadCreators: new Set(),
      });
      return { ...launch, riskEvaluation, status: riskEvaluation.decision === 'APPROVED' ? 'eligible' : 'rejected' };
    });

    const filtered = filter === 'approved'
      ? liveLaunches.filter((launch: TokenLaunch) => launch.riskEvaluation?.decision === 'APPROVED')
      : filter === 'rejected'
        ? liveLaunches.filter((launch: TokenLaunch) => launch.riskEvaluation?.decision === 'REJECTED')
        : liveLaunches;

    return NextResponse.json({ launches: filtered, totalCount: filtered.length, source, timestamp: Date.now() });
  } catch (error) {
    const engine = getEngine();
    return NextResponse.json({
      launches: engine.getLaunches(),
      totalCount: engine.getLaunches().length,
      source: 'engine-fallback',
      error: error instanceof Error ? error.message : 'Failed to fetch live launches',
      timestamp: Date.now(),
    }, { status: 200 });
  }
}
