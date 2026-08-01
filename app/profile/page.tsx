"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { OrderCard } from '@/components/ui/OrderCard';
import { Wallet, ClipboardList, ChevronDown, Star, MessageSquare, CheckCircle, Edit2, Plus, Trash2, X, Briefcase, Bell } from 'lucide-react';

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
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null);

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

      // === Завантаження даних ===
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

      // === REALTIME (безпечно) ===
      await cleanupChannel();

      if (!isMounted) return;

      channel = supabase
        .channel(`realtime-profile-orders-${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          async () => {
            if (!isMounted) return;

            // Перезавантажуємо мої оголошення
            const { data: freshOrders } = await supabase
              .from('orders')
              .select('*')
              .eq('user_id', userId)
              .order('created_at', { ascending: false });
            if (freshOrders && isMounted) setMyOrders(freshOrders);

            // Якщо виконавець — перезавантажуємо активні замовлення
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
      setMessage({ text: 'Profil został zaktualizowany! ✓', type: 'success' });
    } catch (error: any) {
      setMessage({ text: 'Wystąpił błąd podczas zapisywania.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const addPortfolioImage = () => {
    if (!newImageUrl.trim()) return;
    setPortfolioImages([...portfolioImages, newImageUrl.trim()]);
    setNewImageUrl('');
  };

  const removePortfolioImage = (index: number) => {
    setPortfolioImages(portfolioImages.filter((_, i) => i !== index));
  };

  if (isLoading && !profile) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-razdwa-purple border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 max-w-md mx-auto">
      <div className="flex justify-between items-center mb-4 mt-15">
        <h1 className="text-2xl font-bold text-razdwa-dark">Mój profil</h1>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="flex items-center gap-1.5 text-xs font-semibold text-razdwa-purple bg-purple-50 px-3 py-2 rounded-xl border border-purple-100 hover:bg-purple-100 transition-colors shadow-sm"
        >
          {isEditing ? <X size={14} /> : <Edit2 size={14} />}
          {isEditing ? 'Zamknij edycję' : 'Edytuj profil'}
        </button>
      </div>

      <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 mb-5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-razdwa-purple text-white rounded-full flex items-center justify-center">
            <Wallet size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase">Twój balans</p>
            <p className="text-lg font-bold text-razdwa-purple">{profile?.points_balance || 0} pkt</p>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-1.5">
          <span className="text-xs bg-white text-razdwa-purple font-semibold px-3 py-1 rounded-lg border border-purple-100">
            {profile?.role === 'provider' ? 'Wykonawca' : 'Zleceniodawca'}
          </span>
          {profile?.role === 'provider' && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-[11px] font-bold text-green-700 bg-white px-2 py-0.5 rounded-md border border-green-100">
                <CheckCircle size={12} className="text-green-600" />
                <span>{reviews.length} wykonane</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-yellow-600 bg-white px-2 py-0.5 rounded-md border border-yellow-100">
                <Star size={12} className="fill-yellow-400 text-yellow-400" />
                <span>{averageRating}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {message && (
        <div className={`p-3 mb-4 rounded-xl text-sm font-medium text-center ${
          message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
        }`}>
          {message.text}
        </div>
      )}

      {profile?.role === 'provider' && notifications.length > 0 && (
        <div className="mb-5 bg-green-50 border border-green-200 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-green-700" />
            <h3 className="font-bold text-xs text-green-800 uppercase tracking-wider">Nowe powiadomienia</h3>
          </div>
          {notifications.map((notif) => (
            <div key={notif.id} className="bg-white p-3 rounded-xl border border-green-100 flex flex-col gap-1.5 shadow-sm">
              <p className="font-bold text-xs text-razdwa-dark">{notif.title}</p>
              <p className="text-xs text-gray-600">{notif.message}</p>
              <button
                onClick={async () => {
                  await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id);
                  setNotifications(notifications.filter(n => n.id !== notif.id));
                  if (notif.order_id) {
                    router.push(`/order/${notif.order_id}`);
                  }
                }}
                className="mt-1 self-start text-[11px] font-semibold text-razdwa-purple bg-purple-50 px-2.5 py-1 rounded-lg hover:bg-purple-100 transition-colors"
              >
                Przejdź do zlecenia →
              </button>
            </div>
          ))}
        </div>
      )}

      {profile?.role === 'provider' && activeAssignedOrders.length > 0 && (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Briefcase size={18} className="text-amber-700" />
            <h2 className="font-bold text-sm text-amber-900">
              Zlecenie w realizacji <span className="bg-amber-200 text-amber-800 text-[10px] px-2 py-0.5 rounded-md ml-1">Aktywne</span>
            </h2>
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

      {!isEditing ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-5 shadow-sm flex flex-col gap-3">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Imię / Nazwa</p>
            <p className="text-sm font-bold text-razdwa-dark">{profile?.full_name || 'Nie podano'}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Numer telefonu</p>
            <p className="text-sm font-bold text-razdwa-dark">{profile?.contact_info || 'Nie podano'}</p>
          </div>

          {profile?.role === 'provider' && (
            <div className="pt-3 border-t border-gray-50">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Portfolio realizacji</p>
              {(!profile.portfolio || profile.portfolio.length === 0) ? (
                <p className="text-xs text-gray-400 italic">Brak zdjęć w portfolio. Kliknij „Edytuj profil”, aby dodać prace.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {profile.portfolio.map((img: string, idx: number) => (
                    <a key={idx} href={img} target="_blank" rel="noopener noreferrer" className="block aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                      <img src={img} alt="Portfolio" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleUpdate} className="bg-white border border-gray-100 rounded-2xl p-4 mb-5 shadow-sm flex flex-col gap-3">
          <div className="flex justify-between items-center mb-1">
            <h2 className="font-bold text-sm text-razdwa-dark">Edycja danych</h2>
            <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">Limit: raz na 14 dni</span>
          </div>

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

          {profile?.role === 'provider' && (
            <div className="flex flex-col gap-1.5 mt-1">
              <label className="text-xs font-semibold text-gray-700">Portfolio (Ссылки на фото)</label>
              <div className="flex gap-2">
                <input 
                  type="url"
                  placeholder="https://example.com/photo.jpg"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-xl p-2 text-xs focus:outline-none focus:ring-2 focus:ring-razdwa-purple/50"
                />
                <button
                  type="button"
                  onClick={addPortfolioImage}
                  className="bg-razdwa-purple text-white px-3 py-2 rounded-xl text-xs font-semibold hover:bg-opacity-90 flex items-center gap-1 shrink-0"
                >
                  <Plus size={14} /> Dodaj
                </button>
              </div>

              {portfolioImages.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {portfolioImages.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group bg-gray-50">
                      <img src={img} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePortfolioImage(idx)}
                        className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
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

      {profile?.role === 'provider' && (
        <div className="border-t border-gray-100 pt-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare size={18} className="text-razdwa-purple" />
            <h2 className="font-bold text-sm text-razdwa-dark">
              Opinie klientów <span className="text-razdwa-purple font-semibold">({reviews.length})</span>
            </h2>
          </div>

          {reviews.length === 0 ? (
            <div className="text-center py-6 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <p className="text-xs text-gray-500">Nie masz jeszcze żadnych opinii.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {reviews.map((rev) => (
                <div key={rev.id} className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-razdwa-dark">{rev.client?.full_name || 'Klient'}</span>
                    <div className="flex items-center gap-1 text-xs text-yellow-500 font-semibold">
                      <Star size={12} className="fill-yellow-400 text-yellow-400" />
                      <span>{rev.rating}/5</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">{rev.comment || 'Brak komentarza'}</p>
                  <span className="text-[10px] text-gray-400">
                    {new Date(rev.created_at).toLocaleDateString('pl-PL')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="border-t border-gray-100 pt-5">
        <details className="group bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <summary className="flex items-center justify-between cursor-pointer list-none">
            <div className="flex items-center gap-2">
              <ClipboardList size={18} className="text-razdwa-purple" />
              <h2 className="font-bold text-sm text-razdwa-dark">
                Moje ogłoszenia <span className="text-razdwa-purple font-semibold">({myOrders.length})</span>
              </h2>
            </div>
            <ChevronDown size={18} className="text-gray-400 transition-transform group-open:rotate-180" />
          </summary>

          <div className="pt-4 mt-3 border-t border-gray-50">
            {myOrders.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-xs text-gray-500 mb-3">Nie dodałeś jeszcze żadnych ogłoszeń.</p>
                <Button onClick={() => router.push('/create')}>
                  Stwórz zlecenie
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
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