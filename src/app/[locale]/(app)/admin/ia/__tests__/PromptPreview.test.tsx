/**
 * B-W2-008 — PromptPreview tests.
 *
 * Covers:
 *   - per-type substitution against §2.2-2.4 mock values
 *   - escaped {{literal}} preserved verbatim
 *   - unknown placeholders render as [mock:NAME] and surface in unfilled notice
 *   - token count surfaces against substituted text (not raw template)
 *   - never calls fetch (no AI invocation)
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../../../../../messages/en.json";

import {
  PromptPreview,
  substitutePlaceholders,
} from "../PromptPreview";

function wrap(children: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={en}>
      {children}
    </NextIntlClientProvider>
  );
}

describe("substitutePlaceholders", () => {
  it("guide: substitutes {destination} with the canonical mock", () => {
    expect(substitutePlaceholders("Plan {destination}", "guide")).toBe(
      "Plan Paris, France"
    );
  });

  it("plan: substitutes per §2.3 schema", () => {
    expect(
      substitutePlaceholders("from {destination} for {days} days", "plan")
    ).toBe("from Lisbon, Portugal for 5 days");
  });

  it("checklist: substitutes per §2.4 schema", () => {
    expect(substitutePlaceholders("destino={destination}", "checklist")).toBe(
      "destino=Buenos Aires, AR"
    );
  });

  it("preserves escaped {{literal}} as a single-brace literal", () => {
    expect(
      substitutePlaceholders("hello {{kept}} and {destination}", "guide")
    ).toBe("hello {kept} and Paris, France");
  });

  it("renders unknown placeholders as [mock:NAME]", () => {
    expect(substitutePlaceholders("we have {customField}", "guide")).toBe(
      "we have [mock:customField]"
    );
  });

  it("never throws on empty template", () => {
    expect(substitutePlaceholders("", "guide")).toBe("");
  });
});

describe("PromptPreview", () => {
  it("does NOT call fetch (no AI invocation)", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(
      wrap(
        <PromptPreview
          systemPrompt="System {destination}"
          userTemplate="User {days}"
          modelType="guide"
        />
      )
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("renders substituted system + user content in their respective panels", () => {
    render(
      wrap(
        <PromptPreview
          systemPrompt="System {destination}"
          userTemplate="User {days}"
          modelType="guide"
        />
      )
    );
    expect(
      screen.getByTestId("admin-ia-preview-system").textContent
    ).toMatch(/Paris, France/);
    expect(
      screen.getByTestId("admin-ia-preview-user").textContent
    ).toMatch(/7/);
  });

  it("surfaces unfilled placeholder names when names are unknown", () => {
    render(
      wrap(
        <PromptPreview
          systemPrompt="hello {customField}"
          userTemplate="ok"
          modelType="guide"
        />
      )
    );
    const notice = screen.getByTestId("admin-ia-preview-unfilled");
    expect(notice.textContent).toMatch(/customField/);
  });

  it("hides the unfilled notice when every placeholder resolved", () => {
    render(
      wrap(
        <PromptPreview
          systemPrompt="{destination} {originCity}"
          userTemplate="{days} days"
          modelType="guide"
        />
      )
    );
    expect(
      screen.queryByTestId("admin-ia-preview-unfilled")
    ).not.toBeInTheDocument();
  });

  it("token count reflects the SUBSTITUTED text length, not the raw template", () => {
    render(
      wrap(
        <PromptPreview
          systemPrompt="{destination}"
          userTemplate=""
          modelType="guide"
        />
      )
    );
    const tokenEl = screen.getByTestId("admin-ia-preview-token-count");
    // "Paris, France" → 13 chars → ceil(13/3.5) = 4
    expect(tokenEl.textContent).toMatch(/4/);
  });
});
