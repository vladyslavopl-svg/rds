import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";

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
            <main className="flex-1 w-full px-4 sm:px-6 md:px-8 pt-20 pb-28 transition-all duration-300">
              {children}
            </main>

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