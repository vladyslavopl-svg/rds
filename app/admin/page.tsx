"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Shield, Users, ClipboardList, Search, Lock, Unlock, Star } from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState({ usersCount: 0, ordersCount: 0 });
  const [searchId, setSearchId] = useState('');
  const [targetUser, setTargetUser] = useState<any>(null);
  const [targetEmail, setTargetEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null);

  // Поля редактирования
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [pointsToAdd, setPointsToAdd] = useState('');
  const [banReasonInput, setBanReasonInput] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<any>(null);

  useEffect(() => {
    checkAdminAndFetchStats();
  }, []);

  const checkAdminAndFetchStats = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }

    // Проверяем флаг is_admin в таблице profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single();

    if (!profile || profile.is_admin !== true) {
      router.push('/');
      return;
    }

    // Подгружаем статистику
    const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    const { count: ordersCount } = await supabase.from('orders').select('*', { count: 'exact', head: true });
    setStats({ usersCount: usersCount || 0, ordersCount: ordersCount || 0 });
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchId.trim()) return;
    setLoading(true);
    setMessage(null);
    setCodeSent(false);

    try {
      const res = await fetch('/api/admin/get-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: searchId.trim() })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setTargetUser(data.profile);
      setEditName(data.profile?.full_name || '');
      setTargetEmail(data.email || '');
      setEditEmail(data.email || '');
      setBanReasonInput(data.profile?.ban_reason || '');
    } catch (err: any) {
      setMessage({ text: err.message || 'Nie znaleziono użytkownika o takim ID.', type: 'error' });
      setTargetUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Моментальная блокировка/разблокировка без кода
  const handleToggleBan = async () => {
    if (!targetUser) return;
    const newBanStatus = !targetUser.is_banned;

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: targetUser.id,
          updates: {
            is_banned: newBanStatus,
            ban_reason: newBanStatus ? (banReasonInput || 'Naruszenie regulaminu platformy.') : null
          }
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setTargetUser({
        ...targetUser,
        is_banned: newBanStatus,
        ban_reason: newBanStatus ? (banReasonInput || 'Naruszenie regulaminu platformy.') : null
      });

      setMessage({ 
        text: newBanStatus ? 'Użytkownik został zablokowany i wylogowany.' : 'Użytkownik został odblokowany.', 
        type: 'success' 
      });
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Шаг 1: Запрос кода подтверждения (для остальных изменений: данных, поинтов, PRO)
  const requestAction = async (updates: any) => {
    if (!targetUser) return;
    setLoading(true);
    setMessage(null);
    setPendingUpdates(updates);

    try {
      const res = await fetch('/api/admin/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: targetUser.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCodeSent(true);
      setMessage({ text: 'Kod potwierdzenia został wysłany na e-mail użytkownika!', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Шаг 2: Подтверждение кода и выполнение изменения данных/поинтов/PRO
  const confirmAndExecute = async () => {
    if (!targetUser || !verificationCode.trim()) {
      setMessage({ text: 'Wprowadź kod potwierdzenia.', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: targetUser.id,
          code: verificationCode.trim(),
          updates: pendingUpdates
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage({ text: 'Operacja została pomyślnie wykonana! ✓', type: 'success' });
      setCodeSent(false);
      setVerificationCode('');
      handleSearch(new Event('submit') as any);
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 pb-28 max-w-xl mx-auto min-h-screen">
      <div className="flex items-center gap-2 mb-6 mt-2">
        <Shield className="text-violet-600" size={28} />
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Panel Administracyjny</h1>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center">
            <Users size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase">Użytkownicy</p>
            <p className="text-xl font-bold text-gray-900">{stats.usersCount}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <ClipboardList size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase">Ogłoszenia</p>
            <p className="text-xl font-bold text-gray-900">{stats.ordersCount}</p>
          </div>
        </div>
      </div>

      {/* Поиск пользователя по ID */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm mb-6">
        <h2 className="font-bold text-base text-gray-900 mb-3">Wyszukaj użytkownika</h2>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Wprowadź UUID użytkownika..."
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/25"
          />
          <Button type="submit" disabled={loading}>
            <Search size={16} />
          </Button>
        </form>
      </div>

      {message && (
        <div className={`p-3.5 mb-4 rounded-xl text-sm font-medium text-center ${
          message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Карточка пользователя */}
      {targetUser && (
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-lg text-gray-900">{targetUser?.full_name || 'Brak imienia'}</h3>
              <p className="text-xs text-gray-400 font-mono">ID: {targetUser?.id}</p>
              <p className="text-xs text-gray-600 mt-1">E-mail: <strong>{targetEmail}</strong></p>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
              targetUser?.is_banned ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
            }`}>
              {targetUser?.is_banned ? 'Zablokowany' : 'Aktywny'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 py-2 border-t border-b border-gray-50 text-sm">
            <div>Balans: <strong>{targetUser?.points_balance || 0} pkt</strong></div>
            <div>PRO status: <strong className={targetUser?.is_pro ? 'text-violet-600' : 'text-gray-500'}>{targetUser?.is_pro ? 'Tak' : 'Nie'}</strong></div>
          </div>

          {/* Блок управления блокировкой (моментально) */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col gap-2.5">
            <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wider">Zarządzanie blokadą</h4>
            {targetUser?.is_banned ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-red-600">Powód: {targetUser?.ban_reason || 'Brak powódu'}</p>
                <Button variant="outline" className="text-emerald-600" onClick={handleToggleBan} disabled={loading}>
                  <Unlock size={14} className="mr-1" /> Odblokuj użytkownika
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Input 
                  label="Powód blokady" 
                  placeholder="np. Oszustwo, spam..." 
                  value={banReasonInput}
                  onChange={(e) => setBanReasonInput(e.target.value)}
                />
                <Button variant="outline" className="text-red-600" onClick={handleToggleBan} disabled={loading}>
                  <Lock size={14} className="mr-1" /> Zablokuj natychmiast
                </Button>
              </div>
            )}
          </div>

          {/* Форма редактирования данных / поинтов / PRO (с кодом подтверждения) */}
          <div className="flex flex-col gap-3 pt-2 border-t border-gray-100">
            <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wider">Edycja danych (wymaga kodu e-mail)</h4>
            <Input label="Imię / Nazwa" value={editName} onChange={(e) => setEditName(e.target.value)} />
            <Input label="E-mail" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            <Input label="Dodaj / Odejmij punkty (np. 10 lub -5)" value={pointsToAdd} onChange={(e) => setPointsToAdd(e.target.value)} placeholder="0" />

            {!codeSent ? (
              <div className="flex flex-wrap gap-2 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => requestAction({ 
                    full_name: editName, 
                    email: editEmail, 
                    points_balance: pointsToAdd ? (targetUser?.points_balance || 0) + parseInt(pointsToAdd) : (targetUser?.points_balance || 0) 
                  })}
                  disabled={loading}
                >
                  Zapisz dane / punkty
                </Button>

                <Button 
                  variant="outline" 
                  onClick={() => requestAction({ is_pro: !targetUser?.is_pro })}
                  disabled={loading}
                >
                  <Star size={14} className="mr-1" /> {targetUser?.is_pro ? 'Usuń PRO' : 'Nadaj PRO'}
                </Button>
              </div>
            ) : (
              <div className="bg-violet-50 p-4 rounded-xl border border-violet-100 flex flex-col gap-3 mt-2">
                <p className="text-xs text-violet-800 font-medium">
                  Wprowadź 6-cyfrowy kod wysłany na e-mail użytkownika, aby potwierdzić operację:
                </p>
                <input 
                  type="text" 
                  placeholder="123456" 
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="bg-white border border-violet-200 rounded-xl px-4 py-2 text-center text-lg font-mono tracking-widest focus:outline-none"
                />
                <Button onClick={confirmAndExecute} disabled={loading}>
                  Potwierdź i wykonaj
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}