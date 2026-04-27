/**
 * V-06 (PII), V-07 (API keys), V-08 (internal URLs).
 *
 * SPEC-AI-GOVERNANCE-V2 §3.1 V-06..V-08.
 *
 * Each check scans BOTH systemPrompt and userTemplate. Multiple matches
 * surface as multiple ValidationFailure entries so the admin can locate
 * every offending line on a single response.
 *
 * B-W2-003 — Sprint 46 Wave 2 task 3/9.
 */
import "server-only";
import type { ValidationCheck, ValidationFailure } from "./types";

// ─── V-06: Real-data detectors ──────────────────────────────────────────────
// SPEC §3.1 examples:
//   email   /[\w.+-]+@[\w-]+\.[\w.-]+/
//   phoneBR /\+?55\s?\(?\d{2}/
//   cpf     /\d{3}\.\d{3}\.\d{3}-\d{2}/
//   card    /\d{4}[\s-]?\d{4}[\s-]?\d{4}/

const PII_DETECTORS: { name: string; re: RegExp }[] = [
  { name: "e-mail", re: /[\w.+-]+@[\w-]+\.[\w.-]+/g },
  { name: "telefone BR", re: /\+?55\s?\(?\d{2}/g },
  { name: "CPF", re: /\d{3}\.\d{3}\.\d{3}-\d{2}/g },
  { name: "número de cartão", re: /\d{4}[\s-]?\d{4}[\s-]?\d{4}/g },
];

function findLine(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) {
    if (text[i] === "\n") line++;
  }
  return line;
}

export const v06PiiDetection: ValidationCheck<"V-06"> = (ctx) => {
  const errors: ValidationFailure[] = [];
  const fields = [
    { field: "systemPrompt" as const, value: ctx.systemPrompt },
    { field: "userTemplate" as const, value: ctx.userTemplate },
  ];
  for (const { field, value } of fields) {
    for (const { name, re } of PII_DETECTORS) {
      // Reset regex state each iteration; matchAll handles a fresh iterator.
      for (const match of value.matchAll(re)) {
        const line = match.index !== undefined ? findLine(value, match.index) : undefined;
        errors.push({
          code: "V-06",
          field,
          line,
          message: `Dado real detectado (${name}) em ${field} linha ${line ?? "?"}: \`${match[0]}\``,
        });
      }
    }
  }
  return errors.length > 0 ? errors : null;
};

// ─── V-07: API key detectors ────────────────────────────────────────────────
// SPEC §3.1: /sk-[a-zA-Z0-9]{20,}/, /AIza[0-9A-Za-z_-]{35}/

const API_KEY_DETECTORS: { name: string; re: RegExp }[] = [
  { name: "Anthropic", re: /sk-[a-zA-Z0-9]{20,}/g },
  { name: "Google AI", re: /AIza[0-9A-Za-z_-]{35}/g },
];

export const v07ApiKeyDetection: ValidationCheck<"V-07"> = (ctx) => {
  const errors: ValidationFailure[] = [];
  for (const field of ["systemPrompt", "userTemplate"] as const) {
    const value = ctx[field];
    for (const { name, re } of API_KEY_DETECTORS) {
      for (const match of value.matchAll(re)) {
        const line = match.index !== undefined ? findLine(value, match.index) : undefined;
        errors.push({
          code: "V-07",
          field,
          line,
          message: `Possível chave de API ${name} detectada em ${field} linha ${line ?? "?"}`,
        });
      }
    }
  }
  return errors.length > 0 ? errors : null;
};

// ─── V-08: Internal URL detectors ───────────────────────────────────────────
// SPEC §3.1: localhost, 127.0.0.1, .internal, .travel-planner.dev

const INTERNAL_URL_DETECTORS: { name: string; re: RegExp }[] = [
  { name: "localhost", re: /\blocalhost(?::\d+)?\b/g },
  { name: "127.0.0.1", re: /\b127\.0\.0\.1(?::\d+)?\b/g },
  { name: ".internal", re: /\b[\w.-]+\.internal\b/g },
  { name: ".travel-planner.dev", re: /\b[\w.-]+\.travel-planner\.dev\b/g },
];

export const v08InternalUrlDetection: ValidationCheck<"V-08"> = (ctx) => {
  const errors: ValidationFailure[] = [];
  for (const field of ["systemPrompt", "userTemplate"] as const) {
    const value = ctx[field];
    for (const { name, re } of INTERNAL_URL_DETECTORS) {
      for (const match of value.matchAll(re)) {
        const line = match.index !== undefined ? findLine(value, match.index) : undefined;
        errors.push({
          code: "V-08",
          field,
          line,
          message: `URL interna (${name}) detectada em ${field} linha ${line ?? "?"}: \`${match[0]}\``,
        });
      }
    }
  }
  return errors.length > 0 ? errors : null;
};
