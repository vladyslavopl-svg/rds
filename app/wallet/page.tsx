"use client";

import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { ChevronLeft, Wallet, Star, Infinity, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';

const PACKAGES = [
  {
    id: "price_1Tzu2MAQiCkL3kL2qyC79V6Y",
    points: "15",
    price: "30 zł",
    description: "Idealny na start. 15 możliwości kontaktu z klientami.",
    isPopular: false,
    isPro: false,
  },
  {
    id: "price_1ТВОЙ_ID_ДЛЯ_35_PUNKTOW",
    points: "35",
    price: "60 zł",
    description: "Najlepszy wybór na początek tygodnia.",
    isPopular: false,
    isPro: false,
  },
  {
    id: "price_1ТВОЙ_ID_ДЛЯ_95_PUNKTOW",
    points: "95",
    price: "150 zł",
    description: "Najczęściej wybierany przez aktywnych fachowców. Hit sprzedaży!",
    isPopular: true,
    isPro: false,
  },
  {
    id: "price_1ТВОЙ_ID_ДЛЯ_300_PUNKTOW",
    points: "300",
    price: "400 zł",
    description: "Zapas na długi czas. Najbardziej opłacalny pakiet jednorazowy.",
    isPopular: false,
    isPro: false,
  },
  {
    id: "price_1ТВОЙ_ID_ДЛЯ_PRO_ПОДПИСКИ",
    points: "PRO",
    price: "199 zł / mc",
    description: "Nielimitowane odpowiedzi przez miesiąc + widoczny status PRO (fioletowa gwiazdka na profilu).",
    isPopular: false,
    isPro: true,
  },
];

export default function WalletPage() {
  const router = useRouter();
  const [loadingPackageId, setLoadingPackageId] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(2); // по умолчанию популярный
  const scrollRef = useRef<HTMLDivElement>(null);

  // Следим за скроллом на мобильных, чтобы обновлять точки
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const cards = el.querySelectorAll('[data-card]');
      const scrollLeft = el.scrollLeft;
      const cardWidth = cards[0]?.clientWidth || 300;
      const gap = 20;
      const index = Math.round(scrollLeft / (cardWidth + gap));
      setActiveIndex(Math.min(Math.max(index, 0), PACKAGES.length - 1));
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToCard = (index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const cards = el.querySelectorAll('[data-card]');
    const card = cards[index] as HTMLElement;
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  };

  const handleBuyPackage = async (priceId: string, isPro: boolean) => {
    setLoadingPackageId(priceId);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        alert('Musisz być zalogowany, aby dokonać zakupu.');
        setLoadingPackageId(null);
        return;
      }

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          userId: session.user.id,
          isSubscription: isPro,
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Błąd inicjalizacji płatności');
      }
    } catch (error) {
      console.error(error);
      alert('Wystąpił błąd podczas przekierowania do płatności.');
    } finally {
      setLoadingPackageId(null);
    }
  };

  return (
    <div className="bg-razdwa-gray min-h-screen pb-24">
      {/* Шапка */}
      <div className="flex items-center gap-3 px-4 py-4 bg-white border-b border-gray-100 shadow-sm sticky top-0 z-20">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-1 hover:bg-gray-100 rounded-full transition-colors active:scale-95"
        >
          <ChevronLeft size={20} className="text-razdwa-dark" />
        </button>
        <span className="font-bold text-sm text-razdwa-dark flex items-center gap-1.5">
          <Wallet size={16} className="text-razdwa-purple" />
          Mój portfel
        </span>
      </div>

      <div className="pt-6 pb-4">
        <h1 className="text-2xl font-black text-razdwa-dark px-4 mb-1 md:text-center">
          Wybierz pakiet
        </h1>
        <p className="text-sm text-gray-500 px-4 mb-6 md:text-center">
          Punkty do kontaktu z klientami
        </p>

        {/* ========== МОБИЛЬНЫЙ / ПЛАНШЕТ: горизонтальный скролл ========== */}
        <div className="relative lg:hidden">
          {/* Градиентные края */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-8 w-6 bg-gradient-to-r from-razdwa-gray to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-8 w-6 bg-gradient-to-l from-razdwa-gray to-transparent z-10" />

          <div
            ref={scrollRef}
            className="flex gap-5 overflow-x-auto snap-x snap-mandatory px-4 pb-6 scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {PACKAGES.map((pkg, index) => {
              const isLoading = loadingPackageId === pkg.id;
              const isActive = activeIndex === index;

              return (
                <div
                  key={pkg.id}
                  data-card
                  onClick={() => scrollToCard(index)}
                  className={`
                    shrink-0 w-[78vw] max-w-[320px] snap-center
                    bg-white rounded-3xl overflow-hidden border-2 transition-all duration-300
                    flex flex-col
                    ${pkg.isPro
                      ? 'border-purple-500 shadow-lg shadow-purple-100'
                      : pkg.isPopular
                        ? 'border-razdwa-purple shadow-md'
                        : isActive
                          ? 'border-gray-300 shadow-md'
                          : 'border-gray-100 shadow-sm'
                    }
                  `}
                >
                  {/* Бейдж */}
                  {(pkg.isPopular || pkg.isPro) && (
                    <div className={`
                      absolute top-0 left-1/2 -translate-x-1/2 z-10
                      text-[10px] font-bold uppercase tracking-wider px-3.5 py-1 rounded-b-xl
                      flex items-center gap-1 shadow-sm
                      ${pkg.isPro
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                        : 'bg-razdwa-purple text-white'
                      }
                    `}>
                      <Star size={10} className={pkg.isPro ? 'fill-yellow-300 text-yellow-300' : 'fill-white'} />
                      {pkg.isPro ? 'Polecany' : 'Hit sprzedaży'}
                    </div>
                  )}

                  {/* Верхняя часть с цифрами */}
                  <div className={`
                    relative h-44 flex items-center justify-center
                    ${pkg.isPro
                      ? 'bg-gradient-to-br from-purple-50 via-indigo-50 to-purple-50'
                      : pkg.isPopular
                        ? 'bg-purple-50'
                        : 'bg-gray-50'
                    }
                  `}>
                    {pkg.isPro ? (
                      <div className="flex flex-col items-center mt-2">
                        <Infinity size={52} className="text-razdwa-purple mb-1" strokeWidth={2.5} />
                        <span className="text-4xl font-black bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                          PRO
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center mt-2">
                        <span className={`text-7xl font-black tracking-tighter leading-none ${
                          pkg.isPopular ? 'text-razdwa-purple' : 'text-gray-400'
                        }`}>
                          {pkg.points}
                        </span>
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1.5">
                          Punktów
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Контент */}
                  <div className="p-5 flex flex-col flex-1 gap-4">
                    <div className="flex-1">
                      <h2 className="font-black text-lg text-razdwa-dark leading-tight">
                        {pkg.isPro ? 'Konto PRO' : `Pakiet ${pkg.points} pkt`}
                      </h2>
                      <p className="text-[13px] text-gray-500 mt-2 leading-relaxed">
                        {pkg.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Cena</div>
                        <div className="font-black text-xl text-razdwa-dark">{pkg.price}</div>
                      </div>

                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBuyPackage(pkg.id, pkg.isPro);
                        }}
                        disabled={loadingPackageId !== null}
                        className={`
                          min-w-[110px] h-11 rounded-xl font-bold text-sm shadow-sm
                          active:scale-95 transition-all
                          ${pkg.isPro
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:opacity-90'
                            : pkg.isPopular
                              ? 'bg-razdwa-purple text-white hover:bg-purple-700'
                              : 'bg-razdwa-dark text-white hover:bg-gray-800'
                          }
                        `}
                      >
                        {isLoading ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          pkg.isPro ? 'Aktywuj' : 'Kupuję'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Точки-индикаторы */}
          <div className="flex justify-center gap-2 mt-1">
            {PACKAGES.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollToCard(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  activeIndex === index
                    ? 'w-6 bg-razdwa-purple'
                    : 'w-2 bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* ========== ДЕСКТОП: сетка ========== */}
        <div className="hidden lg:grid grid-cols-3 xl:grid-cols-5 gap-5 px-6 max-w-7xl mx-auto">
          {PACKAGES.map((pkg) => {
            const isLoading = loadingPackageId === pkg.id;

            return (
              <div
                key={pkg.id}
                className={`
                  relative bg-white rounded-3xl overflow-hidden border-2 transition-all duration-300
                  flex flex-col hover:shadow-lg hover:-translate-y-1
                  ${pkg.isPro
                    ? 'border-purple-500 shadow-lg shadow-purple-100'
                    : pkg.isPopular
                      ? 'border-razdwa-purple shadow-md'
                      : 'border-gray-100 shadow-sm'
                  }
                `}
              >
                {(pkg.isPopular || pkg.isPro) && (
                  <div className={`
                    absolute top-0 left-1/2 -translate-x-1/2 z-10
                    text-[10px] font-bold uppercase tracking-wider px-3.5 py-1 rounded-b-xl
                    flex items-center gap-1
                    ${pkg.isPro
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                      : 'bg-razdwa-purple text-white'
                    }
                  `}>
                    <Star size={10} className={pkg.isPro ? 'fill-yellow-300 text-yellow-300' : 'fill-white'} />
                    {pkg.isPro ? 'Polecany' : 'Hit sprzedaży'}
                  </div>
                )}

                <div className={`
                  h-40 flex items-center justify-center
                  ${pkg.isPro
                    ? 'bg-gradient-to-br from-purple-50 to-indigo-50'
                    : pkg.isPopular
                      ? 'bg-purple-50'
                      : 'bg-gray-50'
                  }
                `}>
                  {pkg.isPro ? (
                    <div className="flex flex-col items-center">
                      <Infinity size={48} className="text-razdwa-purple mb-1" strokeWidth={2.5} />
                      <span className="text-3xl font-black bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                        PRO
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <span className={`text-6xl font-black tracking-tighter ${
                        pkg.isPopular ? 'text-razdwa-purple' : 'text-gray-400'
                      }`}>
                        {pkg.points}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                        Punktów
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-5 flex flex-col flex-1 gap-4">
                  <div className="flex-1">
                    <h2 className="font-black text-base text-razdwa-dark leading-tight">
                      {pkg.isPro ? 'Konto PRO' : `Pakiet ${pkg.points} pkt`}
                    </h2>
                    <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                      {pkg.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-gray-100 space-y-3">
                    <div className="font-black text-xl text-razdwa-dark">{pkg.price}</div>
                    <Button
                      onClick={() => handleBuyPackage(pkg.id, pkg.isPro)}
                      disabled={loadingPackageId !== null}
                      className={`
                        w-full h-11 rounded-xl font-bold text-sm
                        ${pkg.isPro
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:opacity-90'
                          : pkg.isPopular
                            ? 'bg-razdwa-purple text-white hover:bg-purple-700'
                            : 'bg-razdwa-dark text-white hover:bg-gray-800'
                        }
                      `}
                    >
                      {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                      ) : (
                        pkg.isPro ? 'Aktywuj PRO' : 'Kupuję'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Подпись */}
        <p className="text-[11px] text-gray-400 text-center px-6 max-w-md mx-auto leading-relaxed mt-8">
          Płatności bezpiecznie przetwarzane przez Stripe.
          <br />
          Karty, Apple Pay, Google Pay oraz BLIK.
        </p>
      </div>
    </div>
  );
}