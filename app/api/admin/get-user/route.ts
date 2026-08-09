import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'Brak ID użytkownika' }, { status: 400 });
    }

    // Ищем профиль в базе данных
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Nie znaleziono użytkownika.' }, { status: 404 });
    }

    // Получаем защищенный email через Auth Admin
    const { data: userData } = await supabase.auth.admin.getUserById(userId).catch(() => ({ data: null }));

    return NextResponse.json({
      profile,
      email: userData?.user?.email || ''
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}