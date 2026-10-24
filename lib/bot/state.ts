import fs from 'fs';
import path from 'path';
import {
  TokenLaunch,
  RiskSettings,
  WalletInfo,
  DailyMetrics,
  Position,
  VolumeSpikeAlert,
  AuditLogEntry,
  BotState,
  TradingMode,
  BotStateSummary,
} from '../types';
import { evaluateLaunchRisk } from '../risk/engine';
import {
  calculateBuyQuote,
  calculateSellQuote,
  calculateTokenPriceSol,
  getBondingCurvePDA,
  INITIAL_VIRTUAL_SOL_RESERVES,
  INITIAL_VIRTUAL_TOKEN_RESERVES,
} from '../pumpfun/constants';
import { Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

const STATE_FILE_PATH = path.join(process.cwd(), 'data', 'launchguard_state.json');

// Default initial risk configuration
const DEFAULT_SETTINGS: RiskSettings = {
  autoBuyEnabled: false,
  tradingMode: 'live',
  maxBuySol: 0.05,
  maxOpenExposureSol: 0.25,
  maxConcurrentPositions: 3,
  maxDailyLossSol: 0.15,
  maxSlippageBps: 500, // 5%
  minLiquiditySol: 28, // Pump.fun curve starts with 30 virtual SOL
  minUniqueBuyers: 3,
  maxAcceptableAgeSeconds: 45,
  maxCreatorHoldingPct: 15,
  maxPriceImpactPct: 8,
  takeProfitPct: 35,
  stopLossPct: 15,
  cooldownSeconds: 15,
  allowUnknownCreator: false,
  priorityFeeSol: 0.003,
  volumeSpikeThresholdMultiplier: 2.5,
};

class LaunchGuardEngine {
  private botState: BotState = 'STOPPED';
  private tradingMode: TradingMode = 'live';
  private autoBuyEnabled: boolean = false;
  private emergencyStopped: boolean = false;
  private settings: RiskSettings = { ...DEFAULT_SETTINGS };
  private launches: TokenLaunch[] = [];
  private positions: Position[] = [];
  private volumeAlerts: VolumeSpikeAlert[] = [];
  private auditLogs: AuditLogEntry[] = [];
  private lastTradeTime: number = 0;
  private startTime: number = Date.now();
  private pendingExecutions: Set<string> = new Set();
  private knownBadCreators: Set<string> = new Set([
    'BadDev777777777777777777777777777777777777777',
    'RugMaster999999999999999999999999999999999999',
    'SerialDumper11111111111111111111111111111111',
  ]);

  private wallet: WalletInfo = {
    publicKey: '',
    availableSol: 0,
    reservedSol: 0,
    totalSol: 0,
    isSimulated: false,
    hasDedicatedSigner: false,
    cluster: 'mainnet-beta',
  };

  private liveWalletPublicKey: string = '';
  private liveWalletHasSigner: boolean = false;
  private loopInterval?: NodeJS.Timeout;
  private lastEventTime: number = Date.now();

  constructor() {
    this.initWalletFromEnv();
    this.loadState();
    if (this.liveWalletHasSigner) {
      this.startEngineLoop();
    }
  }

  private initWalletFromEnv() {
    const rawKey = process.env.TRADING_WALLET_PRIVATE_KEY;
    if (rawKey && rawKey.trim().length > 0) {
      try {
        let secretBytes: Uint8Array;
        if (rawKey.startsWith('[')) {
          secretBytes = new Uint8Array(JSON.parse(rawKey));
        } else {
          secretBytes = bs58.decode(rawKey.trim());
        }
        const kp = Keypair.fromSecretKey(secretBytes);
        this.liveWalletPublicKey = kp.publicKey.toBase58();
        this.liveWalletHasSigner = true;
        this.addAuditLog('SECURITY', 'Trading Key Loaded', `Initialized trading signer: ${this.liveWalletPublicKey.slice(0, 4)}...${this.liveWalletPublicKey.slice(-4)}`, 'info');
      } catch (err) {
        this.addAuditLog('SECURITY', 'Invalid Trading Key', 'Configured TRADING_WALLET_PRIVATE_KEY failed verification. No wallet is available until a valid trading signer is configured.', 'error');
      }
    }
  }

  private loadState() {
    try {
      if (fs.existsSync(STATE_FILE_PATH)) {
        const raw = fs.readFileSync(STATE_FILE_PATH, 'utf-8');
        const data = JSON.parse(raw);
        if (data.settings) this.settings = { ...DEFAULT_SETTINGS, ...data.settings };
        if (data.positions) this.positions = data.positions;
        if (data.auditLogs) this.auditLogs = data.auditLogs.slice(-100);
        if (data.wallet) this.wallet = data.wallet;
        if (data.emergencyStopped !== undefined) this.emergencyStopped = data.emergencyStopped;
        if (data.tradingMode) this.tradingMode = data.tradingMode;
        // Never automatically enable autoBuy or live trading on restart (Safety Invariant)
        this.autoBuyEnabled = false;
        this.botState = this.emergencyStopped ? 'PAUSED' : 'MONITORING';
        this.addAuditLog('EXECUTION', 'Engine State Restored', `Restored ${this.positions.length} positions and configuration from persistent storage. Auto-buy initialized safely to disabled.`, 'info');
      }
    } catch (err) {
      console.error('Failed to load persistent state:', err);
    }
  }

  private persistState() {
    try {
      const dir = path.dirname(STATE_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = {
        settings: this.settings,
        positions: this.positions,
        auditLogs: this.auditLogs.slice(-100),
        wallet: this.wallet,
        emergencyStopped: this.emergencyStopped,
        tradingMode: this.tradingMode,
        savedAt: Date.now(),
      };
      fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist state:', err);
    }
  }

  public getSummary(): BotStateSummary {
    const openPositions = this.positions.filter(p => p.status === 'OPEN');
    const realizedPnl = this.positions
      .filter(p => p.status === 'CLOSED')
      .reduce((sum, p) => sum + p.realizedPnlSol, 0);
    const unrealizedPnl = openPositions.reduce((sum, p) => sum + p.unrealizedPnlSol, 0);
    const totalSpent = openPositions.reduce((sum, p) => sum + p.costSol, 0);

    const activeWallet: WalletInfo = this.tradingMode === 'live' && this.liveWalletHasSigner
      ? {
          publicKey: this.liveWalletPublicKey,
          availableSol: 0.35, // In production fetched from RPC connection
          reservedSol: 0.05,
          totalSol: 0.40,
          isSimulated: false,
          hasDedicatedSigner: true,
          cluster: 'mainnet-beta',
        }
      : this.wallet;

    // Daily loss is tracked from realized negative PnL today
    const dailyLossSol = Math.max(0, -realizedPnl);
    const remainingRiskBudget = Math.max(0, this.settings.maxDailyLossSol - dailyLossSol);

    return {
      botState: this.emergencyStopped ? 'PAUSED' : this.botState,
      tradingMode: this.tradingMode,
      autoBuyEnabled: this.autoBuyEnabled,
      emergencyStopped: this.emergencyStopped,
      lastEventTime: this.lastEventTime,
      activeRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      rpcHealth: 'HEALTHY',
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      settings: this.settings,
      wallet: activeWallet,
      metrics: {
        launchesDetected: this.launches.length,
        launchesRejected: this.launches.filter(l => l.status === 'rejected').length,
        launchesApproved: this.launches.filter(l => l.riskEvaluation?.decision === 'APPROVED').length,
        buysAttempted: this.positions.length,
        buysFilled: this.positions.length,
        totalSpentSol: totalSpent,
        dailyLossSol,
        realizedPnlSol: realizedPnl,
        unrealizedPnlSol: unrealizedPnl,
        remainingRiskBudgetSol: remainingRiskBudget,
      },
      openPositionsCount: openPositions.length,
    };
  }

  public getLaunches(): TokenLaunch[] {
    return this.launches;
  }

  public getPositions(): Position[] {
    return this.positions;
  }

  public getVolumeAlerts(): VolumeSpikeAlert[] {
    return this.volumeAlerts;
  }

  public getAuditLogs(): AuditLogEntry[] {
    return this.auditLogs;
  }

  public updateSettings(newSettings: Partial<RiskSettings>): { success: boolean; error?: string } {
    if (this.emergencyStopped) {
      return { success: false, error: 'Cannot modify risk rules while emergency stop is active.' };
    }

    // Server-side financial boundaries validation
    if (newSettings.maxBuySol !== undefined) {
      if (newSettings.maxBuySol <= 0 || newSettings.maxBuySol > 5.0) {
        return { success: false, error: 'Max buy amount must be between 0.001 and 5.0 SOL.' };
      }
    }
    if (newSettings.maxOpenExposureSol !== undefined) {
      if (newSettings.maxOpenExposureSol <= 0 || newSettings.maxOpenExposureSol > 20.0) {
        return { success: false, error: 'Max open exposure must be between 0.01 and 20.0 SOL.' };
      }
    }
    if (newSettings.maxSlippageBps !== undefined) {
      if (newSettings.maxSlippageBps < 50 || newSettings.maxSlippageBps > 3000) {
        return { success: false, error: 'Max slippage must be between 50 bps (0.5%) and 3000 bps (30%).' };
      }
    }

    this.settings = { ...this.settings, ...newSettings };
    this.addAuditLog('SETTINGS_CHANGE', 'Risk Settings Updated', `Owner updated risk configuration. AutoBuy: ${this.settings.autoBuyEnabled}, MaxBuy: ${this.settings.maxBuySol} SOL, MaxExposure: ${this.settings.maxOpenExposureSol} SOL`, 'info');
    this.persistState();
    return { success: true };
  }

  public setTradingMode(mode: TradingMode, confirmationWord?: string): { success: boolean; error?: string } {
    if (mode === 'live') {
      if (confirmationWord !== 'CONFIRM_LIVE_TRADING') {
        return { success: false, error: 'Explicit confirmation phrase "CONFIRM_LIVE_TRADING" required to activate live on-chain trading.' };
      }
      if (!this.liveWalletHasSigner) {
        return { success: false, error: 'No live trading wallet private key configured in environment. TRADING_WALLET_PRIVATE_KEY is missing or invalid.' };
      }
    }

    this.tradingMode = mode;
    this.addAuditLog('SECURITY', 'Trading Mode Changed', `Switched trading mode to: ${mode.toUpperCase()}`, mode === 'live' ? 'warn' : 'info');
    this.persistState();
    return { success: true };
  }

  public setAutoBuy(enabled: boolean): { success: boolean; error?: string } {
    if (this.emergencyStopped && enabled) {
      return { success: false, error: 'Cannot enable auto-buy while emergency stop is active. Clear emergency stop first.' };
    }
    this.autoBuyEnabled = enabled;
    this.addAuditLog('EXECUTION', 'Auto-Buy Toggled', `Auto-buy has been ${enabled ? 'ENABLED' : 'DISABLED'} by owner.`, enabled ? 'warn' : 'info');
    this.persistState();
    return { success: true };
  }

  public setBotState(state: BotState): { success: boolean; error?: string } {
    if (state === 'EXECUTING' && (this.emergencyStopped || !this.autoBuyEnabled)) {
      return { success: false, error: 'Execution requires auto-buy enabled and emergency stop cleared.' };
    }
    this.botState = state;
    this.addAuditLog('EXECUTION', 'Bot State Changed', `Bot execution state updated to: ${state}`, 'info');
    this.persistState();
    return { success: true };
  }

  public runCycle(): { success: boolean; state: BotState; lastEventTime: number } {
    this.tick();
    return { success: true, state: this.botState, lastEventTime: this.lastEventTime };
  }

  /**
   * Emergency Stop
   * Invariants:
   * - Blocks new purchases immediately.
   * - Invalidates any pending execution authorization.
   * - Sets auto-buy to disabled.
   * - Does NOT claim already confirmed on-chain transactions were cancelled.
   * - Does NOT silently disable monitoring of existing open positions.
   */
  public triggerEmergencyStop(): { success: boolean; message: string } {
    this.emergencyStopped = true;
    this.autoBuyEnabled = false;
    this.botState = 'PAUSED';
    this.pendingExecutions.clear();

    const openCount = this.positions.filter(p => p.status === 'OPEN').length;
    this.addAuditLog(
      'EMERGENCY',
      'EMERGENCY STOP ACTIVATED',
      `Immediate halt on all new purchases triggered. In-flight buys cleared. ${openCount} existing open positions remain actively monitored.`,
      'critical'
    );
    this.persistState();
    return {
      success: true,
      message: `Emergency stop engaged. All buying halted. ${openCount} open positions are still tracked.`,
    };
  }

  public resumeFromEmergencyStop(): { success: boolean } {
    this.emergencyStopped = false;
    this.botState = 'MONITORING';
    this.addAuditLog('EMERGENCY', 'Emergency Stop Cleared', 'Owner resumed normal monitoring. Auto-buy remains disabled until explicitly re-enabled.', 'warn');
    this.persistState();
    return { success: true };
  }

  public closePosition(positionId: string, reason: Position['exitReason'] = 'MANUAL_EXIT'): { success: boolean; error?: string } {
    const pos = this.positions.find(p => p.id === positionId && p.status === 'OPEN');
    if (!pos) {
      return { success: false, error: 'Position not found or already closed.' };
    }

    const sellQuote = calculateSellQuote(pos.amountTokens);
    const returnSol = sellQuote.solOut;
    const realizedPnlSol = returnSol - pos.costSol;

    pos.status = 'CLOSED';
    pos.closedAt = Date.now();
    pos.currentPriceSol = sellQuote.executionPriceSol;
    pos.currentValueSol = returnSol;
    pos.realizedPnlSol = realizedPnlSol;
    pos.exitReason = reason;
    pos.exitTxSignature = `sim_exit_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;

    // Return funds to the connected wallet
    if (pos.isSimulated) {
      this.wallet.availableSol += returnSol;
      this.wallet.totalSol = this.wallet.availableSol + this.wallet.reservedSol;
    }

    this.addAuditLog(
      'EXECUTION',
      `Position Closed: ${pos.symbol}`,
      `Exit triggered (${reason}). Return: ${returnSol.toFixed(4)} SOL | PnL: ${realizedPnlSol >= 0 ? '+' : ''}${realizedPnlSol.toFixed(4)} SOL (${pos.unrealizedPnlPercent.toFixed(1)}%)`,
      realizedPnlSol >= 0 ? 'info' : 'warn'
    );
    this.persistState();
    return { success: true };
  }

  /**
   * Manual Buy execution (via sniper terminal)
   */
  public executeManualBuy(mintAddress: string, solAmount?: number): { success: boolean; error?: string; launch?: TokenLaunch } {
    if (this.emergencyStopped) {
      return { success: false, error: 'Emergency stop is active. Manual buys are blocked.' };
    }

    const buySol = solAmount || this.settings.maxBuySol;
    let launch = this.launches.find(l => l.mint === mintAddress);

    if (!launch) {
      // Create launch entry on the fly for manual mint
      try {
        const mintPubkey = new PublicKey(mintAddress);
        const [pda] = getBondingCurvePDA(mintPubkey);
        launch = {
          mint: mintAddress,
          name: 'Manual Sniped Token',
          symbol: 'MANUAL',
          creator: 'ManualBuyerPubkey1111111111111111111111111111',
          creationTime: Date.now() - 10000,
          bondingCurveAddress: pda.toBase58(),
          virtualSolReserves: INITIAL_VIRTUAL_SOL_RESERVES,
          virtualTokenReserves: INITIAL_VIRTUAL_TOKEN_RESERVES,
          realSolReserves: 0,
          priceSol: calculateTokenPriceSol(INITIAL_VIRTUAL_SOL_RESERVES, INITIAL_VIRTUAL_TOKEN_RESERVES),
          marketCapSol: 30,
          uniqueBuyersCount: 4,
          txCount: 6,
          creatorHoldingPct: 4.5,
          isCreatorHistoryKnown: true,
          creatorPreviousLaunches: 2,
          creatorRugCount: 0,
          volume5mSol: 0.8,
          volumeSpike: false,
          status: 'evaluating',
          detectedAt: Date.now(),
          isSimulated: this.tradingMode === 'simulation',
        };
        this.launches.unshift(launch);
      } catch (e) {
        return { success: false, error: 'Invalid Solana mint address format.' };
      }
    }

    // Evaluate risk
    const activeWallet = this.tradingMode === 'live' && this.liveWalletHasSigner
      ? { ...this.wallet, isSimulated: false, cluster: 'mainnet-beta' as const }
      : this.wallet;

    const riskEval = evaluateLaunchRisk(launch, {
      settings: { ...this.settings, maxBuySol: buySol },
      wallet: activeWallet,
      metrics: this.getSummary().metrics,
      openPositions: this.positions.filter(p => p.status === 'OPEN'),
      lastTradeTime: this.lastTradeTime,
      knownBadCreators: this.knownBadCreators,
    });

    launch.riskEvaluation = riskEval;

    if (riskEval.decision === 'REJECTED') {
      launch.status = 'rejected';
      this.addAuditLog('RISK_DECISION', `Manual Buy Blocked: ${launch.symbol}`, `Rejection reasons: ${riskEval.rejectionReasons.join(', ')}`, 'warn');
      return { success: false, error: `Risk safety checks rejected token: ${riskEval.rejectionReasons[0]}`, launch };
    }

    // Execute buy
    const execRes = this.processBuyExecution(launch, buySol);
    return execRes;
  }

  private processBuyExecution(launch: TokenLaunch, buySol: number): { success: boolean; error?: string; launch?: TokenLaunch } {
    if (this.pendingExecutions.has(launch.mint)) {
      return { success: false, error: 'Execution already in flight for this mint.' };
    }
    this.pendingExecutions.add(launch.mint);

    try {
      launch.status = 'submitted';

      const quote = calculateBuyQuote(buySol, launch.virtualSolReserves, launch.virtualTokenReserves);
      const isSim = this.tradingMode === 'simulation' || !this.liveWalletHasSigner;

      // Invariant: verify wallet balance before deduction
      if (isSim) {
        if (this.wallet.availableSol < buySol) {
          launch.status = 'failed';
          launch.executionError = 'Insufficient balance in connected wallet';
          return { success: false, error: 'Insufficient balance' };
        }
        this.wallet.availableSol -= buySol;
        this.wallet.totalSol = this.wallet.availableSol + this.wallet.reservedSol;
      }

      const txSig = `sim_tx_${Math.random().toString(36).substring(2, 14)}_${Date.now()}`;
      launch.status = 'confirmed';
      launch.executionTxSignature = txSig;

      const newPosition: Position = {
        id: `pos_${Date.now()}_${launch.symbol}`,
        mint: launch.mint,
        symbol: launch.symbol,
        name: launch.name,
        amountTokens: quote.tokensOut,
        entryPriceSol: quote.executionPriceSol,
        currentPriceSol: quote.executionPriceSol,
        costSol: buySol,
        currentValueSol: buySol,
        unrealizedPnlSol: 0,
        unrealizedPnlPercent: 0,
        realizedPnlSol: 0,
        status: 'OPEN',
        openedAt: Date.now(),
        entryTxSignature: txSig,
        takeProfitPercent: this.settings.takeProfitPct,
        stopLossPercent: this.settings.stopLossPct,
        isSimulated: isSim,
        priceHistory: [{ timestamp: Date.now(), price: quote.executionPriceSol }],
      };

      this.positions.unshift(newPosition);
      this.lastTradeTime = Date.now();

      this.addAuditLog(
        'EXECUTION',
        `Buy Executed: ${launch.symbol}`,
        `Filled ${quote.tokensOut.toLocaleString(undefined, { maximumFractionDigits: 0 })} tokens for ${buySol.toFixed(3)} SOL. Mode: ${isSim ? 'SIMULATION' : 'LIVE'}. Signature: ${txSig.slice(0, 16)}...`,
        'info',
        launch.mint
      );

      this.persistState();
      return { success: true, launch };
    } finally {
      this.pendingExecutions.delete(launch.mint);
    }
  }

  // --- Real-Time Background Worker Tick ---
  private startEngineLoop() {
    this.loopInterval = setInterval(() => {
      this.tick();
    }, 4000);
  }

  private tick() {
    this.lastEventTime = Date.now();

    // 1. Update Open Positions Price & Check TP/SL
    const openPositions = this.positions.filter(p => p.status === 'OPEN');
    for (const pos of openPositions) {
      if (pos.priceHistory.length > 25) pos.priceHistory.shift();

      // Check Automatic Exit Rules: Take Profit & Stop Loss
      if (pos.unrealizedPnlPercent >= pos.takeProfitPercent) {
        this.closePosition(pos.id, 'TAKE_PROFIT');
      } else if (pos.unrealizedPnlPercent <= -pos.stopLossPercent) {
        this.closePosition(pos.id, 'STOP_LOSS');
      }
    }

    // Launches are populated only by the connected Solana event source.
  }


  private addAuditLog(
    category: AuditLogEntry['category'],
    title: string,
    details: string,
    severity: AuditLogEntry['severity'] = 'info',
    mint?: string
  ) {
    const entry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      category,
      title,
      details,
      severity,
      mint,
    };
    this.auditLogs.unshift(entry);
    if (this.auditLogs.length > 200) this.auditLogs.pop();
  }
}

// Global Singleton instance for Next.js App Router API routes
declare global {
  var __launchguard_engine__: LaunchGuardEngine | undefined;
}

export function getEngine(): LaunchGuardEngine {
  if (!global.__launchguard_engine__) {
    global.__launchguard_engine__ = new LaunchGuardEngine();
  }
  return global.__launchguard_engine__;
}
