"use client";

import { LandingNav } from "./LandingNav";
import { HeroSectionV2 } from "./HeroSectionV2";
import { PhasesSectionV2 } from "./PhasesSectionV2";
import { AiSectionV2 } from "./AiSectionV2";
import { GamificationSectionV2 } from "./GamificationSectionV2";
import { DestinationsSectionV2 } from "./DestinationsSectionV2";
import { FooterV2 } from "./FooterV2";

interface LandingPageV2Props {
  isAuthenticated?: boolean;
}

export function LandingPageV2({ isAuthenticated = false }: LandingPageV2Props) {
  return (
    <div className="flex min-h-screen flex-col">
      <LandingNav isAuthenticated={isAuthenticated} />
      <main className="flex-1">
        <HeroSectionV2 isAuthenticated={isAuthenticated} />
        <PhasesSectionV2 />
        <DestinationsSectionV2 />
        <GamificationSectionV2 isAuthenticated={isAuthenticated} />
        <AiSectionV2 />
      </main>
      <FooterV2 />
    </div>
  );
}
