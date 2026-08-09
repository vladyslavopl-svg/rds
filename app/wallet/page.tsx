"use client";

import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { ChevronLeft, Wallet, Star, Infinity } from 'lucide-react';
import { useRouter } from 'next/navigation';

const PACKAGES = [
  {
    id: "price_1U2frQAQiCkL3kL2TuFvJr7H",
    points: "15",
    price: "30 zł",
    description: "Idealny na start. 15 możliwości kontaktu z klientami.",
    isPopular: false,
    isPro: false,
  },
    {
    id: "price_1U2gLbAQiCkL3kL2ZJVFKHcl",
    points: "5",
    price: "3 zł",
    description: "Idealny na start. 15 możliwości kontaktu z klientami.",
    isPopular: false,
    isPro: false,
  },
  {
    id: "price_1U2ftIAQiCkL3kL2KWbYto9Q",
    points: "35",
    price: "60 zł",
    description: "Najlepszy wybór na początek tygodnia.",
    isPopular: false,
    isPro: false,
  },
  {
    id: "price_1U2ftmAQiCkL3kL2xWnhIuUT",
    points: "95",
    price: "150 zł",
    description: "Najczęściej wybierany przez aktywnych fachowców.",
    isPopular: true,
    isPro: false,
  },
  {
    id: "price_1U2fuBAQiCkL3kL2eUAyXZRx",
    points: "300",
    price: "400 zł",
    description: "Zapas na długi czas. Najbardziej opłacalny pakiet.",
    isPopular: false,
    isPro: false,
  },
  {
    id: "price_1U2fuxAQiCkL3kL2r7AXEskN",
    points: "PRO",
    price: "199 zł / mc",
    description: "Nielimitowane odpowiedzi + widoczny status PRO.",
    isPopular: false,
    isPro: true,
  },
];

export default function WalletPage() {
  const router = useRouter();
  const [loadingPackageId, setLoadingPackageId] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(2);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const cards = el.querySelectorAll('[data-card]');
      if (!cards[0]) return;
      const cardWidth = (cards[0] as HTMLElement).offsetWidth;
      const gap = 16;
      const index = Math.round(el.scrollLeft / (cardWidth + gap));
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
        router.push('/login');
        return;
      }

      const pkg = PACKAGES.find(p => p.id === priceId);

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          userId: session.user.id,
          isSubscription: isPro,
          pointsToGive: isPro ? 0 : parseInt(pkg?.points || "0")
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
    <div className="bg-gray-50 min-h-screen pb-28">
      
      {/* Header */}
      <div className="
        sticky top-0 z-20
        flex items-center gap-3 px-4 py-3.5
        bg-white/95 backdrop-blur-md
        border-b border-gray-100
        shadow-[0_1px_3px_rgba(0,0,0,0.04)]
      ">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-1 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft size={22} className="text-gray-700" />
        </button>
        <div className="flex items-center gap-2">
          <Wallet size={18} className="text-violet-600" />
          <span className="font-semibold text-[15px] text-gray-900">Mój portfel</span>
        </div>
      </div>

      <div className="pt-6 pb-4 max-w-6xl mx-auto">
        <div className="px-4 mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Wybierz pakiet
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Punkty do kontaktu z klientami
          </p>
        </div>

        {/* ========== MOBILE: горизонтальный скролл ========== */}
        <div className="relative lg:hidden">
          <div
            ref={scrollRef}
            className="
              flex gap-4 overflow-x-auto snap-x snap-mandatory
              px-4 pb-4
              scrollbar-none
            "
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {PACKAGES.map((pkg, index) => {
              const isLoading = loadingPackageId === pkg.id;

              return (
                <div
                  key={pkg.id}
                  data-card
                  onClick={() => scrollToCard(index)}
                  className={`
                    relative shrink-0 w-[75vw] max-w-[300px] snap-center
                    bg-white rounded-2xl overflow-hidden
                    border transition-all duration-300
                    flex flex-col
                    ${pkg.isPro
                      ? 'border-violet-400 shadow-lg shadow-violet-100'
                      : pkg.isPopular
                        ? 'border-violet-300 shadow-md'
                        : 'border-gray-100 shadow-sm'
                    }
                  `}
                >
                  {/* Badge */}
                  {(pkg.isPopular || pkg.isPro) && (
                    <div className={`
                      absolute top-0 left-1/2 -translate-x-1/2 z-10
                      text-[10px] font-bold uppercase tracking-wider
                      px-3 py-1 rounded-b-lg
                      flex items-center gap-1
                      ${pkg.isPro
                        ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white'
                        : 'bg-violet-600 text-white'
                      }
                    `}>
                      <Star size={10} className={pkg.isPro ? 'fill-yellow-300 text-yellow-300' : 'fill-white'} />
                      {pkg.isPro ? 'Polecany' : 'Hit'}
                    </div>
                  )}

                  {/* Top */}
                  <div className={`
                    h-40 flex items-center justify-center
                    ${pkg.isPro
                      ? 'bg-gradient-to-br from-violet-50 to-fuchsia-50'
                      : pkg.isPopular
                        ? 'bg-violet-50'
                        : 'bg-gray-50'
                    }
                  `}>
                    {pkg.isPro ? (
                      <div className="flex flex-col items-center">
                        <Infinity size={44} className="text-violet-600 mb-1" strokeWidth={2.5} />
                        <span className="text-3xl font-black bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                          PRO
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <span className={`text-6xl font-black tracking-tighter leading-none ${
                          pkg.isPopular ? 'text-violet-600' : 'text-gray-400'
                        }`}>
                          {pkg.points}
                        </span>
                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mt-1">
                          Punktów
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4 flex flex-col flex-1 gap-3">
                    <div className="flex-1">
                      <h2 className="font-bold text-base text-gray-900">
                        {pkg.isPro ? 'Konto PRO' : `Pakiet ${pkg.points} pkt`}
                      </h2>
                      <p className="text-[13px] text-gray-500 mt-1.5 leading-relaxed">
                        {pkg.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div>
                        <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Cena</div>
                        <div className="font-bold text-lg text-gray-900">{pkg.price}</div>
                      </div>

                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBuyPackage(pkg.id, pkg.isPro);
                        }}
                        disabled={loadingPackageId !== null}
                        className={`
                          min-w-[100px] h-10 rounded-xl text-sm font-semibold
                          ${pkg.isPro
                            ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white'
                            : pkg.isPopular
                              ? 'bg-violet-600 text-white'
                              : 'bg-gray-900 text-white'
                          }
                        `}
                      >
                        {isLoading ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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

          {/* Dots */}
          <div className="flex justify-center gap-1.5 mt-2">
            {PACKAGES.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollToCard(index)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  activeIndex === index
                    ? 'w-5 bg-violet-600'
                    : 'w-1.5 bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* ========== DESKTOP: сетка ========== */}
        <div className="hidden lg:grid grid-cols-3 xl:grid-cols-5 gap-4 px-6">
          {PACKAGES.map((pkg) => {
            const isLoading = loadingPackageId === pkg.id;

            return (
              <div
                key={pkg.id}
                className={`
                  relative bg-white rounded-2xl overflow-hidden
                  border transition-all duration-300
                  flex flex-col
                  hover:shadow-lg hover:-translate-y-0.5
                  ${pkg.isPro
                    ? 'border-violet-400 shadow-lg shadow-violet-100'
                    : pkg.isPopular
                      ? 'border-violet-300 shadow-md'
                      : 'border-gray-100 shadow-sm'
                  }
                `}
              >
                {(pkg.isPopular || pkg.isPro) && (
                  <div className={`
                    absolute top-0 left-1/2 -translate-x-1/2 z-10
                    text-[10px] font-bold uppercase tracking-wider
                    px-3 py-1 rounded-b-lg
                    flex items-center gap-1
                    ${pkg.isPro
                      ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white'
                      : 'bg-violet-600 text-white'
                    }
                  `}>
                    <Star size={10} className={pkg.isPro ? 'fill-yellow-300 text-yellow-300' : 'fill-white'} />
                    {pkg.isPro ? 'Polecany' : 'Hit'}
                  </div>
                )}

                <div className={`
                  h-36 flex items-center justify-center
                  ${pkg.isPro
                    ? 'bg-gradient-to-br from-violet-50 to-fuchsia-50'
                    : pkg.isPopular
                      ? 'bg-violet-50'
                      : 'bg-gray-50'
                  }
                `}>
                  {pkg.isPro ? (
                    <div className="flex flex-col items-center">
                      <Infinity size={40} className="text-violet-600 mb-1" strokeWidth={2.5} />
                      <span className="text-2xl font-black bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                        PRO
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <span className={`text-5xl font-black tracking-tighter ${
                        pkg.isPopular ? 'text-violet-600' : 'text-gray-400'
                      }`}>
                        {pkg.points}
                      </span>
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-1">
                        Punktów
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-4 flex flex-col flex-1 gap-3">
                  <div className="flex-1">
                    <h2 className="font-bold text-sm text-gray-900">
                      {pkg.isPro ? 'Konto PRO' : `Pakiet ${pkg.points} pkt`}
                    </h2>
                    <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                      {pkg.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-gray-100 space-y-2.5">
                    <div className="font-bold text-lg text-gray-900">{pkg.price}</div>
                    <Button
                      onClick={() => handleBuyPackage(pkg.id, pkg.isPro)}
                      disabled={loadingPackageId !== null}
                      className={`
                        w-full h-10 rounded-xl text-sm font-semibold
                        ${pkg.isPro
                          ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white'
                          : pkg.isPopular
                            ? 'bg-violet-600 text-white'
                            : 'bg-gray-900 text-white'
                        }
                      `}
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
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

        {/* Footer note */}
        <p className="text-[11px] text-gray-400 text-center px-6 max-w-md mx-auto leading-relaxed mt-8">
          Płatności bezpiecznie przetwarzane przez Stripe.
          <br />
          Karty, Apple Pay, Google Pay oraz BLIK.
        </p>
      </div>
    </div>
  );
}