// ─── Payment Provider Interface ─────────────────────────────────────────────

export interface PaymentIntent {
  intentId: string;
  clientToken: string;
  status: "pending" | "confirmed" | "failed";
}

export interface PaymentConfirmation {
  success: boolean;
  referenceId: string;
  status: "confirmed" | "failed";
}

export interface PaymentProvider {
  /**
   * Create a payment intent for a given amount.
   */
  createIntent(
    amountCents: number,
    currency: string,
    metadata?: Record<string, string>
  ): Promise<PaymentIntent>;

  /**
   * Confirm a previously created payment intent.
   */
  confirmIntent(intentId: string): Promise<PaymentConfirmation>;

  /**
   * Verify webhook signature for payment notifications.
   */
  verifyWebhookSignature(
    payload: string,
    signature: string
  ): Promise<boolean>;
}
