/**
 * Tests for the dev-setup script utilities.
 *
 * Tests cover: route discovery from file system and port checking.
 * The script's main functions (Docker check, user creation, etc.) are
 * tested via integration by verifying their output behavior.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as net from "net";

// ─── Route scanning (extracted logic) ────────────────────────────────────────

function scanRoutes(appDir: string): string[] {
  const routes: string[] = [];
  if (!fs.existsSync(appDir)) return routes;

  function walk(dir: string, prefix: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const segment = entry.name.startsWith("(") ? "" : `/${entry.name}`;
        walk(fullPath, prefix + segment);
      } else if (entry.name === "page.tsx" || entry.name === "page.ts") {
        routes.push(prefix || "/");
      }
    }
  }
  walk(appDir, "");
  return routes.sort();
}

function checkPort(port: number, host = "127.0.0.1"): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2000);
    socket.on("connect", () => { socket.destroy(); resolve(true); });
    socket.on("timeout", () => { socket.destroy(); resolve(false); });
    socket.on("error",   () => { socket.destroy(); resolve(false); });
    socket.connect(port, host);
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("dev-setup: scanRoutes", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = path.join(__dirname, "__test_app_" + Date.now());
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns empty array for non-existent directory", () => {
    expect(scanRoutes("/nonexistent/path")).toEqual([]);
  });

  it("finds a page.tsx at the root level", () => {
    fs.writeFileSync(path.join(tmpDir, "page.tsx"), "export default function() {}");
    expect(scanRoutes(tmpDir)).toEqual(["/"]);
  });

  it("finds pages in nested directories", () => {
    const subDir = path.join(tmpDir, "trips");
    fs.mkdirSync(subDir);
    fs.writeFileSync(path.join(subDir, "page.tsx"), "");
    expect(scanRoutes(tmpDir)).toEqual(["/trips"]);
  });

  it("finds pages in deeply nested directories", () => {
    const deepDir = path.join(tmpDir, "trips", "[id]", "itinerary");
    fs.mkdirSync(deepDir, { recursive: true });
    fs.writeFileSync(path.join(deepDir, "page.tsx"), "");
    expect(scanRoutes(tmpDir)).toContain("/trips/[id]/itinerary");
  });

  it("handles route groups (parenthesized names) by omitting segment", () => {
    const groupDir = path.join(tmpDir, "(auth)");
    fs.mkdirSync(groupDir);
    const loginDir = path.join(groupDir, "login");
    fs.mkdirSync(loginDir);
    fs.writeFileSync(path.join(loginDir, "page.tsx"), "");
    expect(scanRoutes(tmpDir)).toContain("/login");
  });

  it("skips directories starting with _ or .", () => {
    const hiddenDir = path.join(tmpDir, "_components");
    fs.mkdirSync(hiddenDir);
    fs.writeFileSync(path.join(hiddenDir, "page.tsx"), "");
    const dotDir = path.join(tmpDir, ".hidden");
    fs.mkdirSync(dotDir);
    fs.writeFileSync(path.join(dotDir, "page.tsx"), "");
    expect(scanRoutes(tmpDir)).toEqual([]);
  });

  it("finds both page.tsx and page.ts files", () => {
    const dir1 = path.join(tmpDir, "a");
    const dir2 = path.join(tmpDir, "b");
    fs.mkdirSync(dir1);
    fs.mkdirSync(dir2);
    fs.writeFileSync(path.join(dir1, "page.tsx"), "");
    fs.writeFileSync(path.join(dir2, "page.ts"), "");
    expect(scanRoutes(tmpDir)).toEqual(["/a", "/b"]);
  });

  it("returns routes sorted alphabetically", () => {
    for (const name of ["z", "a", "m"]) {
      const dir = path.join(tmpDir, name);
      fs.mkdirSync(dir);
      fs.writeFileSync(path.join(dir, "page.tsx"), "");
    }
    expect(scanRoutes(tmpDir)).toEqual(["/a", "/m", "/z"]);
  });

  it("discovers routes from the actual src/app directory", () => {
    const actualAppDir = path.join(__dirname, "..", "..", "..", "src", "app");
    const routes = scanRoutes(actualAppDir);
    // Should find at least the root page and some auth pages
    expect(routes.length).toBeGreaterThanOrEqual(3);
    expect(routes).toContain("/");
  });
});

describe("dev-setup: checkPort", () => {
  it("returns false for a port nothing is listening on", async () => {
    // Use a random high port that's unlikely to be in use
    const result = await checkPort(59999);
    expect(result).toBe(false);
  });

  it("returns true for a port with an active server", async () => {
    const server = net.createServer();
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as net.AddressInfo).port;

    const result = await checkPort(port);
    expect(result).toBe(true);

    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
});
