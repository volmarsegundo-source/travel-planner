/**
 * Brazilian phone number formatting and validation utilities.
 *
 * Handles both landline (10 digits) and mobile (11 digits) formats.
 * Format: (XX) XXXXX-XXXX or (XX) XXXX-XXXX
 */

/**
 * Formats a raw phone input into Brazilian phone format.
 * Auto-inserts parentheses and dashes as the user types.
 *
 * @param value - Raw input string (may contain digits and formatting chars)
 * @returns Formatted phone string: (XX) XXXXX-XXXX
 */
export function formatBrazilianPhone(value: string): string {
  let digits = value.replace(/\D/g, "");

  // Strip Brazilian country code (55) if present
  if (digits.length >= 12 && digits.startsWith("55")) {
    digits = digits.slice(2);
  }

  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 11)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;

  // Truncate to 11 digits max
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Validates whether a phone value is a valid Brazilian phone number.
 *
 * @param value - Phone string (formatted or raw digits)
 * @returns true if empty (optional field) or has 10-11 digits
 */
export function isValidBrazilianPhone(value: string): boolean {
  if (!value || value.trim() === "") return true; // Optional field
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 11;
}
