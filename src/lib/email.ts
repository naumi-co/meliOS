import { Resend } from "resend";

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY environment variable is not set");
  }
  return new Resend(apiKey);
}

export async function sendVerificationEmail(email: string, url: string): Promise<void> {
  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
    to: email,
    subject: "Confirma tu cuenta en MeliOS",
    text: `Hola,\n\nConfirma tu cuenta haciendo clic en el siguiente enlace:\n\n${url}\n\nEste enlace expira en 24 horas.\n\nSi no creaste esta cuenta, puedes ignorar este correo.\n\n— El equipo de MeliOS`,
  });

  if (error) {
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
}
