import React from 'react';

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 text-slate-800">
      <h1 className="text-3xl font-bold mb-8">Polityka Prywatności</h1>
      
      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-2">1. Administrator danych</h2>
          <p>Administratorem Twoich danych osobowych jest [Twoje Imię i Nazwisko], prowadzący działalność nierejestrowaną z siedzibą w [Twój Adres]. Kontakt z administratorem: support@razdwaszybko.pl.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">2. Cel zbierania danych</h2>
          <p>Twoje dane (np. adres e-mail, imię, numer telefonu) są zbierane wyłącznie w celu świadczenia usług w ramach platformy RazDwaSzybko.pl, obsługi konta użytkownika oraz komunikacji.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">3. Płatności i dane finansowe</h2>
          <p>Nie przechowujemy danych Twoich kart płatniczych. Wszystkie transakcje są przetwarzane i zabezpieczane przez zewnętrznego operatora płatności – firmę Stripe.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">4. Prawa użytkownika (RODO)</h2>
          <p>Masz prawo dostępu do swoich danych, ich sprostowania, usunięcia ("prawo do bycia zapomnianym") lub ograniczenia przetwarzania. W tym celu skontaktuj się z nami mailowo.</p>
        </section>
      </div>
    </div>
  );
}
