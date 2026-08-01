"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation'; // <-- Добавили для перехода между страницами
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter(); // <-- Инициализируем роутер
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
        // Ждем 1 секунду, чтобы пользователь увидел сообщение, и перебрасываем на главную
        setTimeout(() => router.push('/'), 1000);
        
      } else {
        // --- РЕГИСТРАЦИЯ ---
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        // Как только аккаунт создан, делаем запись в таблицу profiles
        if (data.user) {
          const { error: profileError } = await supabase.from('profiles').insert([
            { 
              id: data.user.id, 
              role: 'provider', // Делаем его исполнителем по умолчанию
              points_balance: 10 // Начисляем 10 бонусов за регистрацию
            }
          ]);
          if (profileError) console.error('Błąd tworzenia profilu:', profileError);
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
    <div className="p-6 flex flex-col justify-center min-h-[75vh]">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-razdwa-dark mb-2">
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

      <form className="flex flex-col" onSubmit={handleAuth}>
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
          className="text-razdwa-purple font-semibold hover:underline"
          type="button"
        >
          {isLogin ? 'Zarejestruj się' : 'Zaloguj się'}
        </button>
      </div>
    </div>
  );
}