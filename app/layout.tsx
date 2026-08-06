import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import Link from "next/link"; // Импортируем Link для быстрой навигации

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "RazDwaSzybko - Zlecenia i fachowcy",
  description: "Platforma freelance dla rynku Polski",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body className={`${inter.className} bg-razdwa-gray text-razdwa-dark antialiased`}>
        
        {/* Внешний фон и центрирование для больших экранов */}
        <div className="flex justify-center min-h-[100dvh] w-full">
          
          {/* Главный контейнер (App Shell). Плавно меняет ширину */}
          <div className="app-container flex flex-col w-full min-h-screen bg-white relative">
            
            {/* Обертка для шапки */}
            <div className="header-wrapper z-50">
              <Header />
            </div>
            
            {/* Основной контент */}
            <main className="flex-1 w-full px-4 sm:px-6 md:px-8 pt-20 transition-all duration-300">
              {children}
            </main>

            {/* Футер с юридическими ссылками (Обязательно для Stripe) */}
            <footer className="w-full px-4 py-8 pb-28 border-t border-gray-100 bg-white">
              <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-gray-500">
                <Link href="/terms" className="hover:text-razdwa-dark transition-colors">
                  Regulamin
                </Link>
                <Link href="/privacy" className="hover:text-razdwa-dark transition-colors">
                  Polityka Prywatności
                </Link>
                <Link href="/refunds" className="hover:text-razdwa-dark transition-colors">
                  Zwroty i Reklamacje
                </Link>
                <Link href="/contact" className="hover:text-razdwa-dark transition-colors">
                  Kontakt
                </Link>
              </div>
              <div className="text-center mt-6 text-xs text-gray-400">
                &copy; {new Date().getFullYear()} RazDwaSzybko.pl. Wszelkie prawa zastrzeżone.
              </div>
            </footer>

            {/* Обертка для нижней панели */}
            <div className="bottom-nav-wrapper z-50">
              <BottomNav />
            </div>
            
          </div>
        </div>

      </body>
    </html>
  );
}