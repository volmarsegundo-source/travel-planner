import "server-only";
import type { EmailSender } from "./email-sender";
import { ConsoleEmailSender } from "./console-sender";
import { ResendEmailSender } from "./resend-sender";

const DEFAULT_FROM = "Atlas <noreply@atlas.local>";

/**
 * Resolve the active EmailSender from environment.
 *
 * - RESEND_API_KEY present → ResendEmailSender
 * - Otherwise, NODE_ENV !== "production" → ConsoleEmailSender (dev/test fallback)
 * - Otherwise (prod without key) → throws at boot (fail-loud)
 */
export function getEmailSender(): EmailSender {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || DEFAULT_FROM;

  if (apiKey) {
    return new ResendEmailSender({ apiKey, from });
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Email sender not configured: RESEND_API_KEY is required in production"
    );
  }

  return new ConsoleEmailSender();
}
