"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, PlusCircle, MessageSquare, User, ClipboardList } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export const BottomNav = () => {
  const pathname = usePathname();
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    let channel: any;

    const initGlobalListener = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const userId = session.user.id;

        const checkStorage = () => {
          const savedUnread = JSON.parse(localStorage.getItem('razdwa_unread_chats') || '[]');
          setHasUnread(savedUnread.length > 0);
        };
        checkStorage();

        const { data: chats } = await supabase
          .from('chats')
          .select('id')
          .or(`client_id.eq.${userId},provider_id.eq.${userId}`);

        if (!chats || chats.length === 0) return;
        const chatIds = chats.map(c => c.id);

        const uniqueChannelName = `global_nav_unread_${userId}_${Date.now()}`;
        
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
                  const currentSaved = JSON.parse(localStorage.getItem('razdwa_unread_chats') || '[]');
                  if (!currentSaved.includes(messageChatId)) {
                    currentSaved.push(messageChatId);
                    localStorage.setItem('razdwa_unread_chats', JSON.stringify(currentSaved));
                  }
                  setHasUnread(true);
                }
              }
            }
          )
          .subscribe();

        const interval = setInterval(checkStorage, 500);
        return () => clearInterval(interval);

      } catch (err) {
        console.error('Błąd globalnego nasłuchu:', err);
      }
    };

    initGlobalListener();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return (
    <nav className="bg-white border-t border-gray-100 fixed bottom-0 w-full max-w-md z-50 px-2 py-2">
      <div className="flex items-center justify-around">
        
        <Link href="/" className={`flex flex-col items-center p-1.5 transition-colors ${pathname === '/' ? 'text-razdwa-purple font-semibold' : 'text-gray-400 hover:text-razdwa-dark'}`}>
          <Home size={22} />
          <span className="text-[10px] mt-1 font-medium">Główna</span>
        </Link>

        <Link href="/orders" className={`flex flex-col items-center p-1.5 transition-colors ${pathname === '/orders' ? 'text-razdwa-purple font-semibold' : 'text-gray-400 hover:text-razdwa-dark'}`}>
          <Search size={22} />
          <span className="text-[10px] mt-1 font-medium">Szukaj</span>
        </Link>

        <Link href="/create" className="flex flex-col items-center p-1.5 -mt-5">
          <div className="bg-razdwa-purple text-white p-2.5 rounded-full shadow-lg shadow-purple-200 transform hover:scale-105 transition-transform">
            <PlusCircle size={26} />
          </div>
        </Link>

        <Link href="/chats" className={`relative flex flex-col items-center p-1.5 transition-colors ${pathname.startsWith('/chats') ? 'text-razdwa-purple font-semibold' : 'text-gray-400 hover:text-razdwa-dark'}`}>
          <div className="relative">
            <MessageSquare size={22} />
            {hasUnread && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
            )}
          </div>
          <span className="text-[10px] mt-1 font-medium">Czat</span>
        </Link>

        <Link href="/profile" className={`flex flex-col items-center p-1.5 transition-colors ${pathname === '/profile' ? 'text-razdwa-purple font-semibold' : 'text-gray-400 hover:text-razdwa-dark'}`}>
          <User size={22} />
          <span className="text-[10px] mt-1 font-medium">Profil</span>
        </Link>
        
      </div>
    </nav>
  );
};