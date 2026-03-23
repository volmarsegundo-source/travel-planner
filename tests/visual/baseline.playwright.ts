/**
 * Visual Regression Baseline — Sprint 38
 *
 * Captures screenshots of key pages in the V1 design (before Design System V2).
 * These baselines will be compared in future PRs to detect unintended visual changes.
 *
 * Run: PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test tests/visual/
 * Or:  PLAYWRIGHT_BASE_URL=https://travel-planner-eight-navy.vercel.app npx playwright test tests/visual/
 *
 * Baselines stored in: tests/visual/baseline.spec.ts-snapshots/
 */

import { test, expect } from "@playwright/test";

const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL || "https://travel-planner-eight-navy.vercel.app";

// ─── Unauthenticated Pages ──────────────────────────────────────────────────

test.describe("Visual Regression — V1 Baseline (unauthenticated)", () => {
  test("Landing page — EN", async ({ page }) => {
    await page.goto(`${BASE_URL}/en`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("landing-en.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test("Landing page — PT", async ({ page }) => {
    await page.goto(`${BASE_URL}/pt`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("landing-pt.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test("Login page — EN", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/auth/login`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("login-en.png", {
      maxDiffPixelRatio: 0.01,
    });
  });

  test("Register page — EN", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/auth/register`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("register-en.png", {
      maxDiffPixelRatio: 0.01,
    });
  });

  test("404 page", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/nonexistent-page-12345`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("404-en.png", {
      maxDiffPixelRatio: 0.01,
    });
  });
});

// ─── Authenticated Pages (requires test user) ──────────────────────────────

test.describe("Visual Regression — V1 Baseline (authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user
    await page.goto(`${BASE_URL}/en/auth/login`);
    await page.fill('[name="email"], [data-testid="email-input"] input, input[type="email"]', "testuser@travel.dev");
    await page.fill('[name="password"], [data-testid="password-input"] input, input[type="password"]', "Test@1234");
    await page.click('[type="submit"]');
    // Wait for redirect to dashboard
    await page.waitForURL(/expeditions|trips|dashboard/, { timeout: 15000 });
  });

  test("Expeditions dashboard", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("dashboard-en.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("New expedition wizard", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/expedition/new`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("new-expedition-en.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("Como funciona page", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/como-funciona`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("como-funciona-en.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("Purchase page", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/meu-atlas/comprar-pa`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("purchase-pa-en.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("Admin dashboard (if admin)", async ({ page }) => {
    // Try navigating to admin — may redirect if not admin role
    await page.goto(`${BASE_URL}/en/admin/dashboard`);
    await page.waitForLoadState("networkidle");
    // Screenshot whatever state we land on (admin page or redirect)
    await expect(page).toHaveScreenshot("admin-or-redirect-en.png", {
      maxDiffPixelRatio: 0.02,
    });
  });
});
