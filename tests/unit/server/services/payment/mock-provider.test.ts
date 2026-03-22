/**
 * Unit tests for MockPaymentProvider.
 *
 * Tests cover:
 * - createIntent: returns valid intent structure
 * - confirmIntent: returns success after simulated delay
 * - verifyWebhookSignature: always returns true
 * - intentId and referenceId uniqueness
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { MockPaymentProvider } from "@/server/services/payment/mock-provider";

describe("MockPaymentProvider", () => {
  const provider = new MockPaymentProvider();

  describe("createIntent", () => {
    it("returns an intent with intentId, clientToken, and pending status", async () => {
      const intent = await provider.createIntent(2990, "BRL");

      expect(intent.intentId).toBeTruthy();
      expect(intent.clientToken).toMatch(/^mock_token_/);
      expect(intent.status).toBe("pending");
    });

    it("returns unique intentIds on consecutive calls", async () => {
      const intent1 = await provider.createIntent(1490, "BRL");
      const intent2 = await provider.createIntent(1490, "BRL");

      expect(intent1.intentId).not.toBe(intent2.intentId);
    });
  });

  describe("confirmIntent", () => {
    it("returns success with a referenceId", async () => {
      const intent = await provider.createIntent(2990, "BRL");
      const confirmation = await provider.confirmIntent(intent.intentId);

      expect(confirmation.success).toBe(true);
      expect(confirmation.status).toBe("confirmed");
      expect(confirmation.referenceId).toBeTruthy();
      expect(confirmation.referenceId).toMatch(/^mock_ref_/);
    });

    it("referenceId contains part of the intentId", async () => {
      const intent = await provider.createIntent(2990, "BRL");
      const confirmation = await provider.confirmIntent(intent.intentId);

      expect(confirmation.referenceId).toContain(intent.intentId.slice(0, 8));
    });
  });

  describe("verifyWebhookSignature", () => {
    it("always returns true for mock provider", async () => {
      const result = await provider.verifyWebhookSignature(
        '{"event": "payment.confirmed"}',
        "fake-signature"
      );

      expect(result).toBe(true);
    });
  });
});
