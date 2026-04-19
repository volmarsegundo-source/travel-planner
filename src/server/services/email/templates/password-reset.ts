import "server-only";
import type { EmailLocale } from "../email-sender";

interface RenderArgs {
  resetUrl: string;
  locale: EmailLocale | string;
}

interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

const TEMPLATES: Record<
  "en" | "pt-BR",
  (url: string) => RenderedEmail
> = {
  en: (url) => ({
    subject: "Reset your Atlas password",
    text: [
      "Hello,",
      "",
      "We received a request to reset the password for your Atlas account.",
      "Click the link below within the next hour to choose a new password:",
      "",
      url,
      "",
      "If you did not request a password reset, you can safely ignore this email.",
      "",
      "— Atlas",
    ].join("\n"),
    html: `<!doctype html><html><body style="font-family:system-ui,sans-serif;color:#1a1a1a;line-height:1.5;">
<p>Hello,</p>
<p>We received a request to reset the password for your Atlas account.</p>
<p>Click the link below within the next hour to choose a new password:</p>
<p><a href="${url}" style="color:#0a66c2">${url}</a></p>
<p>If you did not request a password reset, you can safely ignore this email.</p>
<p>— Atlas</p>
</body></html>`,
  }),
  "pt-BR": (url) => ({
    subject: "Redefina sua senha do Atlas",
    text: [
      "Olá,",
      "",
      "Recebemos um pedido para redefinir a senha da sua conta Atlas.",
      "Clique no link abaixo na próxima hora para escolher uma nova senha:",
      "",
      url,
      "",
      "Se você nao solicitou a redefinição de senha, pode ignorar este email com segurança.",
      "",
      "— Atlas",
    ].join("\n"),
    html: `<!doctype html><html><body style="font-family:system-ui,sans-serif;color:#1a1a1a;line-height:1.5;">
<p>Olá,</p>
<p>Recebemos um pedido para redefinir a senha da sua conta Atlas.</p>
<p>Clique no link abaixo na próxima hora para escolher uma nova senha:</p>
<p><a href="${url}" style="color:#0a66c2">${url}</a></p>
<p>Se você nao solicitou a redefinição de senha, pode ignorar este email com segurança.</p>
<p>— Atlas</p>
</body></html>`,
  }),
};

export function renderPasswordResetEmail(args: RenderArgs): RenderedEmail {
  const locale: "en" | "pt-BR" =
    args.locale === "pt-BR" ? "pt-BR" : "en";
  return TEMPLATES[locale](args.resetUrl);
}
