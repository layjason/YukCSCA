/**
 * Format package/revision instants for admin chrome (Asia/Jakarta date + time).
 * Example (en): "Aug 10, 2026, 3:42 PM"
 */
export function formatAdminDate(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Jakarta',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
