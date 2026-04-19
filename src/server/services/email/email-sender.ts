import "server-only";

export type EmailLocale = "en" | "pt-BR";

export interface PasswordResetEmailArgs {
  to: string;
  resetUrl: string;
  locale: EmailLocale;
}

export interface EmailSender {
  sendPasswordReset(args: PasswordResetEmailArgs): Promise<void>;
}
