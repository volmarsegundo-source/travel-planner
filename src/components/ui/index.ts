// ─── Atlas Design System v2 — Component Barrel Export ────────────────────────
//
// All Atlas components are gated behind NEXT_PUBLIC_DESIGN_V2 feature flag.
// Import from this file: import { AtlasButton, AtlasInput } from "@/components/ui";

// Components
export { AtlasButton, atlasButtonVariants } from "./AtlasButton";
export { AtlasInput } from "./AtlasInput";
export { AtlasCard, atlasCardVariants } from "./AtlasCard";
export { AtlasChip } from "./AtlasChip";
export { AtlasBadge } from "./AtlasBadge";
export { AtlasPhaseProgress } from "./AtlasPhaseProgress";
export { AtlasStepperInput } from "./AtlasStepperInput";
export { DesignBranch } from "./DesignBranch";

// Types
export type { AtlasButtonProps } from "./AtlasButton";
export type { AtlasInputProps } from "./AtlasInput";
export type { AtlasCardProps } from "./AtlasCard";
export type { AtlasChipProps, ChipColor } from "./AtlasChip";
export type { AtlasBadgeProps, StatusColor } from "./AtlasBadge";
export type { AtlasPhaseProgressProps, PhaseSegment, SegmentState } from "./AtlasPhaseProgress";
export type { AtlasStepperInputProps } from "./AtlasStepperInput";
