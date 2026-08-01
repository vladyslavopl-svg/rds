"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { OrderCard, OrderCardProps } from '@/components/ui/OrderCard';
import { Search } from 'lucide-react';

const categories = [
  'Wszystkie',
  'Remont i budowa',
  'Hydraulika',
  'Sprzątanie',
  'IT i Grafika',
  'Transport',
  'Inne'
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderCardProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Wszystkie');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      // Загружаем все заказы (включая со статусом in_progress, чтобы на них отображалась плашка)
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

  const filteredOrders = orders.filter((order) => {
    const matchesCategory = selectedCategory === 'Wszystkie' || order.category === selectedCategory;
    const matchesSearch = order.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          order.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="p-4 bg-gray-50 min-h-screen pb-24">
      <div className="mb-4 mt-3">
        <h1 className="text-2xl font-bold text-razdwa-dark mb-1">Szukaj zleceń</h1>
        <p className="text-gray-500 text-sm">Wyszukaj interesujące Cię zadanie</p>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text"
          placeholder="Szukaj po tytule lub opisie..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-razdwa-purple/50 shadow-sm"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-razdwa-purple text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-gray-200 animate-pulse rounded-2xl w-full"></div>
          ))}
        </div>
      )}

      {!isLoading && filteredOrders.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 p-6 mt-4">
          <div className="text-4xl mb-3">🔍</div>
          <h3 className="font-bold text-gray-700">Nie znaleziono zleceń</h3>
          <p className="text-sm text-gray-500 mt-1">Spróbuj zmienić filtry lub wyszukiwane hasło.</p>
        </div>
      )}

      {!isLoading && filteredOrders.length > 0 && (
        <div className="flex flex-col gap-3">
          {filteredOrders.map((order) => (
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