export const logger = {
  info: (event: string, meta?: Record<string, unknown>) =>
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "info",
        service: "travel-planner",
        environment: process.env.NODE_ENV,
        event,
        ...meta,
      })
    ),
  error: (event: string, error: unknown, meta?: Record<string, unknown>) =>
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "error",
        service: "travel-planner",
        environment: process.env.NODE_ENV,
        event,
        errorMessage:
          error instanceof Error ? error.message : String(error),
        ...meta,
      })
    ),
  warn: (event: string, meta?: Record<string, unknown>) =>
    console.warn(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "warn",
        service: "travel-planner",
        environment: process.env.NODE_ENV,
        event,
        ...meta,
      })
    ),
};
