import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const newMessage = payload.record;

    if (!newMessage || !newMessage.chat_id) {
      return NextResponse.json({ received: true });
    }

    const chatId = newMessage.chat_id;
    const senderId = newMessage.sender_id;

    // 1. Получаем чат и связанный заказ
    const { data: chat } = await supabaseAdmin
      .from('chats')
      .select('client_id, provider_id, orders(title)')
      .eq('id', chatId)
      .single();

    if (!chat) return NextResponse.json({ received: true });

    // 2. Определяем ID получателя (того, кто НЕ отправлял сообщение)
    const recipientId = senderId === chat.client_id ? chat.provider_id : chat.client_id;
    if (!recipientId) return NextResponse.json({ received: true });

    // 3. Достаем email получателя через Supabase Admin Auth API
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(recipientId);
    const recipientEmail = userData?.user?.email;

    if (!recipientEmail) return NextResponse.json({ received: true });

    const orderTitle = (chat.orders as any)?.title || 'Zlecenie';
    const chatUrl = `https://razdwaszybko.pl/chats/${chatId}`;

    // 4. Отправляем email
    await resend.emails.send({
      from: 'RazDwaSzybko <noreply@razdwaszybko.pl>',
      to: recipientEmail,
      subject: `Nowa wiadomość: ${orderTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #7c3aed;">Masz nową wiadomość!</h2>
          <p>Ktoś napisał do Ciebie w czacie dotyczącym zlecenia: <b>${orderTitle}</b>.</p>
          <p style="margin: 30px 0; text-align: center;">
            <a href="${chatUrl}" style="background-color: #7c3aed; color: white; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block; font-size: 16px;">
              Otwórz czat
            </a>
          </p>
          <p style="font-size: 12px; color: #888; text-align: center;">RazDwaSzybko – Szybko, bezpiecznie i bez wychodzenia z domu.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Email notification error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}