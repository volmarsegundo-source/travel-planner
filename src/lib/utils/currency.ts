/**
 * Currency formatting utilities.
 *
 * Provides locale-aware currency defaults and consistent formatting
 * across the application using Intl.NumberFormat.
 */

// ─── Default currency by locale ──────────────────────────────────────────────

const LOCALE_CURRENCY_MAP: Record<string, string> = {
  "pt-BR": "BRL",
  en: "USD",
};

const FALLBACK_CURRENCY = "USD";

/**
 * Returns the default currency code for a given locale.
 * Falls back to USD for unknown locales.
 */
export function getDefaultCurrency(locale: string): string {
  return LOCALE_CURRENCY_MAP[locale] ?? FALLBACK_CURRENCY;
}

// ─── Currency formatting ─────────────────────────────────────────────────────

/**
 * Formats a numeric value as a currency string using Intl.NumberFormat.
 *
 * @param value - The numeric amount to format
 * @param currency - ISO 4217 currency code (e.g., "BRL", "USD", "EUR")
 * @param locale - BCP 47 locale string (e.g., "pt-BR", "en")
 * @returns Formatted currency string (e.g., "R$ 1.500,00" or "$1,500.00")
 */
export function formatCurrency(
  value: number,
  currency: string,
  locale: string
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}
