export function formatChartMonth(date: string): string {
  const compact = /^(\d{4})(\d{2})\d{2}$/.exec(date);
  if (compact) return `${compact[1]}-${compact[2]}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.slice(0, 7) : date;
}
