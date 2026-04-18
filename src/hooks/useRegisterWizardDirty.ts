"use client";

import { useEffect } from "react";
import { useWizardDirty } from "@/contexts/WizardDirtyContext";

/**
 * Registers the current wizard's dirty state, save, and discard callbacks
 * into the WizardDirtyContext so that LanguageSwitcher can intercept
 * locale changes when the form has unsaved data.
 */
export function useRegisterWizardDirty(opts: {
  isDirty: boolean;
  save: () => void | Promise<void>;
  discard: () => void;
}) {
  const { register } = useWizardDirty();

  useEffect(() => {
    register({
      isDirty: opts.isDirty,
      save: opts.save,
      discard: opts.discard,
    });
  }, [opts.isDirty, opts.save, opts.discard, register]);
}
