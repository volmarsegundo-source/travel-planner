"use client";

import { useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import type { AiInteractionDTO } from "@/server/actions/admin.actions";

interface PromptViewerProps {
  interactions: AiInteractionDTO[];
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const t = useTranslations("admin.prompts");
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={label}
      className={
        "min-h-[44px] min-w-[44px] inline-flex items-center justify-center " +
        "rounded-atlas-sm px-3 py-2 text-xs font-atlas-body font-bold " +
        "transition-colors duration-200 motion-reduce:transition-none " +
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2 " +
        (copied
          ? "bg-atlas-primary/10 text-atlas-primary"
          : "bg-atlas-surface-container text-atlas-on-surface-variant hover:bg-atlas-surface-container-high")
      }
    >
      {copied ? t("copied") : t("copy")}
    </button>
  );
}

function CollapsibleSection({
  title,
  content,
  copyLabel,
}: {
  title: string;
  content: string;
  copyLabel: string;
}) {
  return (
    <details className="group">
      <summary
        className={
          "min-h-[44px] flex items-center gap-2 cursor-pointer " +
          "rounded-atlas-sm px-3 py-2 text-sm font-atlas-body font-bold " +
          "text-atlas-on-surface-variant " +
          "hover:bg-atlas-surface-container-low " +
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2"
        }
      >
        <span
          className="inline-block transition-transform duration-200 motion-reduce:transition-none group-open:rotate-90"
          aria-hidden="true"
        >
          &#9654;
        </span>
        {title}
      </summary>
      <div className="mt-2 relative">
        <div className="absolute right-2 top-2 z-10">
          <CopyButton text={content} label={copyLabel} />
        </div>
        <pre className="overflow-x-auto rounded-atlas-sm bg-atlas-surface-container p-4 text-xs font-mono text-atlas-on-surface whitespace-pre-wrap break-words max-h-96">
          <code>{content}</code>
        </pre>
      </div>
    </details>
  );
}

function InteractionCard({
  interaction,
}: {
  interaction: AiInteractionDTO;
}) {
  const t = useTranslations("admin.prompts");

  const statusColor =
    interaction.status === "success"
      ? "bg-atlas-primary/10 text-atlas-primary"
      : interaction.status === "error"
        ? "bg-atlas-error/10 text-atlas-error"
        : "bg-atlas-on-surface-variant/10 text-atlas-on-surface-variant";

  const formattedDate = new Date(interaction.createdAt).toLocaleString();
  const formattedCost =
    interaction.estimatedCostUsd > 0
      ? `$${interaction.estimatedCostUsd.toFixed(6)}`
      : "$0.00";

  return (
    <article
      className="rounded-atlas-md border border-atlas-outline-variant/20 bg-atlas-surface p-4 space-y-3"
      aria-label={`${t("phase")}: ${interaction.phase}, ${t("model")}: ${interaction.model}`}
    >
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <time
          dateTime={interaction.createdAt}
          className="font-atlas-body text-atlas-on-surface-variant"
        >
          {formattedDate}
        </time>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${statusColor}`}
        >
          {interaction.status}
        </span>
        <span className="inline-flex items-center rounded-full bg-atlas-surface-container px-2 py-0.5 text-xs font-atlas-body text-atlas-on-surface-variant">
          {interaction.phase}
        </span>
        <span className="inline-flex items-center rounded-full bg-atlas-surface-container px-2 py-0.5 text-xs font-atlas-body text-atlas-on-surface-variant">
          {interaction.model}
        </span>
        {interaction.cacheHit && (
          <span className="inline-flex items-center rounded-full bg-atlas-primary/10 px-2 py-0.5 text-xs font-bold text-atlas-primary">
            {t("cacheHitYes")}
          </span>
        )}
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs font-atlas-body">
        <div>
          <span className="text-atlas-on-surface-variant">{t("inputTokens")}: </span>
          <span className="font-bold text-atlas-on-surface">
            {interaction.inputTokens.toLocaleString()}
          </span>
        </div>
        <div>
          <span className="text-atlas-on-surface-variant">{t("outputTokens")}: </span>
          <span className="font-bold text-atlas-on-surface">
            {interaction.outputTokens.toLocaleString()}
          </span>
        </div>
        <div>
          <span className="text-atlas-on-surface-variant">{t("responseTime")}: </span>
          <span className="font-bold text-atlas-on-surface">
            {interaction.latencyMs.toLocaleString()}ms
          </span>
        </div>
        <div>
          <span className="text-atlas-on-surface-variant">{t("totalCost")}: </span>
          <span className="font-bold text-atlas-on-surface">{formattedCost}</span>
        </div>
      </div>

      {/* Extra info */}
      {interaction.promptSlug && (
        <div className="text-xs font-atlas-body text-atlas-on-surface-variant">
          {t("promptSlug")}: <span className="font-mono">{interaction.promptSlug}</span>
          {interaction.templateVersion && (
            <span className="ml-2">v{interaction.templateVersion}</span>
          )}
        </div>
      )}

      {interaction.errorCode && (
        <div className="text-xs font-atlas-body text-atlas-error">
          Error: <span className="font-mono">{interaction.errorCode}</span>
        </div>
      )}

      {/* Collapsible template sections */}
      {interaction.templateSystemPrompt && (
        <CollapsibleSection
          title={t("systemPrompt")}
          content={interaction.templateSystemPrompt}
          copyLabel={`${t("copy")} ${t("systemPrompt")}`}
        />
      )}

      {interaction.templateUserPrompt && (
        <CollapsibleSection
          title={t("userPrompt")}
          content={interaction.templateUserPrompt}
          copyLabel={`${t("copy")} ${t("userPrompt")}`}
        />
      )}

      {interaction.metadata && Object.keys(interaction.metadata).length > 0 && (
        <CollapsibleSection
          title={t("metadata")}
          content={JSON.stringify(interaction.metadata, null, 2)}
          copyLabel={`${t("copy")} ${t("metadata")}`}
        />
      )}
    </article>
  );
}

export function PromptViewer({ interactions }: PromptViewerProps) {
  const t = useTranslations("admin.prompts");

  const [phaseFilter, setPhaseFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const phases = useMemo(
    () => [...new Set(interactions.map((i) => i.phase))].sort(),
    [interactions],
  );
  const models = useMemo(
    () => [...new Set(interactions.map((i) => i.model))].sort(),
    [interactions],
  );
  const statuses = useMemo(
    () => [...new Set(interactions.map((i) => i.status))].sort(),
    [interactions],
  );

  const filtered = useMemo(
    () =>
      interactions.filter(
        (i) =>
          (!phaseFilter || i.phase === phaseFilter) &&
          (!modelFilter || i.model === modelFilter) &&
          (!statusFilter || i.status === statusFilter),
      ),
    [interactions, phaseFilter, modelFilter, statusFilter],
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div
        className="flex flex-wrap gap-3"
        role="group"
        aria-label={t("filterByPhase")}
      >
        <label className="flex flex-col gap-1 text-xs font-atlas-body text-atlas-on-surface-variant">
          {t("filterByPhase")}
          <select
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value)}
            className={
              "min-h-[44px] rounded-atlas-sm border border-atlas-outline-variant/30 " +
              "bg-atlas-surface px-3 py-2 text-sm font-atlas-body text-atlas-on-surface " +
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2"
            }
          >
            <option value="">{t("allPhases")}</option>
            {phases.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-atlas-body text-atlas-on-surface-variant">
          {t("filterByModel")}
          <select
            value={modelFilter}
            onChange={(e) => setModelFilter(e.target.value)}
            className={
              "min-h-[44px] rounded-atlas-sm border border-atlas-outline-variant/30 " +
              "bg-atlas-surface px-3 py-2 text-sm font-atlas-body text-atlas-on-surface " +
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2"
            }
          >
            <option value="">{t("allModels")}</option>
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-atlas-body text-atlas-on-surface-variant">
          {t("filterByStatus")}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={
              "min-h-[44px] rounded-atlas-sm border border-atlas-outline-variant/30 " +
              "bg-atlas-surface px-3 py-2 text-sm font-atlas-body text-atlas-on-surface " +
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2"
            }
          >
            <option value="">{t("allStatuses")}</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Count */}
      <p className="text-sm font-atlas-body text-atlas-on-surface-variant" aria-live="polite">
        {t("showingCount", { count: filtered.length })}
      </p>

      {/* Results */}
      {filtered.length === 0 ? (
        <div
          className="rounded-atlas-md border border-atlas-outline-variant/20 bg-atlas-surface-container-low p-8 text-center"
          role="status"
        >
          <p className="text-sm font-atlas-body text-atlas-on-surface-variant">
            {t("noResults")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((interaction) => (
            <InteractionCard key={interaction.id} interaction={interaction} />
          ))}
        </div>
      )}
    </div>
  );
}
