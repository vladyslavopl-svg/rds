"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { OrderCard } from '@/components/ui/OrderCard';
import { ChevronLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function MyOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMyOrders = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push('/auth'); // Если не авторизован — на страницу входа
        return;
      }

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Błąd pobierania moich zleceń:', error);
      } else {
        setOrders(data || []);
      }
      setIsLoading(false);
    };

    fetchMyOrders();
  }, [router]);

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      {/* Шапка */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors -ml-1">
            <ChevronLeft size={20} className="text-razdwa-dark" />
          </button>
          <span className="font-bold text-sm text-razdwa-dark">Moje ogłoszenia</span>
        </div>
        <Button onClick={() => router.push('/create-order')} className="flex items-center gap-1 text-xs">
          <Plus size={14} /> Dodaj
        </Button>
      </div>

      <div className="p-4">
        {isLoading && (
          <div className="flex flex-col gap-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-32 bg-gray-200 animate-pulse rounded-xl w-full"></div>
            ))}
          </div>
        )}

        {!isLoading && orders.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 p-6 mt-4 shadow-sm">
            <div className="text-4xl mb-3">📋</div>
            <h3 className="font-bold text-gray-700 text-sm">Nie masz jeszcze żadnych ogłoszeń</h3>
            <p className="text-xs text-gray-500 mt-1 mb-4">Stwórz swoje pierwsze zlecenie, aby znaleźć fachowców.</p>
            <Button onClick={() => router.push('/create-order')}>
              Stwórz zlecenie
            </Button>
          </div>
        )}

        {!isLoading && orders.length > 0 && (
          <div className="flex flex-col gap-3">
            {orders.map((order) => (
              <OrderCard 
                key={order.id} 
                id={order.id}
                title={order.title}
                description={order.description}
                category={order.category}
                budget={order.budget}
                location={order.location}
                deadline={order.deadline}
                created_at={order.created_at}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}