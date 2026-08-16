"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { OrderCard, OrderCardProps } from '@/components/ui/OrderCard';
import { Search, LocateFixed, Loader2, MapPin } from 'lucide-react';

const categories = [
  'Wszystkie',
  'Remont i budowa',
  'Hydraulika',
  'Sprzątanie',
  'IT i Grafika',
  'Transport',
  'Inne',
];

const RADIUS_OPTIONS = [
  { label: 'Wszystkie', value: 0 },
  { label: '5 km', value: 5 },
  { label: '10 km', value: 10 },
  { label: '25 km', value: 25 },
  { label: '50 km', value: 50 },
  { label: '100 km', value: 100 },
];

/** Haversine distance in km */
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

type OrderWithGeo = OrderCardProps & {
  lat?: number | null;
  lng?: number | null;
  distanceKm?: number | null;
};

type OrderCardListItemProps = OrderCardProps & {
  distanceKm?: number | null;
};

const OrderCardWithDistance = OrderCard as React.ComponentType<OrderCardListItemProps>;

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderWithGeo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Wszystkie');
  const [searchQuery, setSearchQuery] = useState('');

  // Geo state
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [radiusKm, setRadiusKm] = useState(0); // 0 = all
  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [sortByDistance, setSortByDistance] = useState(false);

  const detectUserLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setGeoError('Geolokalizacja niedostępna w tej przeglądarce.');
      return;
    }

    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLat(position.coords.latitude);
        setUserLng(position.coords.longitude);
        setSortByDistance(true);
        // Default useful radius when user enables "near me"
        if (radiusKm === 0) setRadiusKm(25);
        setIsLocating(false);
      },
      (err) => {
        console.error(err);
        setGeoError(
          err.code === 1
            ? 'Odmówiono dostępu do lokalizacji. Zezwól w ustawieniach przeglądarki.'
            : 'Nie udało się pobrać lokalizacji.'
        );
        setIsLocating(false);
      },
      { timeout: 12000, enableHighAccuracy: true, maximumAge: 60000 }
    );
  }, [radiusKm]);

  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Błąd pobierania zleceń:', error);
      } else {
        setOrders((data as OrderWithGeo[]) || []);
      }
      setIsLoading(false);
    };

    fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    let result = orders.map((order) => {
      let distanceKm: number | null = null;
      if (
        userLat != null &&
        userLng != null &&
        typeof order.lat === 'number' &&
        typeof order.lng === 'number'
      ) {
        distanceKm = getDistanceKm(userLat, userLng, order.lat, order.lng);
      }
      return { ...order, distanceKm };
    });

    // Category
    if (selectedCategory !== 'Wszystkie') {
      result = result.filter((o) => o.category === selectedCategory);
    }

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          o.title?.toLowerCase().includes(q) ||
          o.description?.toLowerCase().includes(q) ||
          o.location?.toLowerCase().includes(q)
      );
    }

    // Radius filter (only when we have user position and radius > 0)
    if (userLat != null && userLng != null && radiusKm > 0) {
      result = result.filter((o) => {
        // Orders without coordinates are hidden when radius filter is active
        if (o.distanceKm == null) return false;
        return o.distanceKm <= radiusKm;
      });
    }

    // Sort by distance when enabled
    if (sortByDistance && userLat != null && userLng != null) {
      result = [...result].sort((a, b) => {
        if (a.distanceKm == null && b.distanceKm == null) return 0;
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    }

    return result;
  }, [orders, selectedCategory, searchQuery, userLat, userLng, radiusKm, sortByDistance]);

  const hasUserLocation = userLat != null && userLng != null;

  return (
    <div className="p-4 pb-28 max-w-md mx-auto min-h-screen">
      {/* Header */}
      <div className="mb-5 mt-2">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Szukaj zleceń</h1>
        <p className="text-sm text-gray-500 mt-1">Wyszukaj interesujące Cię zadanie</p>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Szukaj po tytule, opisie lub mieście..."
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

      {/* Near me + radius */}
      <div className="mb-4 space-y-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={detectUserLocation}
            disabled={isLocating}
            className={`
              flex items-center justify-center gap-2 flex-1
              px-3.5 py-2.5 rounded-xl text-xs font-semibold
              transition-all border
              ${
                hasUserLocation
                  ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }
              disabled:opacity-60
            `}
          >
            {isLocating ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <LocateFixed size={15} />
            )}
            {hasUserLocation ? 'Lokalizacja włączona' : 'W pobliżu mnie'}
          </button>
        </div>

        {hasUserLocation && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-0.5 px-0.5">
            {RADIUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setRadiusKm(opt.value);
                  if (opt.value > 0) setSortByDistance(true);
                }}
                className={`
                  px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap
                  transition-all
                  ${
                    radiusKm === opt.value
                      ? 'bg-violet-100 text-violet-700 border border-violet-200'
                      : 'bg-gray-50 text-gray-600 border border-transparent hover:bg-gray-100'
                  }
                `}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {geoError && (
          <p className="text-[11px] text-red-500 flex items-center gap-1">
            <MapPin size={12} /> {geoError}
          </p>
        )}

        {hasUserLocation && !geoError && (
          <p className="text-[11px] text-violet-600">
            Pokazuję zlecenia
            {radiusKm > 0 ? ` w promieniu ${radiusKm} km` : ' z całej Polski'}
            {sortByDistance ? ' · posortowane według odległości' : ''}
          </p>
        )}
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
              ${
                selectedCategory === cat
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
        <div
          className="
          flex flex-col items-center justify-center
          text-center py-14 px-6
          bg-white rounded-2xl border border-gray-100 shadow-sm
        "
        >
          <div
            className="
            w-14 h-14 mb-3
            bg-violet-50 rounded-2xl
            flex items-center justify-center
          "
          >
            <Search size={24} className="text-violet-400" />
          </div>
          <h3 className="font-bold text-gray-800 text-base">Nie znaleziono zleceń</h3>
          <p className="text-sm text-gray-500 mt-1.5 max-w-[260px]">
            {hasUserLocation && radiusKm > 0
              ? 'Spróbuj zwiększyć promień wyszukiwania lub wyłącz filtr lokalizacji'
              : 'Spróbuj zmienić filtry lub wyszukiwane hasło'}
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
              distanceKm={order.distanceKm}
            />
          ))}
        </div>
      )}
    </div>
  );
}
