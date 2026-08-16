import React from 'react';
import Link from 'next/link';
import { MapPin, Calendar, ChevronRight } from 'lucide-react';

export interface OrderCardProps {
  id: string;
  title: string;
  description: string;
  category: string;
  budget?: string;
  location?: string;
  deadline?: string;
  status?: string;
  created_at: string;
  /** Расстояние в км (если доступно) */
  distanceKm?: number | null;
  lat?: number | null;
  lng?: number | null;
}

export const OrderCard = ({
  id,
  title,
  description,
  category,
  budget,
  location,
  deadline,
  status,
  distanceKm,
}: OrderCardProps) => {
  const displayBudget = budget
    ? budget.toLowerCase().includes('zł') || budget.toLowerCase().includes('pln')
      ? budget
      : `${budget} zł`
    : 'Do negocjacji';

  const isInProgress = status === 'in_progress';

  const formatDistance = (km: number) => {
    if (km < 1) return `${Math.round(km * 1000)} m`;
    if (km < 10) return `${km.toFixed(1)} km`;
    return `${Math.round(km)} km`;
  };

  return (
    <Link href={`/order/${id}`} className="block group">
      <div
        className={`bg-white border rounded-xl p-3.5 shadow-sm hover:shadow-md transition-all flex flex-col gap-2 ${
          isInProgress ? 'border-amber-200 bg-amber-50/10' : 'border-gray-100'
        }`}
      >
        {/* Шапка: категория, статус и бюджет */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="bg-purple-50 text-razdwa-purple text-[11px] font-semibold px-2 py-0.5 rounded-md">
              {category}
            </span>
            {isInProgress && (
              <span className="bg-amber-100 text-amber-700 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                Wykonawca wybrany
              </span>
            )}
          </div>
          <span className="text-xs font-bold text-green-600">{displayBudget}</span>
        </div>

        {/* Заголовок, локация и срок */}
        <div>
          <h3 className="font-bold text-razdwa-dark text-sm leading-tight mb-1">{title}</h3>

          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-gray-500 text-[11px]">
            {location && (
              <div className="flex items-center gap-1">
                <MapPin size={12} className="text-razdwa-purple shrink-0" />
                <span>{location}</span>
                {typeof distanceKm === 'number' && (
                  <span className="ml-1 text-violet-600 font-semibold">
                    · {formatDistance(distanceKm)}
                  </span>
                )}
              </div>
            )}
            {deadline && (
              <div className="flex items-center gap-1">
                <Calendar size={12} className="text-razdwa-purple shrink-0" />
                <span>Termin: {deadline}</span>
              </div>
            )}
          </div>
        </div>

        {/* Описание */}
        <p className="text-[11px] text-gray-600 line-clamp-1">{description}</p>

        {/* Нижняя строка перенаправления */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-50 mt-0.5">
          <span className="text-[10px] text-gray-400">Szczegóły zlecenia</span>
          <span className="text-[11px] font-semibold text-razdwa-purple flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
            Zobacz <ChevronRight size={12} />
          </span>
        </div>

      </div>
    </Link>
  );
};