/**
 * Diagnostic endpoint for Unsplash API integration.
 * GET /api/test-unsplash?q=istanbul+turkey
 * Returns: API key status, API response, Redis cache status.
 * DELETE THIS after debugging.
 */
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const query = url.searchParams.get("q") || "istanbul turkey travel";

  const key = process.env.UNSPLASH_ACCESS_KEY;
  const keyStatus = key ? `configured (${key.slice(0, 8)}...)` : "NOT SET";

  if (!key) {
    return NextResponse.json({
      keyStatus,
      error: "UNSPLASH_ACCESS_KEY is not set in environment variables",
    });
  }

  try {
    const apiUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`;
    const response = await fetch(apiUrl, {
      headers: { Authorization: `Client-ID ${key}` },
      signal: AbortSignal.timeout(10_000),
    });

    const status = response.status;
    const body = await response.json();

    return NextResponse.json({
      keyStatus,
      apiStatus: status,
      totalResults: body.total ?? 0,
      firstResult: body.results?.[0]
        ? {
            url: body.results[0].urls?.regular,
            photographer: body.results[0].user?.name,
            width: body.results[0].width,
            height: body.results[0].height,
          }
        : null,
      redisUrl: process.env.REDIS_URL ? "configured" : "NOT SET",
    });
  } catch (error) {
    return NextResponse.json({
      keyStatus,
      error: String(error),
    });
  }
}
