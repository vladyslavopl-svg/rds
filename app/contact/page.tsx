import React from 'react';

export default function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 text-slate-800">
      <h1 className="text-3xl font-bold mb-8">Kontakt</h1>
      
      <div className="bg-white shadow rounded-lg p-6 border border-gray-100">
        <h2 className="text-xl font-semibold mb-4">Skontaktuj się z nami</h2>
        <p className="mb-6 text-gray-600">Masz pytania dotyczące płatności, działania platformy lub napotkałeś problem? Jesteśmy tu, aby pomóc!</p>
        
        <div className="space-y-4">
          <div>
            <span className="block text-sm text-gray-500 font-medium">E-mail wsparcia:</span>
            <a href="mailto:support@razdwaszybko.pl" className="text-blue-600 hover:underline font-medium text-lg">support@razdwaszybko.pl</a>
          </div>
          
          <div className="pt-4 border-t border-gray-100">
            <h3 className="font-medium text-gray-900 mb-2">Dane kontaktowe:</h3>
            <p className="text-gray-600">
              [Vladyslav Oliinyk]<br />
              Działalność nierejestrowana<br />
              [Bolesława Krzywoustego, 14]<br />
              [70-250, Szczecin]
              [vladyslav.o.pl@gmail.com]
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
