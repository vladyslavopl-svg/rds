import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { targetUserId, actionDescription } = await req.json();

    // Генерируем 6-значный код
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 минут

    // Сохраняем код в профиль целевого пользователя (или админа)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ admin_code: code, admin_code_expires_at: expiresAt })
      .eq('id', targetUserId);

    if (updateError) throw updateError;

    // Получаем почту пользователя
    const { data: userData } = await supabase.auth.admin.getUserById(targetUserId);
    const userEmail = userData?.user?.email;

    if (!userEmail) {
      return NextResponse.json({ error: 'Nie znaleziono adresu e-mail użytkownika.' }, { status: 404 });
    }

    // Отправляем код на почту через верифицированный домен
    await resend.emails.send({
      from: 'RazDwaSzybko Admin <support@razdwaszybko.pl>',
      to: userEmail,
      subject: 'Kod potwierdzenia operacji administracyjnej',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #111827; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #7c3aed;">Potwierdzenie zmiany danych 🔒</h2>
          <p>Otrzymaliśmy prośbę o modyfikację Twojego konta w panelu administracyjnym.</p>
          <p>Twój kod potwierdzenia:</p>
          <div style="font-size: 24px; font-weight: bold; background: #f3f4f6; padding: 12px; text-align: center; border-radius: 8px; letter-spacing: 4px;">
            ${code}
          </div>
          <p style="font-size: 12px; color: #6b7280; margin-top: 16px;">Kod jest ważny przez 10 minut. Jeśli to nie Ty, zignoruj tę wiadomość.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, message: 'Kod został wysłany na e-mail użytkownika.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}