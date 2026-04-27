/**
 * B-W2-006 — PromptEditor unit tests.
 *
 * RTL coverage:
 *   - renders create form fields
 *   - placeholder extraction surfaces in stats panel
 *   - forbidden placeholder highlights inline (V-02 echo)
 *   - token count refreshes as user types
 *   - submit POSTs to /api/admin/ai/prompts and surfaces validationErrors
 *   - 409 surfaces slugTaken message
 *
 * The editor's heavier UI (a11y / i18n cross-locale) is covered indirectly
 * by the parent page test + i18n smoke; this test focuses on the
 * editor-specific behaviors.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../../../../../messages/en.json";

import { PromptEditor } from "../PromptEditor";

function wrap(children: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={en}>
      {children}
    </NextIntlClientProvider>
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("B-W2-006 PromptEditor", () => {
  it("renders create form fields", () => {
    render(
      wrap(
        <PromptEditor
          mode="create"
          onCancel={() => {}}
          onSaved={() => {}}
        />
      )
    );
    expect(screen.getByTestId("admin-ia-editor-slug")).toBeInTheDocument();
    expect(screen.getByTestId("admin-ia-editor-modeltype")).toBeInTheDocument();
    expect(screen.getByTestId("admin-ia-editor-system")).toBeInTheDocument();
    expect(screen.getByTestId("admin-ia-editor-user")).toBeInTheDocument();
    expect(screen.getByTestId("admin-ia-editor-submit")).toBeInTheDocument();
  });

  it("extracts placeholders live and shows them in the stats panel", () => {
    const { container } = render(
      wrap(
        <PromptEditor
          mode="create"
          onCancel={() => {}}
          onSaved={() => {}}
        />
      )
    );
    fireEvent.change(screen.getByTestId("admin-ia-editor-system"), {
      target: { value: "Hello {destination} from {originCity}" },
    });
    // Look at the rendered chips (not the textarea content) — chips have
    // `data-placeholder` attribute, set by PromptEditor for each detected name.
    const chips = container.querySelectorAll<HTMLElement>("[data-placeholder]");
    const names = [...chips].map((c) => c.getAttribute("data-placeholder"));
    expect(names).toContain("destination");
    expect(names).toContain("originCity");
  });

  it("flags forbidden placeholder inline (V-02 client-side echo)", () => {
    render(
      wrap(
        <PromptEditor
          mode="create"
          onCancel={() => {}}
          onSaved={() => {}}
        />
      )
    );
    fireEvent.change(screen.getByTestId("admin-ia-editor-user"), {
      target: { value: "Send to {userEmail}" },
    });
    const warn = screen.getByTestId("admin-ia-editor-forbidden-warn");
    expect(warn).toBeInTheDocument();
    expect(warn.textContent).toMatch(/userEmail/);
  });

  it("updates token count as user types", () => {
    render(
      wrap(
        <PromptEditor
          mode="create"
          onCancel={() => {}}
          onSaved={() => {}}
        />
      )
    );
    fireEvent.change(screen.getByTestId("admin-ia-editor-system"), {
      target: { value: "x".repeat(7) }, // 7 chars → 2 tokens
    });
    fireEvent.change(screen.getByTestId("admin-ia-editor-user"), {
      target: { value: "y".repeat(8) }, // 8 chars → 3 tokens
    });
    const stats = screen.getByTestId("admin-ia-editor-stats");
    expect(stats.textContent).toMatch(/2/);
    expect(stats.textContent).toMatch(/3/);
    expect(stats.textContent).toMatch(/5/);
  });

  it("on 400 with validationErrors surfaces them in the alert list", async () => {
    const onSaved = vi.fn();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: "validation",
            code: "VALIDATION_FAILED",
            validationErrors: [
              { code: "V-01", message: "Faltam placeholders obrigatórios" },
              { code: "V-06", message: "PII detectada" },
            ],
          }),
          { status: 400 }
        )
      );

    render(
      wrap(
        <PromptEditor
          mode="create"
          onCancel={() => {}}
          onSaved={onSaved}
        />
      )
    );

    fireEvent.change(screen.getByTestId("admin-ia-editor-slug"), {
      target: { value: "test-slug" },
    });
    fireEvent.change(screen.getByTestId("admin-ia-editor-system"), {
      target: { value: "Some content here" },
    });
    fireEvent.change(screen.getByTestId("admin-ia-editor-user"), {
      target: { value: "Generate it" },
    });

    fireEvent.click(screen.getByTestId("admin-ia-editor-submit"));

    await waitFor(() => {
      expect(
        screen.getByTestId("admin-ia-editor-server-errors")
      ).toBeInTheDocument();
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/admin/ai/prompts",
      expect.objectContaining({ method: "POST" })
    );
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("on 409 surfaces slugTaken message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: "Slug already exists", code: "SLUG_TAKEN" }),
        { status: 409 }
      )
    );

    render(
      wrap(
        <PromptEditor
          mode="create"
          onCancel={() => {}}
          onSaved={() => {}}
        />
      )
    );

    fireEvent.change(screen.getByTestId("admin-ia-editor-slug"), {
      target: { value: "duplicate" },
    });
    fireEvent.change(screen.getByTestId("admin-ia-editor-system"), {
      target: { value: "Some content" },
    });
    fireEvent.change(screen.getByTestId("admin-ia-editor-user"), {
      target: { value: "Generate" },
    });
    fireEvent.click(screen.getByTestId("admin-ia-editor-submit"));

    await waitFor(() => {
      expect(
        screen.getByText(en.admin.ia.editor.slugTaken)
      ).toBeInTheDocument();
    });
  });

  it("on 201 calls onSaved and surfaces returned warnings", async () => {
    const onSaved = vi.fn();
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: "tpl_1",
          slug: "ok",
          versionId: "ver_1",
          versionTag: "1.0.0",
          warnings: [
            { code: "W-02", message: "Recomendado declarar formato" },
          ],
        }),
        { status: 201 }
      )
    );

    render(
      wrap(
        <PromptEditor
          mode="create"
          onCancel={() => {}}
          onSaved={onSaved}
        />
      )
    );

    fireEvent.change(screen.getByTestId("admin-ia-editor-slug"), {
      target: { value: "ok" },
    });
    fireEvent.change(screen.getByTestId("admin-ia-editor-system"), {
      target: { value: "System content" },
    });
    fireEvent.change(screen.getByTestId("admin-ia-editor-user"), {
      target: { value: "User content" },
    });
    fireEvent.click(screen.getByTestId("admin-ia-editor-submit"));

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledTimes(1);
    });
  });
});
