export interface LogMetadata extends Record<string, unknown> {
  traceId?: string;
}

export const logger = {
  info: (event: string, meta?: LogMetadata) =>
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "info",
        service: "travel-planner",
        environment: process.env.NODE_ENV,
        event,
        ...(meta?.traceId ? { traceId: meta.traceId } : {}),
        ...meta,
      })
    ),
  error: (event: string, error: unknown, meta?: LogMetadata) =>
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "error",
        service: "travel-planner",
        environment: process.env.NODE_ENV,
        event,
        errorMessage:
          error instanceof Error ? error.message : String(error),
        ...(meta?.traceId ? { traceId: meta.traceId } : {}),
        ...meta,
      })
    ),
  warn: (event: string, meta?: LogMetadata) =>
    console.warn(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "warn",
        service: "travel-planner",
        environment: process.env.NODE_ENV,
        event,
        ...(meta?.traceId ? { traceId: meta.traceId } : {}),
        ...meta,
      })
    ),
};
