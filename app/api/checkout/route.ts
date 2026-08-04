import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const { priceId, userId, isSubscription, pointsToGive } = await req.json();

    // 1. АВТОМАТИЧЕСКИ получаем домен, с которого пришел запрос (например, https://www.razdwaszybko.pl)
    // Если по какой-то причине заголовка нет, используем твой боевой домен как запасной вариант
    const origin = req.headers.get('origin') || 'https://www.razdwaszybko.pl';

    if (!userId) {
      return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });
    }

    const paymentMethods = isSubscription ? ['card'] : ['card', 'blik'];

    const session = await stripe.checkout.sessions.create({
      payment_method_types: paymentMethods,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: isSubscription ? 'subscription' : 'payment', 
      metadata: {
        userId: userId,
        isPro: isSubscription ? 'true' : 'false',
        points: pointsToGive ? pointsToGive.toString() : '0'
      },
      client_reference_id: userId,
      
      // 2. ИСПОЛЬЗУЕМ НАШ origin ЗДЕСЬ
      success_url: `${origin}/wallet?success=true`,
      cancel_url: `${origin}/wallet?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Błąd Stripe:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}