import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://razdwaszybko.pl';

  // 1. Статические страницы
  const staticPages = [
    '',
    '/login',
    '/contact',
    '/terms',
    '/privacy',
    '/orders',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1.0 : 0.8,
  }));

  // 2. Динамические страницы активных заказов из базы данных
  let orderPages: MetadataRoute.Sitemap = [];
  try {
    const { data: orders } = await supabase
      .from('orders')
      .select('id, updated_at')
      .eq('status', 'active');

    if (orders) {
      orderPages = orders.map((order) => ({
        url: `${baseUrl}/order/${order.id}`,
        lastModified: order.updated_at ? new Date(order.updated_at) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }));
    }
  } catch (error) {
    console.error('Błąd generowania sitemap dla zamówień:', error);
  }

  return [...staticPages, ...orderPages];
}