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

  const [isLogin, setIsLogin] = useState(!refCode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState(''); 
  const [contactInfo, setContactInfo] = useState(''); 
  
  // Состояния для двухшаговой верификации
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [verificationCode, setVerificationCode] = useState('');

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
        // --- РЕГИСТРАЦИЯ: ШАГ 1 (Запрос кода) ---
        if (!fullName.trim() || !contactInfo.trim()) {
          throw new Error('Wypełnij imię, nazwisko oraz numer telefonu.');
        }

        // Проверка черного списка доменов почты
        const emailDomain = email.split('@')[1]?.toLowerCase();
        if (emailDomain) {
          const { data: blacklisted } = await supabase
            .from('email_blacklist')
            .select('id')
            .eq('domain', emailDomain)
            .maybeSingle();

          if (blacklisted) {
            throw new Error('Rejestracja z tej domeny pocztowej została zablokowana ze względów bezpieczeństwa.');
          }
        }

        // Отправка кода через наш API
        const res = await fetch('/api/send-verification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });

        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || 'Nie udało się wysłać kodu weryfikacyjnego.');

        setStep('verify');
        setMessage({ text: 'Kod weryfikacyjny został wysłany na Twój e-mail! 📨', type: 'success' });
      }
    } catch (error: any) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // --- РЕГИСТРАЦИЯ: ШАГ 2 (Подтверждение кода и создание аккаунта) ---
 const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode.trim()) {
      setMessage({ text: 'Wprowadź kod weryfikacyjny.', type: 'error' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    const cleanEmail = email.trim().toLowerCase();

    try {
      // 1. Проверяем код через наш безопасный API-роут
      const res = await fetch('/api/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, code: verificationCode })
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Nieprawidłowy kod weryfikacyjny.');
      }

      // 2. Создаем аккаунт в Supabase Auth
      const { data, error } = await supabase.auth.signUp({ email: cleanEmail, password });
      if (error) throw error;
      
      if (data.user) {
        let referrerId = null;

        if (refCode) {
          const { data: referrerProfile } = await supabase
            .from('profiles')
            .select('id, points_balance')
            .eq('referral_code', refCode)
            .maybeSingle();

          if (referrerProfile) {
            referrerId = referrerProfile.id;
            const currentBalance = referrerProfile.points_balance || 0;

            await supabase
              .from('profiles')
              .update({ points_balance: currentBalance + 4 })
              .eq('id', referrerId);
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
            invited_by: referrerId,
            is_verified: true
          }
        ]);
        if (profileError) throw profileError;
      }
      
      setMessage({ text: 'Konto zostało pomyślnie utworzone! 🎉', type: 'success' });
      setTimeout(() => router.push('/'), 1000);

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
          {isLogin ? 'Witaj ponownie! 👋' : (step === 'verify' ? 'Potwierdź e-mail ✉️' : 'Dołącz do nas! 🚀')}
        </h1>
        <p className="text-gray-500 text-sm">
          {isLogin ? 'Zaloguj się, aby zarządzać zleceniami' : (step === 'verify' ? `Wpisz kod wysłany na adres ${email}` : 'Stwórz konto i zacznij działać')}
        </p>
        {refCode && !isLogin && step === 'form' && (
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

      {/* ШАГ 2: ВВОД КОДА ВЕРИФИКАЦИИ */}
      {step === 'verify' ? (
        <form className="flex flex-col gap-4" onSubmit={handleVerifyAndRegister}>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-700">Kod weryfikacyjny (6 cyfr)</label>
            <input 
              type="text" 
              placeholder="123456" 
              maxLength={6}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              required
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-center text-xl font-mono tracking-widest text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/25"
            />
          </div>

          <Button fullWidth className="mt-2" disabled={isLoading}>
            {isLoading ? 'Weryfikacja...' : 'Potwierdź i zarejestruj się'}
          </Button>

          <button 
            type="button" 
            onClick={() => setStep('form')}
            className="text-xs text-gray-500 hover:text-gray-800 text-center mt-2"
          >
            ← Wróć do edycji danych
          </button>
        </form>
      ) : (
        /* ШАГ 1: ФОРМА ВХОДА ИЛИ РЕГИСТРАЦИИ */
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
            {isLoading ? 'Przetwarzanie...' : (isLogin ? 'Zaloguj się' : 'Dalej (Wyślij kod)')}
          </Button>
        </form>
      )}

      <div className="mt-8 text-center text-sm text-gray-500">
        {isLogin ? 'Nie masz konta? ' : 'Masz już konto? '}
        <button 
          onClick={() => {
            setIsLogin(!isLogin);
            setStep('form');
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