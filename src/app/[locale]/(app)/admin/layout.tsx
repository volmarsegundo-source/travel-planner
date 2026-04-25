import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { AdminNav } from "./AdminNav";
import { hasAiGovernanceAccess } from "@/lib/auth/rbac";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Double guard: middleware also checks, but layout is authoritative
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  // Check admin role from database
  const { db } = await import("@/server/db");
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  // B-W1-006 (Sprint 46 Day 3): path-aware RBAC mirrors the middleware's
  // SPEC §7.7 model — `/admin/ia` allows admin | admin-ai | admin-ai-approver;
  // other `/admin/*` paths stay admin-only (back-compat). Defense-in-depth
  // alongside the middleware check.
  const h = await headers();
  const pathname = h.get("x-pathname") ?? "";
  const isAiAdminRoute = pathname.includes("/admin/ia");
  const allowed = isAiAdminRoute
    ? hasAiGovernanceAccess(user?.role)
    : user?.role === "admin";

  if (!allowed) {
    redirect("/expeditions");
  }

  const t = await getTranslations("admin.dashboard");

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </header>
      <AdminNav />
      {children}
    </div>
  );
}
