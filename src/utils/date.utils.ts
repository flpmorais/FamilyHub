// Locale: pt-PT date formatting
// Story 2.1 fills in full formatters (Intl.DateTimeFormat pt-PT)

export function toISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function fromISODate(isoDate: string): Date {
  return new Date(isoDate + "T00:00:00");
}

export function daysUntilExpiry(iso: string): number {
  const now = new Date();
  const expiry = new Date(iso);
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
