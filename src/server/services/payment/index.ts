import "server-only";

// ─── Payment Provider Factory ───────────────────────────────────────────────

import type { PaymentProvider } from "./payment-provider.interface";
import { MockPaymentProvider } from "./mock-provider";

export type { PaymentProvider };
export type { PaymentIntent, PaymentConfirmation } from "./payment-provider.interface";

/**
 * Returns the active payment provider.
 * Currently always returns the MockPaymentProvider.
 * When a real provider is integrated, this factory will switch based on env config.
 */
export function getPaymentProvider(): PaymentProvider {
  // Future: check process.env.PAYMENT_PROVIDER to return Stripe/MercadoPago/etc.
  return new MockPaymentProvider();
}
