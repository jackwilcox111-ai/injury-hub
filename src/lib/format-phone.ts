/**
 * Formats a phone string to (XXX) XXX-XXXX convention.
 * Handles 10-digit and 11-digit (leading 1) numbers.
 * Returns original string if it can't be parsed.
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  const d = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (d.length === 10) {
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  return phone;
}
