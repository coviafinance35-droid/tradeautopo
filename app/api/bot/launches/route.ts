import { NextRequest, NextResponse } from 'next/server';
import { getEngine } from '@/lib/bot/state';

export async function GET(req: NextRequest) {
  try {
    const engine = getEngine();
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter'); // 'all', 'approved', 'rejected', 'spikes'

    let launches = engine.getLaunches();

    if (filter === 'approved') {
      launches = launches.filter(l => l.riskEvaluation?.decision === 'APPROVED');
    } else if (filter === 'rejected') {
      launches = launches.filter(l => l.riskEvaluation?.decision === 'REJECTED');
    } else if (filter === 'spikes') {
      launches = launches.filter(l => l.volumeSpike);
    }

    return NextResponse.json({
      launches,
      totalCount: launches.length,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch launches' }, { status: 500 });
  }
}
