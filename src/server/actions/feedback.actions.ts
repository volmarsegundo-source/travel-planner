"use server";

import "server-only";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { UnauthorizedError } from "@/lib/errors";
import { feedbackSchema } from "@/lib/validations/feedback.schema";
import { hashUserId } from "@/lib/hash";
import { logger } from "@/lib/logger";
import type { FeedbackInput } from "@/lib/validations/feedback.schema";
import type { ActionResult } from "@/types/trip.types";

// ─── Constants ──────────────────────────────────────────────────────────────

const FEEDBACK_RATE_LIMIT = 5;
const FEEDBACK_RATE_WINDOW_SECONDS = 3600; // 1 hour
const FEEDBACK_PAGE_SIZE = 25;

// ─── Webhook ────────────────────────────────────────────────────────────────

async function sendFeedbackWebhook(feedback: {
  type: string;
  message: string;
  page: string;
  userId: string;
  currentPhase?: number;
}) {
  const webhookUrl = process.env.FEEDBACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  const typeEmoji: Record<string, string> = {
    bug: "\uD83D\uDC1B",
    suggestion: "\uD83D\uDCA1",
    praise: "\u2B50",
  };
  const emoji = typeEmoji[feedback.type] ?? "\uD83D\uDCDD";

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // Discord/Slack compatible format
        content: `${emoji} **New ${feedback.type}** feedback`,
        embeds: [
          {
            title: `${emoji} ${feedback.type.charAt(0).toUpperCase() + feedback.type.slice(1)} Feedback`,
            description: feedback.message.slice(0, 500),
            fields: [
              { name: "Page", value: feedback.page, inline: true },
              ...(feedback.currentPhase
                ? [
                    {
                      name: "Phase",
                      value: String(feedback.currentPhase),
                      inline: true,
                    },
                  ]
                : []),
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
  } catch {
    /* silently ignore webhook failures */
  }
}

// ─── Submit Feedback ────────────────────────────────────────────────────────

export async function submitFeedbackAction(
  data: FeedbackInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const userId = session.user.id;

  // Validate input
  const parsed = feedbackSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "feedback.errorTooShort" };
  }

  // Rate limit: 5 per hour per user
  const rateLimitResult = await checkRateLimit(
    `feedback:${userId}`,
    FEEDBACK_RATE_LIMIT,
    FEEDBACK_RATE_WINDOW_SECONDS,
  );
  if (!rateLimitResult.allowed) {
    return { success: false, error: "feedback.errorRateLimit" };
  }

  try {
    const feedback = await db.betaFeedback.create({
      data: {
        userId,
        type: parsed.data.type,
        message: parsed.data.message,
        page: parsed.data.page,
        currentPhase: parsed.data.currentPhase ?? null,
        screenshotData: parsed.data.screenshotData ?? null,
      },
    });

    logger.info("Beta feedback submitted", {
      userId: hashUserId(userId),
      feedbackId: feedback.id,
      type: parsed.data.type,
      page: parsed.data.page,
    });

    // Fire-and-forget webhook notification
    sendFeedbackWebhook({
      type: parsed.data.type,
      message: parsed.data.message,
      page: parsed.data.page,
      userId: hashUserId(userId),
      currentPhase: parsed.data.currentPhase,
    });

    return { success: true, data: { id: feedback.id } };
  } catch (error) {
    logger.error("Failed to submit feedback", {
      userId: hashUserId(userId),
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return { success: false, error: "feedback.errorGeneric" };
  }
}

// ─── Get Feedback List (Admin) ──────────────────────────────────────────────

interface FeedbackFilters {
  type?: "bug" | "suggestion" | "praise";
  status?: "new" | "read" | "resolved";
  page?: number;
}

export async function getFeedbackListAction(
  filters: FeedbackFilters = {},
): Promise<
  ActionResult<{
    items: Array<{
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
    }>;
    total: number;
    pageCount: number;
  }>
> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  // Admin role check
  const user = session.user as { id: string; role?: string };
  if (user.role !== "admin") {
    return { success: false, error: "errors.unauthorized" };
  }

  const where: Record<string, unknown> = {};
  if (filters.type) where.type = filters.type;
  if (filters.status) where.status = filters.status;

  const currentPage = Math.max(1, filters.page ?? 1);

  try {
    const [items, total] = await Promise.all([
      db.betaFeedback.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (currentPage - 1) * FEEDBACK_PAGE_SIZE,
        take: FEEDBACK_PAGE_SIZE,
        select: {
          id: true,
          userId: true,
          type: true,
          message: true,
          page: true,
          currentPhase: true,
          status: true,
          adminNotes: true,
          screenshotData: true,
          createdAt: true,
        },
      }),
      db.betaFeedback.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items,
        total,
        pageCount: Math.ceil(total / FEEDBACK_PAGE_SIZE),
      },
    };
  } catch (error) {
    logger.error("Failed to fetch feedback list", {
      userId: hashUserId(user.id),
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return { success: false, error: "feedback.errorGeneric" };
  }
}

// ─── Update Feedback Status (Admin) ─────────────────────────────────────────

export async function updateFeedbackStatusAction(
  id: string,
  status: "new" | "read" | "resolved",
  adminNotes?: string,
): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  // Admin role check
  const user = session.user as { id: string; role?: string };
  if (user.role !== "admin") {
    return { success: false, error: "errors.unauthorized" };
  }

  try {
    await db.betaFeedback.update({
      where: { id },
      data: {
        status,
        ...(adminNotes !== undefined ? { adminNotes } : {}),
      },
    });

    logger.info("Feedback status updated", {
      userId: hashUserId(user.id),
      feedbackId: id,
      status,
    });

    return { success: true, data: undefined };
  } catch (error) {
    logger.error("Failed to update feedback status", {
      userId: hashUserId(user.id),
      feedbackId: id,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return { success: false, error: "feedback.errorGeneric" };
  }
}
