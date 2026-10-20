import { NextRequest, NextResponse } from 'next/server';
import { getEngine } from '@/lib/bot/state';

export async function GET() {
  try {
    const engine = getEngine();
    return NextResponse.json(engine.getSummary().settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const engine = getEngine();

    const result = engine.updateSettings(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      settings: engine.getSummary().settings,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update settings' }, { status: 500 });
  }
}
