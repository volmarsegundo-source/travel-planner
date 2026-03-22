import "server-only";

// ─── Mock Payment Provider ──────────────────────────────────────────────────
//
// Simulates a payment gateway for development and testing.
// All intents succeed after a 200ms simulated delay.

import { createId } from "@paralleldrive/cuid2";
import type {
  PaymentProvider,
  PaymentIntent,
  PaymentConfirmation,
} from "./payment-provider.interface";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MockPaymentProvider implements PaymentProvider {
  async createIntent(
    _amountCents: number,
    _currency: string,
    _metadata?: Record<string, string>
  ): Promise<PaymentIntent> {
    return {
      intentId: createId(),
      clientToken: "mock_token_" + createId(),
      status: "pending",
    };
  }

  async confirmIntent(intentId: string): Promise<PaymentConfirmation> {
    await delay(200);

    return {
      success: true,
      referenceId: "mock_ref_" + intentId.slice(0, 8) + "_" + createId(),
      status: "confirmed",
    };
  }

  async verifyWebhookSignature(
    _payload: string,
    _signature: string
  ): Promise<boolean> {
    // Mock provider always considers webhooks valid
    return true;
  }
}
