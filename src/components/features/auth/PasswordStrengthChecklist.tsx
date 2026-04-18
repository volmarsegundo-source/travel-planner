"use client";

import { useTranslations } from "next-intl";

/* ────────────────────────────────────────────────────────────────────────────
 * Inline SVG Icons — Check and Cross
 * ──────────────────────────────────────────────────────────────────────────── */

function CheckIcon() {
  return (
    <svg
      className="size-4 text-green-600"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg
      className="size-4 text-muted-foreground"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Password Strength Criteria
 * ──────────────────────────────────────────────────────────────────────────── */

const MIN_PASSWORD_LENGTH = 8;

interface Criterion {
  key: string;
  test: (password: string) => boolean;
}

const CRITERIA: Criterion[] = [
  {
    key: "minLength",
    test: (p) => p.length >= MIN_PASSWORD_LENGTH,
  },
  {
    key: "uppercase",
    test: (p) => /[A-Z]/.test(p),
  },
  {
    key: "number",
    test: (p) => /[0-9]/.test(p),
  },
  {
    key: "special",
    test: (p) => /[^A-Za-z0-9]/.test(p),
  },
];

/* ────────────────────────────────────────────────────────────────────────────
 * Component
 * ──────────────────────────────────────────────────────────────────────────── */

interface PasswordStrengthChecklistProps {
  password: string;
}

export function PasswordStrengthChecklist({
  password,
}: PasswordStrengthChecklistProps) {
  const t = useTranslations("passwordStrength");

  return (
    <ul
      aria-live="polite"
      className="mt-2 space-y-1 text-sm"
      data-testid="password-strength-checklist"
    >
      {CRITERIA.map(({ key, test }) => {
        const met = test(password);
        return (
          <li
            key={key}
            className={`flex items-center gap-2 ${met ? "text-green-600" : "text-muted-foreground"}`}
            data-testid={`criterion-${key}`}
          >
            {met ? <CheckIcon /> : <CrossIcon />}
            <span>{t(key)}</span>
          </li>
        );
      })}
    </ul>
  );
}
