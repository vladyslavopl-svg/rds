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
    <div className="p-4 pb-28 max-w-md mx-auto min-h-screen">
      
      {/* Header */}
      <div className="mb-5 mt-2">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Szukaj zleceń</h1>
        <p className="text-sm text-gray-500 mt-1">Wyszukaj interesujące Cię zadanie</p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input 
          type="text"
          placeholder="Szukaj po tytule lub opisie..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="
            w-full
            bg-white border border-gray-200
            rounded-xl pl-11 pr-4 py-3
            text-sm text-gray-900
            placeholder:text-gray-400
            focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-400
            shadow-sm
            transition-shadow
          "
        />
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-5 scrollbar-none -mx-1 px-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`
              px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap
              transition-all
              ${selectedCategory === cat
                ? 'bg-violet-600 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
              }
            `}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 bg-gray-100 animate-pulse rounded-2xl w-full" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && filteredOrders.length === 0 && (
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
            <Search size={24} className="text-violet-400" />
          </div>
          <h3 className="font-bold text-gray-800 text-base">Nie znaleziono zleceń</h3>
          <p className="text-sm text-gray-500 mt-1.5 max-w-[240px]">
            Spróbuj zmienić filtry lub wyszukiwane hasło
          </p>
        </div>
      )}

      {/* Orders list */}
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