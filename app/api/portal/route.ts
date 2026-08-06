import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Инициализируем Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-07-29.dahlia', // обновлено под текущую версию типов
});

// Используем Service Role Key для безопасного доступа к базе данных
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'Brak identyfikatora użytkownika' }, { status: 400 });
    }

    // 1. Ищем stripe_customer_id пользователя в базе
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (error || !profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'Nie znaleziono konta Stripe. Kup subskrypcję PRO, aby aktywować portal.' },
        { status: 404 }
      );
    }

    // 2. Создаем сессию для Stripe Customer Portal
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      // Куда вернуть пользователя, когда он нажмет "Wróć" в портале
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://razdwaszybko.pl/profile'}/profile`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Błąd portalu Stripe:', error);
    return NextResponse.json({ error: 'Wystąpił błąd serwera' }, { status: 500 });
  }
}