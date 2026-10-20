import { NextRequest, NextResponse } from 'next/server';
import { getEngine } from '@/lib/bot/state';

export async function GET() {
  try {
    const engine = getEngine();
    const positions = engine.getPositions();
    const openPositions = positions.filter(p => p.status === 'OPEN');
    const closedPositions = positions.filter(p => p.status === 'CLOSED');

    return NextResponse.json({
      open: openPositions,
      closed: closedPositions,
      totalCount: positions.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch positions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { positionId, reason } = body;

    if (!positionId) {
      return NextResponse.json({ error: 'positionId is required' }, { status: 400 });
    }

    const engine = getEngine();
    const res = engine.closePosition(positionId, reason || 'MANUAL_EXIT');

    if (!res.success) {
      return NextResponse.json({ error: res.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Position closed successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to close position' }, { status: 500 });
  }
}
