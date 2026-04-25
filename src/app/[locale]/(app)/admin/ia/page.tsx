/**
 * /admin/ia — Central de Governança de IA V2 (Wave 1 skeleton).
 *
 * SPEC-ARCH-AI-GOVERNANCE-V2 §3 Wave 1 deliverable: 4-tab shell with
 * empty states. Wave 2+ wires Prompt CRUD, Modelos config, Outputs
 * curation; Wave 1 ships the container.
 *
 * Gating:
 *   - Server: feature flag AI_GOVERNANCE_V2 OFF → notFound() (404).
 *   - Server: parent layout enforces RBAC (admin | admin-ai | admin-ai-approver
 *     per SPEC §7.7 via path-aware check in src/app/[locale]/(app)/admin/layout.tsx).
 *
 * B-W1-006 — Sprint 46 Day 3.
 */
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { isAiGovernanceV2Enabled } from "@/lib/flags/ai-governance";
import { AdminIaTabs } from "./AdminIaTabs";

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function AdminIaPage({ searchParams }: PageProps) {
  if (!isAiGovernanceV2Enabled()) {
    notFound();
  }

  const { tab } = await searchParams;
  const t = await getTranslations("admin.ia");
  const activeTab = (
    ["dashboard", "prompts", "modelos", "outputs"] as const
  ).includes(tab as never)
    ? (tab as "dashboard" | "prompts" | "modelos" | "outputs")
    : "dashboard";

  return (
    <section
      aria-labelledby="admin-ia-heading"
      className="flex flex-col gap-6"
    >
      <header>
        <h2 id="admin-ia-heading" className="text-xl font-semibold">
          {t("title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>

      <AdminIaTabs activeTab={activeTab} />

      <div role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
        {activeTab === "dashboard" && (
          <EmptyState
            title={t("dashboardEmptyTitle")}
            body={t("dashboardEmptyBody")}
          />
        )}
        {activeTab === "prompts" && (
          <EmptyState
            title={t("promptsEmptyTitle")}
            body={t("promptsEmptyBody")}
          />
        )}
        {activeTab === "modelos" && (
          <EmptyState
            title={t("modelosEmptyTitle")}
            body={t("modelosEmptyBody")}
          />
        )}
        {activeTab === "outputs" && (
          <EmptyState
            title={t("outputsEmptyTitle")}
            body={t("outputsEmptyBody")}
          />
        )}
      </div>
    </section>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div
      className="rounded-md border border-dashed border-atlas-outline-variant/40 p-8 text-center"
      data-testid="admin-ia-empty-state"
    >
      <p className="font-semibold text-atlas-on-surface">{title}</p>
      <p className="mt-2 text-sm text-atlas-on-surface-variant">{body}</p>
    </div>
  );
}
