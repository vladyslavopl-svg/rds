import { createClient } from '@supabase/supabase-js';

// Забираем наши секретные ключи из файла .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Создаем и экспортируем "кабель", через который будем делать запросы к базе
export const supabase = createClient(supabaseUrl, supabaseAnonKey);