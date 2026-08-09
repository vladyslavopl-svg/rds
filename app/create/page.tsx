"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { MapPin, Calendar, Tag, DollarSign, FileText } from 'lucide-react';
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
  const [location, setLocation] = useState('Szczecin, zachodniopomorskie');
  const [category, setCategory] = useState(categories[0]);
  const [deadline, setDeadline] = useState(deadlines[0]);
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        () => {
          console.log('Geolokalizacja odrzucona lub niedostępna.');
        },
        { timeout: 10000 }
      );
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !location.trim() || !budget.trim()) {
      setError('Wypełnij wszystkie wymagane pola, w tym budżet.');
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
          budget, // Теперь обязательное поле
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
    <div className="p-4 pb-28 max-w-md mx-auto min-h-screen">
      
      {/* Header */}
      <div className="mb-6 mt-2">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Dodaj zlecenie
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Opisz, co trzeba zrobić
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        
        {error && (
          <div className="
            bg-red-50 text-red-600 border border-red-100
            p-3.5 rounded-xl text-sm font-medium text-center
          ">
            {error}
          </div>
        )}

        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
            <FileText size={14} className="text-violet-500" />
            Co masz do zrobienia? *
          </label>
          <input
            type="text"
            placeholder="np. Naprawa kranu, Malowanie salonu..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="
              w-full bg-white border border-gray-200
              rounded-xl px-4 py-3 text-sm text-gray-900
              placeholder:text-gray-400
              focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-400
              shadow-sm transition-shadow
            "
          />
        </div>

        {/* Location */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
            <MapPin size={14} className="text-violet-500" />
            Lokalizacja (Miasto i region) *
          </label>
          <input
            type="text"
            placeholder="np. Szczecin, zachodniopomorskie"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
            className="
              w-full bg-white border border-gray-200
              rounded-xl px-4 py-3 text-sm text-gray-900
              placeholder:text-gray-400
              focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-400
              shadow-sm transition-shadow
            "
          />
        </div>

        {/* Category */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
            <Tag size={14} className="text-violet-500" />
            Kategoria *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="
              w-full bg-white border border-gray-200
              rounded-xl px-4 py-3 text-sm text-gray-900
              focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-400
              shadow-sm transition-shadow
            "
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Deadline */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
            <Calendar size={14} className="text-violet-500" />
            Termin usługi *
          </label>
          <select
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="
              w-full bg-white border border-gray-200
              rounded-xl px-4 py-3 text-sm text-gray-900
              focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-400
              shadow-sm transition-shadow
            "
          >
            {deadlines.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
            <FileText size={14} className="text-violet-500" />
            Opisz szczegóły *
          </label>
          <textarea
            rows={4}
            placeholder="Opisz dokładniej, co trzeba zrobić, podaj wymiary, materiały lub inne ważne informacje..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className="
              w-full bg-white border border-gray-200
              rounded-xl px-4 py-3 text-sm text-gray-900
              placeholder:text-gray-400
              focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-400
              shadow-sm transition-shadow resize-none
            "
          />
        </div>

        {/* Budget - Now Required */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
            <DollarSign size={14} className="text-violet-500" />
            Budżet *
          </label>
          <input
            type="text"
            placeholder="np. 300 zł lub Do negocjacji"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            required
            className="
              w-full bg-white border border-gray-200
              rounded-xl px-4 py-3 text-sm text-gray-900
              placeholder:text-gray-400
              focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-400
              shadow-sm transition-shadow
            "
          />
        </div>

        {/* Submit */}
        <div className="pt-2">
          <Button
            fullWidth
            className="py-3.5 text-sm shadow-md"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Publikowanie...' : 'Opublikuj zlecenie'}
          </Button>
        </div>
      </form>
    </div>
  );
}