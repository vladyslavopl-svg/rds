"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, Send } from 'lucide-react';

export default function ChatRoomPage() {
  const params = useParams();
  const router = useRouter();

  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [chatInfo, setChatInfo] = useState<any>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initChat = async () => {
      if (!params.id) return;

        // Очищаем статус непрочитанного при открытии чата
        const savedUnread = JSON.parse(localStorage.getItem('razdwa_unread_chats') || '[]');
        const updatedUnread = savedUnread.filter((id: string) => id !== params.id);
        localStorage.setItem('razdwa_unread_chats', JSON.stringify(updatedUnread));
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }
        const userId = session.user.id;
        setCurrentUserId(userId);

        if (!params.id) return;

        // 1. Інформація про чат
        const { data: chatData, error: chatError } = await supabase
          .from('chats')
          .select('*')
          .eq('id', params.id)
          .single();

        if (chatError) throw chatError;
        setChatInfo(chatData);

        // 2. Співрозмовник (запрашиваем только существующую колонку full_name)
        const otherUserId = chatData.client_id === userId ? chatData.provider_id : chatData.client_id;
        if (otherUserId) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', otherUserId)
            .single();

          if (profileError) {
            console.error('Błąd pobierania profilu współrozmówcy:', profileError);
          } else if (profileData) {
            setOtherUser(profileData);
          }
        }

        // 3. Назва замовлення
        if (chatData?.order_id) {
          const { data: orderData } = await supabase
            .from('orders')
            .select('title')
            .eq('id', chatData.order_id)
            .single();

          if (orderData) {
            setChatInfo((prev: any) => ({ ...prev, order: orderData }));
          }
        }

        // 4. Повідомлення
        const { data: msgData, error: msgError } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_id', params.id)
          .order('created_at', { ascending: true });

        if (msgError) throw msgError;
        if (msgData) setMessages(msgData);

      } catch (err) {
        console.error('Błąd ładowania czatu:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) initChat();

    // Realtime підписка
    if (!params.id) return;

    const channel = supabase
      .channel(`chat_room_${params.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          if (payload.new && payload.new.chat_id === params.id) {
            setMessages((prev) => {
              if (prev.some((msg) => msg.id === payload.new.id)) return prev;
              return [...prev, payload.new];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [params.id, router]);

  // Автоскрол вниз
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUserId || !params.id) return;

    const text = newMessage;
    setNewMessage('');

    const { error } = await supabase.from('messages').insert([
      {
        chat_id: params.id,
        sender_id: currentUserId,
        content: text,
      },
    ]);

    if (error) {
      console.error('Błąd wysyłania wiadomości:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-razdwa-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const userName = otherUser?.full_name || 'Rozmówca';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div className="relative flex flex-col h-[100dvh] max-w-md mx-auto bg-gray-50 overflow-hidden">
      {/* Шапка */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 flex items-center px-4 z-30 shadow-sm">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors -ml-2 mr-1"
        >
          <ChevronLeft size={24} className="text-razdwa-dark" />
        </button>

        <div className="w-10 h-10 bg-purple-100 text-razdwa-purple rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 mr-3">
          {userInitial}
        </div>

        <div className="overflow-hidden flex-1">
          <span className="font-bold text-sm block truncate text-razdwa-dark">
            {userName}
          </span>
          <span className="text-[11px] text-gray-400 truncate block">
            {chatInfo?.order?.title || 'Zlecenie'}
          </span>
        </div>
      </div>

      {/* Список повідомлень */}
      <div className="flex-1 overflow-y-auto px-4 pt-20 pb-24 flex flex-col gap-4 z-10">
        {messages.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">
            Brak wiadomości. Napisz pierwszą wiadomość!
          </div>
        ) : (
          messages.map((msg) => {
            const isMyMessage = msg.sender_id === currentUserId;
            const senderName = isMyMessage ? 'Ty' : userName;
            const senderInitial = senderName.charAt(0).toUpperCase();

            return (
              <div
                key={msg.id}
                className={`flex gap-2 max-w-[85%] ${
                  isMyMessage ? 'self-end flex-row-reverse' : 'self-start'
                }`}
              >
                {/* Аватарка (инициалы) */}
                <div className="w-8 h-8 rounded-full bg-purple-100 text-razdwa-purple flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden mt-1">
                  {senderInitial}
                </div>

                {/* Контент */}
                <div
                  className={`flex flex-col ${
                    isMyMessage ? 'items-end' : 'items-start'
                  }`}
                >
                  <span className="text-[11px] text-gray-500 mb-0.5 px-1 font-medium">
                    {senderName}
                  </span>

                  <div
                    className={`p-3 rounded-2xl text-sm ${
                      isMyMessage
                        ? 'bg-razdwa-purple text-white rounded-br-none'
                        : 'bg-white text-razdwa-dark border border-gray-100 rounded-bl-none shadow-sm'
                    }`}
                  >
                    {msg.content}
                  </div>

                  <span className="text-[10px] text-gray-400 mt-1 px-1">
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Поле вводу */}
      <form
        onSubmit={handleSendMessage}
        className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-3 flex gap-2 z-30 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]"
      >
        <input
          type="text"
          placeholder="Napisz wiadomość..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-razdwa-purple/50"
        />
        <button
          type="submit"
          className="bg-razdwa-purple text-white p-3 rounded-xl hover:bg-opacity-90 transition-colors flex items-center justify-center shadow-sm"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}