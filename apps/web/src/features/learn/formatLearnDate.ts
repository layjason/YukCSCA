/** Format package/revision instants for student Learn chrome (Asia/Jakarta calendar day). */
export function formatLearnDate(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeZone: 'Asia/Jakarta',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
