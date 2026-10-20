import { NextResponse } from 'next/server';
import { getEngine } from '@/lib/bot/state';

export async function GET() {
  try {
    const engine = getEngine();
    return NextResponse.json({
      logs: engine.getAuditLogs(),
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch audit logs' }, { status: 500 });
  }
}
