"use client";

import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Wallet, LogOut, CheckCircle, X, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export const Header = () => {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [isProvider, setIsProvider] = useState(false);
  const [pointsBalance, setPointsBalance] = useState<number | null>(null);
  const [isPro, setIsPro] = useState(false);
  
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

      const uniqueChannelName = `notifications-${userId}-${crypto.randomUUID()}`;

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

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role, points_balance, is_pro')
        .eq('id', userId)
        .single();

      if (!isMountedRef.current) return;

      if (profileData) {
        setIsProvider(profileData.role === 'provider');
        setPointsBalance(profileData.points_balance);
        setIsPro(profileData.is_pro || false);

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMountedRef.current) return;
        
        setSession(session);

        if (session?.user) {
          initHeader(session.user.id);
        } else {
          await cleanupChannel();
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
    <header className="bg-white/95 backdrop-blur-md border-b border-gray-100/80 fixed top-0 w-full max-w-md z-50 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between px-3 py-3.5">
        
        {/* Logo */}
        <Link href="/" className="relative flex items-center shrink-0">
          <div className="relative w-[170px] h-[44px]">
            <Image
              src="/logo.png"
              alt="RazDwaSzybko"
              fill
              sizes="280px"
              className="object-contain object-left scale-110 origin-left"
              priority
            />
          </div>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-1.5">
          {session ? (
            <>
{isProvider && isPro && (
  <div
    className="
      relative flex items-center gap-1.5
      px-3.5 py-1.5 rounded-full
      bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500
      shadow-[0_2px_8px_rgba(245,158,11,0.45)]
      border border-amber-300/60
      cursor-default
    "
    title="Aktywne konto PRO"
  >
    <Star
      size={12}
      className="fill-white text-white drop-shadow-sm"
    />
    <span className="
      text-[11px] font-black text-white
      tracking-[0.18em] uppercase
      drop-shadow-sm
    ">
      PRO
    </span>
  </div>
)}

              {/* Wallet — обычный провайдер */}
              {isProvider && pointsBalance !== null && !isPro && (
                <Link
                  href="/wallet"
                  className="
                    flex items-center gap-1.5
                    bg-violet-50 px-2.5 py-1.5 rounded-xl
                    border border-violet-100
                    hover:bg-violet-100 hover:border-violet-200
                    transition-colors
                  "
                >
                  <Wallet size={14} className="text-violet-600" />
                  <span className="text-sm font-bold text-violet-700">
                    {pointsBalance}
                    <span className="text-[11px] font-semibold ml-0.5 opacity-80">pkt</span>
                  </span>
                </Link>
              )}

              {/* Wallet — PRO */}
              {isProvider && pointsBalance !== null && isPro && (
                <Link
                  href="/wallet"
                  className="
                    flex items-center gap-1.5
                    bg-violet-50/70 px-2 py-1.5 rounded-xl
                    border border-violet-100/80
                    hover:bg-violet-100 hover:border-violet-200
                    transition-colors
                  "
                  title="Twój portfel"
                >
                  <Wallet size={13} className="text-violet-500" />
                  <span className="text-xs font-semibold text-violet-600">
                    {pointsBalance}
                  </span>
                </Link>
              )}

              {/* Notifications */}
              {isProvider && (
                <div className="relative">
                  <button
                    onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                    className="
                      relative p-2 rounded-xl
                      hover:bg-gray-100
                      transition-colors
                    "
                    title="Powiadomienia"
                  >
                    <Bell
                      size={18}
                      className={notifications.length > 0 ? "text-violet-600" : "text-gray-500"}
                    />
                    {notifications.length > 0 && (
                      <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                        {notifications.length}
                      </span>
                    )}
                  </button>

                  {isNotificationsOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                        <span className="font-bold text-sm text-gray-800">Powiadomienia</span>
                        <button
                          onClick={() => setIsNotificationsOpen(false)}
                          className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      {notifications.length === 0 ? (
                        <div className="py-10 text-center">
                          <p className="text-sm text-gray-400">Brak nowych powiadomień</p>
                        </div>
                      ) : (
                        <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                          {notifications.map((notif) => (
                            <div
                              key={notif.id}
                              onClick={() => handleNotificationClick(notif)}
                              className="
                                px-4 py-3 cursor-pointer
                                hover:bg-violet-50/60
                                transition-colors
                              "
                            >
                              <div className="flex items-start gap-2">
                                <CheckCircle size={15} className="text-emerald-500 mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                  <p className="font-semibold text-[13px] text-gray-900 leading-snug">
                                    {notif.title}
                                  </p>
                                  <p className="text-[12px] text-gray-500 mt-0.5 leading-snug line-clamp-2">
                                    {notif.message}
                                  </p>
                                  <span className="text-[10px] text-gray-400 mt-1.5 block">
                                    {new Date(notif.created_at).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  }</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="
                  p-2 rounded-xl
                  text-gray-400 hover:text-red-500 hover:bg-red-50
                  transition-colors
                "
                title="Wyloguj się"
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="
                text-sm font-semibold text-violet-700
                bg-violet-50 hover:bg-violet-100
                px-3.5 py-2 rounded-xl
                border border-violet-100
                transition-colors
              "
            >
              Zaloguj się
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};