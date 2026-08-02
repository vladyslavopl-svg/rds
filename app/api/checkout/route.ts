import { NextResponse } from 'next/server';
// @ts-ignore
import Stripe from 'stripe';

// Инициализируем Stripe твоим секретным ключом (он должен быть в .env.local)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-07-29.dahlia', // Используем актуальную версию API
});

export async function POST(req: Request) {
  try {
    const { priceId, userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'Brak autoryzacji (Нет авторизации)' }, { status: 401 });
    }

    // Создаем сессию оплаты
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'blik'], // Включаем поддержку карт и польского BLIK!
      line_items: [
        {
          price: priceId,
          quantity: 1, // 1 пакет
        },
      ],
      mode: 'payment',
      // Куда вернуть пользователя после успешной оплаты или отмены
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/wallet?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/wallet?canceled=true`,
      // КРАЙНЕ ВАЖНО: Привязываем платеж к ID пользователя, чтобы потом начислить ему поинты!
      client_reference_id: userId,
    });

    // Возвращаем ссылку на готовую страницу оплаты Stripe
    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Błąd Stripe:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}