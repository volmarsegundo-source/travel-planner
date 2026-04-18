"use client";

import { WizardDirtyProvider } from "@/contexts/WizardDirtyContext";
import type { ReactNode } from "react";

/**
 * Client boundary for the (app) layout.
 * Provides the WizardDirtyContext so LanguageSwitcher (in the navbar)
 * can detect unsaved wizard state before navigating cross-locale.
 */
export function AppShellClient({ children }: { children: ReactNode }) {
  return <WizardDirtyProvider>{children}</WizardDirtyProvider>;
}
