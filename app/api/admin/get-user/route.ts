import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Здесь используется секретный ключ с правами админа
);

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error) throw error;
    return NextResponse.json({ user: data.user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}