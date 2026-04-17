/**
 * Browser-side SSE consumer for the Phase 5 destination guide stream.
 *
 * Wraps the fetch + ReadableStream + line-buffered SSE parsing so that the
 * React component only deals with high-level callbacks.
 *
 * @see src/app/api/ai/guide/stream/route.ts
 */

import type { DestinationGuideContentV2 } from "@/types/ai.types";

export interface StreamGuideOptions {
  tripId: string;
  destination: string;
  language: "pt-BR" | "en";
  locale: string;
  regen: boolean;
  extraCategories?: string[];
  personalNotes?: string;
  signal?: AbortSignal;
  onStart?: (data: { destination: string }) => void;
  onChunk?: (chunk: string) => void;
}

export type StreamGuideResult =
  | {
      kind: "complete";
      content: DestinationGuideContentV2;
      generationCount?: number;
      regenCount?: number;
    }
  | { kind: "error"; errorCode: string };

interface SsePacket {
  event?: string;
  data: string;
}

function* parseSseBuffer(buffer: string): Generator<SsePacket> {
  // Split on the SSE event boundary (\n\n).
  const parts = buffer.split("\n\n");
  // The last element may be a partial packet — caller handles the leftover.
  for (let i = 0; i < parts.length - 1; i++) {
    const block = parts[i];
    if (!block) continue;
    let event: string | undefined;
    const dataLines: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) {
        event = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trim());
      }
    }
    if (dataLines.length > 0) {
      yield { event, data: dataLines.join("\n") };
    }
  }
}

export async function streamDestinationGuide(
  options: StreamGuideOptions,
): Promise<StreamGuideResult> {
  const {
    tripId,
    destination,
    language,
    locale,
    regen,
    extraCategories,
    personalNotes,
    signal,
    onStart,
    onChunk,
  } = options;

  let response: Response;
  try {
    response = await fetch("/api/ai/guide/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        tripId,
        destination,
        language,
        locale,
        regen,
        extraCategories,
        personalNotes,
      }),
    });
  } catch {
    return { kind: "error", errorCode: "errors.network" };
  }

  if (!response.ok) {
    let errorCode = "errors.generic";
    try {
      const body = (await response.json()) as { error?: string };
      if (body?.error) errorCode = body.error;
    } catch {
      // ignore — fall back to generic
    }
    return { kind: "error", errorCode };
  }

  if (!response.body) {
    return { kind: "error", errorCode: "errors.generic" };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: StreamGuideResult = { kind: "error", errorCode: "errors.generic" };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Process complete packets, retain trailing partial chunk
      const lastBoundary = buffer.lastIndexOf("\n\n");
      if (lastBoundary === -1) continue;
      const processable = buffer.slice(0, lastBoundary + 2);
      buffer = buffer.slice(lastBoundary + 2);

      for (const packet of parseSseBuffer(processable)) {
        if (packet.event === "start") {
          try {
            const parsed = JSON.parse(packet.data) as { destination: string };
            onStart?.(parsed);
          } catch {
            // ignore malformed start
          }
          continue;
        }
        if (packet.event === "complete") {
          try {
            const parsed = JSON.parse(packet.data) as {
              content: DestinationGuideContentV2;
              generationCount?: number;
              regenCount?: number;
            };
            result = {
              kind: "complete",
              content: parsed.content,
              generationCount: parsed.generationCount,
              regenCount: parsed.regenCount,
            };
          } catch {
            result = { kind: "error", errorCode: "errors.AI_PARSE_ERROR" };
          }
          continue;
        }
        if (packet.event === "error") {
          try {
            const parsed = JSON.parse(packet.data) as { error?: string };
            const rawCode = parsed.error ?? "errors.generic";
            // Normalize bare AI error codes to errors.* namespace for i18n lookup
            const errorCode = rawCode.startsWith("errors.") ? rawCode : `errors.${rawCode}`;
            result = { kind: "error", errorCode };
          } catch {
            result = { kind: "error", errorCode: "errors.generic" };
          }
          continue;
        }
        // Default data packet — chunk forwarding
        try {
          const parsed = JSON.parse(packet.data) as { chunk?: string };
          if (parsed.chunk && onChunk) onChunk(parsed.chunk);
        } catch {
          // Non-JSON chunks are tolerated (no-op)
        }
      }
    }
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      return { kind: "error", errorCode: "errors.aborted" };
    }
    return { kind: "error", errorCode: "errors.generic" };
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // ignore
    }
  }

  return result;
}
