import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return NextResponse.json({ authenticated: Boolean(user), user: user ? { id: user.id, email: user.email } : null });
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Authentication failed.' }, { status: 500 });
  }
}

export async function DELETE() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.json({ success: true });
}
