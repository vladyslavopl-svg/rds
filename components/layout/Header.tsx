"use client";

import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Wallet, LogOut, CheckCircle, X, Star } from 'lucide-react'; // Добавили Star
import { supabase } from '@/lib/supabase';

export const Header = () => {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [isProvider, setIsProvider] = useState(false);
  const [pointsBalance, setPointsBalance] = useState<number | null>(null);
  const [isPro, setIsPro] = useState(false); // НОВОЕ: Стейт для статуса PRO
  
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const cleanupChannel = async () => {
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };

    const initHeader = async (userId: string) => {
      await cleanupChannel();

      if (!isMountedRef.current) return;

      const uniqueChannelName = `notifications-${userId}-${Date.now()}`;

      const channel = supabase
        .channel(uniqueChannelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            if (isMountedRef.current) {
              setNotifications((prev) => [payload.new, ...prev]);
            }
          }
        )
        .subscribe();

      channelRef.current = channel;

      // НОВОЕ: Добавили is_pro в запрос к базе данных
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role, points_balance, is_pro')
        .eq('id', userId)
        .single();

      if (!isMountedRef.current) return;

      if (profileData) {
        setIsProvider(profileData.role === 'provider');
        setPointsBalance(profileData.points_balance);
        setIsPro(profileData.is_pro || false); // Сохраняем статус PRO

        if (profileData.role === 'provider') {
          const { data: notifsData } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .eq('is_read', false)
            .order('created_at', { ascending: false });

          if (notifsData && isMountedRef.current) {
            setNotifications(notifsData);
          }
        }
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMountedRef.current) return;
      setSession(session);
      if (session?.user) {
        initHeader(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMountedRef.current) return;
        
        setSession(session);
        await cleanupChannel();

        if (session?.user) {
          initHeader(session.user.id);
        } else {
          setIsProvider(false);
          setPointsBalance(null);
          setIsPro(false);
          setNotifications([]);
        }
      }
    );

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
      cleanupChannel();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleNotificationClick = async (notif: any) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notif.id);

    setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
    setIsNotificationsOpen(false);

    if (notif.order_id) {
      router.push(`/order/${notif.order_id}`);
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-100 fixed top-0 w-full max-w-md z-50">
      <div className="flex items-center justify-between pr-4 pl-2 py-4 relative">
        <Link href="/" className="relative flex items-center group">
          <div className="animate-fade-in-right relative w-[180px] h-[48px]">
            <Image
              src="/logo.png"
              alt="RazDwaSzybko"
              fill
              sizes="300px"
              className="object-contain object-left scale-125 origin-left"
              priority
            />
          </div>
        </Link>

        <div className="flex items-center gap-2 text-razdwa-dark">
          {session ? (
            <>
              {/* НОВОЕ: Плашка PRO, если у пользователя isPro === true */}
              {isProvider && isPro && (
                <div className="flex items-center gap-1 bg-gradient-to-r from-purple-600 to-indigo-600 px-2.5 py-1.5 rounded-lg shadow-sm border border-purple-500 cursor-default" title="Aktywne konto PRO">
                  <Star size={14} className="fill-yellow-400 text-yellow-400" />
                  <span className="text-xs font-bold text-white tracking-wider">PRO</span>
                </div>
              )}

              {/* Кошелек показываем всегда, но если есть PRO - поинты не так важны, хотя баланс пусть будет */}
              {isProvider && pointsBalance !== null && !isPro && (
                <Link 
                  href="/wallet" 
                  className="flex items-center gap-1.5 bg-purple-50 px-2.5 py-1.5 rounded-lg border border-purple-100 hover:bg-purple-100 transition-colors"
                >
                  <Wallet size={15} className="text-razdwa-purple" />
                  <span className="text-sm font-bold text-razdwa-purple">{pointsBalance} pkt</span>
                </Link>
              )}

              {/* Если юзер PRO, кошелек можно сделать менее заметным, чтобы не отвлекал */}
              {isProvider && pointsBalance !== null && isPro && (
                <Link 
                  href="/wallet" 
                  className="flex items-center gap-1.5 bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors"
                  title="Twój portfel"
                >
                  <Wallet size={14} className="text-gray-400" />
                  <span className="text-xs font-semibold text-gray-500">{pointsBalance}</span>
                </Link>
              )}

              {isProvider && (
                <div className="relative">
                  <button 
                    onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors relative"
                    title="Powiadomienia"
                  >
                    <Bell size={15} className={notifications.length > 0 ? "text-razdwa-purple" : "text-gray-600"} />
                    {notifications.length > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {notifications.length}
                      </span>
                    )}
                  </button>

                  {isNotificationsOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 z-50 flex flex-col gap-2">
                      <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                        <span className="font-bold text-xs text-razdwa-dark">Powiadomienia</span>
                        <button onClick={() => setIsNotificationsOpen(false)} className="text-gray-400 hover:text-gray-600">
                          <X size={15} />
                        </button>
                      </div>

                      {notifications.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-4">Brak nowych powiadomień</p>
                      ) : (
                        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                          {notifications.map((notif) => (
                            <div 
                              key={notif.id}
                              onClick={() => handleNotificationClick(notif)}
                              className="bg-purple-50/50 hover:bg-purple-50 border border-purple-100 p-2.5 rounded-xl cursor-pointer transition-colors flex flex-col gap-1"
                            >
                              <p className="font-bold text-xs text-razdwa-dark flex items-center gap-1">
                                <CheckCircle size={12} className="text-green-600" />
                                {notif.title}
                              </p>
                              <p className="text-[11px] text-gray-600 leading-snug">{notif.message}</p>
                              <span className="text-[9px] text-gray-400 mt-0.5">
                                {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <button 
                onClick={handleLogout}
                className="p-2 hover:bg-red-50 text-red-500 rounded-full transition-colors"
                title="Wyloguj się"
              >
                <LogOut size={20} />
              </button>
            </>
          ) : (
            <Link 
              href="/login"
              className="text-sm font-semibold text-razdwa-purple hover:bg-purple-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              Zaloguj się
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};