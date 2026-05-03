// Locale: pt-PT date formatting
// Story 2.1 fills in full formatters (Intl.DateTimeFormat pt-PT)

export function toISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function fromISODate(isoDate: string): Date {
  return new Date(isoDate + "T00:00:00");
}

export function daysUntilExpiry(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(iso);
  expiry.setHours(0, 0, 0, 0);
  return Math.round(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
}
