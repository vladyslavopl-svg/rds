import React from 'react';

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 text-slate-800">
      <h1 className="text-3xl font-bold mb-8">Regulamin Serwisu RazDwaSzybko.pl</h1>
      
      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-2">1. Postanowienia ogólne</h2>
          <p>Administratorem serwisu jest Vladyslav Oliinyk, prowadzący działalność nierejestrowaną, z siedzibą pod adresem: Bolesława Krzywoustego 14, 70-250 Szczecin.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">2. Usługi i opłaty</h2>
          <p>Serwis umożliwia specjalistom zakup wirtualnych punktów oraz subskrypcji konta PRO w celu pozyskiwania zleceń. Wszystkie płatności są realizowane za pośrednictwem bezpiecznej bramki płatniczej Stripe.</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Konto PRO odnawia się automatycznie co miesiąc. Użytkownik może anulować subskrypcję w dowolnym momencie w panelu użytkownika.</li>
            <li>Zakupione punkty służą wyłącznie do korzystania z funkcji platformy i nie podlegają wymianie na gotówkę.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">3. Prawa i obowiązki użytkownika</h2>
          <p>Użytkownik zobowiązuje się do podawania prawdziwych informacji w swoim profilu oraz korzystania z serwisu zgodnie z obowiązującym prawem. Administracja serwisu zastrzega sobie prawo do blokowania kont naruszających regulamin.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">4. Odpowiedzialność</h2>
          <p>RazDwaSzybko.pl pełni rolę pośrednika (platformy ogłoszeniowej) i nie ponosi odpowiedzialności za jakość usług świadczonych przez wykonawców na rzecz klientów.</p>
        </section>
      </div>
    </div>
  );
}
