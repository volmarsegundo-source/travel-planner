"use client";

import { useRef, useState, useMemo, useCallback } from "react";

/**
 * djb2 hash function for fast string hashing.
 * Deterministic and collision-resistant enough for dirty-state detection.
 */
function djb2Hash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

// Export for testing
export { djb2Hash as _djb2Hash };

/**
 * Tracks whether a form's values have changed from their initial state.
 *
 * Uses a hash-based comparison to avoid deep equality checks.
 * Keys are sorted before serialization so property order is irrelevant.
 *
 * @param formValues - Object whose values represent the current form state.
 * @returns isDirty, resetDirty (alias markClean), and hash values for debugging.
 */
export function useFormDirty(formValues: Record<string, unknown>) {
  const serialized = useMemo(
    () => JSON.stringify(formValues, Object.keys(formValues).sort()),
    [formValues],
  );
  const currentHash = useMemo(() => djb2Hash(serialized), [serialized]);

  // Baseline stored in ref for synchronous reads, with a counter state to trigger re-renders.
  const baselineRef = useRef(currentHash);
  const [, setTick] = useState(0);

  const resetDirty = useCallback(() => {
    baselineRef.current = currentHash;
    setTick((t) => t + 1);
  }, [currentHash]);

  // markClean is an alias for resetDirty (semantic convenience)
  const markClean = resetDirty;

  return {
    isDirty: currentHash !== baselineRef.current,
    resetDirty,
    markClean,
    initialHash: baselineRef.current,
    currentHash,
  };
}
