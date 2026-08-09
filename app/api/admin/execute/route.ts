import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { targetUserId, updates } = await req.json();

    if (!targetUserId) {
      return NextResponse.json({ error: 'Brak ID użytkownika.' }, { status: 400 });
    }

    // Обновляем профиль (например, is_banned и ban_reason)
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', targetUserId);

    if (updateError) throw updateError;

    // Если пользователя заблокировали, сразу сбрасываем его активные сессии (выкидываем из аккаунта)
    if (updates.is_banned === true) {
      await supabase.auth.admin.signOut(targetUserId);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}