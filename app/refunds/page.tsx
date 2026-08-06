import React from 'react';

export default function RefundsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 text-slate-800">
      <h1 className="text-3xl font-bold mb-8">Polityka Zwrotów i Reklamacji</h1>
      
      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-2">1. Odstąpienie od umowy (14 dni)</h2>
          <p>Zgodnie z prawem konsumenckim w UE, użytkownikowi przysługuje prawo do odstąpienia od umowy w ciągu 14 dni od daty zakupu bez podawania przyczyny.</p>
          <p className="mt-2 font-medium text-red-600">Wyjątek dotyczący treści cyfrowych:</p>
          <p>Prawo do odstąpienia od umowy i zwrotu środków nie przysługuje w przypadku, gdy użytkownik rozpoczął już korzystanie z zakupionych punktów (np. odblokował kontakt do zlecenia) za swoją wyraźną zgodą przed upływem terminu 14 dni.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">2. Subskrypcja konta PRO</h2>
          <p>Subskrypcję konta PRO można anulować w dowolnym momencie w ustawieniach konta. Po anulowaniu subskrypcji, konto PRO pozostaje aktywne do końca opłaconego okresu rozliczeniowego. Nie zwracamy środków za częściowo wykorzystany miesiąc.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">3. Jak złożyć reklamację?</h2>
          <p>Aby złożyć wniosek o zwrot środków lub zgłosić problem z płatnością, skontaktuj się z nami pod adresem: <b>support@razdwaszybko.pl</b>. Reklamacje rozpatrujemy w ciągu 14 dni roboczych.</p>
        </section>
      </div>
    </div>
  );
}
