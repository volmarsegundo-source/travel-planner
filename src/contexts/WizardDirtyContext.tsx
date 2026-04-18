"use client";

import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────

interface WizardDirtyRegistration {
  isDirty: boolean;
  save: () => void | Promise<void>;
  discard: () => void;
}

interface WizardDirtyContextValue {
  isDirty: boolean;
  save: () => void | Promise<void>;
  discard: () => void;
  register: (registration: WizardDirtyRegistration) => void;
}

// ─── Default (no-op) context value ─────────────────────────────────────────

const defaultValue: WizardDirtyContextValue = {
  isDirty: false,
  save: () => {},
  discard: () => {},
  register: () => {},
};

// ─── Context ───────────────────────────────────────────────────────────────

const WizardDirtyContext = createContext<WizardDirtyContextValue>(defaultValue);

// ─── Provider ──────────────────────────────────────────────────────────────

export function WizardDirtyProvider({ children }: { children: ReactNode }) {
  const [registration, setRegistration] =
    useState<WizardDirtyRegistration | null>(null);

  const register = useCallback((reg: WizardDirtyRegistration) => {
    setRegistration(reg);
  }, []);

  const save = useCallback(async () => {
    if (registration) {
      await registration.save();
    }
  }, [registration]);

  const discard = useCallback(() => {
    if (registration) {
      registration.discard();
    }
  }, [registration]);

  const value: WizardDirtyContextValue = {
    isDirty: registration?.isDirty ?? false,
    save,
    discard,
    register,
  };

  return (
    <WizardDirtyContext.Provider value={value}>
      {children}
    </WizardDirtyContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useWizardDirty(): WizardDirtyContextValue {
  return useContext(WizardDirtyContext);
}
