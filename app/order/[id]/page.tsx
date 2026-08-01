"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Tag, Clock, ChevronLeft, User, MessageSquare, Phone, MapPin, Calendar, Star, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter(); 
  
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [clientProfile, setClientProfile] = useState<any>(null);

  const [isOwner, setIsOwner] = useState(false);
  const [offers, setOffers] = useState<any[]>([]);

  // Хранилище рейтингов и отзывов для исполнителей: { [providerId]: { rating, count, reviewsList } }
  const [providerStats, setProviderStats] = useState<{ [key: string]: { rating: number, count: number, reviews: any[] } }>({});
  
  // Состояние для открытых отзывов конкретного исполнителя в модалке или списке
  const [expandedProviderReviews, setExpandedProviderReviews] = useState<string | null>(null);

  // Состояния для модального окна закрытия заказа
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!params.id) return;

      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user;

      const { data: orderData, error } = await supabase
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

        // Загружаем отклики
        const { data: offersData } = await supabase
          .from('offers')
          .select(`
            id,
            created_at,
            status,
            provider_id,
            provider:profiles!offers_provider_id_fkey (id, full_name, role, contact_info) 
          `)
          .eq('order_id', orderData.id)
          .order('created_at', { ascending: false });

        if (offersData) {
          setOffers(offersData);

          // Собираем ID всех исполнителей, чтобы подгрузить их отзывы и рейтинг
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

      const { data: profile, error: profileError } = await supabase
        .from('profiles').select('points_balance').eq('id', session.user.id).single();

      if (profileError) throw profileError;

      if (profile.points_balance < 1) {
        setMessage({ text: 'Brak wystarczającej liczby punktów. Doładuj konto!', type: 'error' });
        setIsSubmitting(false);
        return;
      }

      const { error: updateError } = await supabase
        .from('profiles').update({ points_balance: profile.points_balance - 1 }).eq('id', session.user.id);

      if (updateError) throw updateError;

      const { error: offerError } = await supabase
        .from('offers').insert([{ order_id: order.id, provider_id: session.user.id }]);

      if (offerError) throw offerError;

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

      setHasApplied(true);
      setMessage({ text: 'Oferta została złożona ✓', type: 'success' });
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
        <div className="w-8 h-8 border-4 border-razdwa-purple border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6 text-center mt-10">
        <h2 className="text-base font-bold text-razdwa-dark mb-1">Zlecenie nie istnieje</h2>
        <p className="text-xs text-gray-500 mb-3">Wygląda na to, że to zlecenie zostało usunięte lub nie istnieje.</p>
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

  return (
    <div className="bg-white min-h-screen pb-20">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10 shadow-sm">
        <button onClick={() => router.back()} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors -ml-1">
          <ChevronLeft size={20} className="text-razdwa-dark" />
        </button>
        <span className="font-bold text-sm text-razdwa-dark">Szczegóły zlecenia</span>
      </div>

      <div className="p-4 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <span className="bg-purple-50 text-razdwa-purple text-xs font-semibold px-2.5 py-1 rounded-md flex items-center gap-1">
            <Tag size={12} />
            {order.category}
          </span>
          <span className="flex items-center gap-1 text-gray-400 text-xs">
            <Clock size={12} />
            {formattedDate}
          </span>
        </div>

        <h1 className="text-lg font-bold text-razdwa-dark leading-snug">{order.title}</h1>

        <div className="flex flex-col gap-1 text-xs text-gray-500">
          {order.location && (
            <div className="flex items-center gap-1.5">
              <MapPin size={13} className="text-razdwa-purple shrink-0" />
              <span>{order.location}</span>
            </div>
          )}
          {order.deadline && (
            <div className="flex items-center gap-1.5">
              <Calendar size={13} className="text-razdwa-purple shrink-0" />
              <span>Termin: {order.deadline}</span>
            </div>
          )}
        </div>

        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex justify-between items-center">
          <span className="text-gray-500 text-xs font-medium">Proponowany budżet</span>
          <span className="text-sm font-bold text-green-600">{displayBudget}</span>
        </div>

        <div>
          <h3 className="font-bold text-razdwa-dark mb-1.5 text-xs uppercase tracking-wider text-gray-400">Opis zadania</h3>
          <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{order.description}</p>
        </div>

        {isOwner ? (
          <div className="border-t border-gray-100 pt-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-razdwa-dark text-sm">Zgłoszenia ({offers.length})</h3>
              <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md ${
                order.status === 'in_progress' ? 'bg-amber-50 text-amber-600' : 'bg-purple-50 text-razdwa-purple'
              }`}>
                {order.status === 'in_progress' ? 'Status: Wykonuje się' : 'Status: Otwarte'}
              </span>
            </div>
            
            {order.status === 'in_progress' && (
              <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex flex-col gap-2">
                <p className="text-xs font-bold text-amber-800">Wykonawca realizuje to zadanie</p>
                <p className="text-[11px] text-amber-600">Po zakończeniu prac potwierdź sukces, oceń specjalistę i usuń zlecenie.</p>
                <button
                  onClick={() => setIsCloseModalOpen(true)}
                  className="mt-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition-colors shadow-sm text-center"
                >
                  Zamknij zlecenie (Sukces ✓)
                </button>
              </div>
            )}

            {offers.length === 0 ? (
              <div className="text-center py-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-gray-500 text-xs">Jeszcze nikt się nie zgłosił.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {offers.map((offer) => {
                  const providerId = offer.provider_id || offer.provider?.id;
                  const isSelected = order.selected_provider_id === providerId;
                  const stats = providerStats[providerId] || { rating: 0, count: 0, reviews: [] };
                  const isReviewsOpen = expandedProviderReviews === providerId;

                  return (
                    <div key={offer.id} className={`p-3 border rounded-xl flex flex-col gap-2.5 bg-white shadow-sm ${
                      isSelected ? 'border-green-500 bg-green-50/20' : 'border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-razdwa-purple">
                            <User size={16} />
                          </div>
                          <div>
                            <p className="font-bold text-razdwa-dark text-xs flex items-center gap-1.5">
                              {offer.provider?.full_name || 'Fachowiec'}
                              {isSelected && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Wybrany</span>}
                            </p>
                            
                            {/* Рейтинг и количество комментариев */}
                            <button
                              type="button"
                              onClick={() => setExpandedProviderReviews(isReviewsOpen ? null : providerId)}
                              className="flex items-center gap-2 mt-1 text-[11px] text-gray-500 hover:text-razdwa-purple transition-colors"
                            >
                              <div className="flex items-center gap-0.5 text-yellow-600 font-semibold">
                                <Star size={11} className="fill-yellow-400 text-yellow-400" />
                                <span>{stats.rating}</span>
                              </div>
                              <span className="text-gray-300">•</span>
                              <span className="underline">Opinie ({stats.count})</span>
                              <ChevronDown size={12} className={`transition-transform ${isReviewsOpen ? 'rotate-180' : ''}`} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Выпадающий список комментариев */}
                      {isReviewsOpen && (
                        <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-100 flex flex-col gap-2 mt-1">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Komentarze klientów:</p>
                          {stats.reviews.length === 0 ? (
                            <p className="text-[11px] text-gray-500 italic">Brak opinii</p>
                          ) : (
                            stats.reviews.map((rev) => (
                              <div key={rev.id} className="bg-white p-2 rounded-lg border border-gray-100 text-[11px] flex flex-col gap-1">
                                <div className="flex justify-between items-center font-semibold text-razdwa-dark">
                                  <span>{rev.client?.full_name || 'Klient'}</span>
                                  <div className="flex items-center gap-0.5 text-yellow-500">
                                    <Star size={10} className="fill-yellow-400 text-yellow-400" />
                                    <span>{rev.rating}/5</span>
                                  </div>
                                </div>
                                <p className="text-gray-600">{rev.comment || 'Brak komentarza'}</p>
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                        {offer.provider?.contact_info && (
                          <a 
                            href={`tel:${offer.provider.contact_info}`}
                            className="flex-1 text-center text-xs font-semibold text-razdwa-dark bg-gray-100 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
                          >
                            <Phone size={12} />
                            Zadzwoń
                          </a>
                        )}
                        
                        <button 
                          onClick={() => openChatWithProvider(providerId)}
                          className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold text-white bg-razdwa-purple py-2 rounded-lg hover:bg-opacity-90 transition-colors shadow-sm"
                        >
                          <MessageSquare size={12} />
                          Napisz
                        </button>
                      </div>

{order.status !== 'in_progress' && (
  <button
    onClick={async () => {
      const providerId = offer.provider_id || offer.provider?.id;
      
      // 1. Обновляем статус заказа и записываем выбранного исполнителя
      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({ status: 'in_progress', selected_provider_id: providerId })
        .eq('id', order.id);

      if (orderUpdateError) {
        alert(`Błąd zapisu: ${orderUpdateError.message}`);
        return;
      }

      // 2. Отправляем уведомление выбранному исполнителю
      const { error: notifError } = await supabase.from('notifications').insert([
        {
          user_id: providerId,
          title: 'Gratulacje! Wybrano Cię',
          message: `Klient wybrał Cię do realizacji zlecenia: "${order.title}".`,
          order_id: order.id
        }
      ]);

      if (notifError) {
        console.error('Błąd wysyłania powiadomienia:', notifError);
      }

      setOrder({ ...order, status: 'in_progress', selected_provider_id: providerId });
      alert('Wykonawca został pomyślnie wybrany!');
    }}
    className="w-full mt-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors shadow-sm"
  >
    Wybierz jako wykonawcę
  </button>
)}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Модальное окно завершения и оценки */}
            {isCloseModalOpen && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl flex flex-col gap-4">
                  <h3 className="font-bold text-base text-razdwa-dark">Zakończenie zlecenia</h3>
                  <p className="text-xs text-gray-500">Oceń pracę wykonawcy. Twoja opinia pojawi się na jego wizytówce.</p>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-700">Ocena (0 - 5 gwiazdek)</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setRating(star)}
                          className={`text-xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-700">Komentarz / Opinia</label>
                    <textarea
                      rows={3}
                      placeholder="Napisz kilka słów o współpracy..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-razdwa-purple/50"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
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
                          alert('Zlecenie zostało pomyślnie zamknięte, a opinia zapisana w profilu wykonawcy!');
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
          <>
            {message && (
              <div className={`p-3 rounded-xl text-xs font-medium text-center shadow-sm ${
                message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'
              }`}>
                {message.text}
              </div>
            )}
            
            {hasApplied ? (
              <div className="bg-green-50 border border-green-100 rounded-xl p-3.5 flex flex-col gap-2.5 shadow-sm">
                <div className="text-green-700 font-bold text-xs flex items-center gap-1.5">
                  <span>✓ Oferta została złożona</span>
                </div>
                <p className="text-[11px] text-gray-600">
                  Możesz skontaktować się z klientem bezpośrednio:
                </p>
                <div className="flex items-center gap-2 pt-2 border-t border-green-100">
                  {clientProfile?.contact_info && (
                    <a 
                      href={`tel:${clientProfile.contact_info}`}
                      className="flex-1 text-center text-xs font-semibold text-razdwa-dark bg-white border border-gray-200 py-2.5 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-1 shadow-sm"
                    >
                      <Phone size={12} />
                      Zadzwoń
                    </a>
                  )}
                  <button 
                    onClick={openOrCreateChatForProvider}
                    className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold text-white bg-razdwa-purple py-2.5 rounded-xl hover:bg-opacity-90 transition-colors shadow-sm"
                  >
                    <MessageSquare size={12} />
                    Napisz w czacie
                  </button>
                </div>
              </div>
            ) : order.status === 'in_progress' ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col gap-3">
                <div>
                  <p className="text-xs font-bold text-amber-800 mb-0.5">Zlecenie w trakcie realizacji</p>
                  <p className="text-[11px] text-amber-600">Klient wybrał już wykonawcę do tego zadania i naboru nie ma.</p>
                </div>

                {(() => {
                  const selectedOffer = offers.find(o => (o.provider_id || o.provider?.id) === order.selected_provider_id);
                  const provider = selectedOffer?.provider;
                  const providerId = order.selected_provider_id;
                  const stats = providerStats[providerId] || { rating: 0, count: 0, reviews: [] };
                  const isReviewsOpen = expandedProviderReviews === providerId;

                  return (
                    <div className="bg-white border border-amber-200 rounded-xl p-3 flex flex-col gap-2 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-razdwa-purple">
                            <User size={16} />
                          </div>
                          <div>
                            <p className="font-bold text-razdwa-dark text-xs flex items-center gap-1.5">
                              {provider?.full_name || 'Wybrany fachowiec'}
                              <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Wybrany</span>
                            </p>
                            <button
                              type="button"
                              onClick={() => setExpandedProviderReviews(isReviewsOpen ? null : providerId)}
                              className="flex items-center gap-2 mt-1 text-[11px] text-gray-500 hover:text-razdwa-purple transition-colors"
                            >
                              <div className="flex items-center gap-0.5 text-yellow-600 font-semibold">
                                <Star size={11} className="fill-yellow-400 text-yellow-400" />
                                <span>{stats.rating}</span>
                              </div>
                              <span className="text-gray-300">•</span>
                              <span className="underline">Opinie ({stats.count})</span>
                              <ChevronDown size={12} className={`transition-transform ${isReviewsOpen ? 'rotate-180' : ''}`} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {isReviewsOpen && (
                        <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-100 flex flex-col gap-2 mt-1">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Komentarze klientów:</p>
                          {stats.reviews.length === 0 ? (
                            <p className="text-[11px] text-gray-500 italic">Brak opinii</p>
                          ) : (
                            stats.reviews.map((rev) => (
                              <div key={rev.id} className="bg-white p-2 rounded-lg border border-gray-100 text-[11px] flex flex-col gap-1">
                                <div className="flex justify-between items-center font-semibold text-razdwa-dark">
                                  <span>{rev.client?.full_name || 'Klient'}</span>
                                  <div className="flex items-center gap-0.5 text-yellow-500">
                                    <Star size={10} className="fill-yellow-400 text-yellow-400" />
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
              <div className="flex flex-col gap-2 pt-2">
                <Button 
                  fullWidth 
                  className="py-3 text-sm shadow-md hover:shadow-lg transition-all"
                  onClick={handleOffer}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Przetwarzanie...' : 'Odpowiedz (1 punkt)'}
                </Button>
                <p className="text-[11px] text-center text-gray-400">
                  Odpowiedź na zlecenie pobiera 1 punkt z salda i odblokowuje kontakt oraz czat.
                </p>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}