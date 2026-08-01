import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav"; // <-- Добавили импорт

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
        <div className="max-w-md mx-auto min-h-screen bg-white shadow-xl relative overflow-x-hidden flex flex-col">
          
          <Header />
          
          <div className="flex-1 pb-16"> {/* Добавили отступ pb-16, чтобы контент не прятался под панель */}
            {children}
          </div>

          <BottomNav /> {/* <-- Добавили нижнюю панель */}
          
        </div>
      </body>
    </html>
  );
}