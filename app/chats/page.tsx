"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { MessageSquare, ChevronRight, Search } from 'lucide-react';

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
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 pb-28 max-w-md mx-auto min-h-screen">
      
      {/* Header */}
      <div className="mb-6 mt-2">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Wiadomości</h1>
        <p className="text-sm text-gray-500 mt-1">
          {chats.length > 0 
            ? `${chats.length} ${chats.length === 1 ? 'rozmowa' : 'rozmów'}`
            : 'Twoje aktywne konwersacje'
          }
        </p>
      </div>

      {chats.length === 0 ? (
        <div className="
          flex flex-col items-center justify-center
          text-center py-16 px-6
          bg-white rounded-2xl border border-gray-100
          shadow-sm
        ">
          <div className="
            w-16 h-16 mb-4
            bg-violet-50 rounded-2xl
            flex items-center justify-center
          ">
            <MessageSquare size={28} className="text-violet-500" />
          </div>
          <h3 className="font-bold text-gray-800 text-base">Brak wiadomości</h3>
          <p className="text-sm text-gray-500 mt-1.5 max-w-[240px]">
            Rozpocznij konwersację ze strony zlecenia
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {chats.map((chat) => {
            const isUnread = unreadChatIds.has(chat.id);
            
            return (
              <div 
                key={chat.id}
                onClick={() => router.push(`/chats/${chat.id}`)}
                className={`
                  group relative
                  flex items-center gap-3.5
                  p-4 rounded-2xl
                  border transition-all duration-200
                  cursor-pointer
                  ${isUnread 
                    ? 'bg-violet-50/70 border-violet-200 shadow-sm' 
                    : 'bg-white border-gray-100 hover:border-violet-100 hover:shadow-md'
                  }
                `}
              >
                {/* Avatar / Icon */}
                <div className={`
                  relative shrink-0
                  w-12 h-12 rounded-xl
                  flex items-center justify-center
                  ${isUnread 
                    ? 'bg-violet-600 text-white' 
                    : 'bg-violet-50 text-violet-600 group-hover:bg-violet-100'
                  }
                  transition-colors
                `}>
                  <MessageSquare size={22} />
                  
                  {isUnread && (
                    <span className="
                      absolute -top-1 -right-1
                      w-3.5 h-3.5
                      bg-red-500 rounded-full
                      border-2 border-white
                    " />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`
                      font-semibold text-[15px] truncate
                      ${isUnread ? 'text-gray-900' : 'text-gray-800'}
                    `}>
                      {chat.orders?.title || 'Zlecenie'}
                    </h3>
                    
                    {isUnread && (
                      <span className="
                        shrink-0
                        text-[10px] font-bold
                        bg-violet-600 text-white
                        px-1.5 py-0.5 rounded-md
                      ">
                        NOWA
                      </span>
                    )}
                  </div>
                  
                  <p className={`
                    text-[13px] mt-0.5 truncate
                    ${isUnread 
                      ? 'text-violet-700 font-medium' 
                      : 'text-gray-500'
                    }
                  `}>
                    {isUnread ? 'Nowa wiadomość' : 'Rozmowa dotycząca zlecenia'}
                  </p>
                </div>

                {/* Arrow */}
                <ChevronRight 
                  size={18} 
                  className={`
                    shrink-0 transition-transform
                    ${isUnread 
                      ? 'text-violet-500' 
                      : 'text-gray-300 group-hover:text-violet-400 group-hover:translate-x-0.5'
                    }
                  `} 
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}