import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import Link from "next/link";
import Script from "next/script"; // Импортируем компонент Script

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "Zlecenia i Fachowcy",
  description: "Platforma freelance dla rynku Polski",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <head>
        {/* Cookie Consent by TermsFeed */}
        <Script
          id="termsfeed-cookie-consent"
          src="https://www.termsfeed.com/public/cookie-consent/4.2.0/cookie-consent.js"
          strategy="beforeInteractive"
        />
        <Script
          id="termsfeed-cookie-consent-setup"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              document.addEventListener('DOMContentLoaded', function () {
                cookieconsent.run({
                  "notice_banner_type":"simple",
                  "consent_type":"express",
                  "palette":"light",
                  "language":"pl",
                  "page_load_consent_levels":["strictly-necessary"],
                  "notice_banner_reject_button_hide":false,
                  "preferences_center_close_button_hide":false,
                  "page_refresh_confirmation_buttons":false,
                  "website_name":"razdwaszybko.pl",
                  "website_privacy_policy_url":"https://www.razdwaszybko.pl/privacy"
                });
              });
            `,
          }}
        />
      </head>
      <body className={`${inter.className} bg-razdwa-gray text-razdwa-dark antialiased`}>
        
        <div className="flex justify-center min-h-[100dvh] w-full">
          <div className="app-container flex flex-col w-full min-h-screen bg-white relative">
            
            <div className="header-wrapper z-50">
              <Header />
            </div>
            
            <main className="flex-1 w-full px-4 sm:px-6 md:px-8 pt-20 transition-all duration-300">
              {children}
            </main>

            <footer className="w-full px-4 py-8 pb-28 border-t border-gray-100 bg-white">
              <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-gray-500">
                <Link href="/terms" className="hover:text-razdwa-dark transition-colors">Regulamin</Link>
                <Link href="/privacy" className="hover:text-razdwa-dark transition-colors">Polityka Prywatności</Link>
                <Link href="/refunds" className="hover:text-razdwa-dark transition-colors">Zwroty i Reklamacje</Link>
                <Link href="/contact" className="hover:text-razdwa-dark transition-colors">Kontakt</Link>
                {/* Ссылка для изменения настроек куки */}
                <a href="#" id="open_preferences_center" className="hover:text-razdwa-dark transition-colors">
                  Ustawienia cookies
                </a>
              </div>
              <div className="text-center mt-6 text-xs text-gray-400">
                &copy; {new Date().getFullYear()} razdwaszybko.pl. Wszelkie prawa zastrzeżone.
              </div>
            </footer>

            <div className="bottom-nav-wrapper z-50">
              <BottomNav />
            </div>
            
          </div>
        </div>

      </body>
    </html>
  );
}