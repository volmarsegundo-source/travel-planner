import "server-only";
import { db } from "@/server/db";
import { logger } from "@/lib/logger";
import { hashUserId } from "@/lib/hash";
import { AiService } from "./ai.service";
import { PromptRegistryService } from "./prompt-registry.service";
import type {
  GeneratePlanParams,
  ItineraryPlan,
  GenerateChecklistParams,
  ChecklistResult,
  GenerateGuideParams,
  DestinationGuideContentV2,
} from "@/types/ai.types";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GatewayInteraction {
  id: string;
  costUsd: number;
  latencyMs: number;
  source: string;
}

export interface GatewayResult<T> {
  data: T;
  interaction: GatewayInteraction;
}

// ─── Service ────────────────────────────────────────────────────────────────

export class AiGatewayService {
  static async generatePlan(
    params: GeneratePlanParams,
  ): Promise<GatewayResult<ItineraryPlan>> {
    return this.execute("plan", "travel-plan", params.userId, async () => {
      return AiService.generateTravelPlan(params);
    });
  }

  static async generateChecklist(
    params: GenerateChecklistParams,
  ): Promise<GatewayResult<ChecklistResult>> {
    return this.execute(
      "checklist",
      "checklist",
      params.userId,
      async () => {
        return AiService.generateChecklist(params);
      },
    );
  }

  static async generateGuide(
    params: GenerateGuideParams,
  ): Promise<GatewayResult<DestinationGuideContentV2>> {
    return this.execute(
      "guide",
      "destination-guide",
      params.userId,
      async () => {
        return AiService.generateDestinationGuide(params);
      },
    );
  }

  // ─── Core executor ──────────────────────────────────────────────────────

  private static async execute<T>(
    phase: string,
    promptSlug: string,
    userId: string,
    fn: () => Promise<T>,
  ): Promise<GatewayResult<T>> {
    const hid = hashUserId(userId);
    const startMs = Date.now();
    let status = "success";
    let errorCode: string | undefined;

    // Load prompt template for metadata (non-blocking on failure)
    let templateSource = "inline";
    try {
      const template =
        await PromptRegistryService.getTemplate(promptSlug);
      templateSource = template.source;
    } catch {
      // Non-blocking — template metadata is for observability only
    }

    try {
      const data = await fn();
      const latencyMs = Date.now() - startMs;

      // Log interaction (fire-and-forget)
      this.logInteraction({
        userId: hid,
        phase,
        promptSlug,
        status,
        latencyMs,
        templateSource,
      }).catch((err) =>
        logger.warn("ai-gateway.log.error", {
          error: String(err),
        }),
      );

      return {
        data,
        interaction: {
          id: "",
          costUsd: 0,
          latencyMs,
          source: templateSource,
        },
      };
    } catch (error) {
      status = "error";
      errorCode =
        error instanceof Error
          ? error.message.slice(0, 50)
          : "unknown";
      const latencyMs = Date.now() - startMs;

      this.logInteraction({
        userId: hid,
        phase,
        promptSlug,
        status,
        errorCode,
        latencyMs,
        templateSource,
      }).catch(() => {});

      throw error;
    }
  }

  // ─── Interaction logging ────────────────────────────────────────────────

  private static async logInteraction(data: {
    userId: string;
    phase: string;
    promptSlug: string;
    status: string;
    errorCode?: string;
    latencyMs: number;
    templateSource: string;
  }): Promise<void> {
    try {
      await db.aiInteractionLog.create({
        data: {
          userId: data.userId,
          phase: data.phase,
          provider: "claude",
          model:
            data.phase === "plan"
              ? "claude-sonnet-4-6"
              : "claude-haiku-4-5-20251001",
          promptSlug: data.promptSlug,
          status: data.status,
          errorCode: data.errorCode,
          latencyMs: data.latencyMs,
          metadata: { templateSource: data.templateSource },
        },
      });
    } catch (error) {
      logger.warn("ai-gateway.log.write.error", {
        error: String(error),
      });
    }
  }
}
