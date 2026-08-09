import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[70vh] text-center max-w-md mx-auto">
      <h1 className="text-6xl font-black text-violet-600 mb-2">404</h1>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Strona nie została znaleziona</h2>
      <p className="text-sm text-gray-500 mb-6">
        Wygląda na to, że szukana strona nie istnieje lub została usunięta.
      </p>
      <Link href="/" className="w-full">
        <Button fullWidth>Wróć na stronę główną</Button>
      </Link>
    </div>
  );
}