import { NextResponse } from 'next/server';
import { runFullTestSuite } from '@/lib/risk/tests';

export async function GET() {
  try {
    const report = runFullTestSuite();
    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to execute test suite' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const report = runFullTestSuite();
    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to execute test suite' }, { status: 500 });
  }
}
