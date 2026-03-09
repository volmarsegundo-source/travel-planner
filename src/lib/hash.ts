import { createHash } from "crypto";

/**
 * Produces a deterministic, non-reversible hash of a userId for log output.
 * Uses SHA-256 truncated to 12 hex characters.
 *
 * The same userId always produces the same hash, enabling log correlation
 * without exposing the raw identifier.
 *
 * @example hashUserId("clx123abc") => "a1b2c3d4e5f6"
 */
export function hashUserId(userId: string): string {
  return createHash("sha256").update(userId).digest("hex").slice(0, 12);
}
