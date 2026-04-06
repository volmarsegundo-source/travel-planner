import "server-only";
import { db } from "@/server/db";
import { logger } from "@/lib/logger";
import {
  PLAN_SYSTEM_PROMPT,
  CHECKLIST_SYSTEM_PROMPT,
  GUIDE_SYSTEM_PROMPT,
} from "@/lib/prompts/system-prompts";
import type { ModelType } from "./ai-provider.interface";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ResolvedPromptTemplate {
  slug: string;
  version: string;
  modelType: ModelType;
  systemPrompt: string;
  maxTokens: number;
  cacheControl: boolean;
  source: "db" | "inline";
}

// ─── Inline fallback templates ──────────────────────────────────────────────

const INLINE_TEMPLATES: Record<string, ResolvedPromptTemplate> = {
  "travel-plan": {
    slug: "travel-plan",
    version: "1.1.0",
    modelType: "plan",
    systemPrompt: PLAN_SYSTEM_PROMPT,
    maxTokens: 2048,
    cacheControl: true,
    source: "inline",
  },
  checklist: {
    slug: "checklist",
    version: "1.0.0",
    modelType: "checklist",
    systemPrompt: CHECKLIST_SYSTEM_PROMPT,
    maxTokens: 2048,
    cacheControl: true,
    source: "inline",
  },
  "destination-guide": {
    slug: "destination-guide",
    version: "2.0.0",
    modelType: "guide",
    systemPrompt: GUIDE_SYSTEM_PROMPT,
    maxTokens: 4096,
    cacheControl: true,
    source: "inline",
  },
};

// ─── In-memory cache ────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const templateCache = new Map<
  string,
  { template: ResolvedPromptTemplate; expiresAt: number }
>();

// ─── Service ────────────────────────────────────────────────────────────────

export class PromptRegistryService {
  /**
   * Resolves a prompt template by slug.
   *
   * Resolution order:
   * 1. In-memory cache (TTL 5 min)
   * 2. Database (active template)
   * 3. Inline fallback constant
   *
   * Throws if slug has no inline fallback and DB lookup fails/returns null.
   */
  static async getTemplate(slug: string): Promise<ResolvedPromptTemplate> {
    // 1. Check in-memory cache
    const cached = templateCache.get(slug);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.template;
    }

    // 2. Try DB
    try {
      const dbTemplate = await db.promptTemplate.findFirst({
        where: { slug, isActive: true },
      });

      if (dbTemplate) {
        const resolved: ResolvedPromptTemplate = {
          slug: dbTemplate.slug,
          version: dbTemplate.version,
          modelType: dbTemplate.modelType as ModelType,
          systemPrompt: dbTemplate.systemPrompt,
          maxTokens: dbTemplate.maxTokens,
          cacheControl: dbTemplate.cacheControl,
          source: "db",
        };
        templateCache.set(slug, {
          template: resolved,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });
        return resolved;
      }
    } catch (error) {
      logger.warn("prompt-registry.db.error", {
        slug,
        error: String(error),
      });
    }

    // 3. Inline fallback
    const inline = INLINE_TEMPLATES[slug];
    if (inline) {
      templateCache.set(slug, {
        template: inline,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      return inline;
    }

    throw new Error(`Prompt template not found: ${slug}`);
  }

  /** Clears the in-memory template cache. */
  static clearCache(): void {
    templateCache.clear();
  }
}
