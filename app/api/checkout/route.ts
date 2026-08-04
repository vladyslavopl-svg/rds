import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-07-29.dahlia',
});

export async function POST(req: Request) {
  try {
    // Теперь мы получаем еще и pointsToGive с фронтенда
    const { priceId, userId, isSubscription, pointsToGive } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'blik'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: isSubscription ? 'subscription' : 'payment', 
      
      // МАГИЯ ЗДЕСЬ: Передаем скрытые данные, которые вернутся нам в Webhook
      metadata: {
        userId: userId,
        isPro: isSubscription ? 'true' : 'false',
        points: pointsToGive ? pointsToGive.toString() : '0'
      },
      client_reference_id: userId,
      
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/wallet?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/wallet?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Błąd Stripe:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}