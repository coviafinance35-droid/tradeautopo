export type BotState = 'STOPPED' | 'MONITORING' | 'PAUSED' | 'EXECUTING';
export type TradingMode = 'simulation' | 'live';
export type LaunchStatus = 'evaluating' | 'rejected' | 'eligible' | 'submitted' | 'confirmed' | 'failed';
export type RiskLevel = 'SAFE' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type RiskDecision = 'APPROVED' | 'REJECTED';

export interface TokenLaunch {
  mint: string;
  name: string;
  symbol: string;
  description?: string;
  uri?: string;
  creator: string;
  creationTime: number; // Unix timestamp ms
  bondingCurveAddress: string;
  virtualSolReserves: number; // in lamports
  virtualTokenReserves: number;
  realSolReserves: number;
  priceSol: number;
  marketCapSol: number;
  uniqueBuyersCount: number;
  txCount: number;
  creatorHoldingPct: number;
  isCreatorHistoryKnown: boolean;
  creatorPreviousLaunches: number;
  creatorRugCount: number;
  volume5mSol: number;
  volumeSpike: boolean;
  spikeMultiplier?: number;
  status: LaunchStatus;
  riskEvaluation?: RiskEvaluation;
  executionTxSignature?: string;
  executionError?: string;
  detectedAt: number;
  isSimulated: boolean;
}

export interface RiskCheckDetail {
  pass: boolean;
  label: string;
  detail: string;
  critical: boolean;
}

export interface RiskEvaluation {
  score: number; // 0-100 (100 = lowest risk)
  confidence: number; // 0-100%
  riskLevel: RiskLevel;
  decision: RiskDecision;
  rejectionReasons: string[];
  explanation: string;
  checks: Record<string, RiskCheckDetail>;
  evaluatedAt: number;
}

export interface Position {
  id: string;
  mint: string;
  symbol: string;
  name: string;
  amountTokens: number;
  entryPriceSol: number;
  currentPriceSol: number;
  costSol: number;
  currentValueSol: number;
  unrealizedPnlSol: number;
  unrealizedPnlPercent: number;
  realizedPnlSol: number;
  status: 'OPEN' | 'CLOSED';
  openedAt: number;
  closedAt?: number;
  entryTxSignature: string;
  exitTxSignature?: string;
  exitReason?: 'TAKE_PROFIT' | 'STOP_LOSS' | 'MANUAL_EXIT' | 'EMERGENCY_STOP' | 'TIMEOUT';
  takeProfitPercent: number;
  stopLossPercent: number;
  isSimulated: boolean;
  priceHistory: { timestamp: number; price: number }[];
}

export interface RiskSettings {
  autoBuyEnabled: boolean;
  tradingMode: TradingMode;
  maxBuySol: number;
  maxOpenExposureSol: number;
  maxConcurrentPositions: number;
  maxDailyLossSol: number;
  maxSlippageBps: number;
  minLiquiditySol: number;
  minUniqueBuyers: number;
  maxAcceptableAgeSeconds: number;
  maxCreatorHoldingPct: number;
  maxPriceImpactPct: number;
  takeProfitPct: number;
  stopLossPct: number;
  cooldownSeconds: number;
  allowUnknownCreator: boolean;
  priorityFeeSol: number;
  volumeSpikeThresholdMultiplier: number;
}

export interface WalletInfo {
  publicKey: string;
  availableSol: number;
  reservedSol: number;
  totalSol: number;
  isSimulated: boolean;
  hasDedicatedSigner: boolean;
  cluster: 'mainnet-beta' | 'devnet' | 'simulation';
}

export interface DailyMetrics {
  launchesDetected: number;
  launchesRejected: number;
  launchesApproved: number;
  buysAttempted: number;
  buysFilled: number;
  totalSpentSol: number;
  dailyLossSol: number;
  realizedPnlSol: number;
  unrealizedPnlSol: number;
  remainingRiskBudgetSol: number;
}

export interface VolumeSpikeAlert {
  id: string;
  mint: string;
  symbol: string;
  name: string;
  surgeMultiplier: number;
  currentVolumeSol: number;
  baselineVolumeSol: number;
  timestamp: number;
  priceSol: number;
  priceChangePct: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  category: 'RISK_DECISION' | 'EXECUTION' | 'EMERGENCY' | 'SETTINGS_CHANGE' | 'SECURITY' | 'VOLUME_SPIKE';
  title: string;
  details: string;
  mint?: string;
  severity: 'info' | 'warn' | 'error' | 'critical';
}

export interface BotStateSummary {
  botState: BotState;
  tradingMode: TradingMode;
  autoBuyEnabled: boolean;
  emergencyStopped: boolean;
  lastEventTime: number;
  activeRpcUrl: string;
  rpcHealth: 'HEALTHY' | 'DEGRADED' | 'DISCONNECTED';
  uptimeSeconds: number;
  settings: RiskSettings;
  wallet: WalletInfo;
  metrics: DailyMetrics;
  openPositionsCount: number;
}
