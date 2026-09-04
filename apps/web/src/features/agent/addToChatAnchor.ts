export type AddToChatAnchor = {
  top: number;
  left: number;
  place: 'above' | 'below';
  fallback: boolean;
};

const PILL_HALF_PX = 96;
const EDGE_PX = 8;
const TOP_SAFE_PX = 48;

export interface ClientRectLike {
  top: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
}

export function addToChatAnchorFromRect(
  rect: ClientRectLike | null,
  viewport: { width: number; height: number },
): AddToChatAnchor {
  const fallbackLeft = viewport.width / 2;
  const fallback: AddToChatAnchor = {
    top: Math.max(viewport.height * 0.28, TOP_SAFE_PX),
    left: fallbackLeft,
    place: 'above',
    fallback: true,
  };
  if (!rect || (rect.width <= 0 && rect.height <= 0)) return fallback;

  const minLeft = PILL_HALF_PX + EDGE_PX;
  const maxLeft = Math.max(minLeft, viewport.width - PILL_HALF_PX - EDGE_PX);
  const left = Math.min(Math.max(rect.left + rect.width / 2, minLeft), maxLeft);
  const place: 'above' | 'below' = rect.top < TOP_SAFE_PX + 44 ? 'below' : 'above';
  return {
    top: place === 'above' ? rect.top : rect.bottom,
    left,
    place,
    fallback: false,
  };
}

export function firstRangeRect(range: Range | null): ClientRectLike | null {
  if (!range) return null;
  const rects =
    typeof range.getClientRects === 'function' ? Array.from(range.getClientRects()) : [];
  const fromList = rects.find((row) => row.width > 0 || row.height > 0);
  if (fromList) return fromList;
  if (typeof range.getBoundingClientRect !== 'function') return null;
  const box = range.getBoundingClientRect();
  if (box.width > 0 || box.height > 0) return box;
  return null;
}
