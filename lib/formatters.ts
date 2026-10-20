export function formatSol(amount: number, digits: number = 4): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '0.0000 SOL';
  return `${amount.toFixed(digits)} SOL`;
}

export function formatAddress(address: string, sliceSize: number = 4): string {
  if (!address || address.length < sliceSize * 2) return address || '';
  return `${address.slice(0, sliceSize)}...${address.slice(-sliceSize)}`;
}

export function formatTimeAgo(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ago`;
}

export function formatPercent(pct: number): string {
  if (pct === undefined || pct === null || isNaN(pct)) return '0.0%';
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}
