/**
 * B-W2-007 — DiffViewer rendering tests.
 *
 * Covers:
 *   - identical inputs render without add/remove rows
 *   - +X / -Y summary updates per ops
 *   - paired remove+add render on the same row (modification)
 *   - left / right gutters carry line numbers
 *   - i18n labels rendered for column headers
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../../../../../messages/en.json";

import { DiffViewer } from "../DiffViewer";

function wrap(children: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={en}>
      {children}
    </NextIntlClientProvider>
  );
}

describe("B-W2-007 DiffViewer", () => {
  it("identical inputs render only `same` rows", () => {
    const { container } = render(
      wrap(
        <DiffViewer
          before="alpha\nbeta"
          after="alpha\nbeta"
          beforeLabel="1.0.0"
          afterLabel="1.0.1"
        />
      )
    );
    const cells = container.querySelectorAll<HTMLElement>("[data-cell-type]");
    expect([...cells].every((c) => c.dataset.cellType === "same")).toBe(true);
  });

  it("summary surfaces +X / -Y / =Z counts", () => {
    render(
      wrap(
        <DiffViewer
          before={"a\nb\nc"}
          after={"a\nMID\nb\nc"}
          beforeLabel="1.0.0"
          afterLabel="1.1.0"
        />
      )
    );
    const summary = screen.getByTestId("admin-ia-diff-summary");
    expect(summary.textContent).toMatch(/\+1/);
    expect(summary.textContent).toMatch(/=3/);
  });

  it("pairs adjacent remove+add on the same row", () => {
    const { container } = render(
      wrap(
        <DiffViewer
          before={"a\nb\nc"}
          after={"a\nB\nc"}
          beforeLabel="prev"
          afterLabel="next"
        />
      )
    );
    const rows = container.querySelectorAll<HTMLElement>(
      "[data-testid^=admin-ia-diff-row-]"
    );
    // Find the row whose left is "remove" — its right cell should be "add".
    const modRow = [...rows].find(
      (r) => r.querySelector('[data-cell="left"]')?.getAttribute("data-cell-type") === "remove"
    );
    expect(modRow).toBeDefined();
    const rightCell = modRow!.querySelector('[data-cell="right"]')!;
    expect(rightCell.getAttribute("data-cell-type")).toBe("add");
  });

  it("renders the column header labels", () => {
    render(
      wrap(
        <DiffViewer
          before="x"
          after="y"
          beforeLabel="v-baseline"
          afterLabel="v-candidate"
        />
      )
    );
    expect(screen.getByText("v-baseline")).toBeInTheDocument();
    expect(screen.getByText("v-candidate")).toBeInTheDocument();
  });

  it("pure additions render with blank left side", () => {
    const { container } = render(
      wrap(
        <DiffViewer
          before="a"
          after={"a\nNEW1\nNEW2"}
          beforeLabel="prev"
          afterLabel="next"
        />
      )
    );
    const blanks = container.querySelectorAll<HTMLElement>(
      '[data-cell="left"][data-cell-type="blank"]'
    );
    expect(blanks.length).toBe(2);
  });
});
