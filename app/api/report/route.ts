import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_KEY);

export async function POST(req: Request) {
  try {
    const { reportedUserId, reporterId, reason, userRole } = await req.json();

    if (!reportedUserId || !reason) {
      return NextResponse.json({ error: 'Brak wymaganych danych zgłoszenia.' }, { status: 400 });
    }

    // Отправляем письмо на почту поддержки/админа
    await resend.emails.send({
      from: 'RazDwaSzybko Zgłoszenia <support@razdwaszybko.pl>',
      to: 'support@razdwaszybko.pl', // Почта, куда будут падать жалобы
      subject: `Nowa skarga na ${userRole === 'provider' ? 'wykonawcę' : 'zleceniodawcę'}! ⚠️`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #111827; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626; margin-bottom: 12px;">Nowe zgłoszenie naruszenia 🚨</h2>
          <p style="font-size: 14px; color: #374151;">
            Wpłynęła nowa skarga na użytkownika o ID:
          </p>
          <div style="background: #f3f4f6; padding: 10px; font-family: monospace; font-weight: bold; border-radius: 6px; margin-bottom: 15px;">
            ${reportedUserId}
          </div>
          <p style="font-size: 14px; color: #374151;">
            <strong>Typ użytkownika:</strong> ${userRole === 'provider' ? 'Wykonawca' : 'Zleceniodawca'}
          </p>
          <p style="font-size: 14px; color: #374151;">
            <strong>Kto zgłaszał (ID):</strong> ${reporterId || 'Nieznany (Gość)'}
          </p>
          <p style="font-size: 14px; color: #374151;"><strong>Treść zgłoszenia:</strong></p>
          <div style="background: #f9fafb; border-left: 4px solid #dc2626; padding: 12px; font-style: italic; color: #4b5563; border-radius: 4px;">
            "${reason}"
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Błąd wysyłania skargi:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}