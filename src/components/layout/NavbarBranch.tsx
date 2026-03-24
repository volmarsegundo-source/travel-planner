"use client";

import { DesignBranch } from "@/components/ui";
import { AuthenticatedNavbar } from "./AuthenticatedNavbar";
import { AuthenticatedNavbarV2 } from "./AuthenticatedNavbarV2";

interface NavbarBranchProps {
  userName: string;
  userImage: string | null;
  userEmail: string;
  gamification?: {
    totalPoints: number;
    availablePoints: number;
    currentLevel: number;
    phaseName: string;
    rank: "novato" | "desbravador" | "navegador" | "capitao" | "aventureiro" | "lendario";
  };
}

/**
 * Client-side bridge to DesignBranch for the authenticated navbar.
 * Used in the server-side app layout to conditionally render V1 or V2 navbar.
 */
export function NavbarBranch(props: NavbarBranchProps) {
  return (
    <DesignBranch
      v1={<AuthenticatedNavbar {...props} />}
      v2={<AuthenticatedNavbarV2 {...props} />}
    />
  );
}
