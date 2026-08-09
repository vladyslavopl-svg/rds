"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { OrderCard } from '@/components/ui/OrderCard';
import { Wallet, ClipboardList, ChevronDown, Star, MessageSquare, CheckCircle, Edit2, Plus, Trash2, X, Briefcase, Bell, Mail, Gift, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react'; // Импортируем генератор QR-кода

export default function ProfilePage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [activeAssignedOrders, setActiveAssignedOrders] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [averageRating, setAverageRating] = useState<number>(0);
  
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [email, setEmail] = useState(''); 
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null);

  const [copiedId, setCopiedId] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false); // Состояние для модального окна QR-кода

  useEffect(() => {
    let isMounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const cleanupChannel = async () => {
      if (channel) {
        await supabase.removeChannel(channel);
        channel = null;
      }
    };

    const fetchProfileData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      if (!isMounted) return;

      setSession(session);
      const userId = session.user.id;
      setEmail(session.user.email || '');

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!isMounted) return;

      if (profileData) {
        setProfile(profileData);
        setFullName(profileData.full_name || '');
        setContactInfo(profileData.contact_info || '');
        setPortfolioImages(profileData.portfolio || []);
      }

      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (ordersData && isMounted) {
        setMyOrders(ordersData);
      }

      if (profileData?.role === 'provider') {
        const { data: assignedData } = await supabase
          .from('orders')
          .select('*')
          .eq('selected_provider_id', userId)
          .eq('status', 'in_progress');

        if (assignedData && isMounted) {
          setActiveAssignedOrders(assignedData);
        }

        const { data: notifsData } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .eq('is_read', false)
          .order('created_at', { ascending: false });

        if (notifsData && isMounted) {
          setNotifications(notifsData);
        }
      }

      const { data: reviewsData } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          provider_id,
          client:profiles!reviews_client_id_fkey (full_name)
        `)
        .eq('provider_id', userId)
        .order('created_at', { ascending: false });

      if (reviewsData && reviewsData.length > 0 && isMounted) {
        setReviews(reviewsData);
        const sum = reviewsData.reduce((acc, rev) => acc + rev.rating, 0);
        const avg = sum / reviewsData.length;
        setAverageRating(Number(avg.toFixed(1)));
      }

      if (isMounted) {
        setIsLoading(false);
      }

      await cleanupChannel();

      if (!isMounted) return;

      channel = supabase
        .channel(`realtime-profile-orders-${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          async () => {
            if (!isMounted) return;

            const { data: freshOrders } = await supabase
              .from('orders')
              .select('*')
              .eq('user_id', userId)
              .order('created_at', { ascending: false });
            if (freshOrders && isMounted) setMyOrders(freshOrders);

            if (profileData?.role === 'provider') {
              const { data: freshAssigned } = await supabase
                .from('orders')
                .select('*')
                .eq('selected_provider_id', userId)
                .eq('status', 'in_progress');
              if (freshAssigned && isMounted) setActiveAssignedOrders(freshAssigned);
            }
          }
        )
        .subscribe();
    };

    fetchProfileData();

    return () => {
      isMounted = false;
      cleanupChannel();
    };
  }, [router]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      if (profile?.last_profile_update) {
        const lastUpdate = new Date(profile.last_profile_update).getTime();
        const now = new Date().getTime();
        const diffDays = (now - lastUpdate) / (1000 * 60 * 60 * 24);

        if (diffDays < 14) {
          const daysLeft = Math.ceil(14 - diffDays);
          setMessage({ 
            text: `Dane można aktualizować tylko raz na 14 dni. Spróbuj ponownie za ${daysLeft} dni.`, 
            type: 'error' 
          });
          setIsLoading(false);
          return;
        }
      }

      const currentTime = new Date().toISOString();

      if (email && email !== session.user.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email: email });
        if (emailError) throw emailError;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          contact_info: contactInfo,
          portfolio: portfolioImages,
          last_profile_update: currentTime
        })
        .eq('id', session.user.id);

      if (error) throw error;

      setProfile({
        ...profile,
        full_name: fullName,
        contact_info: contactInfo,
        portfolio: portfolioImages,
        last_profile_update: currentTime
      });

      setIsEditing(false);
      setMessage({ text: 'Profil został zaktualizowany! Jeśli zmieniłeś e-mail, sprawdź skrzynkę w celu potwierdzenia. ✓', type: 'success' });
    } catch (error: any) {
      setMessage({ text: error.message || 'Wystąpił błąd podczas zapisywania.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!session?.user?.id) return;
    
    setIsLoadingPortal(true);
    try {
      const res = await fetch('/api/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id }),
      });
      
      const data = await res.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Wystąpił błąd podczas ładowania portalu.');
      }
    } catch (err) {
      console.error('Błąd:', err);
      alert('Wystąpił błąd sieci.');
    } finally {
      setIsLoadingPortal(false);
    }
  };

  if (isLoading && !profile) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const referralUrl = profile?.referral_code ? `https://razdwaszybko.pl/login?ref=${profile.referral_code}` : '';

  return (
    <div className="p-4 pb-28 max-w-md mx-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-5 mt-2">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Mój profil</h1>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/wallet')}
            className="
              flex items-center gap-1.5
              bg-violet-600 text-white text-xs font-bold
              px-3 py-2 rounded-xl
              hover:bg-violet-700 transition-colors
              shadow-sm
            "
          >
            <Plus size={14} />
            Doładuj
          </button>
          
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="
              flex items-center gap-1.5
              text-xs font-semibold text-violet-700
              bg-violet-50 px-3 py-2 rounded-xl
              border border-violet-100
              hover:bg-violet-100 transition-colors
            "
          >
            {isEditing ? <X size={14} /> : <Edit2 size={14} />}
            {isEditing ? 'Zamknij' : 'Edytuj'}
          </button>
        </div>
      </div>

      {/* Balance Card */}
      <div className="
        relative overflow-hidden
        bg-gradient-to-br from-violet-600 to-fuchsia-600
        rounded-2xl p-5 mb-4
        shadow-[0_4px_20px_rgba(139,92,246,0.25)]
      ">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Wallet size={22} className="text-white" />
            </div>
            <div>
              <p className="text-[11px] text-white/70 font-medium uppercase tracking-wider">
                Twój balans
              </p>
              <p className="text-2xl font-bold text-white tracking-tight">
                {profile?.points_balance || 0}
                <span className="text-base font-semibold ml-1 opacity-80">pkt</span>
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-[11px] bg-white/20 text-white font-semibold px-2.5 py-1 rounded-lg backdrop-blur-sm">
              {profile?.role === 'provider' ? 'Wykonawca' : 'Zleceniodawca'}
            </span>

            {profile?.role === 'provider' && (
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1 text-[11px] font-bold text-white bg-white/15 px-2 py-0.5 rounded-md">
                  <CheckCircle size={11} />
                  <span>{reviews.length}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-yellow-300 bg-white/15 px-2 py-0.5 rounded-md">
                  <Star size={11} className="fill-yellow-300" />
                  <span>{averageRating}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PRO Status */}
        {profile?.role === 'provider' && profile?.is_pro && (
          <div className="mt-4 pt-3.5 border-t border-white/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-white/20 px-2.5 py-1 rounded-full">
                <Star size={12} className="fill-yellow-300 text-yellow-300" />
                <span className="text-[11px] font-black text-white tracking-wide uppercase">
                  PRO
                </span>
              </div>
              <span className="text-[12px] text-white/80 font-medium">
                Aktywne
              </span>
            </div>

            {profile?.pro_expires_at && (
              <span className="text-[11px] text-white/70 font-medium">
                do {new Date(profile.pro_expires_at).toLocaleDateString('pl-PL')}
              </span>
            )}
          </div>
        )}

        {/* User ID + Copy */}
        <div className={`
          flex items-center justify-between
          ${profile?.role === 'provider' && profile?.is_pro ? 'mt-3' : 'mt-4 pt-3.5 border-t border-white/20'}
        `}>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] text-white/60 font-medium shrink-0">ID:</span>
            <span className="text-[11px] text-white/90 font-mono truncate">
              {session?.user?.id || profile?.id}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              const id = session?.user?.id || profile?.id;
              if (id) {
                navigator.clipboard.writeText(id);
                setCopiedId(true);
                setTimeout(() => setCopiedId(false), 2000);
              }
            }}
            className="
              flex items-center gap-1.5
              text-[11px] font-semibold text-white
              bg-white/15 hover:bg-white/25
              px-2.5 py-1 rounded-lg
              transition-colors
              shrink-0
              min-w-[76px] justify-center
            "
            title="Kopiuj ID"
          >
            {copiedId ? (
              <span className="text-emerald-300">Skopiowano!</span>
            ) : (
              <>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="12" 
                  height="12" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                </svg>
                Kopiuj
              </>
            )}
          </button>
        </div>
      </div>

      {/* Referral Program Card */}
      {profile?.referral_code && (
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center">
                <Gift size={16} className="text-violet-600" />
              </div>
              <h3 className="font-bold text-sm text-gray-900">Program poleceń 🎁</h3>
            </div>
            
            {/* Кнопка показать QR-код */}
            <button
              onClick={() => setIsQrModalOpen(true)}
              className="flex items-center gap-1 text-xs font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 px-2.5 py-1.5 rounded-xl transition-colors"
            >
              <QrCode size={14} />
              QR-kod
            </button>
          </div>

          <p className="text-xs text-gray-500 mb-3">
            Zapraszaj znajomych i zyskuj <strong className="text-violet-600">4 punkty</strong> za każdego zarejestrowanego użytkownika!
          </p>
          
          <div className="flex gap-2">
            <input 
              type="text" 
              readOnly 
              value={referralUrl}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono text-gray-600 focus:outline-none"
            />
            <Button 
              onClick={() => {
                navigator.clipboard.writeText(referralUrl);
                setCopiedRef(true);
                setTimeout(() => setCopiedRef(false), 2000);
              }}
              className="text-xs py-2 px-3 shrink-0"
            >
              {copiedRef ? 'Skopiowano!' : 'Kopiuj'}
            </Button>
          </div>
        </div>
      )}

      {/* Модальное окно с QR-кодом */}
      {isQrModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xs w-full p-6 shadow-xl relative flex flex-col items-center text-center animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setIsQrModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            <h3 className="text-lg font-bold text-gray-900 mb-1">Twój QR-kod</h3>
            <p className="text-xs text-gray-500 mb-5">
              Zeskanuj kod, aby przejść do rejestracji z Twojego polecenia.
            </p>

            {/* Сам QR код */}
            <div className="bg-white p-3 border border-gray-100 rounded-2xl shadow-sm mb-5">
              <QRCodeSVG value={referralUrl} size={180} />
            </div>

            <Button fullWidth onClick={() => setIsQrModalOpen(false)}>
              Zamknij
            </Button>
          </div>
        </div>
      )}

      {/* PRO Subscription Button */}
      {profile?.role === 'provider' && profile?.is_pro && (
        <div className="mb-5">
          <button
            onClick={handleManageSubscription}
            disabled={isLoadingPortal}
            className="
              w-full
              bg-gradient-to-r from-violet-600 to-fuchsia-600
              text-white py-3 px-4 rounded-xl
              text-sm font-bold
              shadow-[0_4px_14px_rgba(139,92,246,0.3)]
              hover:opacity-95 active:scale-[0.98]
              transition-all
              flex items-center justify-center gap-2
              disabled:opacity-50
            "
          >
            <Star size={15} className="fill-yellow-300 text-yellow-300" />
            {isLoadingPortal ? 'Ładowanie portalu...' : 'Zarządzaj subskrypcją PRO'}
          </button>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className={`
          p-3.5 mb-4 rounded-xl text-sm font-medium text-center
          ${message.type === 'error' 
            ? 'bg-red-50 text-red-600 border border-red-100' 
            : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}
        `}>
          {message.text}
        </div>
      )}

      {/* Notifications */}
      {profile?.role === 'provider' && notifications.length > 0 && (
        <div className="mb-5 bg-emerald-50 border border-emerald-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Bell size={16} className="text-emerald-700" />
            </div>
            <h3 className="font-bold text-sm text-emerald-900">Nowe powiadomienia</h3>
          </div>
          
          <div className="flex flex-col gap-2.5">
            {notifications.map((notif) => (
              <div key={notif.id} className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-sm">
                <p className="font-bold text-sm text-gray-900">{notif.title}</p>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">{notif.message}</p>
                <button
                  onClick={async () => {
                    await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id);
                    setNotifications(notifications.filter(n => n.id !== notif.id));
                    if (notif.order_id) {
                      router.push(`/order/${notif.order_id}`);
                    }
                  }}
                  className="
                    mt-2.5 self-start
                    text-xs font-semibold text-violet-700
                    bg-violet-50 hover:bg-violet-100
                    px-3 py-1.5 rounded-lg
                    transition-colors
                  "
                >
                  Przejdź do zlecenia →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Assigned Orders */}
      {profile?.role === 'provider' && activeAssignedOrders.length > 0 && (
        <div className="mb-5 bg-amber-50 border border-amber-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
              <Briefcase size={16} className="text-amber-700" />
            </div>
            <h2 className="font-bold text-sm text-amber-900">
              Zlecenie w realizacji
            </h2>
            <span className="ml-auto text-[10px] font-bold bg-amber-200 text-amber-800 px-2 py-0.5 rounded-md">
              Aktywne
            </span>
          </div>
          
          <div className="flex flex-col gap-2.5">
            {activeAssignedOrders.map((order) => (
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
              />
            ))}
          </div>
        </div>
      )}

      {/* Profile Info / Edit Form */}
      {!isEditing ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-5 shadow-sm">
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Imię / Nazwa</p>
              <p className="text-base font-semibold text-gray-900">{profile?.full_name || 'Nie podano'}</p>
            </div>
            
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Numer telefonu</p>
              <p className="text-base font-semibold text-gray-900">{profile?.contact_info || 'Nie podano'}</p>
            </div> 

            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Adres e-mail</p>
              <p className="text-base font-semibold text-gray-900">{email || 'Nie podano'}</p>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleUpdate} className="bg-white border border-gray-100 rounded-2xl p-5 mb-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-base text-gray-900">Edycja danych</h2>
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100">
              Limit: raz na 14 dni
            </span>
          </div>

          <div className="space-y-3">
            <Input 
              label="Imię / Nazwa" 
              placeholder="np. Jan Kowalski"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />

            <Input 
              label="Numer telefonu" 
              placeholder="np. +48 123 456 789"
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
            /> 

            <Input 
              label="Adres e-mail" 
              type="email"
              placeholder="np. jan@kowalski.pl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="flex gap-2.5 pt-5">
            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={() => setIsEditing(false)}
            >
              Anuluj
            </Button>
            <Button fullWidth type="submit" disabled={isLoading}>
              {isLoading ? 'Zapisywanie...' : 'Zapisz zmiany'}
            </Button>
          </div>
        </form>
      )}

      {/* Reviews */}
      {profile?.role === 'provider' && (
        <div className="mb-6">
          <details className="group bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <summary className="flex items-center justify-between cursor-pointer list-none p-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center">
                  <MessageSquare size={16} className="text-violet-600" />
                </div>
                <h2 className="font-bold text-base text-gray-900">
                  Opinie klientów
                  <span className="text-violet-600 font-semibold ml-1.5">({reviews.length})</span>
                </h2>
              </div>
              <ChevronDown 
                size={18} 
                className="text-gray-400 transition-transform duration-200 group-open:rotate-180" 
              />
            </summary>

            <div className="px-4 pb-4 border-t border-gray-50">
              {reviews.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-400">Nie masz jeszcze żadnych opinii.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 pt-4">
                  {reviews.map((rev) => (
                    <div 
                      key={rev.id} 
                      className="bg-gray-50/70 border border-gray-100 rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold text-sm text-gray-900">
                          {rev.client?.full_name || 'Klient'}
                        </span>
                        <div className="flex items-center gap-1 text-sm font-semibold text-amber-500">
                          <Star size={13} className="fill-amber-400 text-amber-400" />
                          <span>{rev.rating}/5</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {rev.comment || 'Brak komentarza'}
                      </p>
                      <span className="text-[11px] text-gray-400 mt-2 block">
                        {new Date(rev.created_at).toLocaleDateString('pl-PL')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </details>
        </div>
      )}

      {/* My Orders */}
      <div>
        <details className="group bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <summary className="flex items-center justify-between cursor-pointer list-none p-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center">
                <ClipboardList size={16} className="text-violet-600" />
              </div>
              <h2 className="font-bold text-base text-gray-900">
                Moje ogłoszenia
                <span className="text-violet-600 font-semibold ml-1.5">({myOrders.length})</span>
              </h2>
            </div>
            <ChevronDown size={18} className="text-gray-400 transition-transform duration-200 group-open:rotate-180" />
          </summary>

          <div className="px-4 pb-4 border-t border-gray-50">
            {myOrders.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400 mb-4">Nie dodałeś jeszcze żadnych ogłoszeń.</p>
                <Button onClick={() => router.push('/create')}>
                  Stwórz zlecenie
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 pt-4">
                {myOrders.map((order) => (
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
                  />
                ))}
              </div>
            )}
          </div>
        </details>
      </div>
    </div>
  );
}