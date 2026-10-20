import { PublicKey } from '@solana/web3.js';

// Official Pump.fun Solana Program constants
export const PUMP_FUN_PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
export const PUMP_FEE_RECIPIENT = new PublicKey('CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM');
export const PUMP_GLOBAL_ACCOUNT = new PublicKey('4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf');
export const PUMP_MINT_AUTHORITY = new PublicKey('TSLvdd1pWpHVjahSpsvCXUbgwsL3JAcvokwaKt1eokM');
export const PUMP_EVENT_AUTHORITY = new PublicKey('Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1');

// Pump.fun bonding curve initial configuration constants
// Virtual SOL reserves: 30 SOL (30,000,000,000 lamports)
export const INITIAL_VIRTUAL_SOL_RESERVES = 30_000_000_000;
// Virtual Token reserves: 1,073,000,000,000,000 (with 6 decimals)
export const INITIAL_VIRTUAL_TOKEN_RESERVES = 1_073_000_000_000_000;
// Real Token reserves: 793,100,000,000,000 (available on curve)
export const INITIAL_REAL_TOKEN_RESERVES = 793_100_000_000_000;
// Target SOL for migration: ~85 SOL
export const MIGRATION_TARGET_SOL = 85;

// Instruction discriminators (Sighash 8 bytes)
export const CREATE_INSTRUCTION_DISCRIMINATOR = Buffer.from([24, 30, 200, 40, 5, 28, 7, 119]);
export const BUY_INSTRUCTION_DISCRIMINATOR = Buffer.from([102, 6, 61, 18, 1, 218, 235, 234]);
export const SELL_INSTRUCTION_DISCRIMINATOR = Buffer.from([51, 230, 133, 164, 1, 127, 131, 173]);

/**
 * Derives the bonding curve PDA for a token mint.
 */
export function getBondingCurvePDA(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('bonding-curve'), mint.toBuffer()],
    PUMP_FUN_PROGRAM_ID
  );
}

/**
 * Calculates current token price in SOL using the constant-product virtual reserves.
 * k = virtualSolReserves * virtualTokenReserves
 * price = (virtualSol / 1e9) / (virtualToken / 1e6)
 */
export function calculateTokenPriceSol(virtualSolReserves: number, virtualTokenReserves: number): number {
  if (virtualTokenReserves <= 0) return 0;
  const sol = virtualSolReserves / 1e9;
  const tokens = virtualTokenReserves / 1e6;
  return sol / tokens;
}

/**
 * Calculates output token amount and price impact for an exact SOL buy.
 * Formula:
 * tokensOut = (virtualTokenReserves * solInLamports) / (virtualSolReserves + solInLamports)
 */
export function calculateBuyQuote(
  solAmount: number,
  virtualSolReserves: number = INITIAL_VIRTUAL_SOL_RESERVES,
  virtualTokenReserves: number = INITIAL_VIRTUAL_TOKEN_RESERVES
): { tokensOut: number; priceImpactPct: number; executionPriceSol: number } {
  const solInLamports = solAmount * 1e9;
  const newSolReserves = virtualSolReserves + solInLamports;
  const tokensOutRaw = (virtualTokenReserves * solInLamports) / newSolReserves;
  const tokensOut = tokensOutRaw / 1e6;

  const initialPrice = calculateTokenPriceSol(virtualSolReserves, virtualTokenReserves);
  const executionPrice = solAmount / (tokensOut || 1);
  const priceImpactPct = initialPrice > 0 ? ((executionPrice - initialPrice) / initialPrice) * 100 : 0;

  return {
    tokensOut,
    priceImpactPct: Math.max(0, priceImpactPct),
    executionPriceSol: executionPrice,
  };
}

/**
 * Calculates output SOL for an exact token sell amount.
 */
export function calculateSellQuote(
  tokenAmount: number,
  virtualSolReserves: number = INITIAL_VIRTUAL_SOL_RESERVES,
  virtualTokenReserves: number = INITIAL_VIRTUAL_TOKEN_RESERVES
): { solOut: number; priceImpactPct: number; executionPriceSol: number } {
  const tokensInRaw = tokenAmount * 1e6;
  const newTokens = virtualTokenReserves + tokensInRaw;
  const solOutLamports = (virtualSolReserves * tokensInRaw) / newTokens;
  const solOut = solOutLamports / 1e9;

  const initialPrice = calculateTokenPriceSol(virtualSolReserves, virtualTokenReserves);
  const executionPrice = tokenAmount > 0 ? solOut / tokenAmount : 0;
  const priceImpactPct = initialPrice > 0 ? ((initialPrice - executionPrice) / initialPrice) * 100 : 0;

  return {
    solOut,
    priceImpactPct: Math.max(0, priceImpactPct),
    executionPriceSol: executionPrice,
  };
}
