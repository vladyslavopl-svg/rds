"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button'; // Твой компонент кнопки, или используй обычный <button>
import { ChevronLeft, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function WalletPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  // Твой price ID из Stripe
  const PRICE_ID = "price_1Tzu2MAQiCkL3kL2qyC79V6Y";

  const handleBuyPackage = async () => {
    setIsLoading(true);
    try {
      // 1. Получаем текущего пользователя
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        alert('Musisz być zalogowany, aby dokonać zakupu.');
        setIsLoading(false);
        return;
      }

      // 2. Отправляем запрос на наш новый серверный роут
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: PRICE_ID,
          userId: session.user.id, // Передаем ID, чтобы Stripe знал, кто платит
        }),
      });

      const data = await response.json();

      // 3. Если всё прошло успешно, Stripe вернет ссылку, и мы перекинем туда пользователя
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Błąd inicjalizacji płatności');
      }
    } catch (error) {
      console.error(error);
      alert('Wystąpił błąd podczas przekierowania do płatności.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-razdwa-gray min-h-screen pb-20">
      {/* Шапка */}
      <div className="flex items-center gap-3 px-4 py-4 bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors -ml-1">
          <ChevronLeft size={20} className="text-razdwa-dark" />
        </button>
        <span className="font-bold text-sm text-razdwa-dark flex items-center gap-1.5">
          <Wallet size={16} className="text-razdwa-purple" />
          Mój portfel
        </span>
      </div>

      <div className="p-4 flex flex-col items-center mt-4">
        {/* Карточка товара */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden max-w-sm w-full border border-gray-100 transition-transform hover:shadow-lg">
          
{/* Блок с картинкой */}
          <div className="relative w-full h-68 bg-gray-100 flex items-center justify-center overflow-hidden">
            <Image 
              src="/20points-pack.png" 
              alt="Pakiet 15 punktów" 
              fill 
              className="object-contain p-4 transition-transform duration-300 hover:scale-105" 
            />
          </div>
          
          {/* Блок с описанием и кнопкой */}
          <div className="p-5 flex flex-col gap-3">
            <div>
              <h2 className="font-bold text-lg text-razdwa-dark leading-tight"><b>15 Punktów</b></h2>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                Doładuj swoje konto, aby odblokować możliwość odpowiadania na zlecenia klientów. Jeden punkt to jedna możliwość kontaktu.
              </p>
            </div>
            
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 font-semibold uppercase">Cena</span>
                <span className="font-black text-xl text-razdwa-dark">30 zł</span>
              </div>
              
              <Button 
                onClick={handleBuyPackage} 
                disabled={isLoading}
                className="px-6 py-2.5 shadow-md hover:shadow-lg transition-shadow"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Ładowanie...
                  </span>
                ) : (
                  'Kup pakiet'
                )}
              </Button>
            </div>
          </div>
          
        </div>
        
        {/* Дополнительная информация */}
        <p className="text-[11px] text-gray-400 text-center mt-6 max-w-xs leading-relaxed">
          Płatności są bezpiecznie przetwarzane przez Stripe. Obsługujemy karty płatnicze oraz BLIK.
        </p>
      </div>
    </div>
  );
}