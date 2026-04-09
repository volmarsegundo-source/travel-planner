import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,

  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  beforeSend(event) {
    if (event.request?.headers) {
      delete event.request.headers["authorization"];
      delete event.request.headers["cookie"];
    }
    if (event.request?.data && typeof event.request.data === "object") {
      const data = event.request.data as Record<string, unknown>;
      for (const key of [
        "password",
        "confirmPassword",
        "token",
        "secret",
        "apiKey",
        "api_key",
        "ANTHROPIC_API_KEY",
        "GOOGLE_AI_API_KEY",
      ]) {
        if (key in data) data[key] = "[REDACTED]";
      }
    }
    return event;
  },
});
