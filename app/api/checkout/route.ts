import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    // Теперь мы получаем еще и isSubscription из нашего приложения
    const { priceId, userId, isSubscription } = await req.json();

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
      // МАГИЯ ЗДЕСЬ: Если это подписка, Stripe требует режим 'subscription', иначе 'payment'
      mode: isSubscription ? 'subscription' : 'payment', 
      
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/wallet?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/wallet?canceled=true`,
      client_reference_id: userId,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Błąd Stripe:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}