import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { AdminNav } from "./AdminNav";
import { decideAdminAccess } from "@/lib/auth/rbac";

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

  // Path-aware RBAC delegated to `decideAdminAccess` (B47-MW-PURE-FN,
  // Sprint 46) — the same helper the Edge middleware calls, so the two
  // gates cannot drift. Empty `x-pathname` (header missing) collapses to
  // the back-compat admin-only branch via the helper's path detection.
  const h = await headers();
  const pathname = h.get("x-pathname") ?? "/admin";
  if (decideAdminAccess(pathname, user?.role) === "deny") {
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
