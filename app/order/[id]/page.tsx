import { supabase } from '@/lib/supabase';
import type { Metadata } from 'next';
import OrderDetailsClient from './OrderDetailsClient';

type Props = {
  params: Promise<{ id: string }>;
};

// Генерация метаданных (выполняется на сервере)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  if (!id) {
    return { title: 'Zlecenie | RazDwaSzybko' };
  }

  const { data: order } = await supabase
    .from('orders')
    .select('title, description, location, budget')
    .eq('id', id)
    .maybeSingle();

  if (!order) {
    return { title: 'Zlecenie nie zostało znalezione | RazDwaSzybko' };
  }

  const cleanDescription = order.description ? order.description.substring(0, 150) + '...' : '';

  return {
    title: `${order.title} — ${order.location || 'Polska'}`,
    description: `${cleanDescription} Budżet: ${order.budget || 'Do negocjacji'}. Znajdź fachowca na RazDwaSzybko.`,
    openGraph: {
      title: `${order.title} | RazDwaSzybko`,
      description: cleanDescription,
      type: 'article',
    },
  };
}

// Главная серверная страница, которая рендерит клиентскую часть
export default async function Page({ params }: Props) {
  const { id } = await params;
  return <OrderDetailsClient orderId={id} />;
}