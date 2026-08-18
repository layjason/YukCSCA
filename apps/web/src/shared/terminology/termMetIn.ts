import type { TFunction } from 'i18next';
import type { TermMetIn } from './types';

function topicTitle(metIn: TermMetIn, interfaceLanguage: string): string {
  const text = metIn.topicTitle;
  if (!text) return '';
  const order =
    interfaceLanguage === 'id'
      ? [text.indonesian, text.english, text.simplifiedChinese]
      : interfaceLanguage === 'zh-CN'
        ? [text.simplifiedChinese, text.english, text.indonesian]
        : [text.english, text.indonesian, text.simplifiedChinese];
  return order.find((value) => value?.trim())?.trim() ?? '';
}

export function formatMetInLine(metIn: TermMetIn, interfaceLanguage: string, t: TFunction): string {
  const topic = topicTitle(metIn, interfaceLanguage);
  return t('terminology.metIn', {
    place: t(`terminology.place.${metIn.place}`),
    topic: topic ? t('terminology.metInTopic', { topic }) : '',
  });
}
