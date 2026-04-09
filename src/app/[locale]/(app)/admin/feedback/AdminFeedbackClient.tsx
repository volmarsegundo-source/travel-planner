"use client";

import { useState, useCallback, useTransition } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { AtlasCard } from "@/components/ui/AtlasCard";
import {
  getFeedbackListAction,
  updateFeedbackStatusAction,
} from "@/server/actions/feedback.actions";

// ─── Constants ──────────────────────────────────────────────────────────────

const FEEDBACK_PAGE_SIZE = 25;

type FeedbackType = "bug" | "suggestion" | "praise";
type FeedbackStatus = "new" | "read" | "resolved";

interface FeedbackItem {
  id: string;
  userId: string;
  type: string;
  message: string;
  page: string;
  currentPhase: number | null;
  status: string;
  adminNotes: string | null;
  screenshotData: string | null;
  createdAt: Date;
}

interface FeedbackData {
  items: FeedbackItem[];
  total: number;
  pageCount: number;
}

interface AdminFeedbackClientProps {
  initialData: FeedbackData;
}

// ─── Badge helpers ──────────────────────────────────────────────────────────

const TYPE_BADGE_CLASSES: Record<string, string> = {
  bug: "bg-atlas-error-container text-atlas-on-error-container",
  suggestion: "bg-atlas-warning/10 text-atlas-warning",
  praise: "bg-atlas-success/10 text-atlas-success",
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  new: "bg-atlas-primary/10 text-atlas-primary",
  read: "bg-atlas-surface-container text-atlas-on-surface-variant",
  resolved: "bg-atlas-success/10 text-atlas-success",
};

// ─── Component ──────────────────────────────────────────────────────────────

export function AdminFeedbackClient({ initialData }: AdminFeedbackClientProps) {
  const t = useTranslations("admin.adminFeedback");
  const [isPending, startTransition] = useTransition();

  const [data, setData] = useState<FeedbackData>(initialData);
  const [currentPage, setCurrentPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<FeedbackType | undefined>(
    undefined,
  );
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | undefined>(
    undefined,
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});

  // ─── Data fetching ──────────────────────────────────────────────────────

  const fetchData = useCallback(
    (page: number, type?: FeedbackType, status?: FeedbackStatus) => {
      startTransition(async () => {
        const result = await getFeedbackListAction({
          page,
          type,
          status,
        });
        if (result.success && result.data) {
          setData(result.data);
        }
      });
    },
    [],
  );

  const handleTypeFilter = (type: FeedbackType | undefined) => {
    setTypeFilter(type);
    setCurrentPage(1);
    setExpandedId(null);
    fetchData(1, type, statusFilter);
  };

  const handleStatusFilter = (status: FeedbackStatus | undefined) => {
    setStatusFilter(status);
    setCurrentPage(1);
    setExpandedId(null);
    fetchData(1, typeFilter, status);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setExpandedId(null);
    fetchData(page, typeFilter, statusFilter);
  };

  // ─── Actions ────────────────────────────────────────────────────────────

  const handleStatusUpdate = (id: string, status: FeedbackStatus) => {
    startTransition(async () => {
      const result = await updateFeedbackStatusAction(id, status);
      if (result.success) {
        fetchData(currentPage, typeFilter, statusFilter);
      }
    });
  };

  const handleSaveNote = (id: string) => {
    const notes = editingNotes[id];
    if (notes === undefined) return;
    startTransition(async () => {
      const item = data.items.find((f) => f.id === id);
      const currentStatus = (item?.status ?? "read") as FeedbackStatus;
      const result = await updateFeedbackStatusAction(
        id,
        currentStatus,
        notes,
      );
      if (result.success) {
        setEditingNotes((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        fetchData(currentPage, typeFilter, statusFilter);
      }
    });
  };

  // ─── Helpers ────────────────────────────────────────────────────────────

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const truncate = (text: string, max: number) =>
    text.length > max ? text.slice(0, max) + "..." : text;

  // ─── Pagination info ───────────────────────────────────────────────────

  const from = data.total === 0 ? 0 : (currentPage - 1) * FEEDBACK_PAGE_SIZE + 1;
  const to = Math.min(currentPage * FEEDBACK_PAGE_SIZE, data.total);

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold">{t("title")}</h2>
        <p className="text-atlas-on-surface-variant">{t("subtitle")}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        {/* Type filters */}
        <div className="flex gap-1">
          {([undefined, "bug", "suggestion", "praise"] as const).map(
            (type) => {
              const label =
                type === undefined
                  ? t("filterAll")
                  : type === "bug"
                    ? t("filterBug")
                    : type === "suggestion"
                      ? t("filterSuggestion")
                      : t("filterPraise");
              const isActive = typeFilter === type;
              return (
                <button
                  key={type ?? "all"}
                  onClick={() => handleTypeFilter(type)}
                  className={cn(
                    "min-h-[44px] min-w-[44px] px-3 py-2 rounded-atlas-md text-sm font-atlas-body font-bold",
                    "transition-colors duration-200 motion-reduce:transition-none",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2",
                    isActive
                      ? "bg-atlas-primary text-atlas-on-primary"
                      : "bg-atlas-surface-container text-atlas-on-surface-variant hover:bg-atlas-surface-container-high",
                  )}
                >
                  {label}
                </button>
              );
            },
          )}
        </div>

        {/* Status filters */}
        <div className="flex gap-1">
          {([undefined, "new", "read", "resolved"] as const).map((status) => {
            const label =
              status === undefined
                ? t("filterAll")
                : status === "new"
                  ? t("statusNew")
                  : status === "read"
                    ? t("statusRead")
                    : t("statusResolved");
            const isActive = statusFilter === status;
            return (
              <button
                key={status ?? "all-status"}
                onClick={() => handleStatusFilter(status)}
                className={cn(
                  "min-h-[44px] min-w-[44px] px-3 py-2 rounded-atlas-md text-sm font-atlas-body font-bold",
                  "transition-colors duration-200 motion-reduce:transition-none",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2",
                  isActive
                    ? "bg-atlas-primary text-atlas-on-primary"
                    : "bg-atlas-surface-container text-atlas-on-surface-variant hover:bg-atlas-surface-container-high",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feedback list */}
      {data.items.length === 0 ? (
        <AtlasCard>
          <p className="text-center text-atlas-on-surface-variant py-8">
            {t("noFeedback")}
          </p>
        </AtlasCard>
      ) : (
        <div className="space-y-3">
          {data.items.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <AtlasCard key={item.id} className={cn(isPending && "opacity-60")}>
                {/* Summary row */}
                <button
                  onClick={() =>
                    setExpandedId(isExpanded ? null : item.id)
                  }
                  className={cn(
                    "w-full text-left min-h-[44px]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2 rounded-atlas-sm",
                  )}
                  aria-expanded={isExpanded}
                >
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {/* Date */}
                    <span className="text-xs text-atlas-on-surface-variant shrink-0">
                      {formatDate(item.createdAt)}
                    </span>

                    {/* Type badge */}
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-atlas-sm text-xs font-bold",
                        TYPE_BADGE_CLASSES[item.type] ??
                          "bg-atlas-surface-container text-atlas-on-surface-variant",
                      )}
                    >
                      {item.type}
                    </span>

                    {/* User ID (truncated) */}
                    <span className="text-xs text-atlas-on-surface-variant font-mono">
                      {truncate(item.userId, 12)}
                    </span>

                    {/* Page */}
                    <span className="text-xs text-atlas-on-surface-variant">
                      {t("page")}: {truncate(item.page, 30)}
                    </span>

                    {/* Phase */}
                    {item.currentPhase !== null && (
                      <span className="text-xs text-atlas-on-surface-variant">
                        {t("phase")}: {item.currentPhase}
                      </span>
                    )}

                    {/* Message preview */}
                    <span className="flex-1 text-sm truncate min-w-0">
                      {truncate(item.message, 80)}
                    </span>

                    {/* Status badge */}
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-atlas-sm text-xs font-bold shrink-0",
                        STATUS_BADGE_CLASSES[item.status] ??
                          "bg-atlas-surface-container text-atlas-on-surface-variant",
                      )}
                    >
                      {item.status === "new"
                        ? t("statusNew")
                        : item.status === "read"
                          ? t("statusRead")
                          : t("statusResolved")}
                    </span>
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-atlas-outline-variant/20 space-y-4">
                    {/* Full message */}
                    <p className="text-sm whitespace-pre-wrap">{item.message}</p>

                    {/* Screenshot */}
                    {item.screenshotData && (
                      <div>
                        <p className="text-xs font-bold text-atlas-on-surface-variant mb-1">
                          {t("screenshot")}
                        </p>
                        <img
                          src={item.screenshotData}
                          alt={t("screenshot")}
                          className="max-w-full max-h-64 rounded-atlas-md border border-atlas-outline-variant/20"
                        />
                      </div>
                    )}

                    {/* Admin notes */}
                    <div>
                      <textarea
                        value={
                          editingNotes[item.id] ??
                          item.adminNotes ??
                          ""
                        }
                        onChange={(e) =>
                          setEditingNotes((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                        placeholder={t("addNote")}
                        rows={2}
                        className={cn(
                          "w-full rounded-atlas-md border border-atlas-outline-variant/20 p-2 text-sm",
                          "bg-atlas-surface-container-lowest text-atlas-on-surface",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring",
                        )}
                      />
                      {editingNotes[item.id] !== undefined && (
                        <button
                          onClick={() => handleSaveNote(item.id)}
                          disabled={isPending}
                          className={cn(
                            "mt-1 min-h-[44px] min-w-[44px] px-3 py-2 rounded-atlas-md text-sm font-bold",
                            "bg-atlas-primary text-atlas-on-primary",
                            "hover:opacity-90 transition-opacity motion-reduce:transition-none",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2",
                            "disabled:opacity-50",
                          )}
                        >
                          {t("saveNote")}
                        </button>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      {item.status !== "read" && (
                        <button
                          onClick={() => handleStatusUpdate(item.id, "read")}
                          disabled={isPending}
                          className={cn(
                            "min-h-[44px] min-w-[44px] px-3 py-2 rounded-atlas-md text-sm font-bold",
                            "bg-atlas-surface-container text-atlas-on-surface-variant",
                            "hover:bg-atlas-surface-container-high transition-colors motion-reduce:transition-none",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2",
                            "disabled:opacity-50",
                          )}
                        >
                          {t("markRead")}
                        </button>
                      )}
                      {item.status !== "resolved" && (
                        <button
                          onClick={() =>
                            handleStatusUpdate(item.id, "resolved")
                          }
                          disabled={isPending}
                          className={cn(
                            "min-h-[44px] min-w-[44px] px-3 py-2 rounded-atlas-md text-sm font-bold",
                            "bg-atlas-success/10 text-atlas-success",
                            "hover:bg-atlas-success/20 transition-colors motion-reduce:transition-none",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2",
                            "disabled:opacity-50",
                          )}
                        >
                          {t("markResolved")}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </AtlasCard>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {data.total > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-atlas-on-surface-variant">
            {t("showing", { from: String(from), to: String(to), total: String(data.total) })}
          </span>
          <div className="flex gap-1">
            {Array.from({ length: data.pageCount }, (_, i) => i + 1).map(
              (page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  disabled={isPending}
                  className={cn(
                    "min-h-[44px] min-w-[44px] px-3 py-2 rounded-atlas-md text-sm font-bold",
                    "transition-colors duration-200 motion-reduce:transition-none",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2",
                    page === currentPage
                      ? "bg-atlas-primary text-atlas-on-primary"
                      : "bg-atlas-surface-container text-atlas-on-surface-variant hover:bg-atlas-surface-container-high",
                    "disabled:opacity-50",
                  )}
                >
                  {page}
                </button>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
