import "server-only";
import { logger } from "@/lib/logger";
import type { EmailSender, PasswordResetEmailArgs } from "./email-sender";
import { renderPasswordResetEmail } from "./templates/password-reset";

interface ResendOptions {
  apiKey: string;
  from: string;
}

const RESEND_URL = "https://api.resend.com/emails";

/**
 * Production email sender backed by Resend's HTTP API.
 *
 * Does not swallow the request's context — failures are logged at error level
 * with a structured payload. NEVER throws to the caller: the
 * forgot-password flow must preserve anti-enumeration behaviour regardless
 * of transient delivery failures.
 */
export class ResendEmailSender implements EmailSender {
  constructor(private readonly opts: ResendOptions) {}

  async sendPasswordReset(args: PasswordResetEmailArgs): Promise<void> {
    const { subject, text, html } = renderPasswordResetEmail({
      resetUrl: args.resetUrl,
      locale: args.locale,
    });

    try {
      const res = await fetch(RESEND_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.opts.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: this.opts.from,
          to: [args.to],
          subject,
          text,
          html,
        }),
      });

      if (!res.ok) {
        logger.error("auth.email.sendFailed", {
          status: res.status,
          provider: "resend",
        });
      }
    } catch (err) {
      logger.error("auth.email.sendFailed", {
        provider: "resend",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
