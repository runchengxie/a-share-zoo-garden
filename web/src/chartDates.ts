export function formatChartMonth(date: string): string {
  const compact = /^(\d{4})(\d{2})\d{2}$/.exec(date);
  if (compact) return `${compact[1]}-${compact[2]}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.slice(0, 7) : date;
}

/** Format date-only values without applying the reader's local time zone. */
export function formatDisplayDate(value: string, locale: string): string {
  const match = /^(\d{4})-?(\d{2})-?(\d{2})$/.exec(value);
  if (!match) return value;
  const iso = `${match[1]}-${match[2]}-${match[3]}`;
  const date = new Date(`${iso}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== iso) return value;
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date);
}
