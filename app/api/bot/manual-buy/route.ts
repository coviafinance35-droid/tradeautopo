import { NextRequest, NextResponse } from 'next/server';
import { getEngine } from '@/lib/bot/state';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mint, solAmount } = body;

    if (!mint || typeof mint !== 'string') {
      return NextResponse.json({ error: 'Valid Solana mint address is required' }, { status: 400 });
    }

    const engine = getEngine();
    const result = engine.executeManualBuy(mint.trim(), solAmount ? parseFloat(solAmount) : undefined);

    if (!result.success) {
      return NextResponse.json({ error: result.error, launch: result.launch }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Token purchased successfully after passing safety evaluation',
      launch: result.launch,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Execution error' }, { status: 500 });
  }
}
