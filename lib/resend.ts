import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_KEY);

// Отправка письма клиенту о новом отклике
export async function sendOfferNotificationEmail(clientEmail: string, orderTitle: string, providerName: string) {
  try {
    await resend.emails.send({
      from: 'RazDwaSzybko <onboarding@resend.dev>', // Позже заменишь на свой верифицированный домен
      to: clientEmail,
      subject: `Nowa oferta do Twojego zlecenia: "${orderTitle}"`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #6d28d9;">Masz nowy odклики!</h2>
          <p>Wykonawca <strong>${providerName}</strong> złożył ofertę do Twojego ogłoszenia: <strong>${orderTitle}</strong>.</p>
          <p>Zaloguj się na platformę, aby przejrzeć szczegóły i wybrać najlepszego specjalistę.</p>
          <a href="https://www.razdwaszybko.pl/profile" style="display: inline-block; background-color: #6d28d9; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 8px; margin-top: 15px;">Przejdź do platformy</a>
        </div>
      `,
    });
  } catch (error) {
    console.error('Błąd wysyłania emaila o ofercie:', error);
  }
}

// Отправка письма исполнителю, когда его выбрали
export async function sendSelectedProviderEmail(providerEmail: string, orderTitle: string) {
  try {
    await resend.emails.send({
      from: 'RazDwaSzybko <onboarding@resend.dev>',
      to: providerEmail,
      subject: `Gratulacje! Wybrano Cię do zlecenia: "${orderTitle}"`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #16a34a;">Wybrano Twoją ofertę! 🎉</h2>
          <p>Klient zaakceptował Twoje zgłoszenie do zlecenia: <strong>${orderTitle}</strong>.</p>
          <p>Możesz teraz skontaktować się z klientem bezpośrednio przez czat lub telefon.</p>
          <a href="https://www.razdwaszybko.pl/profile" style="display: inline-block; background-color: #16a34a; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 8px; margin-top: 15px;">Otwórz zlecenie</a>
        </div>
      `,
    });
  } catch (error) {
    console.error('Błąd wysyłania emaila o wyborze wykonawcy:', error);
  }
}