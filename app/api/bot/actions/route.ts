import { NextRequest, NextResponse } from 'next/server';
import { getEngine } from '@/lib/bot/state';
import type { BotState } from '@/lib/types';

const allowedStates = new Set<BotState>(['STOPPED', 'MONITORING', 'PAUSED', 'EXECUTING']);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const engine = getEngine();

    switch (body.action) {
      case 'run_cycle':
        return NextResponse.json(engine.runCycle());
      case 'start_monitoring': {
        const result = engine.setBotState('MONITORING');
        return result.success ? NextResponse.json(result) : NextResponse.json(result, { status: 400 });
      }
      case 'stop': {
        const result = engine.setBotState('STOPPED');
        return result.success ? NextResponse.json(result) : NextResponse.json(result, { status: 400 });
      }
      case 'set_state': {
        if (!allowedStates.has(body.state)) {
          return NextResponse.json({ error: 'Invalid bot state.' }, { status: 400 });
        }
        const result = engine.setBotState(body.state);
        return result.success ? NextResponse.json(result) : NextResponse.json(result, { status: 400 });
      }
      default:
        return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid action request.' }, { status: 400 });
  }
}
