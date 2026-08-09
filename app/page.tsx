"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { OrderCard } from '@/components/ui/OrderCard';
import { ClipboardList } from 'lucide-react';

const PAGE_SIZE = 10;

export default function Home() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const fetchOrders = useCallback(async (pageNum: number, append = false) => {
    if (pageNum === 0) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Błąd pobierania zleceń:', error);
    } else {
      const newOrders = data || [];
      
      if (append) {
        setOrders((prev) => [...prev, ...newOrders]);
      } else {
        setOrders(newOrders);
      }

      // Если пришло меньше PAGE_SIZE — больше данных нет
      setHasMore(newOrders.length === PAGE_SIZE);
    }

    setIsLoading(false);
    setIsLoadingMore(false);
  }, []);

  // Первая загрузка
  useEffect(() => {
    fetchOrders(0, false);
  }, [fetchOrders]);

  // Подгрузка при изменении page
  useEffect(() => {
    if (page === 0) return;
    fetchOrders(page, true);
  }, [page, fetchOrders]);

  // Intersection Observer для бесконечной прокрутки
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoading, isLoadingMore]);

  return (
    <div className="p-4 pb-28 max-w-md mx-auto min-h-screen">
      
      {/* Header */}
      <div className="mb-6 mt-2">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Najnowsze zlecenia
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Znajdź pracę, która Ci odpowiada
        </p>
      </div>

      {/* Loading (первая загрузка) */}
      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 bg-gray-100 animate-pulse rounded-2xl w-full" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && orders.length === 0 && (
        <div className="
          flex flex-col items-center justify-center
          text-center py-14 px-6
          bg-white rounded-2xl border border-gray-100 shadow-sm
        ">
          <div className="
            w-14 h-14 mb-3
            bg-violet-50 rounded-2xl
            flex items-center justify-center
          ">
            <ClipboardList size={24} className="text-violet-400" />
          </div>
          <h3 className="font-bold text-gray-800 text-base">Brak nowych zleceń</h3>
          <p className="text-sm text-gray-500 mt-1.5">
            Bądź pierwszym, który coś doda!
          </p>
        </div>
      )}

      {/* Orders list */}
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

          {/* Триггер подгрузки */}
          <div ref={loadMoreRef} className="py-4 flex justify-center">
            {isLoadingMore && (
              <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
            )}
            {!hasMore && (
              <p className="text-xs text-gray-400">To wszystkie zlecenia</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}