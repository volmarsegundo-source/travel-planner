"use client";

/**
 * PromptEditor — create / edit form for /admin/ia ?tab=prompts.
 *
 * Renders systemPrompt + userTemplate textareas with:
 *   - Live placeholder extraction (canonical /\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)
 *   - Live token count via the B-W2-005 helper
 *   - Forbidden-placeholder pre-flight tag (V-02 echo, ahead of server gate)
 *   - Inline server-side validationErrors + warnings on submit
 *
 * SPEC-AI-GOVERNANCE-V2 §3, §7.
 *
 * B-W2-006 — Sprint 46 Wave 2 task 6/9.
 */
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { estimateCombinedTokens } from "@/lib/ai/token-count";

const PLACEHOLDER_RE = /\{([a-zA-Z][a-zA-Z0-9_]*)\}/g;
const FORBIDDEN = new Set([
  "userEmail",
  "userId",
  "email",
  "phone",
  "passport",
  "cpf",
  "apiKey",
  "secret",
  "token",
  "anthropicApiKey",
  "googleAiApiKey",
  "internalUrl",
  "databaseUrl",
  "redisUrl",
]);

function extractPlaceholders(s: string): string[] {
  const out = new Set<string>();
  const stripped = s.replace(/\{\{[^{}]*\}\}/g, "ESCAPED");
  for (const m of stripped.matchAll(PLACEHOLDER_RE)) out.add(m[1]!);
  return [...out];
}

interface ValidationFailure {
  code: string;
  message: string;
  field?: "systemPrompt" | "userTemplate" | "metadata";
}

interface CommonProps {
  onCancel: () => void;
  onSaved: () => void;
}

interface CreateProps extends CommonProps {
  mode: "create";
}

interface UpdateProps extends CommonProps {
  mode: "update";
  templateId: string;
  initialSlug: string;
  initialModelType: "guide" | "plan" | "checklist";
}

type EditorProps = CreateProps | UpdateProps;

export function PromptEditor(props: EditorProps) {
  const t = useTranslations("admin.ia.editor");
  const isUpdate = props.mode === "update";

  const [slug, setSlug] = useState(isUpdate ? props.initialSlug : "");
  const [modelType, setModelType] = useState<"guide" | "plan" | "checklist">(
    isUpdate ? props.initialModelType : "guide"
  );
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userTemplate, setUserTemplate] = useState("");
  const [maxTokens, setMaxTokens] = useState(4096);
  const [changeNote, setChangeNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [serverErrors, setServerErrors] = useState<ValidationFailure[]>([]);
  const [serverWarnings, setServerWarnings] = useState<ValidationFailure[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const placeholders = useMemo(() => {
    return [
      ...new Set([
        ...extractPlaceholders(systemPrompt),
        ...extractPlaceholders(userTemplate),
      ]),
    ];
  }, [systemPrompt, userTemplate]);

  const forbiddenFound = useMemo(
    () => placeholders.filter((p) => FORBIDDEN.has(p)),
    [placeholders]
  );

  const tokens = useMemo(
    () => estimateCombinedTokens(systemPrompt, userTemplate),
    [systemPrompt, userTemplate]
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setServerErrors([]);
    setServerWarnings([]);
    setSubmitError(null);
    try {
      const payload = isUpdate
        ? {
            systemPrompt: systemPrompt || undefined,
            userTemplate: userTemplate || undefined,
            maxTokens,
            changeNote: changeNote || undefined,
          }
        : {
            slug,
            modelType,
            systemPrompt,
            userTemplate,
            maxTokens,
            cacheControl: true,
            changeNote: changeNote || undefined,
          };
      const url = isUpdate
        ? `/api/admin/ai/prompts/${props.templateId}`
        : `/api/admin/ai/prompts`;
      const res = await fetch(url, {
        method: isUpdate ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 400) {
        const body = (await res.json()) as {
          error?: string;
          code?: string;
          validationErrors?: ValidationFailure[];
        };
        setServerErrors(body.validationErrors ?? []);
        setSubmitError(body.error ?? "validation failed");
        return;
      }
      if (res.status === 409) {
        setSubmitError(t("slugTaken"));
        return;
      }
      if (!res.ok) {
        setSubmitError(`${res.status}`);
        return;
      }
      const body = (await res.json()) as { warnings?: ValidationFailure[] };
      setServerWarnings(body.warnings ?? []);
      props.onSaved();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4"
      data-testid="admin-ia-prompt-editor"
      aria-label={t("formAriaLabel")}
    >
      <header className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {isUpdate ? t("titleEdit", { slug: props.initialSlug }) : t("titleCreate")}
        </h3>
        <button
          type="button"
          onClick={props.onCancel}
          className="text-sm text-atlas-on-surface-variant underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring"
        >
          {t("cancel")}
        </button>
      </header>

      {!isUpdate && (
        <>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-bold">{t("slugLabel")}</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              minLength={3}
              maxLength={50}
              pattern="[a-z0-9-]+"
              className="rounded-atlas-md border border-atlas-outline-variant px-3 py-2 font-mono text-sm"
              data-testid="admin-ia-editor-slug"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-bold">{t("modelTypeLabel")}</span>
            <select
              value={modelType}
              onChange={(e) =>
                setModelType(e.target.value as "guide" | "plan" | "checklist")
              }
              className="rounded-atlas-md border border-atlas-outline-variant px-3 py-2 text-sm"
              data-testid="admin-ia-editor-modeltype"
            >
              <option value="guide">guide</option>
              <option value="plan">plan</option>
              <option value="checklist">checklist</option>
            </select>
          </label>
        </>
      )}

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-bold">{t("systemPromptLabel")}</span>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          required={!isUpdate}
          minLength={isUpdate ? undefined : 10}
          maxLength={50000}
          rows={10}
          className="rounded-atlas-md border border-atlas-outline-variant px-3 py-2 font-mono text-sm"
          data-testid="admin-ia-editor-system"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-bold">{t("userTemplateLabel")}</span>
        <textarea
          value={userTemplate}
          onChange={(e) => setUserTemplate(e.target.value)}
          required={!isUpdate}
          minLength={isUpdate ? undefined : 10}
          maxLength={50000}
          rows={6}
          className="rounded-atlas-md border border-atlas-outline-variant px-3 py-2 font-mono text-sm"
          data-testid="admin-ia-editor-user"
        />
      </label>

      <div
        className="flex flex-col gap-1 text-xs text-atlas-on-surface-variant"
        data-testid="admin-ia-editor-stats"
      >
        <p>
          {t("placeholdersFound")}:{" "}
          {placeholders.length === 0 ? (
            <em>{t("none")}</em>
          ) : (
            placeholders.map((p) => (
              <span
                key={p}
                className={
                  FORBIDDEN.has(p)
                    ? "ml-1 inline-block rounded bg-atlas-error/10 px-1 font-mono text-atlas-error"
                    : "ml-1 inline-block rounded bg-atlas-primary/10 px-1 font-mono text-atlas-primary"
                }
                data-placeholder={p}
                data-forbidden={FORBIDDEN.has(p) ? "true" : "false"}
              >
                {`{${p}}`}
              </span>
            ))
          )}
        </p>
        <p>
          {t("tokenCount", {
            system: tokens.systemTokens,
            user: tokens.userTokens,
            total: tokens.total,
          })}
        </p>
        {forbiddenFound.length > 0 && (
          <p
            role="alert"
            className="text-atlas-error"
            data-testid="admin-ia-editor-forbidden-warn"
          >
            {t("forbiddenInline", { names: forbiddenFound.join(", ") })}
          </p>
        )}
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-bold">{t("changeNoteLabel")}</span>
        <input
          type="text"
          value={changeNote}
          onChange={(e) => setChangeNote(e.target.value)}
          maxLength={500}
          className="rounded-atlas-md border border-atlas-outline-variant px-3 py-2 text-sm"
          data-testid="admin-ia-editor-changenote"
          placeholder={t("changeNotePlaceholder")}
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <span className="font-bold">{t("maxTokensLabel")}</span>
        <input
          type="number"
          value={maxTokens}
          min={256}
          max={16384}
          onChange={(e) => setMaxTokens(Number(e.target.value))}
          className="w-32 rounded-atlas-md border border-atlas-outline-variant px-3 py-2 text-sm"
          data-testid="admin-ia-editor-maxtokens"
        />
      </label>

      {serverErrors.length > 0 && (
        <ul
          role="alert"
          className="rounded-atlas-md border border-atlas-error/40 bg-atlas-error/5 p-3 text-sm"
          data-testid="admin-ia-editor-server-errors"
        >
          {serverErrors.map((e, i) => (
            <li key={`${e.code}-${i}`} className="text-atlas-error">
              <strong>{e.code}</strong>: {e.message}
            </li>
          ))}
        </ul>
      )}
      {serverWarnings.length > 0 && (
        <ul
          className="rounded-atlas-md border border-atlas-warning/40 bg-atlas-warning/5 p-3 text-sm"
          data-testid="admin-ia-editor-server-warnings"
        >
          {serverWarnings.map((w, i) => (
            <li key={`${w.code}-${i}`} className="text-atlas-on-surface">
              <strong>{w.code}</strong>: {w.message}
            </li>
          ))}
        </ul>
      )}
      {submitError && !serverErrors.length && (
        <p role="alert" className="text-sm text-atlas-error">
          {submitError}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-[44px] items-center rounded-atlas-md bg-atlas-primary px-4 py-2 text-sm font-bold text-atlas-on-primary hover:bg-atlas-primary/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring"
          data-testid="admin-ia-editor-submit"
        >
          {submitting ? t("submitting") : isUpdate ? t("save") : t("create")}
        </button>
      </div>
    </form>
  );
}
