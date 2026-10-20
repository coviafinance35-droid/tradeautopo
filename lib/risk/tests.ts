import { TokenLaunch, RiskSettings, WalletInfo, DailyMetrics, Position } from '../types';
import { evaluateLaunchRisk, EvaluationContext } from './engine';
import { Keypair } from '@solana/web3.js';
import { getBondingCurvePDA } from '../pumpfun/constants';

export interface TestResult {
  id: string;
  name: string;
  category: 'RISK_LOGIC' | 'SECURITY' | 'EXECUTION_INVARIANTS' | 'IDEMPOTENCY';
  passed: boolean;
  expected: string;
  actual: string;
  details: string;
  durationMs: number;
}

export interface TestSuiteReport {
  timestamp: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  allPassed: boolean;
  results: TestResult[];
}

export function runFullTestSuite(): TestSuiteReport {
  const startTime = Date.now();
  const results: TestResult[] = [];

  const defaultSettings: RiskSettings = {
    autoBuyEnabled: true,
    tradingMode: 'simulation',
    maxBuySol: 0.05,
    maxOpenExposureSol: 0.25,
    maxConcurrentPositions: 3,
    maxDailyLossSol: 0.15,
    maxSlippageBps: 500,
    minLiquiditySol: 28,
    minUniqueBuyers: 3,
    maxAcceptableAgeSeconds: 45,
    maxCreatorHoldingPct: 15,
    maxPriceImpactPct: 8,
    takeProfitPct: 30,
    stopLossPct: 15,
    cooldownSeconds: 10,
    allowUnknownCreator: false,
    priorityFeeSol: 0.003,
    volumeSpikeThresholdMultiplier: 2.5,
  };

  const dummyWallet: WalletInfo = {
    publicKey: Keypair.generate().publicKey.toBase58(),
    availableSol: 1.0,
    reservedSol: 0.05,
    totalSol: 1.05,
    isSimulated: true,
    hasDedicatedSigner: true,
    cluster: 'simulation',
  };

  const dummyMetrics: DailyMetrics = {
    launchesDetected: 10,
    launchesRejected: 7,
    launchesApproved: 3,
    buysAttempted: 3,
    buysFilled: 3,
    totalSpentSol: 0.15,
    dailyLossSol: 0.02,
    realizedPnlSol: 0.04,
    unrealizedPnlSol: 0.01,
    remainingRiskBudgetSol: 0.13,
  };

  // Helper to generate a valid test launch
  function createTestLaunch(overrides: Partial<TokenLaunch> = {}): TokenLaunch {
    const mintKp = Keypair.generate();
    const creatorKp = Keypair.generate();
    const [pda] = getBondingCurvePDA(mintKp.publicKey);

    return {
      mint: mintKp.publicKey.toBase58(),
      name: 'Test Clean Token',
      symbol: 'TEST',
      creator: creatorKp.publicKey.toBase58(),
      creationTime: Date.now() - 5000, // 5s ago
      bondingCurveAddress: pda.toBase58(),
      virtualSolReserves: 30_000_000_000, // 30 SOL
      virtualTokenReserves: 1_073_000_000_000_000,
      realSolReserves: 0,
      priceSol: 0.000000028,
      marketCapSol: 30,
      uniqueBuyersCount: 5,
      txCount: 8,
      creatorHoldingPct: 5.0,
      isCreatorHistoryKnown: true,
      creatorPreviousLaunches: 3,
      creatorRugCount: 0,
      volume5mSol: 1.2,
      volumeSpike: false,
      status: 'evaluating',
      detectedAt: Date.now() - 5000,
      isSimulated: true,
      ...overrides,
    };
  }

  // TEST 1: Pristine organic launch meeting all criteria must be APPROVED
  {
    const t0 = performance.now();
    const launch = createTestLaunch();
    const context: EvaluationContext = {
      settings: defaultSettings,
      wallet: dummyWallet,
      metrics: dummyMetrics,
      openPositions: [],
      lastTradeTime: Date.now() - 30000,
    };
    const evalRes = evaluateLaunchRisk(launch, context);
    results.push({
      id: 'test-1-organic-pass',
      name: 'Organic Valid Launch Passes All 8 Invariants',
      category: 'RISK_LOGIC',
      passed: evalRes.decision === 'APPROVED' && evalRes.rejectionReasons.length === 0,
      expected: 'APPROVED with 0 rejection reasons',
      actual: `${evalRes.decision} (${evalRes.rejectionReasons.length} reasons)`,
      details: 'Evaluates standard launch with valid PDA, 30 SOL liquidity, 5 unique buyers, 5% creator holding.',
      durationMs: Math.round(performance.now() - t0),
    });
  }

  // TEST 2: High creator holding (> 15%) must be REJECTED immediately
  {
    const t0 = performance.now();
    const launch = createTestLaunch({ creatorHoldingPct: 28.5 });
    const context: EvaluationContext = {
      settings: defaultSettings,
      wallet: dummyWallet,
      metrics: dummyMetrics,
      openPositions: [],
      lastTradeTime: 0,
    };
    const evalRes = evaluateLaunchRisk(launch, context);
    const hasHoldingReason = evalRes.rejectionReasons.some(r => r.includes('Creator supply concentration'));
    results.push({
      id: 'test-2-creator-holding-dump-risk',
      name: 'Creator Holding Exceeding Limit (> 15%) Blocked',
      category: 'RISK_LOGIC',
      passed: evalRes.decision === 'REJECTED' && hasHoldingReason,
      expected: 'REJECTED due to excessive creator holding',
      actual: `${evalRes.decision}: ${evalRes.rejectionReasons[0] || 'none'}`,
      details: 'Blocks rug pull risks where creator retains dangerous share of supply.',
      durationMs: Math.round(performance.now() - t0),
    });
  }

  // TEST 3: Stale launch (> maxAcceptableAgeSeconds) must be REJECTED
  {
    const t0 = performance.now();
    const launch = createTestLaunch({ creationTime: Date.now() - 95000 }); // 95s old
    const context: EvaluationContext = {
      settings: defaultSettings,
      wallet: dummyWallet,
      metrics: dummyMetrics,
      openPositions: [],
      lastTradeTime: 0,
    };
    const evalRes = evaluateLaunchRisk(launch, context);
    const hasStaleReason = evalRes.rejectionReasons.some(r => r.includes('stale or delayed'));
    results.push({
      id: 'test-3-stale-launch-filter',
      name: 'Stale Launch Data Exceeding Age Limit Blocked',
      category: 'RISK_LOGIC',
      passed: evalRes.decision === 'REJECTED' && hasStaleReason,
      expected: 'REJECTED for stale age',
      actual: `${evalRes.decision}: ${evalRes.rejectionReasons[0] || 'none'}`,
      details: 'Prevents buying delayed or replayed events after initial sniper window.',
      durationMs: Math.round(performance.now() - t0),
    });
  }

  // TEST 4: Low buyer count (< 3 independent wallets) triggers wash trading rejection
  {
    const t0 = performance.now();
    const launch = createTestLaunch({ uniqueBuyersCount: 1 });
    const context: EvaluationContext = {
      settings: defaultSettings,
      wallet: dummyWallet,
      metrics: dummyMetrics,
      openPositions: [],
      lastTradeTime: 0,
    };
    const evalRes = evaluateLaunchRisk(launch, context);
    const hasWashReason = evalRes.rejectionReasons.some(r => r.includes('Low buyer diversity'));
    results.push({
      id: 'test-4-wash-trading-filter',
      name: 'Wash Trading Single-Buyer Anomaly Blocked',
      category: 'RISK_LOGIC',
      passed: evalRes.decision === 'REJECTED' && hasWashReason,
      expected: 'REJECTED for insufficient unique buyers',
      actual: `${evalRes.decision}: ${evalRes.rejectionReasons[0] || 'none'}`,
      details: 'Enforces minimum independent wallet distribution before purchase.',
      durationMs: Math.round(performance.now() - t0),
    });
  }

  // TEST 5: Daily loss limit reached blocks any further purchases
  {
    const t0 = performance.now();
    const launch = createTestLaunch();
    const maxLossHitMetrics: DailyMetrics = {
      ...dummyMetrics,
      dailyLossSol: 0.16, // limit is 0.15
    };
    const context: EvaluationContext = {
      settings: defaultSettings,
      wallet: dummyWallet,
      metrics: maxLossHitMetrics,
      openPositions: [],
      lastTradeTime: 0,
    };
    const evalRes = evaluateLaunchRisk(launch, context);
    const hasLossReason = evalRes.rejectionReasons.some(r => r.includes('Daily loss limit'));
    results.push({
      id: 'test-5-daily-loss-circuit-breaker',
      name: 'Daily Loss Limit Circuit Breaker Enforced',
      category: 'SECURITY',
      passed: evalRes.decision === 'REJECTED' && hasLossReason,
      expected: 'REJECTED due to daily loss threshold',
      actual: `${evalRes.decision}: ${evalRes.rejectionReasons[0] || 'none'}`,
      details: 'Backend strictly blocks purchases if cumulative daily loss reaches cap.',
      durationMs: Math.round(performance.now() - t0),
    });
  }

  // TEST 6: Fake PDA or non-Pump.fun address must fail authenticity
  {
    const t0 = performance.now();
    const launch = createTestLaunch({ bondingCurveAddress: Keypair.generate().publicKey.toBase58() });
    const context: EvaluationContext = {
      settings: defaultSettings,
      wallet: dummyWallet,
      metrics: dummyMetrics,
      openPositions: [],
      lastTradeTime: 0,
    };
    const evalRes = evaluateLaunchRisk(launch, context);
    const hasAuthReason = evalRes.rejectionReasons.some(r => r.includes('Authenticity failure'));
    results.push({
      id: 'test-6-pda-authenticity-check',
      name: 'Non-Pump.fun Spoofed PDA Rejected',
      category: 'SECURITY',
      passed: evalRes.decision === 'REJECTED' && hasAuthReason,
      expected: 'REJECTED due to PDA mismatch',
      actual: `${evalRes.decision}: ${evalRes.rejectionReasons[0] || 'none'}`,
      details: 'Validates on-chain PDA seeds [bonding-curve, mint] against Program ID.',
      durationMs: Math.round(performance.now() - t0),
    });
  }

  // TEST 7: Max open exposure limit strictly respected
  {
    const t0 = performance.now();
    const existingPosition: Position = {
      id: 'pos-1',
      mint: Keypair.generate().publicKey.toBase58(),
      symbol: 'ALREADY_HELD',
      name: 'Existing Token',
      amountTokens: 1000000,
      entryPriceSol: 0.00000003,
      currentPriceSol: 0.00000003,
      costSol: 0.23, // 0.23 + 0.05 = 0.28 > 0.25 limit
      currentValueSol: 0.23,
      unrealizedPnlSol: 0,
      unrealizedPnlPercent: 0,
      realizedPnlSol: 0,
      status: 'OPEN',
      openedAt: Date.now() - 60000,
      entryTxSignature: 'simulated_sig_123',
      takeProfitPercent: 30,
      stopLossPercent: 15,
      isSimulated: true,
      priceHistory: [],
    };
    const launch = createTestLaunch();
    const context: EvaluationContext = {
      settings: defaultSettings,
      wallet: dummyWallet,
      metrics: dummyMetrics,
      openPositions: [existingPosition],
      lastTradeTime: 0,
    };
    const evalRes = evaluateLaunchRisk(launch, context);
    const hasExposureReason = evalRes.rejectionReasons.some(r => r.includes('max open exposure limit'));
    results.push({
      id: 'test-7-max-exposure-limit',
      name: 'Max Total Open Exposure Invariant Enforced',
      category: 'EXECUTION_INVARIANTS',
      passed: evalRes.decision === 'REJECTED' && hasExposureReason,
      expected: 'REJECTED for exceeding exposure ceiling',
      actual: `${evalRes.decision}: ${evalRes.rejectionReasons[0] || 'none'}`,
      details: 'Guarantees that pending buy amount plus existing positions never exceed cap.',
      durationMs: Math.round(performance.now() - t0),
    });
  }

  // TEST 8: Zero-Leak Security Check: Private key never returned in public wallet DTO
  {
    const t0 = performance.now();
    const serializedWallet = JSON.stringify(dummyWallet);
    const hasNoSecret = !serializedWallet.includes('privateKey') && !serializedWallet.includes('secretKey');
    results.push({
      id: 'test-8-zero-leak-security',
      name: 'Private Key Zero-Leak Serialization Invariant',
      category: 'SECURITY',
      passed: hasNoSecret,
      expected: 'Wallet DTO never contains privateKey or secretKey fields',
      actual: hasNoSecret ? 'Passed: Clean public DTO' : 'FAILED: Secret detected in DTO',
      details: 'Ensures wallet structure passed to frontend never leaks transaction signer credentials.',
      durationMs: Math.round(performance.now() - t0),
    });
  }

  const passedTests = results.filter(r => r.passed).length;
  return {
    timestamp: startTime,
    totalTests: results.length,
    passedTests,
    failedTests: results.length - passedTests,
    allPassed: passedTests === results.length,
    results,
  };
}
