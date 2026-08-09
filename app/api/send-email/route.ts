import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_KEY);

// Используем Service Role Key для доступа к email адресам пользователей из Auth
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { type, orderId, providerId } = await req.json();

    if (!orderId || !providerId || !type) {
      return NextResponse.json({ error: 'Brak wymaganych danych' }, { status: 400 });
    }

    // 1. Запрашиваем информацию о заказе
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Nie znaleziono zlecenia' }, { status: 404 });
    }

    if (type === 'new_offer') {
      // === ТИП 1: Мастер отклинулся -> Отправляем письмо Клиенту ===
      const [{ data: clientUser }, { data: providerProfile }] = await Promise.all([
        supabase.auth.admin.getUserById(order.user_id),
        supabase.from('profiles').select('full_name').eq('id', providerId).single()
      ]);

      const clientEmail = clientUser?.user?.email;
      const providerName = providerProfile?.full_name || 'Fachowiec';

      if (clientEmail) {
        await resend.emails.send({
          from: 'RazDwaSzybko <support@razdwaszybko.pl>', // Используем верифицированный домен
          to: clientEmail,
          replyTo: 'support@razdwaszybko.pl', // Куда клиент может ответить
          subject: `Nowa oferta do Twojego zlecenia: "${order.title}"`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #111827; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #7c3aed; margin-bottom: 12px;">Masz nowe zgłoszenie! 🚀</h2>
              <p style="font-size: 14px; line-height: 1.5; color: #374151;">
                Wykonawca <strong>${providerName}</strong> właśnie złożył ofertę do Twojego zlecenia:
                <br /><em style="color: #6b7280;">"${order.title}"</em>
              </p>
              <p style="font-size: 14px; color: #374151;">
                Zaloguj się na platformę, aby przejrzeć profil wykonawcy, jego opinie i skontaktować się z nim bezpośrednio.
              </p>
              <a href="https://www.razdwaszybko.pl/order/${order.id}" style="display: inline-block; background-color: #7c3aed; color: #ffffff; padding: 12px 24px; font-weight: bold; border-radius: 12px; text-decoration: none; margin-top: 12px;">
                Zobacz zgłoszenie
              </a>
            </div>
          `,
        });
      }
    } else if (type === 'provider_selected') {
      // === ТИП 2: Клиент выбрал мастера -> Отправляем письмо Исполнителю ===
      const { data: providerUser } = await supabase.auth.admin.getUserById(providerId);
      const providerEmail = providerUser?.user?.email;

      if (providerEmail) {
        await resend.emails.send({
          from: 'RazDwaSzybko <support@razdwaszybko.pl>', // Используем верифицированный домен
          to: providerEmail,
          replyTo: 'support@razdwaszybko.pl', // Куда мастер может ответить
          subject: `Gratulacje! Wybrano Cię do zlecenia: "${order.title}"`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #111827; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #059669; margin-bottom: 12px;">Wybrano Twoją ofertę! 🎉</h2>
              <p style="font-size: 14px; line-height: 1.5; color: #374151;">
                Klient wyznaczył Cię jako wykonawcę do zlecenia:
                <br /><em style="color: #6b7280;">"${order.title}"</em>
              </p>
              <p style="font-size: 14px; color: #374151;">
                Możesz skontaktować się z klientem telefonicznie lub rozpocząć rozmowę w czacie.
              </p>
              <a href="https://www.razdwaszybko.pl/order/${order.id}" style="display: inline-block; background-color: #059669; color: #ffffff; padding: 12px 24px; font-weight: bold; border-radius: 12px; text-decoration: none; margin-top: 12px;">
                Otwórz zlecenie
              </a>
            </div>
          `,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Błąd wysyłania emaila:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}