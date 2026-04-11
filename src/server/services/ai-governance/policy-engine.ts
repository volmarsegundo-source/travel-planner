import "server-only";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PolicyContext {
  phase: string; // "plan" | "checklist" | "guide"
  userId: string;
  /** Resolved provider for this request — optional; enables per-provider budget checks. */
  provider?: "anthropic" | "gemini";
}

export interface PolicyResult {
  allowed: boolean;
  blockedBy?: string;
  reason?: string;
}

export interface AiPolicy {
  name: string;
  evaluate(ctx: PolicyContext): Promise<PolicyResult>;
}

// ─── Engine ─────────────────────────────────────────────────────────────────

export class PolicyEngine {
  private static policies: AiPolicy[] = [];

  static register(policy: AiPolicy): void {
    this.policies.push(policy);
  }

  static async evaluate(ctx: PolicyContext): Promise<PolicyResult> {
    for (const policy of this.policies) {
      const result = await policy.evaluate(ctx);
      if (!result.allowed) return result;
    }
    return { allowed: true };
  }

  /** Reset registered policies — used only in tests. */
  static _reset(): void {
    this.policies = [];
  }
}
