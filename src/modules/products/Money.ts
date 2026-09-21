const PRICE_PATTERN = /^(\d{1,9})(?:\.(\d{1,2}))?$/;

export function parsePrice(s: unknown): number | null {
  if (typeof s !== "string") return null;
  const match = PRICE_PATTERN.exec(s);
  if (!match) return null;
  const cents = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return cents > 0 ? cents : null;
}

export function formatPrice(cents: number): string {
  const whole = Math.trunc(cents / 100);
  const fraction = String(cents % 100).padStart(2, "0");
  return `${whole}.${fraction}`;
}
