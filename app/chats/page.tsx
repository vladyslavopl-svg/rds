"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { MessageSquare, ChevronRight } from 'lucide-react';

export default function ChatsPage() {
  const router = useRouter();
  const [chats, setChats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadChatIds, setUnreadChatIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let channel: any;

    const fetchChatsAndSubscribe = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        const userId = session.user.id;

        // Загружаем актуальные непрочитанные из localStorage
        const savedUnread = JSON.parse(localStorage.getItem('razdwa_unread_chats') || '[]');
        setUnreadChatIds(new Set(savedUnread));

        const { data, error } = await supabase
          .from('chats')
          .select(`
            id,
            created_at,
            orders (
              title
            )
          `)
          .or(`client_id.eq.${userId},provider_id.eq.${userId}`)
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data) {
          setChats(data);
          const chatIds = data.map(c => c.id);

          if (chatIds.length > 0) {
            const uniqueChannelName = `chats_list_unread_${userId}_${Date.now()}`;
            
            channel = supabase
              .channel(uniqueChannelName)
              .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages' },
                (payload) => {
                  if (payload.new && payload.new.chat_id) {
                    const messageChatId = payload.new.chat_id;
                    const senderId = payload.new.sender_id;

                    if (chatIds.includes(messageChatId) && senderId !== userId) {
                      setUnreadChatIds((prev) => {
                        const newSet = new Set(prev);
                        newSet.add(messageChatId);
                        localStorage.setItem('razdwa_unread_chats', JSON.stringify(Array.from(newSet)));
                        return newSet;
                      });
                    }
                  }
                }
              )
              .subscribe();
          }
        }
      } catch (err) {
        console.error('Błąd pobierania czatów:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChatsAndSubscribe();

    // Синхронизация при возвращении на страницу
    const handleFocus = () => {
      const savedUnread = JSON.parse(localStorage.getItem('razdwa_unread_chats') || '[]');
      setUnreadChatIds(new Set(savedUnread));
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      window.removeEventListener('focus', handleFocus);
    };
  }, [router]);

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-razdwa-purple border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 min-h-screen pb-24">
      <div className="mb-4 mt-3">
        <h1 className="text-2xl font-bold text-razdwa-dark mb-1">Wiadomości</h1>
        <p className="text-gray-500 text-sm">Twoje aktywne konwersacje</p>
      </div>

      {chats.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 p-6 mt-4">
          <div className="text-4xl mb-3">💬</div>
          <h3 className="font-bold text-gray-700">Brak wiadomości</h3>
          <p className="text-sm text-gray-500 mt-1">Rozpocznij konwersację ze strony zlecenia.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {chats.map((chat) => {
            const isUnread = unreadChatIds.has(chat.id);
            return (
              <div 
                key={chat.id}
                onClick={() => router.push(`/chats/${chat.id}`)}
                className={`border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex items-center justify-between cursor-pointer ${
                  isUnread ? 'border-razdwa-purple bg-purple-50/40' : 'bg-white border-gray-100'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="relative w-12 h-12 bg-purple-50 text-razdwa-purple rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    <MessageSquare size={22} />
                    {/* Одна аккуратная красная точка */}
                    {isUnread && (
                      <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="font-bold text-razdwa-dark text-sm truncate">
                      {chat.orders?.title || 'Zlecenie'}
                    </h3>
                    <p className={`text-xs mt-0.5 truncate ${isUnread ? 'text-razdwa-purple font-semibold' : 'text-gray-500'}`}>
                      {isUnread ? 'Nowa wiadomość!' : 'Rozmowa dot. zadania'}
                    </p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-400 flex-shrink-0 ml-2" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}