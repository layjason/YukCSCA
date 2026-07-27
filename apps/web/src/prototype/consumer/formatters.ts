function resolveLocale(language: string): string {
  if (language.startsWith('zh')) return 'zh-CN';
  if (language.startsWith('id')) return 'id-ID';
  return 'en';
}

export function formatIDR(amount: number, language: string): string {
  return new Intl.NumberFormat(resolveLocale(language), {
    style: 'currency',
    currency: 'IDR',
  }).format(amount);
}

export function formatDate(value: string, language: string): string {
  return new Intl.DateTimeFormat(resolveLocale(language), {
    dateStyle: 'medium',
  }).format(new Date(value));
}

export function formatDateTime(value: string, language: string): string {
  return new Intl.DateTimeFormat(resolveLocale(language), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
