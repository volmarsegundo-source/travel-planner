import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { AdminDashboardService } from "@/server/services/admin-dashboard.service";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
