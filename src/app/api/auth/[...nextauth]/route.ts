import { handlers } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

const { GET, POST: NextAuthPOST } = handlers;

// Rate-limit the credentials sign-in endpoint (Node.js runtime — ioredis safe here).
// BC-004: moved from auth.ts to avoid pulling ioredis into the Edge middleware bundle.
async function POST(req: NextRequest) {
  if (req.nextUrl.pathname.endsWith("/callback/credentials")) {
    const headersList = await headers();
    const ip =
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headersList.get("x-real-ip") ??
      "unknown";
    const rl = await checkRateLimit(`login:${ip}`, 30, 900);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "errors.rateLimitExceeded" },
        { status: 429 }
      );
    }
  }
  return NextAuthPOST(req);
}

export { GET, POST };
