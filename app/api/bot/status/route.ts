import { NextRequest, NextResponse } from 'next/server';
import { getEngine } from '@/lib/bot/state';

export async function GET() {
  try {
    const engine = getEngine();
    const summary = engine.getSummary();
    return NextResponse.json(summary);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to get bot summary' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const engine = getEngine();

    const { action } = body;

    if (action === 'emergency_stop') {
      const res = engine.triggerEmergencyStop();
      return NextResponse.json(res);
    }

    if (action === 'clear_emergency_stop') {
      const res = engine.resumeFromEmergencyStop();
      return NextResponse.json(res);
    }

    if (action === 'set_autobuy') {
      const { enabled } = body;
      const res = engine.setAutoBuy(Boolean(enabled));
      if (!res.success) {
        return NextResponse.json({ error: res.error }, { status: 400 });
      }
      return NextResponse.json(res);
    }

    if (action === 'set_trading_mode') {
      const { mode, confirmationWord } = body;
      const res = engine.setTradingMode(mode, confirmationWord);
      if (!res.success) {
        return NextResponse.json({ error: res.error }, { status: 400 });
      }
      return NextResponse.json(res);
    }

    if (action === 'set_bot_state') {
      const { state } = body;
      const res = engine.setBotState(state);
      return NextResponse.json(res);
    }

    return NextResponse.json({ error: 'Unknown action specified' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Action failed' }, { status: 500 });
  }
}
