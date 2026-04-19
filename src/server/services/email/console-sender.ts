import "server-only";
import { logger } from "@/lib/logger";
import type { EmailSender, PasswordResetEmailArgs } from "./email-sender";

/**
 * Fallback email sender for development and test environments.
 *
 * Logs the reset URL at info level so developers can complete the flow
 * without a real SMTP/API provider. Must NEVER be used in production —
 * the factory throws at boot if no real sender is configured.
 */
export class ConsoleEmailSender implements EmailSender {
  async sendPasswordReset(args: PasswordResetEmailArgs): Promise<void> {
    logger.info("auth.email.passwordReset.consoleFallback", {
      to: args.to,
      resetUrl: args.resetUrl,
      locale: args.locale,
    });
  }
}
