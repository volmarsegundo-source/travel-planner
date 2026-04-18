import { handlers } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { hashUserId } from "@/lib/hash";
import { logger } from "@/lib/logger";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

const { GET, POST: NextAuthPOST } = handlers;

/** Maximum login attempts per IP within the rate limit window. */
const LOGIN_RATE_LIMIT = 5;
/** Rate limit window in seconds (15 minutes). */
const LOGIN_WINDOW_SECONDS = 900;

// Rate-limit the credentials sign-in endpoint (Node.js runtime — ioredis safe here).
// BC-004: moved from auth.ts to avoid pulling ioredis into the Edge middleware bundle.
// A7: tightened from 30 to 5 attempts per 15 min to prevent slow brute force.
async function POST(req: NextRequest) {
  if (req.nextUrl.pathname.endsWith("/callback/credentials")) {
    const headersList = await headers();
    const ip =
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headersList.get("x-real-ip") ??
      "unknown";
    const rl = await checkRateLimit(`login:${ip}`, LOGIN_RATE_LIMIT, LOGIN_WINDOW_SECONDS);
    if (!rl.allowed) {
      logger.warn("auth.login.rateLimitExceeded", {
        ipHash: hashUserId(ip),
        remaining: rl.remaining,
      });
      return NextResponse.json(
        { error: "errors.rateLimitExceeded" },
        { status: 429 }
      );
    }
  }
  return NextAuthPOST(req);
}

export { GET, POST };
