"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { Flag, X } from 'lucide-react';

interface ReportButtonProps {
  reportedUserId: string;
  userRole: 'provider' | 'client';
}

export function ReportButton({ reportedUserId, userRole }: ReportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleSendReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setIsLoading(true);
    setStatusMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const reporterId = session?.user?.id || null;

      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportedUserId,
          reporterId,
          reason,
          userRole
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStatusMessage('Zgłoszenie zostało wysłane. Dziękujemy.');
      setReason('');
      setTimeout(() => {
        setIsOpen(false);
        setStatusMessage(null);
      }, 2000);
    } catch (err: any) {
      setStatusMessage('Wystąpił błąd podczas wysyłania.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-xl border border-red-100 transition-colors"
      >
        <Flag size={14} />
        Zgłoś użytkownika
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            <h3 className="text-lg font-bold text-gray-900 mb-1">Zgłoś naruszenie</h3>
            <p className="text-xs text-gray-500 mb-4">
              Opisz przyczynę zgłoszenia. Administracja rozpatrzy sprawę w najbliższym czasie.
            </p>

            {statusMessage ? (
              <div className="p-4 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-xl text-center">
                {statusMessage}
              </div>
            ) : (
              <form onSubmit={handleSendReport} className="flex flex-col gap-3">
                <textarea
                  placeholder="Opisz problem (np. oszustwo, brak kontaktu, niewłaściwe zachowanie)..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/25 resize-none"
                  required
                />
                <Button fullWidth disabled={isLoading}>
                  {isLoading ? 'Wysyłanie...' : 'Wyślij zgłoszenie'}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}