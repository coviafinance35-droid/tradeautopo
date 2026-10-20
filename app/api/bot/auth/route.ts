import { NextRequest, NextResponse } from 'next/server';

const EXPECTED_PASSCODE = process.env.OWNER_PASSCODE || 'guard2026';
const SESSION_COOKIE_NAME = 'launchguard_session';

export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME);
  const isAuthenticated = sessionCookie?.value === 'authenticated_owner_session';
  return NextResponse.json({ authenticated: isAuthenticated });
}

export async function POST(req: NextRequest) {
  try {
    const { passcode } = await req.json();

    if (passcode !== EXPECTED_PASSCODE) {
      return NextResponse.json({ error: 'Invalid owner passcode' }, { status: 401 });
    }

    const res = NextResponse.json({ success: true, message: 'Authentication successful' });
    res.cookies.set(SESSION_COOKIE_NAME, 'authenticated_owner_session', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return res;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Authentication failed' }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true, message: 'Logged out' });
  res.cookies.delete(SESSION_COOKIE_NAME);
  return res;
}
