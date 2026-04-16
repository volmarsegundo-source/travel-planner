import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { isPhaseReorderEnabled } from "@/lib/flags/phase-reorder";
import { getPhaseDefinitions } from "@/lib/engines/phase-config";

export async function GET() {
  // Only available in non-production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 403 },
    );
  }

  const phases = getPhaseDefinitions();
  return NextResponse.json({
    raw_env: process.env.NEXT_PUBLIC_PHASE_REORDER_ENABLED,
    parsed_env: env.NEXT_PUBLIC_PHASE_REORDER_ENABLED,
    isPhaseReorderEnabled: isPhaseReorderEnabled(),
    phaseOrder: phases.map((p) => ({
      number: p.phaseNumber,
      nameKey: p.nameKey,
      name: p.name,
    })),
    buildTime: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
  });
}
