import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { targetUserId, code, updates } = await req.json();

    // Достаем профиль для проверки кода
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('admin_code, admin_code_expires_at')
      .eq('id', targetUserId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Nie znaleziono użytkownika.' }, { status: 404 });
    }

    if (!profile.admin_code || profile.admin_code !== code) {
      return NextResponse.json({ error: 'Nieprawidłowy kod potwierdzenia.' }, { status: 400 });
    }

    if (new Date() > new Date(profile.admin_code_expires_at)) {
      return NextResponse.json({ error: 'Kod wygasł. Wyślij nowy.' }, { status: 400 });
    }

    // Если код верный, применяем обновления (и очищаем код)
    const updateData: any = { ...updates, admin_code: null, admin_code_expires_at: null };

    // Если меняется email, обновляем через Auth Admin
    if (updates.email) {
      await supabase.auth.admin.updateUserById(targetUserId, { email: updates.email });
      delete updateData.email; // убираем из апдейта profiles, если там нет такой колонки
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', targetUserId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}