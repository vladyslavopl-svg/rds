import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-07-29.dahlia',
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig!, webhookSecret);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Если оплата прошла успешно
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // Достаем наши скрытые данные из metadata
    const userId = session.metadata?.userId || session.client_reference_id;
    const isPro = session.metadata?.isPro === 'true';
    const addedPoints = parseInt(session.metadata?.points || '0');

    if (userId) {
if (isPro) {
  // 1. АКТИВИРУЕМ PRO НА 31 ДЕНЬ
  const expireDate = new Date();
  expireDate.setDate(expireDate.getDate() + 31);

  await supabaseAdmin
    .from('profiles')
    .update({ 
      is_pro: true,
      pro_expires_at: expireDate.toISOString(),
      stripe_customer_id: session.customer as string, // ← ЭТОГО НЕ ХВАТАЛО
    })
    .eq('id', userId);
    
  console.log(`Пользователь ${userId} получил статус PRO!`);
}

      else if (addedPoints > 0) {
        // 2. НАЧИСЛЯЕМ ПОИНТЫ (Если это не PRO)
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('points_balance')
          .eq('id', userId)
          .single();

        const currentPoints = profile?.points_balance || 0;

        await supabaseAdmin
          .from('profiles')
          .update({ points_balance: currentPoints + addedPoints })
          .eq('id', userId);
          
        console.log(`Пользователю ${userId} начислено ${addedPoints} поинтов!`);
      }
    }
  }

  return NextResponse.json({ received: true });
}