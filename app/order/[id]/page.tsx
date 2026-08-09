"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Tag, Clock, ChevronLeft, User, MessageSquare, Phone, MapPin, Calendar, Star, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ReportButton } from '@/components/ui/ReportButton';

import type { Metadata } from 'next';

type Props = {
  params: { id: string };
};

// Динамические мета-теги для каждого заказа
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!params.id) {
    return { title: 'Zlecenie | RazDwaSzybko' };
  }

  const { data: order } = await supabase
    .from('orders')
    .select('title, description, category, location, budget')
    .eq('id', params.id)
    .maybeSingle();

  if (!order) {
    return { title: 'Zlecenie nie zostało znalezione | RazDwaSzybko' };
  }

  const cleanDescription = order.description ? order.description.substring(0, 150) + '...' : '';

  return {
    title: `${order.title} — ${order.location || 'Polska'}`,
    description: `${cleanDescription} Budżet: ${order.budget || 'Do negocjacji'}. Znajdź fachowca na RazDwaSzybko.`,
    openGraph: {
      title: `${order.title} | RazDwaSzybko`,
      description: cleanDescription,
      type: 'article',
    },
  };
}

// Функция расчета стоимости отклика в зависимости от бюджета заказа
const calculateRequiredPoints = (budgetString: string) => {
  if (!budgetString) return 1;

  const numbers = budgetString.replace(/\D/g, '');
  const budget = numbers ? parseInt(numbers, 10) : 0;

  if (budget === 0) return 1;
  if (budget <= 100) return 1;
  if (budget <= 200) return 3;
  if (budget <= 500) return 5;
  if (budget <= 1000) return 7;
  if (budget <= 2000) return 10;
  if (budget <= 5000) return 12;
  return 15;
};

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter(); 
  
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);

  const [isOwner, setIsOwner] = useState(false);
  const [offers, setOffers] = useState<any[]>([]);

  const [providerStats, setProviderStats] = useState<{ [key: string]: { rating: number, count: number, reviews: any[] } }>({});
  const [expandedProviderReviews, setExpandedProviderReviews] = useState<string | null>(null);

  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  {order && (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{
      __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Task",
        "name": order.title,
        "description": order.description,
        "category": order.category,
        "jobLocation": {
          "@type": "Place",
          "name": order.location || "Polska"
        },
        "offers": {
          "@type": "Offer",
          "price": order.budget ? order.budget.replace(/\D/g, '') : "0",
          "priceCurrency": "PLN"
        },
        "datePosted": order.created_at
      })
    }}
  />
)}

  useEffect(() => {
    const fetchData = async () => {
      if (!params.id) return;

      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user;

      if (currentUser) {
        const { data: userProf } = await supabase
          .from('profiles')
          .select('is_pro, points_balance')
          .eq('id', currentUser.id)
          .single();
        if (userProf) {
          setCurrentUserProfile(userProf);
        }
      }

      const { data: orderData } = await supabase
        .from('orders')
        .select('*')
        .eq('id', params.id)
        .maybeSingle();

      if (orderData) {
        setOrder(orderData);

        const { data: clientData } = await supabase
          .from('profiles')
          .select('full_name, contact_info')
          .eq('id', orderData.user_id)
          .single();

        if (clientData) {
          setClientProfile(clientData);
        }

        const ownerCheck = currentUser?.id === orderData.user_id;
        setIsOwner(ownerCheck);

        const { data: offersData } = await supabase
          .from('offers')
          .select(`
            id,
            created_at,
            status,
            provider_id,
            provider:profiles!offers_provider_id_fkey (id, full_name, role, contact_info, is_pro) 
          `)
          .eq('order_id', orderData.id)
          .order('created_at', { ascending: false });

        if (offersData) {
          setOffers(offersData);

          const providerIds = offersData
            .map(o => o.provider_id || o.provider?.[0]?.id)
            .filter(Boolean);
          
          if (providerIds.length > 0) {
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
              .in('provider_id', providerIds);

            if (reviewsData) {
              const statsMap: { [key: string]: { rating: number, count: number, reviews: any[] } } = {};
              
              providerIds.forEach(id => {
                const pReviews = reviewsData.filter(r => r.provider_id === id);
                const count = pReviews.length;
                const sum = pReviews.reduce((acc, r) => acc + r.rating, 0);
                const avg = count > 0 ? Number((sum / count).toFixed(1)) : 0;

                statsMap[id] = {
                  rating: avg,
                  count: count,
                  reviews: pReviews
                };
              });

              setProviderStats(statsMap);
            }
          }
          
          if (currentUser && !ownerCheck) {
            const userHasApplied = offersData.some(
              o => (o.provider_id || o.provider?.[0]?.id) === currentUser.id
            );
            if (userHasApplied) {
              setHasApplied(true);
            }
          }
        }
      }
      setIsLoading(false);
    };

    fetchData();
  }, [params.id]);

  const handleOffer = async () => {
    if (hasApplied) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        setMessage({ text: 'Musisz być zalogowany, aby złożyć ofertę.', type: 'error' });
        setIsSubmitting(false);
        return;
      }

      // Вычисляем стоимость отклика на основе бюджета
      const pointsNeeded = calculateRequiredPoints(order.budget);

      // Проверяем баланс и PRO статус исполнителя
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('points_balance, is_pro')
        .eq('id', session.user.id)
        .single();

      if (profileError) throw profileError;

      const isPro = profile.is_pro === true;

      // Если не PRO, проверяем хватает ли поинтов и списываем нужную сумму
      if (!isPro) {
        if (profile.points_balance < pointsNeeded) {
          setMessage({ 
            text: `Brak wystarczającej liczby punktów. Ten odcinek wymaga ${pointsNeeded} pkt. Doładuj konto!`, 
            type: 'error' 
          });
          setIsSubmitting(false);
          return;
        }

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ points_balance: profile.points_balance - pointsNeeded })
          .eq('id', session.user.id);

        if (updateError) throw updateError;
      }

      // Создаем оффер
      const { error: offerError } = await supabase
        .from('offers')
        .insert([{ order_id: order.id, provider_id: session.user.id }]);

      if (offerError) throw offerError;

      // Создаем или открываем чат
      const { data: existingChat } = await supabase
        .from('chats')
        .select('id')
        .eq('order_id', order.id)
        .eq('provider_id', session.user.id)
        .maybeSingle();

      if (!existingChat) {
        await supabase.from('chats').insert([
          {
            order_id: order.id,
            client_id: order.user_id,
            provider_id: session.user.id
          }
        ]);
      }

      // Отправляем email-уведомление клиенту
      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'new_offer',
          orderId: order.id,
          providerId: session.user.id
        })
      }).catch(err => console.error('Błąd wysyłania emaila:', err));

      setHasApplied(true);
      setMessage({ 
        text: isPro 
          ? 'Oferta została złożona bezpłatnie (Konto PRO) ✓' 
          : `Oferta została złożona (-${pointsNeeded} pkt) ✓`, 
        type: 'success' 
      });
    } catch (error: any) {
      console.error(error);
      setMessage({ text: 'Wystąpił błąd podczas składania oferty.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openOrCreateChatForProvider = async () => {
    if (!order?.id) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: existingChat } = await supabase
        .from('chats')
        .select('id')
        .eq('order_id', order.id)
        .eq('provider_id', session.user.id)
        .maybeSingle();

      if (existingChat) {
        router.push(`/chats/${existingChat.id}`);
        return;
      }

      const { data: newChat, error } = await supabase
        .from('chats')
        .insert([
          {
            order_id: order.id,
            client_id: order.user_id,
            provider_id: session.user.id
          }
        ])
        .select('id')
        .single();

      if (error) throw error;
      if (newChat) {
        router.push(`/chats/${newChat.id}`);
      }
    } catch (err) {
      console.error('Błąd otwierania czatu:', err);
    }
  };

  const openChatWithProvider = async (providerId: string) => {
    if (!order?.id || !providerId) return;

    try {
      const { data: existingChat } = await supabase
        .from('chats')
        .select('id')
        .eq('order_id', order.id)
        .eq('provider_id', providerId)
        .maybeSingle();

      if (existingChat) {
        router.push(`/chats/${existingChat.id}`);
        return;
      }

      const { data: newChat, error } = await supabase
        .from('chats')
        .insert([
          {
            order_id: order.id,
            client_id: order.user_id,
            provider_id: providerId
          }
        ])
        .select('id')
        .single();

      if (error) throw error;
      if (newChat) {
        router.push(`/chats/${newChat.id}`);
      }
    } catch (err) {
      console.error('Błąd otwierania czatu:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6 text-center mt-10">
        <h2 className="text-lg font-bold text-gray-900 mb-2">Zlecenie nie istnieje</h2>
        <p className="text-sm text-gray-500 mb-4">Wygląda na to, że to zlecenie zostało usunięte lub nie istnieje.</p>
        <Button onClick={() => router.push('/')}>Wróć na główną</Button>
      </div>
    );
  }

  const formattedDate = new Date(order.created_at).toLocaleDateString('pl-PL', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
  const displayBudget = order.budget 
    ? (order.budget.toLowerCase().includes('zł') || order.budget.toLowerCase().includes('pln') ? order.budget : `${order.budget} zł`)
    : 'Do negocjacji';

  const currentOrderPoints = calculateRequiredPoints(order?.budget);

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
        <span className="font-semibold text-[15px] text-gray-900">Szczegóły zlecenia</span>
      </div>

      <div className="p-4 flex flex-col gap-4 max-w-md mx-auto">
        
        {/* Category + Date */}
        <div className="flex justify-between items-center">
          <span className="
            bg-violet-50 text-violet-700
            text-xs font-semibold px-2.5 py-1 rounded-lg
            flex items-center gap-1.5
          ">
            <Tag size={12} />
            {order.category}
          </span>
          <span className="flex items-center gap-1.5 text-gray-400 text-xs">
            <Clock size={12} />
            {formattedDate}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold text-gray-900 leading-snug tracking-tight">
          {order.title}
        </h1>

        {/* Location + Deadline */}
        <div className="flex flex-col gap-1.5 text-sm text-gray-600">
          {order.location && (
            <div className="flex items-center gap-2">
              <MapPin size={15} className="text-violet-500 shrink-0" />
              <span>{order.location}</span>
            </div>
          )}
          {order.deadline && (
            <div className="flex items-center gap-2">
              <Calendar size={15} className="text-violet-500 shrink-0" />
              <span>Termin: {order.deadline}</span>
            </div>
          )}
        </div>

        {/* Budget */}
        <div className="
          bg-white rounded-2xl p-4
          border border-gray-100 shadow-sm
          flex justify-between items-center
        ">
          <span className="text-gray-500 text-sm font-medium">Proponowany budżet</span>
          <span className="text-base font-bold text-emerald-600">{displayBudget}</span>
        </div>

        {/* Description */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Opis zadania
          </h3>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {order.description}
          </p>
        </div>

        {/* ========== OWNER VIEW ========== */}
        {isOwner ? (
          <div className="pt-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-base text-gray-900">
                Zgłoszenia
                <span className="text-violet-600 ml-1.5">({offers.length})</span>
              </h3>
              <span className={`
                text-[11px] font-semibold px-2.5 py-1 rounded-lg
                ${order.status === 'in_progress' 
                  ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                  : 'bg-violet-50 text-violet-700 border border-violet-100'}
              `}>
                {order.status === 'in_progress' ? 'W trakcie' : 'Otwarte'}
              </span>
            </div>
            
            {order.status === 'in_progress' && (
              <div className="mb-4 bg-amber-50 border border-amber-100 rounded-2xl p-4">
                <p className="text-sm font-bold text-amber-900 mb-1">Wykonawca realizuje to zadanie</p>
                <p className="text-xs text-amber-700 mb-3">
                  Po zakończeniu prac potwierdź sukces, oceń specjalistę i zamknij zlecenie.
                </p>
                <button
                  onClick={() => setIsCloseModalOpen(true)}
                  className="
                    w-full bg-emerald-600 hover:bg-emerald-700
                    text-white text-sm font-semibold
                    py-3 px-4 rounded-xl
                    transition-colors shadow-sm
                  "
                >
                  Zamknij zlecenie (Sukces ✓)
                </button>
              </div>
            )}

            {offers.length === 0 ? (
              <div className="text-center py-8 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <p className="text-sm text-gray-400">Jeszcze nikt się nie zgłosił.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {offers.map((offer) => {
                  const providerId = offer.provider_id || offer.provider?.id;
                  const isSelected = order.selected_provider_id === providerId;
                  const stats = providerStats[providerId] || { rating: 0, count: 0, reviews: [] };
                  const isReviewsOpen = expandedProviderReviews === providerId;
                  const providerObj = Array.isArray(offer.provider) ? offer.provider[0] : offer.provider;

                  return (
                    <div 
                      key={offer.id} 
                      className={`
                        p-4 rounded-2xl border bg-white shadow-sm
                        ${isSelected ? 'border-emerald-300 bg-emerald-50/30' : 'border-gray-100'}
                      `}
                    >
                      <div className="flex items-start gap-3">
                        <div className="
                          w-10 h-10 shrink-0
                          bg-violet-100 text-violet-600
                          rounded-xl flex items-center justify-center
                        ">
                          <User size={18} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm text-gray-900">
                              {providerObj?.full_name || 'Fachowiec'}
                            </p>

                            {providerObj?.is_pro && (
                              <div className="
                                flex items-center gap-1
                                bg-gradient-to-r from-violet-600 to-fuchsia-600
                                px-2 py-0.5 rounded-full
                              ">
                                <Star size={10} className="fill-yellow-300 text-yellow-300" />
                                <span className="text-[9px] font-black text-white tracking-wide uppercase">
                                  PRO
                                </span>
                              </div>
                            )}

                            {isSelected && (
                              <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md">
                                Wybrany
                              </span>
                            )}
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => setExpandedProviderReviews(isReviewsOpen ? null : providerId)}
                            className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-500 hover:text-violet-600 transition-colors"
                          >
                            <div className="flex items-center gap-0.5 text-amber-500 font-semibold">
                              <Star size={12} className="fill-amber-400 text-amber-400" />
                              <span>{stats.rating}</span>
                            </div>
                            <span className="text-gray-300">•</span>
                            <span className="underline">Opinie ({stats.count})</span>
                            <ChevronDown size={13} className={`transition-transform ${isReviewsOpen ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                      </div>

                      {isReviewsOpen && (
                        <div className="mt-3 bg-gray-50 rounded-xl p-3 border border-gray-100 flex flex-col gap-2">
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                            Komentarze klientów
                          </p>
                          {stats.reviews.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">Brak opinii</p>
                          ) : (
                            stats.reviews.map((rev) => (
                              <div key={rev.id} className="bg-white p-2.5 rounded-lg border border-gray-100 text-xs">
                                <div className="flex justify-between items-center font-semibold text-gray-800 mb-1">
                                  <span>{rev.client?.full_name || 'Klient'}</span>
                                  <div className="flex items-center gap-0.5 text-amber-500">
                                    <Star size={11} className="fill-amber-400 text-amber-400" />
                                    <span>{rev.rating}/5</span>
                                  </div>
                                </div>
                                <p className="text-gray-600">{rev.comment || 'Brak komentarza'}</p>
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                        {providerObj?.contact_info && (
                          <a 
                            href={`tel:${providerObj.contact_info}`}
                            className="
                              flex-1 flex items-center justify-center gap-1.5
                              text-xs font-semibold text-gray-700
                              bg-gray-100 hover:bg-gray-200
                              py-2.5 rounded-xl transition-colors
                            "
                          >
                            <Phone size={13} />
                            Zadzwoń
                          </a>
                        )}
                        
                        <button 
                          onClick={() => openChatWithProvider(providerId)}
                          className="
                            flex-1 flex items-center justify-center gap-1.5
                            text-xs font-semibold text-white
                            bg-violet-600 hover:bg-violet-700
                            py-2.5 rounded-xl transition-colors shadow-sm
                          "
                        >
                          <MessageSquare size={13} />
                          Napisz
                        </button>
                      </div>

                      {order.status !== 'in_progress' && (
                        <button
                          onClick={async () => {
                            const providerId = offer.provider_id || offer.provider?.id;
                            
                            const { error: orderUpdateError } = await supabase
                              .from('orders')
                              .update({ status: 'in_progress', selected_provider_id: providerId })
                              .eq('id', order.id);

                            if (orderUpdateError) {
                              alert(`Błąd zapisu: ${orderUpdateError.message}`);
                              return;
                            }

                            await supabase.from('notifications').insert([
                              {
                                user_id: providerId,
                                title: 'Gratulacje! Wybrano Cię',
                                message: `Klient wybrał Cię do realizacji zlecenia: "${order.title}".`,
                                order_id: order.id
                              }
                            ]);

                            fetch('/api/send-email', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                type: 'provider_selected',
                                orderId: order.id,
                                providerId: providerId
                              })
                            }).catch(err => console.error('Błąd wysyłania emaila:', err));

                            setOrder({ ...order, status: 'in_progress', selected_provider_id: providerId });
                            alert('Wykonawca został pomyślnie wybrany!');
                          }}
                          className="
                            w-full mt-2
                            bg-blue-600 hover:bg-blue-700
                            text-white text-xs font-semibold
                            py-2.5 rounded-xl transition-colors shadow-sm
                          "
                        >
                          Wybierz jako wykonawcę
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Close Modal */}
            {isCloseModalOpen && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl flex flex-col gap-4">
                  <h3 className="font-bold text-lg text-gray-900">Zakończenie zlecenia</h3>
                  <p className="text-sm text-gray-500">
                    Oceń pracę wykonawcy. Twoja opinia pojawi się na jego profilu.
                  </p>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gray-700">Ocena</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setRating(star)}
                          className={`text-2xl transition-colors ${star <= rating ? 'text-amber-400' : 'text-gray-300'}`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gray-700">Komentarz</label>
                    <textarea
                      rows={3}
                      placeholder="Napisz kilka słów o współpracy..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="
                        w-full border border-gray-200 rounded-xl p-3 text-sm
                        focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-400
                      "
                    />
                  </div>

                  <div className="flex gap-2.5 pt-1">
                    <Button
                      variant="outline"
                      fullWidth
                      onClick={() => setIsCloseModalOpen(false)}
                      disabled={isSubmittingReview}
                    >
                      Anuluj
                    </Button>
                    <Button
                      fullWidth
                      disabled={isSubmittingReview}
                      onClick={async () => {
                        setIsSubmittingReview(true);
                        try {
                          const selectedProviderId = order.selected_provider_id;
                          
                          const { error: reviewError } = await supabase.from('reviews').insert([
                            {
                              order_id: order.id,
                              client_id: order.user_id,
                              provider_id: selectedProviderId,
                              rating: rating,
                              comment: comment
                            }
                          ]);

                          if (reviewError) throw reviewError;

                          const { error: orderError } = await supabase.from('orders').delete().eq('id', order.id);
                          if (orderError) throw orderError;

                          setIsCloseModalOpen(false);
                          alert('Zlecenie zostało pomyślnie zamknięte!');
                          router.push('/profile');
                        } catch (err: any) {
                          console.error(err);
                          alert('Wystąpił błąd podczas zamykania zlecenia.');
                        } finally {
                          setIsSubmittingReview(false);
                        }
                      }}
                    >
                      {isSubmittingReview ? 'Przetwarzanie...' : 'Potwierdź i zamknij'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ========== PROVIDER VIEW ========== */
          <>
            {message && (
              <div className={`
                p-3.5 rounded-xl text-sm font-medium text-center
                ${message.type === 'error' 
                  ? 'bg-red-50 text-red-600 border border-red-100' 
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}
              `}>
                {message.text}
              </div>
            )}
            
{hasApplied ? (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                <div className="text-emerald-700 font-bold text-sm flex items-center justify-between">
                  <span>✓ Oferta została złożona</span>
                  <ReportButton reportedUserId={order.user_id} userRole="client" />
                </div>
                <p className="text-xs text-gray-600">
                  Możesz skontaktować się z klientem:
                </p>
                <div className="flex items-center gap-2">
                  {clientProfile?.contact_info && (
                    <a 
                      href={`tel:${clientProfile.contact_info}`}
                      className="
                        flex-1 flex items-center justify-center gap-1.5
                        text-xs font-semibold text-gray-700
                        bg-white border border-gray-200
                        py-2.5 rounded-xl hover:bg-gray-50 transition-colors shadow-sm
                      "
                    >
                      <Phone size={13} />
                      Zadzwoń
                    </a>
                  )}
                  <button 
                    onClick={openOrCreateChatForProvider}
                    className="
                      flex-1 flex items-center justify-center gap-1.5
                      text-xs font-semibold text-white
                      bg-violet-600 hover:bg-violet-700
                      py-2.5 rounded-xl transition-colors shadow-sm
                    "
                  >
                    <MessageSquare size={13} />
                    Napisz w czacie
                  </button>
                </div>
              </div>
              
            ) : order.status === 'in_progress' ? (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                <p className="text-sm font-bold text-amber-900 mb-1">Zlecenie w trakcie realizacji</p>
                <p className="text-xs text-amber-700 mb-3">
                  Klient wybrał już wykonawcę. Nabór zamknięty.
                </p>

                {(() => {
                  const selectedOffer = offers.find(o => 
                    (o.provider_id || (Array.isArray(o.provider) ? o.provider[0]?.id : o.provider?.id)) === order.selected_provider_id
                  );
                  
                  const rawProvider = selectedOffer?.provider;
                  const provider = Array.isArray(rawProvider) ? rawProvider[0] : rawProvider;
                  const providerId = order.selected_provider_id;
                  const stats = providerStats[providerId] || { rating: 0, count: 0, reviews: [] };
                  const isReviewsOpen = expandedProviderReviews === providerId;

                  return (
                    <div className="bg-white border border-amber-100 rounded-xl p-3.5 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="
                          w-10 h-10 shrink-0
                          bg-violet-100 text-violet-600
                          rounded-xl flex items-center justify-center
                        ">
                          <User size={18} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm text-gray-900">
                              {provider?.full_name || 'Wybrany fachowiec'}
                            </p>
                            {provider?.is_pro && (
                              <div className="
                                flex items-center gap-1
                                bg-gradient-to-r from-violet-600 to-fuchsia-600
                                px-2 py-0.5 rounded-full
                              ">
                                <Star size={10} className="fill-yellow-300 text-yellow-300" />
                                <span className="text-[9px] font-black text-white tracking-wide uppercase">
                                  PRO
                                </span>
                              </div>
                            )}
                            <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md">
                              Wybrany
                            </span>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => setExpandedProviderReviews(isReviewsOpen ? null : providerId)}
                            className="flex items-center gap-1.5 mt-1 text-xs text-gray-500 hover:text-violet-600 transition-colors"
                          >
                            <div className="flex items-center gap-0.5 text-amber-500 font-semibold">
                              <Star size={12} className="fill-amber-400 text-amber-400" />
                              <span>{stats.rating}</span>
                            </div>
                            <span className="text-gray-300">•</span>
                            <span className="underline">Opinie ({stats.count})</span>
                            <ChevronDown size={13} className={`transition-transform ${isReviewsOpen ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                      </div>

                      {isReviewsOpen && (
                        <div className="mt-3 bg-gray-50 rounded-xl p-3 border border-gray-100 flex flex-col gap-2">
                          {stats.reviews.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">Brak opinii</p>
                          ) : (
                            stats.reviews.map((rev) => (
                              <div key={rev.id} className="bg-white p-2.5 rounded-lg border border-gray-100 text-xs">
                                <div className="flex justify-between items-center font-semibold text-gray-800 mb-1">
                                  <span>{rev.client?.full_name || 'Klient'}</span>
                                  <div className="flex items-center gap-0.5 text-amber-500">
                                    <Star size={11} className="fill-amber-400 text-amber-400" />
                                    <span>{rev.rating}/5</span>
                                  </div>
                                </div>
                                <p className="text-gray-600">{rev.comment || 'Brak komentarza'}</p>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 pt-1">
                <Button 
                  fullWidth 
                  className="py-3.5 text-sm shadow-md"
                  onClick={handleOffer}
                  disabled={isSubmitting}
                >
                  {isSubmitting 
                    ? 'Przetwarzanie...' 
                    : currentUserProfile?.is_pro 
                      ? 'Odpowiedz (PRO — Bezpłatnie)' 
                      : `Odpowiedz (${currentOrderPoints} ${currentOrderPoints === 1 ? 'punkt' : currentOrderPoints < 5 ? 'punkty' : 'punktów'})`
                  }
                </Button>
                <p className="text-xs text-center text-gray-400">
                  {currentUserProfile?.is_pro
                    ? 'Jako użytkownik PRO odpowiadasz bez pobierania punktów!'
                    : `Odpowiedź pobiera ${currentOrderPoints} pkt i odblokowuje kontakt oraz czat.`
                  }
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}