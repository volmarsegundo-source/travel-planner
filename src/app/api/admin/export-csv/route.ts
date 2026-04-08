import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { AdminDashboardService } from "@/server/services/admin-dashboard.service";
import { checkRateLimit } from "@/lib/rate-limit";

/** Rate limit: 10 requests per minute per user (admin export is expensive) */
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_SECONDS = 60;

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit per authenticated user
  const rl = await checkRateLimit(
    `admin-export:${session.user.id}`,
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_SECONDS
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429 }
    );
  }

  // Verify admin role from database
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const search = url.searchParams.get("search") ?? undefined;
  const sortParam = url.searchParams.get("sort");
  const sort =
    sortParam === "aiCost" || sortParam === "profit" || sortParam === "rank"
      ? sortParam
      : "revenue";

  const csv = await AdminDashboardService.exportUsersCsv(search, sort);

  const now = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="admin-users-${now}.csv"`,
    },
  });
}
