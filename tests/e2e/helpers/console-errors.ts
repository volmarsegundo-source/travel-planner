import { Page } from "@playwright/test";

/**
 * Tracks console errors emitted during a test.
 *
 * Usage:
 *   const errors = trackConsoleErrors(page);
 *   // ... interact with the page ...
 *   expect(errors).toHaveLength(0);
 *
 * Console warnings are tolerated — only `console.error` entries are captured.
 */
export function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      // Filter benign dev-mode errors that do not indicate real bugs
      if (
        text.includes("hydrat") ||
        text.includes("__nextjs") ||
        text.includes("favicon") ||
        text.includes("chunk") ||
        text.includes("HMR") ||
        text.includes("Fast Refresh")
      ) {
        return;
      }
      errors.push(text);
    }
  });
  return errors;
}

/**
 * Tracks HTTP responses with status >= 500 during a test.
 *
 * Usage:
 *   const serverErrors = trackServerErrors(page);
 *   // ... interact with the page ...
 *   expect(serverErrors).toHaveLength(0);
 */
export function trackServerErrors(
  page: Page
): { url: string; status: number }[] {
  const errors: { url: string; status: number }[] = [];
  page.on("response", (response) => {
    if (response.status() >= 500) {
      errors.push({ url: response.url(), status: response.status() });
    }
  });
  return errors;
}
