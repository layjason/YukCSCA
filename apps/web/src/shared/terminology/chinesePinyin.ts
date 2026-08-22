import { pinyin } from 'pinyin-pro';

const HAN = /[\u3400-\u9fff]/;

/** Tone-marked pinyin for admin auto-fill. Empty when the surface has no Chinese. */
export function generatedPinyin(text: string): string {
  const trimmed = text.trim();
  if (!trimmed || !HAN.test(trimmed)) {
    return '';
  }
  return pinyin(trimmed, {
    toneType: 'symbol',
    type: 'string',
    nonZh: 'consecutive',
  }).trim();
}

/**
 * Fill pinyin from the Chinese surface unless the admin already corrected it.
 * A value that still matches the previous auto-fill is treated as generated.
 */
export function nextPinyin(previousText: string, previousPinyin: string, nextText: string): string {
  const generated = generatedPinyin(nextText);
  const previousGenerated = generatedPinyin(previousText);
  if (!previousPinyin.trim() || previousPinyin.trim() === previousGenerated) {
    return generated;
  }
  return previousPinyin;
}
