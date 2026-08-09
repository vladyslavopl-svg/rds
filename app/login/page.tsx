"use client";

export const dynamic = 'force-dynamic';

import React, { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const refCode = searchParams.get('ref');

  // Если есть реферальный код в URL, сразу открываем форму регистрации (isLogin = false)
  const [isLogin, setIsLogin] = useState(!refCode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState(''); 
  const [contactInfo, setContactInfo] = useState(''); 
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null);

  useEffect(() => {
    if (refCode) {
      setIsLogin(false);
    }
  }, [refCode]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      if (isLogin) {
        // --- ВХОД ---
        const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
        
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('Błędny adres e-mail lub nieprawidłowe hasło. Sprawdź wpisane dane lub zarejestruj się.');
          }
          throw error;
        }
        
        if (authData.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_banned, ban_reason')
            .eq('id', authData.user.id)
            .maybeSingle();

          if (profile?.is_banned) {
            await supabase.auth.signOut();
            const reason = profile.ban_reason || 'Brak podanego powodu.';
            throw new Error(`Konto zostało zablokowane. Powód: ${reason}. W celu wyjaśnienia sytuacji prosimy o kontakt ze wsparciem: support@razdwaszybko.pl`);
          }
        }

        setMessage({ text: 'Zalogowano pomyślnie! 🎉', type: 'success' });
        setTimeout(() => router.push('/'), 1000);
        
      } else {
        // --- РЕГИСТРАЦИЯ ---
        if (!fullName.trim() || !contactInfo.trim()) {
          throw new Error('Wypełnij imię, nazwisko oraz numer telefonu.');
        }

        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        if (data.user) {
          let referrerId = null;

          if (refCode) {
            console.log('Szukam polecającego z kodem:', refCode);
            
            const { data: referrerProfile, error: refErr } = await supabase
              .from('profiles')
              .select('id, points_balance')
              .eq('referral_code', refCode)
              .maybeSingle();

            if (referrerProfile) {
              referrerId = referrerProfile.id;
              const currentBalance = referrerProfile.points_balance || 0;

              const { error: updateErr } = await supabase
                .from('profiles')
                .update({ points_balance: currentBalance + 4 })
                .eq('id', referrerId);

              if (updateErr) {
                console.error('Błąd aktualizacji punktów polecającego:', updateErr);
              } else {
                console.log('Pomyślnie dodano 4 punkty polecającemu!');
              }
            } else {
              console.warn('Nie znaleziono profilu z takim kodem polecenia.');
            }
          }

          const myReferralCode = data.user.id.replace(/-/g, '').substring(0, 8);

          const { error: profileError } = await supabase.from('profiles').upsert([
            { 
              id: data.user.id, 
              full_name: fullName,
              contact_info: contactInfo,
              role: 'provider', 
              points_balance: 10,
              referral_code: myReferralCode,
              invited_by: referrerId
            }
          ]);
          if (profileError) throw profileError;
        }
        
        setMessage({ text: 'Konto zostało pomyślnie utworzone! 🎉', type: 'success' });
        setTimeout(() => router.push('/'), 1000);
      }
    } catch (error: any) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 flex flex-col justify-center min-h-[75vh] max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {isLogin ? 'Witaj ponownie! 👋' : 'Dołącz do nas! 🚀'}
        </h1>
        <p className="text-gray-500 text-sm">
          {isLogin ? 'Zaloguj się, aby zarządzać zleceniami' : 'Stwórz konto i zacznij działać'}
        </p>
        {refCode && !isLogin && (
          <div className="mt-2 text-xs bg-violet-50 text-violet-700 p-2 rounded-lg font-medium">
            Rejestrujesz się z polecenia znajomego! ✨
          </div>
        )}
      </div>

      {message && (
        <div className={`p-3 mb-4 rounded-xl text-sm font-medium text-center ${
          message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
        }`}>
          {message.text}
        </div>
      )}

      <form className="flex flex-col gap-3" onSubmit={handleAuth}>
        {!isLogin && (
          <>
            <Input 
              label="Imię i nazwisko" 
              type="text" 
              placeholder="np. Jan Kowalski" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required={!isLogin} 
            />
            <Input 
              label="Numer telefonu" 
              type="text" 
              placeholder="np. +48 123 456 789" 
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              required={!isLogin} 
            />
          </>
        )}

        <Input 
          label="Adres e-mail" 
          type="email" 
          placeholder="np. jan@kowalski.pl" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required 
        />
        <Input 
          label="Hasło" 
          type="password" 
          placeholder="Minimum 6 znaków" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required 
        />

        <Button fullWidth className="mt-4" disabled={isLoading}>
          {isLoading ? 'Przetwarzanie...' : (isLogin ? 'Zaloguj się' : 'Zarejestruj się')}
        </Button>
      </form>

      <div className="mt-8 text-center text-sm text-gray-500">
        {isLogin ? 'Nie masz konta? ' : 'Masz już konto? '}
        <button 
          onClick={() => {
            setIsLogin(!isLogin);
            setMessage(null);
          }}
          className="text-violet-600 font-semibold hover:underline"
          type="button"
        >
          {isLogin ? 'Zarejestruj się' : 'Zaloguj się'}
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="p-6 flex justify-center items-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}