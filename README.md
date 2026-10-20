# Pump.fun LaunchGuard — Mobile-First Solana New-Launch Sniper & Risk Guardian

Pump.fun LaunchGuard is an iPhone-optimized mobile web application designed to monitor newly launched Pump.fun tokens in real-time, evaluate their risk against deterministic safety invariants, and automatically buy only tokens that meet every required security condition.

The application is controlled entirely through **Apple Safari on iOS** without requiring a native iOS app, terminal commands, or desktop computer for daily operations.

---

## 1. Key Features

- **Real-Time Pump.fun Launch Radar**: Instant detection of token creation events on the official Pump.fun program (`6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P`).
- **Deterministic 8-Check Risk Engine**:
  1. **Liquidity Depth**: Virtual SOL reserve verification ($\ge 28$ SOL).
  2. **Price Impact Simulation**: Simulates exact tokens out using constant-product bonding curve math.
  3. **Creator Supply Concentration & Rug Blacklist**: Blocks developers retaining $> 15\%$ supply or past serial ruggers.
  4. **Wash Trading Filter**: Enforces minimum unique independent buyer wallets.
  5. **Data Freshness**: Rejects stale or delayed block events ($> 45$s old).
  6. **PDA Authenticity Verification**: Checks seeds `[b"bonding-curve", mint]` against official Pump.fun program.
  7. **Wallet Capital & Fee Buffer**: Validates SOL balance after reserving priority fee + base gas.
  8. **Portfolio Risk Budget**: Hard limits on max open exposure, max concurrent positions, and daily loss stop.
- **Real-Time Trending Token Volume Spike Alerts**: Detects sudden buy volume surges (e.g. $+3.5\times$ baseline in 5 minutes) and broadcasts instant dashboard alerts.
- **Hard Rejection Invariant**: AI or machine learning models may provide human summaries, but **can never override** mandatory safety checks.
- **Position & P&L Tracker**: Live tracking of open and closed positions, unrealized/realized P&L, 1-tap market sell/exit, and automatic Take-Profit & Stop-Loss triggers.
- **Emergency Stop**: Instantly halts new purchases, clears pending executions, and preserves position monitoring.
- **Zero-Key Leak Architecture**: Transaction signing is kept server-side in protected runtime memory. Private keys are never sent to the browser bundle or exposed in logs.
- **Paper Trading by Default**: Clearly distinguishes simulation mode from live on-chain mainnet trading.

---

## 2. iPhone-Only Setup Guide (No Computer Required)

You can operate LaunchGuard entirely from an iPhone:

1. **Open Safari on iPhone**:
   Navigate to the hosted URL of your LaunchGuard deployment.
2. **Add to Home Screen (PWA)**:
   - Tap the Safari **Share** icon (the square with an arrow pointing upward).
   - Scroll down and tap **"Add to Home Screen"**.
   - Tap **"Add"** in the top-right corner.
3. **Launch in Standalone Mode**:
   - Tap the **LaunchGuard** icon on your iPhone home screen.
   - The app launches in full-screen standalone mode with Safari address bars hidden and notch safe-area padding enabled.
4. **Authenticate as Owner**:
   - Tap the **Lock** icon in the top header.
   - Enter your owner passcode (default: `guard2026` or configured in `OWNER_PASSCODE`).
5. **Adjust Parameters on the Go**:
   - Use the thumb-zone navigation bar at the bottom to adjust buy size, max exposure, or inspect live launches with one thumb.

---

## 3. Free-Tier Deployment Blueprint & Realistic Disclosures

Deploy LaunchGuard using free-tier infrastructure:

| Component | Recommended Free Provider | Free Tier Quota | Realistic Limitations & Disclosures |
| :--- | :--- | :--- | :--- |
| **Solana RPC & WSS** | **Helius** (helius.dev) | 1,000,000 credits/day | Best free Solana RPC for Pump.fun WebSocket events. Public endpoints (`api.mainnet-beta.solana.com`) face strict 429 rate limits. |
| **Alternative Free RPC** | **QuickNode** | 10M API credits/month | Excellent backup RPC. |
| **Web Dashboard & API** | **Vercel** / **Cloud Run** | Generous free bandwidth | **Disclosure:** Serverless functions sleep after inactivity. While sleeping, background polling pauses until a client connects or wakes it. |
| **24/7 Continuous Worker** | **Fly.io** (Free 3 VMs) / **Railway** | Up to 3 shared-cpu VMs free | **Disclosure:** True continuous 24/7 autonomous sub-second sniping requires a persistent VM container process rather than serverless functions. |
| **Persistent Storage** | **Neon Postgres** / Local Disk | 0.5 GB persistent SQL storage free | Preserves configuration and positions across restarts. |

### Minimum Steps for 24/7 Live Operation
If running on a free serverless provider, LaunchGuard operates safely in **on-demand monitoring mode**. For true 24/7 continuous unattended sniping without an iPhone screen awake:
- Run the worker container on Fly.io or a $4–$5/mo VPS (e.g. Hetzner Cloud).

---

## 4. Security Review & Test Report

LaunchGuard enforces strict defense-in-depth principles:

1. **Private Key Isolation**: The trading private key (`TRADING_WALLET_PRIVATE_KEY`) is only read server-side via `process.env`. The client-side DTO excludes all sensitive fields.
2. **Deterministic Hard Rejections**: Bypassing risk rules via URL parameters or malicious POST bodies is prevented by server-side validation.
3. **Idempotent In-Flight Locks**: Replayed WebSocket events cannot trigger duplicate buy transactions for the same token mint.
4. **Circuit Breakers**: Daily loss cap strictly blocks further purchases if net realized loss exceeds the configured threshold.
5. **Safe Emergency Stop**: Freezes all new purchases without falsely claiming that on-chain submitted transactions were rolled back.

### Live Test Suite Execution
The built-in automated test suite can be run directly from the dashboard (**Risk Guard → Run Test Suite**) or via:
```bash
npm run test # or GET /api/bot/test-suite
```
All 8 security invariants are verified:
- [x] Organic Valid Launch Passes All 8 Invariants
- [x] Creator Holding Exceeding Limit (> 15%) Blocked
- [x] Stale Launch Data Exceeding Age Limit Blocked
- [x] Wash Trading Single-Buyer Anomaly Blocked
- [x] Daily Loss Limit Circuit Breaker Enforced
- [x] Non-Pump.fun Spoofed PDA Rejected
- [x] Max Total Open Exposure Invariant Enforced
- [x] Private Key Zero-Leak Serialization Invariant

---

## 5. Checklist: Moving from Simulation to Controlled Live Trading

Before enabling real on-chain execution:

- [ ] **Dedicated Trading Wallet**: Generate a brand new, isolated keypair. Never use your primary savings wallet.
- [ ] **Minimal Capital**: Fund with no more than 0.1 to 0.5 SOL initially.
- [ ] **Dedicated RPC URL**: Replace public mainnet RPC with a free Helius or QuickNode private endpoint.
- [ ] **Conservative Risk Rules**: Set Max Buy to $\le 0.05$ SOL, Max Slippage to $\le 5\%$, Max Daily Loss to $\le 0.15$ SOL.
- [ ] **Passphrase Confirmation**: Live mode requires typing `CONFIRM_LIVE_TRADING` to prevent accidental activations.
- [ ] **Paper Test Run**: Observe simulated execution for at least 24 hours to verify token evaluation accuracy.

---

## 6. Pump.fun Program Architecture Reference

- **Program ID**: `6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P`
- **Fee Recipient**: `CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM`
- **Initial Virtual Reserves**:
  - Virtual SOL: $30\text{ SOL} = 30,000,000,000\text{ lamports}$
  - Virtual Tokens: $1,073,000,000,000,000$ ($1,073,000,000$ tokens with 6 decimals)
- **Constant Product Formula**:
  $$k = \text{virtualSolReserves} \times \text{virtualTokenReserves}$$
  $$\text{tokensOut} = \frac{\text{virtualTokenReserves} \times \Delta\text{SOL}}{\text{virtualSolReserves} + \Delta\text{SOL}}$$
