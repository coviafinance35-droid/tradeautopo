import {
  TokenLaunch,
  RiskEvaluation,
  RiskSettings,
  RiskCheckDetail,
  DailyMetrics,
  Position,
  WalletInfo,
} from '../types';
import { calculateBuyQuote, getBondingCurvePDA } from '../pumpfun/constants';
import { PublicKey } from '@solana/web3.js';

export interface EvaluationContext {
  settings: RiskSettings;
  wallet: WalletInfo;
  metrics: DailyMetrics;
  openPositions: Position[];
  lastTradeTime: number;
  knownBadCreators?: Set<string>;
}

/**
 * Deterministic Risk Engine for Pump.fun Launches
 * Evaluates tokens against hard quantitative thresholds and behavioral flags.
 * Rule: ANY critical failure immediately results in REJECTION.
 */
export function evaluateLaunchRisk(
  launch: TokenLaunch,
  context: EvaluationContext
): RiskEvaluation {
  const { settings, wallet, metrics, openPositions, lastTradeTime, knownBadCreators } = context;
  const checks: Record<string, RiskCheckDetail> = {};
  const rejectionReasons: string[] = [];

  const now = Date.now();
  const launchAgeSeconds = Math.max(0, Math.floor((now - launch.creationTime) / 1000));

  // --- CHECK 1: Liquidity Depth & Virtual Reserves ---
  const virtualSol = launch.virtualSolReserves / 1e9;
  const passLiquidity = virtualSol >= settings.minLiquiditySol;
  checks.liquidity = {
    pass: passLiquidity,
    label: 'Bonding Curve Liquidity',
    detail: `${virtualSol.toFixed(2)} SOL (Min required: ${settings.minLiquiditySol} SOL)`,
    critical: true,
  };
  if (!passLiquidity) {
    rejectionReasons.push(`Insufficient initial liquidity (${virtualSol.toFixed(1)} SOL < ${settings.minLiquiditySol} SOL threshold)`);
  }

  // --- CHECK 2: Price Impact & Slippage Simulation ---
  const buyQuote = calculateBuyQuote(settings.maxBuySol, launch.virtualSolReserves, launch.virtualTokenReserves);
  const passPriceImpact = buyQuote.priceImpactPct <= settings.maxPriceImpactPct;
  checks.priceImpact = {
    pass: passPriceImpact,
    label: 'Simulated Price Impact',
    detail: `${buyQuote.priceImpactPct.toFixed(2)}% impact for ${settings.maxBuySol} SOL buy (Max: ${settings.maxPriceImpactPct}%)`,
    critical: true,
  };
  if (!passPriceImpact) {
    rejectionReasons.push(`Estimated price impact too high (${buyQuote.priceImpactPct.toFixed(2)}% > ${settings.maxPriceImpactPct}%)`);
  }

  // --- CHECK 3: Creator Supply Concentration & Reputation ---
  const isKnownBlacklist = knownBadCreators?.has(launch.creator) || launch.creatorRugCount > 0;
  const passCreatorHolding = launch.creatorHoldingPct <= settings.maxCreatorHoldingPct;
  const passCreatorBlacklist = !isKnownBlacklist;
  
  // Note: Unknown creator history is treated as unknown (flagged), not proof of safety
  const creatorKnownPass = settings.allowUnknownCreator ? true : launch.isCreatorHistoryKnown;

  const passCreator = passCreatorHolding && passCreatorBlacklist && creatorKnownPass;
  checks.creator = {
    pass: passCreator,
    label: 'Creator Holdings & Trust',
    detail: `Holds ${launch.creatorHoldingPct.toFixed(1)}% supply (Max: ${settings.maxCreatorHoldingPct}%). Past rugs: ${launch.creatorRugCount}. Known: ${launch.isCreatorHistoryKnown ? 'Yes' : 'Unknown'}`,
    critical: true,
  };
  if (!passCreatorHolding) {
    rejectionReasons.push(`Creator supply concentration too high (${launch.creatorHoldingPct.toFixed(1)}% > ${settings.maxCreatorHoldingPct}%)`);
  }
  if (!passCreatorBlacklist) {
    rejectionReasons.push(`Creator identified in suspicious rugs / blacklisted address history (${launch.creatorRugCount} prior flagged rugs)`);
  }
  if (!creatorKnownPass) {
    rejectionReasons.push('Creator history is completely unverified/unknown and strict creator verification rule is enabled');
  }

  // --- CHECK 4: Unique Buyers & Wash Trade Filter ---
  const passUniqueBuyers = launch.uniqueBuyersCount >= settings.minUniqueBuyers;
  checks.buyers = {
    pass: passUniqueBuyers,
    label: 'Unique Wallet Distribution',
    detail: `${launch.uniqueBuyersCount} unique buyers (Min: ${settings.minUniqueBuyers})`,
    critical: true,
  };
  if (!passUniqueBuyers) {
    rejectionReasons.push(`Low buyer diversity (${launch.uniqueBuyersCount} independent buyers < ${settings.minUniqueBuyers}) - risk of single-wallet wash trade`);
  }

  // --- CHECK 5: Market Data Age & Freshness ---
  const passAge = launchAgeSeconds <= settings.maxAcceptableAgeSeconds;
  checks.dataFreshness = {
    pass: passAge,
    label: 'Launch Age & Freshness',
    detail: `${launchAgeSeconds}s old (Max acceptable: ${settings.maxAcceptableAgeSeconds}s)`,
    critical: true,
  };
  if (!passAge) {
    rejectionReasons.push(`Launch is stale or delayed (${launchAgeSeconds}s old > ${settings.maxAcceptableAgeSeconds}s limit)`);
  }

  // --- CHECK 6: Program PDA & Instruction Verification ---
  let passPDA = false;
  try {
    const mintPubkey = new PublicKey(launch.mint);
    const [expectedPDA] = getBondingCurvePDA(mintPubkey);
    passPDA = expectedPDA.toBase58() === launch.bondingCurveAddress;
  } catch {
    passPDA = false;
  }
  checks.programVerification = {
    pass: passPDA,
    label: 'Pump.fun Program & PDA Authenticity',
    detail: passPDA ? 'Verified authentic bonding curve PDA' : 'PDA address mismatch or invalid public key',
    critical: true,
  };
  if (!passPDA) {
    rejectionReasons.push('Authenticity failure: token does not match authoritative Pump.fun PDA derivation');
  }

  // --- CHECK 7: Wallet Balance & Fee Reserve ---
  const requiredSol = settings.maxBuySol + (settings.priorityFeeSol || 0.005) + 0.002; // reserve for gas
  const passBalance = wallet.availableSol >= requiredSol;
  checks.walletSol = {
    pass: passBalance,
    label: 'Wallet Capital & Fee Reserve',
    detail: `${wallet.availableSol.toFixed(4)} SOL available (Requires ${requiredSol.toFixed(4)} SOL with fees)`,
    critical: true,
  };
  if (!passBalance) {
    rejectionReasons.push(`Insufficient available SOL balance (${wallet.availableSol.toFixed(4)} SOL < ${requiredSol.toFixed(4)} SOL required with gas buffer)`);
  }

  // --- CHECK 8: Financial Exposure & Risk Limits ---
  const currentExposure = openPositions.reduce((acc, pos) => acc + pos.costSol, 0);
  const nextExposure = currentExposure + settings.maxBuySol;
  const passExposure = nextExposure <= settings.maxOpenExposureSol;

  const passPositionsCount = openPositions.length < settings.maxConcurrentPositions;
  const passDailyLoss = metrics.dailyLossSol < settings.maxDailyLossSol;

  const secondsSinceLastTrade = Math.floor((now - lastTradeTime) / 1000);
  const passCooldown = lastTradeTime === 0 || secondsSinceLastTrade >= settings.cooldownSeconds;

  const passRiskLimits = passExposure && passPositionsCount && passDailyLoss && passCooldown;
  checks.riskBudget = {
    pass: passRiskLimits,
    label: 'Portfolio Risk Budget & Cooldown',
    detail: `Exposure: ${currentExposure.toFixed(3)}/${settings.maxOpenExposureSol} SOL | Positions: ${openPositions.length}/${settings.maxConcurrentPositions} | Cooldown: ${secondsSinceLastTrade}s/${settings.cooldownSeconds}s`,
    critical: true,
  };
  if (!passExposure) {
    rejectionReasons.push(`Exceeds max open exposure limit (${nextExposure.toFixed(3)} SOL > ${settings.maxOpenExposureSol} SOL)`);
  }
  if (!passPositionsCount) {
    rejectionReasons.push(`Max concurrent positions reached (${openPositions.length}/${settings.maxConcurrentPositions})`);
  }
  if (!passDailyLoss) {
    rejectionReasons.push(`Daily loss limit reached (${metrics.dailyLossSol.toFixed(3)} SOL >= ${settings.maxDailyLossSol} SOL)`);
  }
  if (!passCooldown) {
    rejectionReasons.push(`Trade cooldown active (${secondsSinceLastTrade}s elapsed < ${settings.cooldownSeconds}s required)`);
  }

  // --- Compute Deterministic Score & Confidence ---
  const totalChecks = Object.keys(checks).length;
  const passedChecks = Object.values(checks).filter(c => c.pass).length;
  const baseScore = Math.round((passedChecks / totalChecks) * 100);

  // Confidence is calculated from available on-chain data points
  let confidence = 85;
  if (!launch.isCreatorHistoryKnown) confidence -= 20;
  if (launch.uniqueBuyersCount < 5) confidence -= 10;
  confidence = Math.max(35, Math.min(99, confidence));

  const isApproved = rejectionReasons.length === 0;

  let riskLevel: 'SAFE' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'SAFE';
  if (rejectionReasons.length > 2 || !passPDA || !passCreatorBlacklist) {
    riskLevel = 'CRITICAL';
  } else if (rejectionReasons.length > 0) {
    riskLevel = 'HIGH';
  } else if (baseScore < 90 || !launch.isCreatorHistoryKnown) {
    riskLevel = 'MODERATE';
  }

  const explanation = isApproved
    ? `All 8 safety invariant checks passed with 100% compliance. Bonding curve liquidity (${virtualSol.toFixed(1)} SOL) meets depth threshold, creator holds safe portion (${launch.creatorHoldingPct.toFixed(1)}%), and portfolio risk limits are clear.`
    : `Safety checks failed with ${rejectionReasons.length} rejection reason(s): ${rejectionReasons.slice(0, 2).join('; ')}${rejectionReasons.length > 2 ? ` (+${rejectionReasons.length - 2} more)` : ''}. Automatic execution blocked.`;

  return {
    score: isApproved ? baseScore : Math.min(baseScore, 48),
    confidence,
    riskLevel,
    decision: isApproved ? 'APPROVED' : 'REJECTED',
    rejectionReasons,
    explanation,
    checks,
    evaluatedAt: now,
  };
}
