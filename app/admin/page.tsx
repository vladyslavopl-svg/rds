"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  Shield, Users, ClipboardList, Search, Lock, Unlock, Star, Ticket, 
  Plus, Trash2, UserCheck, Award, Wallet, UserPlus, Mail, ShieldAlert, 
  FileText, Send, AlertTriangle, Ban, CheckCircle2, X, ChevronRight
} from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'users' | 'promos' | 'orders' | 'broadcasts' | 'logs' | 'moderation'>('users');
  
  const [stats, setStats] = useState({ 
    usersCount: 0, 
    ordersCount: 0, 
    proCount: 0, 
    totalPoints: 0, 
    referredCount: 0 
  });
  
  // Промокоды
  const [promoList, setPromoList] = useState<any[]>([]);
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoDescription, setPromoDescription] = useState('');
  const [promoMonths, setPromoMonths] = useState('2');
  const [promoExpiresAt, setPromoExpiresAt] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoMessage, setPromoMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null);

  // Управление пользователями
  const [searchId, setSearchId] = useState('');
  const [targetUser, setTargetUser] = useState<any>(null);
  const [targetEmail, setTargetEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [pointsToAdd, setPointsToAdd] = useState('');
  const [banReasonInput, setBanReasonInput] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<any>(null);

  // Модерация заказов
  const [ordersList, setOrdersList] = useState<any[]>([]);

  // Авто-модерация (стоп-слова)
  const [stopwordsList, setStopwordsList] = useState<any[]>([]);
  const [newStopword, setNewStopword] = useState('');

  // Рассылки и черный список
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [blacklistInput, setBlacklistInput] = useState('');
  const [blacklist, setBlacklist] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    checkAdminAndFetchData();
  }, []);

  const checkAdminAndFetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }

    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single();
    if (!profile || profile.is_admin !== true) { router.push('/'); return; }

    // Загрузка статистики
    const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    const { count: ordersCount } = await supabase.from('orders').select('*', { count: 'exact', head: true });
    const { data: profilesData } = await supabase.from('profiles').select('is_pro, points_balance, invited_by');
    
    let proCount = 0, totalPoints = 0, referredCount = 0;
    if (profilesData) {
      profilesData.forEach((p) => {
        if (p.is_pro) proCount++;
        totalPoints += p.points_balance || 0;
        if (p.invited_by) referredCount++;
      });
    }

    setStats({ usersCount: usersCount || 0, ordersCount: ordersCount || 0, proCount, totalPoints, referredCount });

    // Загрузка данных для вкладок
    fetchPromoCodes();
    fetchOrders();
    fetchStopwords();
    fetchBlacklist();
    fetchLogs(session.user.id);
  };

  const fetchPromoCodes = async () => {
    const { data } = await supabase.from('promo_codes').select('*').order('code', { ascending: true });
    if (data) setPromoList(data);
  };

  const fetchOrders = async () => {
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(50);
    if (data) setOrdersList(data);
  };

  const fetchStopwords = async () => {
    const { data } = await supabase.from('auto_mod_stopwords').select('*');
    if (data) setStopwordsList(data);
  };

  const fetchBlacklist = async () => {
    const { data } = await supabase.from('email_blacklist').select('*');
    if (data) setBlacklist(data);
  };

  const fetchLogs = async (adminId: string) => {
    const { data } = await supabase.from('admin_logs').select('*').order('created_at', { ascending: false }).limit(30);
    if (data) setAuditLogs(data);

    await supabase.from('admin_logs').insert([{ admin_id: adminId, action: 'OPEN_ADMIN_PANEL', details: 'Otwarto panel administratora.' }]);
  };

  const logAdminAction = async (action: string, details: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from('admin_logs').insert([{ admin_id: session.user.id, action, details }]);
  };

  // Поиск пользователя
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchId.trim()) return;
    setLoading(true); setMessage(null); setCodeSent(false);
    try {
      const res = await fetch('/api/admin/get-user', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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
      setMessage({ text: err.message || 'Nie znaleziono.', type: 'error' });
      setTargetUser(null);
    } finally { setLoading(false); }
  };

  // Блокировка
  const handleToggleBan = async () => {
    if (!targetUser) return;
    const newBanStatus = !targetUser.is_banned;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/execute', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: targetUser.id, updates: { is_banned: newBanStatus, ban_reason: newBanStatus ? (banReasonInput || 'Zbanowany') : null } })
      });
      if (!res.ok) throw new Error('Błąd');
      setTargetUser({ ...targetUser, is_banned: newBanStatus });
      await logAdminAction('TOGGLE_BAN', `Zmieniono status bana użytkownika ${targetUser.id} na ${newBanStatus}`);
      setMessage({ text: newBanStatus ? 'Zablokowano.' : 'Odblokowano.', type: 'success' });
    } catch (err: any) { setMessage({ text: err.message, type: 'error' }); }
    finally { setLoading(false); }
  };

  const requestAction = async (updates: any) => {
    if (!targetUser) return;
    setLoading(true); setPendingUpdates(updates);
    try {
      await fetch('/api/admin/send-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetUserId: targetUser.id }) });
      setCodeSent(true);
      setMessage({ text: 'Kod wysłany na e-mail!', type: 'success' });
    } catch (err: any) { setMessage({ text: err.message, type: 'error' }); }
    finally { setLoading(false); }
  };

  const confirmAndExecute = async () => {
    if (!targetUser || !verificationCode.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/execute', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: targetUser.id, code: verificationCode.trim(), updates: pendingUpdates })
      });
      if (!res.ok) throw new Error('Błąd weryfikacji');
      setMessage({ text: 'Zaktualizowano pomyślnie!', type: 'success' });
      setCodeSent(false); setVerificationCode('');
      await logAdminAction('EDIT_USER_DATA', `Zaktualizowano dane użytkownika ${targetUser.id}`);
    } catch (err: any) { setMessage({ text: err.message, type: 'error' }); }
    finally { setLoading(false); }
  };

  // Удаление заказа модератором
  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć to ogłoszenie?')) return;
    await supabase.from('orders').delete().eq('id', orderId);
    await logAdminAction('DELETE_ORDER', `Usunięto ogłoszenie ID: ${orderId}`);
    fetchOrders();
  };

  // Создание промокода
  const handleCreatePromoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCodeInput.trim()) return;
    setPromoLoading(true);
    try {
      await supabase.from('promo_codes').insert([{ code: promoCodeInput.trim().toUpperCase(), description: promoDescription, months_valid: parseInt(promoMonths) || 2, is_active: true }]);
      await logAdminAction('CREATE_PROMO', `Utworzono kod: ${promoCodeInput.toUpperCase()}`);
      setPromoMessage({ text: 'Kod utworzony!', type: 'success' });
      setPromoCodeInput(''); setPromoDescription(''); setShowPromoForm(false); fetchPromoCodes();
    } catch (err: any) { setPromoMessage({ text: err.message, type: 'error' }); }
    finally { setPromoLoading(false); }
  };

  const handleDeletePromo = async (id: string) => {
    await supabase.from('promo_codes').delete().eq('id', id);
    await logAdminAction('DELETE_PROMO', `Usunięto kod ID: ${id}`);
    fetchPromoCodes();
  };

  // Управление стоп-словами
  const handleAddStopword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStopword.trim()) return;
    await supabase.from('auto_mod_stopwords').insert([{ word: newStopword.trim().toLowerCase() }]);
    await logAdminAction('ADD_STOPWORD', `Dodano stop-słowo: ${newStopword.trim()}`);
    setNewStopword('');
    fetchStopwords();
  };

  const handleDeleteStopword = async (id: string) => {
    await supabase.from('auto_mod_stopwords').delete().eq('id', id);
    fetchStopwords();
  };

  // Добавление домена в черный список
  const handleAddBlacklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blacklistInput.trim()) return;
    await supabase.from('email_blacklist').insert([{ domain: blacklistInput.trim().toLowerCase() }]);
    await logAdminAction('ADD_BLACKLIST', `Zablokowano domenę: ${blacklistInput.trim()}`);
    setBlacklistInput(''); fetchBlacklist();
  };

  const handleDeleteBlacklist = async (id: string) => {
    await supabase.from('email_blacklist').delete().eq('id', id);
    fetchBlacklist();
  };

  // Массовая рассылка уведомлений
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMsg.trim()) return;
    
    const { data: users } = await supabase.from('profiles').select('id');
    if (users) {
      const notifs = users.map(u => ({ user_id: u.id, title: broadcastTitle, message: broadcastMsg, is_read: false }));
      await supabase.from('notifications').insert(notifs);
      await logAdminAction('BROADCAST', `Wysłano powiadomienie masowe: ${broadcastTitle}`);
      alert('Powiadomienie zostało wysłane do wszystkich użytkowników!');
      setBroadcastTitle(''); setBroadcastMsg('');
    }
  };

  const tabs = [
    { id: 'users', label: 'Konta', icon: Users },
    { id: 'promos', label: 'Kody', icon: Ticket },
    { id: 'orders', label: 'Ogłoszenia', icon: ClipboardList },
    { id: 'moderation', label: 'Auto-mod', icon: AlertTriangle },
    { id: 'broadcasts', label: 'Wysyłka', icon: Send },
    { id: 'logs', label: 'Logi', icon: FileText },
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-28">
      <div className="max-w-2xl mx-auto px-4 pt-6">
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-200">
            <Shield className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Panel Administracyjny</h1>
            <p className="text-sm text-slate-500">Zarządzanie platformą RazDwaSzybko</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <Users size={20} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Użytkownicy</p>
              <p className="text-2xl font-black text-slate-900">{stats.usersCount}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ClipboardList size={20} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Ogłoszenia</p>
              <p className="text-2xl font-black text-slate-900">{stats.ordersCount}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-white rounded-2xl border border-slate-100 p-3.5 shadow-sm flex flex-col items-center text-center">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-1.5">
              <Award size={18} />
            </div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase">PRO</p>
            <p className="text-xl font-black text-slate-900">{stats.proCount}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-3.5 shadow-sm flex flex-col items-center text-center">
            <div className="w-9 h-9 rounded-xl bg-fuchsia-50 text-fuchsia-600 flex items-center justify-center mb-1.5">
              <Wallet size={18} />
            </div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase">Punkty</p>
            <p className="text-xl font-black text-slate-900">{stats.totalPoints}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-3.5 shadow-sm flex flex-col items-center text-center">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5">
              <UserPlus size={18} />
            </div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase">Polecenia</p>
            <p className="text-xl font-black text-slate-900">{stats.referredCount}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="sticky top-0 z-20 -mx-4 px-4 py-2 bg-gradient-to-b from-slate-50/95 to-slate-50/80 backdrop-blur-md mb-6">
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all
                    ${isActive 
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-200' 
                      : 'bg-white text-slate-500 border border-slate-100 hover:border-violet-200 hover:text-violet-700'
                    }
                  `}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ===================== USERS TAB ===================== */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <h2 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
                <Search size={16} className="text-violet-600" />
                Wyszukaj użytkownika
              </h2>
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Wklej UUID użytkownika..."
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                />
                <Button type="submit" disabled={loading} className="px-4">
                  <Search size={16} />
                </Button>
              </form>
            </div>

            {message && (
              <div className={`p-3.5 rounded-xl text-sm font-medium text-center border ${
                message.type === 'error' 
                  ? 'bg-red-50 text-red-700 border-red-100' 
                  : 'bg-emerald-50 text-emerald-700 border-emerald-100'
              }`}>
                {message.text}
              </div>
            )}

            {targetUser && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* User header */}
                <div className="bg-gradient-to-r from-violet-50 to-indigo-50 px-5 py-4 border-b border-slate-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-base text-slate-900">{targetUser?.full_name || 'Bez nazwy'}</h3>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate max-w-[220px]">{targetUser?.id}</p>
                      {targetEmail && <p className="text-xs text-slate-500 mt-1">{targetEmail}</p>}
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${
                      targetUser?.is_banned 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {targetUser?.is_banned ? 'Zablokowany' : 'Aktywny'}
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-xl p-3 text-center">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase">Balans</p>
                      <p className="text-lg font-black text-slate-900">{targetUser?.points_balance ?? 0} <span className="text-xs font-medium text-slate-500">pkt</span></p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 text-center">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase">PRO</p>
                      <p className="text-lg font-black text-slate-900">{targetUser?.is_pro ? 'Tak' : 'Nie'}</p>
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    fullWidth
                    className={targetUser?.is_banned ? 'text-emerald-600 border-emerald-200 hover:bg-emerald-50' : 'text-red-600 border-red-200 hover:bg-red-50'}
                    onClick={handleToggleBan}
                    disabled={loading}
                  >
                    {targetUser?.is_banned ? (
                      <><Unlock size={16} className="mr-1.5" /> Odblokuj konto</>
                    ) : (
                      <><Ban size={16} className="mr-1.5" /> Zablokuj konto</>
                    )}
                  </Button>

                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Edycja danych</p>
                    <Input label="Imię / Nazwa" value={editName} onChange={(e) => setEditName(e.target.value)} />
                    <Input 
                      label="Punkty do dodania / odjęcia" 
                      value={pointsToAdd} 
                      onChange={(e) => setPointsToAdd(e.target.value)} 
                      placeholder="np. 50 lub -10" 
                    />

                    {!codeSent ? (
                      <Button 
                        variant="outline" 
                        fullWidth
                        onClick={() => requestAction({ 
                          full_name: editName, 
                          points_balance: (targetUser?.points_balance || 0) + parseInt(pointsToAdd || '0') 
                        })}
                        disabled={loading}
                      >
                        Zapisz zmiany (wymaga kodu e-mail)
                      </Button>
                    ) : (
                      <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 space-y-3">
                        <p className="text-xs text-violet-700 font-medium text-center">
                          Wpisz 6-cyfrowy kod wysłany na e-mail
                        </p>
                        <input
                          type="text"
                          placeholder="• • • • • •"
                          maxLength={6}
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          className="w-full bg-white border border-violet-200 rounded-xl p-3 text-center text-lg font-mono tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                        />
                        <Button fullWidth onClick={confirmAndExecute} disabled={loading || verificationCode.length < 6}>
                          Potwierdź zmiany
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================== PROMOS TAB ===================== */}
        {activeTab === 'promos' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Ticket size={16} className="text-violet-600" />
                Kody promocyjne
              </h2>
              <Button 
                variant="outline" 
                onClick={() => setShowPromoForm(!showPromoForm)}
                className="text-xs px-3 py-1.5 h-auto"
              >
                {showPromoForm ? <X size={14} /> : <Plus size={14} />}
                <span className="ml-1">{showPromoForm ? 'Zamknij' : 'Nowy kod'}</span>
              </Button>
            </div>

            <div className="p-5 space-y-4">
              {showPromoForm && (
                <form onSubmit={handleCreatePromoCode} className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100">
                  <Input label="Kod (np. PROMO2025)" value={promoCodeInput} onChange={(e) => setPromoCodeInput(e.target.value)} required />
                  <Input label="Opis (opcjonalnie)" value={promoDescription} onChange={(e) => setPromoDescription(e.target.value)} />
                  <Input label="Miesiące PRO" type="number" value={promoMonths} onChange={(e) => setPromoMonths(e.target.value)} required />
                  <Button type="submit" fullWidth disabled={promoLoading}>
                    {promoLoading ? 'Tworzenie...' : 'Utwórz kod'}
                  </Button>
                </form>
              )}

              {promoMessage && (
                <div className={`p-3 rounded-xl text-xs font-medium text-center ${
                  promoMessage.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'
                }`}>
                  {promoMessage.text}
                </div>
              )}

              <div className="space-y-2">
                {promoList.length === 0 ? (
                  <p className="text-center text-sm text-slate-400 py-8">Brak kodów promocyjnych</p>
                ) : (
                  promoList.map((p) => (
                    <div key={p.id} className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100 hover:border-violet-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-xs bg-violet-100 text-violet-800 px-2.5 py-1 rounded-lg tracking-wide">
                          {p.code}
                        </span>
                        <span className="text-xs text-slate-500">{p.months_valid} mies. PRO</span>
                      </div>
                      <button 
                        onClick={() => handleDeletePromo(p.id)} 
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===================== ORDERS TAB ===================== */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <ClipboardList size={16} className="text-violet-600" />
                Ostatnie ogłoszenia
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Moderacja • ostatnie 50</p>
            </div>

            <div className="divide-y divide-slate-50">
              {ordersList.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-12">Brak ogłoszeń</p>
              ) : (
                ordersList.map((o) => (
                  <div key={o.id} className="p-4 flex justify-between items-start gap-3 hover:bg-slate-50/50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-slate-900 truncate">{o.title}</p>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{o.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {o.budget && (
                          <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md">
                            {o.budget} PLN
                          </span>
                        )}
                        {o.category && (
                          <span className="text-[10px] font-medium bg-violet-50 text-violet-700 px-2 py-0.5 rounded-md">
                            {o.category}
                          </span>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteOrder(o.id)} 
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0"
                      title="Usuń ogłoszenie"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ===================== MODERATION TAB ===================== */}
        {activeTab === 'moderation' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" />
                Słowa kluczowe (Stop-words)
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Ogłoszenia zawierające te słowa w tytule lub opisie zostaną automatycznie odrzucone.
              </p>
            </div>

            <div className="p-5 space-y-4">
              <form onSubmit={handleAddStopword} className="flex gap-2">
                <input
                  type="text"
                  placeholder="np. scam, telegram, link..."
                  value={newStopword}
                  onChange={(e) => setNewStopword(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                />
                <Button type="submit" className="px-4">
                  <Plus size={16} />
                </Button>
              </form>

              <div className="flex flex-wrap gap-2">
                {stopwordsList.length === 0 ? (
                  <p className="text-sm text-slate-400 py-4 w-full text-center">Brak zdefiniowanych słów</p>
                ) : (
                  stopwordsList.map((s) => (
                    <span 
                      key={s.id} 
                      className="inline-flex items-center gap-1.5 bg-violet-50 text-violet-700 text-xs font-semibold px-3 py-1.5 rounded-xl border border-violet-100"
                    >
                      {s.word}
                      <button 
                        onClick={() => handleDeleteStopword(s.id)} 
                        className="text-violet-400 hover:text-red-500 font-bold leading-none ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===================== BROADCASTS TAB ===================== */}
        {activeTab === 'broadcasts' && (
          <div className="space-y-5">
            <form onSubmit={handleSendBroadcast} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Send size={15} className="text-violet-600" />
                  Masowe powiadomienie
                </h2>
              </div>
              <div className="p-5 space-y-3">
                <Input label="Tytuł" value={broadcastTitle} onChange={(e) => setBroadcastTitle(e.target.value)} required />
                <Input label="Treść wiadomości" value={broadcastMsg} onChange={(e) => setBroadcastMsg(e.target.value)} required />
                <Button type="submit" fullWidth>
                  <Send size={15} className="mr-1.5" />
                  Wyślij do wszystkich
                </Button>
              </div>
            </form>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <ShieldAlert size={15} className="text-red-500" />
                  Czarna lista domen
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Blokada rejestracji z określonych domen e-mail</p>
              </div>
              <div className="p-5 space-y-3">
                <form onSubmit={handleAddBlacklist} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="np. tempmail.com"
                    value={blacklistInput}
                    onChange={(e) => setBlacklistInput(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  />
                  <Button type="submit" className="px-4">Zablokuj</Button>
                </form>

                <div className="space-y-1.5 pt-1">
                  {blacklist.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">Lista pusta</p>
                  ) : (
                    blacklist.map((b) => (
                      <div key={b.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-xs font-mono text-slate-700">{b.domain}</span>
                        <button 
                          onClick={() => handleDeleteBlacklist(b.id)} 
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== LOGS TAB ===================== */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <FileText size={15} className="text-violet-600" />
                Dziennik operacji
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Ostatnie 30 akcji</p>
            </div>

            <div className="max-h-[28rem] overflow-y-auto divide-y divide-slate-50">
              {auditLogs.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-12">Brak logów</p>
              ) : (
                auditLogs.map((l) => (
                  <div key={l.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex justify-between items-start gap-3 mb-1">
                      <span className="text-xs font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md">
                        {l.action}
                      </span>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {new Date(l.created_at).toLocaleString('pl-PL')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{l.details}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}