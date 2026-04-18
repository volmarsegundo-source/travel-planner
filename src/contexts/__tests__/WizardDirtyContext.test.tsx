/**
 * Unit tests for WizardDirtyContext.
 * Tests the dirty state registration, save, and discard callbacks.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import {
  WizardDirtyProvider,
  useWizardDirty,
} from "../WizardDirtyContext";

// ─── Test consumer component ────────────────────────────────────────────────

function DirtyConsumer() {
  const { isDirty, save, discard } = useWizardDirty();
  return (
    <div>
      <span data-testid="dirty-state">{String(isDirty)}</span>
      <button data-testid="save-btn" onClick={() => save()}>
        Save
      </button>
      <button data-testid="discard-btn" onClick={() => discard()}>
        Discard
      </button>
    </div>
  );
}

function DirtyRegistrar({
  dirty,
  onSave,
  onDiscard,
}: {
  dirty: boolean;
  onSave: () => void | Promise<void>;
  onDiscard: () => void;
}) {
  const { register } = useWizardDirty();

  // Register on mount
  React.useEffect(() => {
    register({ isDirty: dirty, save: onSave, discard: onDiscard });
  }, [dirty, onSave, onDiscard, register]);

  return <span data-testid="registrar">registered</span>;
}

import React from "react";

describe("WizardDirtyContext", () => {
  // ─── Default values when no wizard registered ────────────────────────────

  it("returns isDirty=false when no wizard is registered", () => {
    render(
      <WizardDirtyProvider>
        <DirtyConsumer />
      </WizardDirtyProvider>,
    );

    expect(screen.getByTestId("dirty-state").textContent).toBe("false");
  });

  // ─── Registration sets isDirty ────────────────────────────────────────────

  it("reflects isDirty=true when a wizard registers dirty state", () => {
    const onSave = vi.fn();
    const onDiscard = vi.fn();

    render(
      <WizardDirtyProvider>
        <DirtyRegistrar dirty={true} onSave={onSave} onDiscard={onDiscard} />
        <DirtyConsumer />
      </WizardDirtyProvider>,
    );

    expect(screen.getByTestId("dirty-state").textContent).toBe("true");
  });

  it("reflects isDirty=false when a wizard registers clean state", () => {
    const onSave = vi.fn();
    const onDiscard = vi.fn();

    render(
      <WizardDirtyProvider>
        <DirtyRegistrar dirty={false} onSave={onSave} onDiscard={onDiscard} />
        <DirtyConsumer />
      </WizardDirtyProvider>,
    );

    expect(screen.getByTestId("dirty-state").textContent).toBe("false");
  });

  // ─── Save callback proxies to registered wizard ──────────────────────────

  it("calls the registered save callback", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onDiscard = vi.fn();

    render(
      <WizardDirtyProvider>
        <DirtyRegistrar dirty={true} onSave={onSave} onDiscard={onDiscard} />
        <DirtyConsumer />
      </WizardDirtyProvider>,
    );

    await act(async () => {
      screen.getByTestId("save-btn").click();
    });

    expect(onSave).toHaveBeenCalledOnce();
  });

  // ─── Discard callback proxies to registered wizard ───────────────────────

  it("calls the registered discard callback", () => {
    const onSave = vi.fn();
    const onDiscard = vi.fn();

    render(
      <WizardDirtyProvider>
        <DirtyRegistrar dirty={true} onSave={onSave} onDiscard={onDiscard} />
        <DirtyConsumer />
      </WizardDirtyProvider>,
    );

    screen.getByTestId("discard-btn").click();

    expect(onDiscard).toHaveBeenCalledOnce();
  });

  // ─── No-op when outside provider ─────────────────────────────────────────

  it("returns safe defaults when used outside provider", () => {
    render(<DirtyConsumer />);

    expect(screen.getByTestId("dirty-state").textContent).toBe("false");
    // save/discard should not throw
    screen.getByTestId("save-btn").click();
    screen.getByTestId("discard-btn").click();
  });
});
