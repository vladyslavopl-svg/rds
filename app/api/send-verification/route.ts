import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY); // Используйте переменную окружения!

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Nieprawidłowy adres e-mail.' }, { status: 400 });
    }

    // 1. Проверка: не отправляли ли код на этот адрес слишком часто (защита от спама)
    const { data: existing } = await supabaseAdmin
      .from('email_verifications')
      .select('created_at')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existing) {
      const lastSent = new Date(existing.created_at).getTime();
      const now = new Date().getTime();
      if (now - lastSent < 60000) { // Ограничение: 1 запрос в минуту
        return NextResponse.json({ error: 'Kod został już wysłany. Odczekaj chwilę.' }, { status: 429 });
      }
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. Сохраняем код в базу
    const { error: dbError } = await supabaseAdmin
      .from('email_verifications')
      .insert([{ email, code }]);

    if (dbError) throw dbError;

    // 3. Отправляем email
    const { error: emailError } = await resend.emails.send({
      from: 'RazDwaSzybko <no-reply@razdwaszybko.pl>', // Лучше добавить имя отправителя
      to: email,
      subject: 'Twój kod weryfikacyjny',
      text: `Twój kod weryfikacyjny to: ${code}. Kod jest ważny przez 15 minut.`
    });

    if (emailError) throw emailError;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Błąd weryfikacji:', error);
    return NextResponse.json({ error: 'Wystąpił błąd serwera.' }, { status: 500 });
  }
}