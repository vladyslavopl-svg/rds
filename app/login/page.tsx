"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState(''); // Новое поле: Имя и Фамилия
  const [contactInfo, setContactInfo] = useState(''); // Новое поле: Телефон
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      if (isLogin) {
        // --- ВХОД ---
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        setMessage({ text: 'Zalogowano pomyślnie! 🎉', type: 'success' });
        setTimeout(() => router.push('/'), 1000);
        
      } else {
        // --- РЕГИСТРАЦИЯ ---
        if (!fullName.trim() || !contactInfo.trim()) {
          throw new Error('Wypełnij imię, nazwisko oraz numer telefonu.');
        }

        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        // Создаем профиль в таблице profiles с именем и телефоном
        if (data.user) {
          const { error: profileError } = await supabase.from('profiles').upsert([
            { 
              id: data.user.id, 
              full_name: fullName,
              contact_info: contactInfo,
              role: 'provider', 
              points_balance: 10 
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