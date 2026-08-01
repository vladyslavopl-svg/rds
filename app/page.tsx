"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { OrderCard } from '@/components/ui/OrderCard';

export default function Home() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Błąd pobierania zleceń:', error);
      } else {
        setOrders(data || []);
      }
      setIsLoading(false);
    };

    fetchOrders();
  }, []);

  return (
    <div className="p-4 bg-gray-50 min-h-screen pb-24">
      <div className="mb-6 mt-15">
        <h1 className="text-2xl font-bold text-razdwa-dark">Najnowsze zlecenia</h1>
        <p className="text-gray-500 text-sm">Znajdź pracę, która Ci odpowiada</p>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-gray-200 animate-pulse rounded-2xl w-full"></div>
          ))}
        </div>
      )}

      {!isLoading && orders.length === 0 && (
        <div className="text-center py-10">
          <div className="text-4xl mb-3">📭</div>
          <h3 className="font-bold text-gray-700">Brak nowych zleceń</h3>
          <p className="text-sm text-gray-500 mt-1">Bądź pierwszym, który coś doda!</p>
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
              status={order.status}
              created_at={order.created_at}
            />
          ))}
        </div>
      )}
    </div>
  );
}