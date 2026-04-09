import { track } from "@vercel/analytics";

export function trackAiGeneration(event: "triggered" | "completed", data: {
  phase: number;
  tripId: string;
  provider?: string;
  latencyMs?: number;
  estimatedCostUsd?: number;
}) {
  track(`ai_generation_${event}`, data);
}

export function trackExpeditionCompleted(tripId: string) {
  track("expedition_completed", { tripId });
}
