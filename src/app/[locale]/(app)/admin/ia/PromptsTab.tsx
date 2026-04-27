"use client";

/**
 * PromptsTab — Wave 2 list-and-edit UI for /admin/ia ?tab=prompts.
 *
 * Two views in one component:
 *   - List view: paginated GET /api/admin/ai/prompts with status filter.
 *   - Editor view: opens for "New" or for an existing template id.
 *
 * The editor renders the canonical placeholder extractor (highlighting
 * each `{name}` token) and a live token-count via the B-W2-005 helper.
 * Inline validation feedback surfaces V-01..V-08 + W-01..W-04 codes
 * coming back from the API.
 *
 * SPEC-ARCH-AI-GOVERNANCE-V2 §5.1; SPEC-AI-GOVERNANCE-V2 §3, §7.
 *
 * B-W2-006 — Sprint 46 Wave 2 task 6/9.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { PromptEditor } from "./PromptEditor";

interface PromptRow {
  id: string;
  slug: string;
  status: string;
  modelType: string;
  activeVersionTag: string | null;
  versionsCount: number;
  updatedAt: string;
}

interface ListResponse {
  data: PromptRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

type View = { kind: "list" } | { kind: "new" } | { kind: "edit"; row: PromptRow };

export function PromptsTab() {
  const t = useTranslations("admin.ia.prompts");
  const [view, setView] = useState<View>({ kind: "list" });
  const [rows, setRows] = useState<PromptRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"" | "draft" | "active" | "archived">("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (statusFilter) qs.set("status", statusFilter);
      const res = await fetch(`/api/admin/ai/prompts?${qs.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) {
        setError(`${res.status}`);
        setRows([]);
        return;
      }
      const json = (await res.json()) as ListResponse;
      setRows(json.data);
    } catch (e) {
      setError((e as Error).message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (view.kind === "list") void load();
  }, [view, load]);

  const onSaved = useCallback(() => {
    setView({ kind: "list" });
  }, []);

  if (view.kind === "new") {
    return (
      <PromptEditor
        mode="create"
        onCancel={() => setView({ kind: "list" })}
        onSaved={onSaved}
      />
    );
  }

  if (view.kind === "edit") {
    return (
      <PromptEditor
        mode="update"
        templateId={view.row.id}
        initialSlug={view.row.slug}
        initialModelType={
          (view.row.modelType as "guide" | "plan" | "checklist") ?? "guide"
        }
        onCancel={() => setView({ kind: "list" })}
        onSaved={onSaved}
      />
    );
  }

  return (
    <div data-testid="admin-ia-prompts-tab" className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t("listTitle")}</h3>
        <button
          type="button"
          className="inline-flex min-h-[44px] items-center rounded-atlas-md bg-atlas-primary px-4 py-2 text-sm font-bold text-atlas-on-primary hover:bg-atlas-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring"
          onClick={() => setView({ kind: "new" })}
          aria-label={t("createNewAria")}
          data-testid="admin-ia-prompts-create"
        >
          {t("createNew")}
        </button>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <span>{t("filterStatus")}:</span>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as typeof statusFilter)
          }
          className="rounded-atlas-md border border-atlas-outline-variant px-2 py-1 text-sm"
          aria-label={t("filterStatus")}
          data-testid="admin-ia-prompts-status-filter"
        >
          <option value="">{t("filterAll")}</option>
          <option value="draft">{t("statusDraft")}</option>
          <option value="active">{t("statusActive")}</option>
          <option value="archived">{t("statusArchived")}</option>
        </select>
      </label>

      {loading && <p className="text-sm text-muted-foreground">{t("loading")}</p>}
      {error && (
        <p className="text-sm text-atlas-error" role="alert">
          {t("loadError")}: {error}
        </p>
      )}
      {rows && rows.length === 0 && !loading && (
        <p className="text-sm text-atlas-on-surface-variant">
          {t("emptyList")}
        </p>
      )}
      {rows && rows.length > 0 && (
        <table className="w-full border-collapse text-sm" data-testid="admin-ia-prompts-table">
          <thead>
            <tr className="border-b border-atlas-outline-variant/20 text-left">
              <th className="py-2 pr-3 font-bold">{t("colSlug")}</th>
              <th className="py-2 pr-3 font-bold">{t("colStatus")}</th>
              <th className="py-2 pr-3 font-bold">{t("colModel")}</th>
              <th className="py-2 pr-3 font-bold">{t("colVersion")}</th>
              <th className="py-2 pr-3 font-bold">{t("colVersions")}</th>
              <th className="py-2 pr-3 font-bold">{t("colUpdated")}</th>
              <th className="py-2 font-bold">{t("colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-b border-atlas-outline-variant/10"
              >
                <td className="py-2 pr-3 font-mono">{r.slug}</td>
                <td className="py-2 pr-3">{r.status}</td>
                <td className="py-2 pr-3">{r.modelType}</td>
                <td className="py-2 pr-3">{r.activeVersionTag ?? "—"}</td>
                <td className="py-2 pr-3">{r.versionsCount}</td>
                <td className="py-2 pr-3 text-atlas-on-surface-variant">
                  {new Date(r.updatedAt).toISOString().slice(0, 10)}
                </td>
                <td className="py-2">
                  <button
                    type="button"
                    className="text-atlas-primary underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring"
                    onClick={() => setView({ kind: "edit", row: r })}
                    aria-label={t("editAria", { slug: r.slug })}
                    data-testid={`admin-ia-prompts-edit-${r.slug}`}
                  >
                    {t("edit")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
