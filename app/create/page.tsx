"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, MapPin, Calendar, Tag, DollarSign, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const categories = [
  'Remont i budowa',
  'Hydraulika',
  'Sprzątanie',
  'IT i Grafika',
  'Transport',
  'Inne'
];

const deadlines = [
  'Jak najszybciej',
  'W ciągu kilku dni',
  'W tym tygodniu',
  'Elastyczny termin'
];

export default function CreateOrderPage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('Szczecin, zachodniopomorskie'); // Fallback по умолчанию
  const [category, setCategory] = useState(categories[0]);
  const [deadline, setDeadline] = useState(deadlines[0]);
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Автоматическое определение локации по координатам устройства
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=pl`
            );
            const data = await response.json();
            
            if (data && data.address) {
              const city = data.address.city || data.address.town || data.address.village || data.address.county;
              const state = data.address.state;
              
              if (city) {
                const formattedLocation = state ? `${city}, ${state}` : city;
                setLocation(formattedLocation);
              }
            }
          } catch (err) {
            console.error('Nie udało się pobrać dokładnej lokalizacji:', err);
          }
        },
        (err) => {
          console.log('Geolokalizacja odrzucona lub niedostępna, używam lokalizacji domyślnej.');
        },
        { timeout: 10000 }
      );
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !location.trim()) {
      setError('Wypełnij wszystkie wymagane pola.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { error: insertError } = await supabase.from('orders').insert([
        {
          user_id: session.user.id,
          title,
          location,
          category,
          deadline,
          description,
          budget: budget ? budget : null,
        }
      ]);

      if (insertError) throw insertError;

      router.push('/orders');
    } catch (err: any) {
      console.error(err);
      setError('Wystąpił błąd podczas tworzenia zlecenia.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
        <div className="p-4 bg-gray-50 min-h-screen pb-24">
      <div className="mb-4 mt-15">
        <h1 className="text-2xl font-bold text-razdwa-dark mb-1">Dodaj zlecenie</h1>
      </div>

      <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-5 max-w-md mx-auto">
        {error && (
          <div className="bg-red-50 text-red-600 border border-red-100 p-4 rounded-xl text-sm font-medium text-center">
            {error}
          </div>
        )}

        {/* 1. Co masz do zrobienia? */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
            <FileText size={14} className="text-razdwa-purple" />
            Co masz do zrobienia? *
          </label>
          <input
            type="text"
            placeholder="np. Naprawa kranu, Malowanie salonu..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-razdwa-purple/50 shadow-sm"
          />
        </div>

        {/* 2. Город и район / локация по умолчанию */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
            <MapPin size={14} className="text-razdwa-purple" />
            Lokalizacja (Miasto i region) *
          </label>
          <input
            type="text"
            placeholder="np. Szczecin, zachodniopomorskie"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-razdwa-purple/50 shadow-sm"
          />
        </div>

        {/* 3. Kategoria */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
            <Tag size={14} className="text-razdwa-purple" />
            Kategoria *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-razdwa-purple/50 shadow-sm text-razdwa-dark"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* 4. Termin uslugi */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
            <Calendar size={14} className="text-razdwa-purple" />
            Termin usługi *
          </label>
          <select
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-razdwa-purple/50 shadow-sm text-razdwa-dark"
          >
            {deadlines.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>

        {/* 5. Opisz szczegóły */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
            <FileText size={14} className="text-razdwa-purple" />
            Opisz szczegóły *
          </label>
          <textarea
            rows={4}
            placeholder="Opisz dokładniej, co trzeba zrobić, podaj wymiary, materiały lub inne ważne informacje..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-razdwa-purple/50 shadow-sm resize-none"
          />
        </div>

        {/* 6. Budżet (opcjonalnie) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
            <DollarSign size={14} className="text-razdwa-purple" />
            Budżet (opcjonalnie)
          </label>
          <input
            type="text"
            placeholder="np. 300 zł lub Do negocjacji"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-razdwa-purple/50 shadow-sm"
          />
        </div>

        <div className="pt-2">
          <Button
            fullWidth
            className="py-4 text-base shadow-md hover:shadow-lg transition-all"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Publikowanie...' : 'Opublikuj zlecenie'}
          </Button>
        </div>
      </form>
    </div>
  );
}