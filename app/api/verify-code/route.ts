import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = String(code).trim();

    console.log("--- DEBUG WERYFIKACJI ---");
    console.log("Szukany e-mail:", cleanEmail);
    console.log("Wpisany kod:", cleanCode);

    // Ищем код через админский клиент
    const { data: verifData, error: verifError } = await supabaseAdmin
      .from('email_verifications')
      .select('*')
      .eq('email', cleanEmail)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (verifError) {
      console.error("Błąd bazy danych:", verifError);
      return NextResponse.json({ error: 'Błąd bazy danych.' }, { status: 400 });
    }

    if (!verifData) {
      console.log("Wynik: Nie znaleziono kodu dla tego e-maila.");
      return NextResponse.json({ error: 'Nie znaleziono kodu dla tego adresu e-mail.' }, { status: 400 });
    }

    console.log("Znaleziono w bazie:", verifData);

    const dbCode = String(verifData.code).trim();
    if (dbCode !== cleanCode) {
      console.log(`Błąd: Kod z bazy [${dbCode}] nie pasuje do wpisanego [${cleanCode}]`);
      return NextResponse.json({ error: `Nieprawidłowy kod weryfikacyjny. (Wpisano: ${cleanCode})` }, { status: 400 });
    }

    if (new Date(verifData.expires_at) < new Date()) {
      console.log("Błąd: Kod wygasł.");
      return NextResponse.json({ error: 'Kod weryfikacyjny wygasł.' }, { status: 400 });
    }

    // Удаляем использованный код
    await supabaseAdmin.from('email_verifications').delete().eq('email', cleanEmail);
    console.log("Sukces! Kod zweryfikowany i usunięty.");

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Krytyczny błąd API:", err);
    return NextResponse.json({ error: 'Wystąpił błąd serwera.' }, { status: 500 });
  }
}