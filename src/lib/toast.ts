"use client";

import { toast as sonnerToast } from "sonner";

// Wrapper over sonner to keep the rest of the app decoupled from the
// underlying toast library. Swapping libraries later should be a one-file
// change here, not a codebase-wide refactor.

const DEFAULT_DURATION_MS = 5000;

export const toast = {
  success(message: string, options?: { duration?: number }) {
    sonnerToast.success(message, { duration: options?.duration ?? DEFAULT_DURATION_MS });
  },
  error(message: string, options?: { duration?: number }) {
    sonnerToast.error(message, { duration: options?.duration ?? DEFAULT_DURATION_MS });
  },
  info(message: string, options?: { duration?: number }) {
    sonnerToast.info(message, { duration: options?.duration ?? DEFAULT_DURATION_MS });
  },
  warning(message: string, options?: { duration?: number }) {
    sonnerToast.warning(message, { duration: options?.duration ?? DEFAULT_DURATION_MS });
  },
};
