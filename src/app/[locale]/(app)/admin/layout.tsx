import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

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

  if (user?.role !== "admin") {
    redirect("/expeditions");
  }

  const t = await getTranslations("admin.dashboard");

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </header>
      {children}
    </div>
  );
}
