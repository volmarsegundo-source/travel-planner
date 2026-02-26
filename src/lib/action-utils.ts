import "server-only";
import { AppError } from "@/lib/errors";

export function mapErrorToKey(error: unknown): string {
  if (error instanceof AppError) {
    return error.message; // always an i18n key in this codebase
  }
  return "errors.generic";
}
