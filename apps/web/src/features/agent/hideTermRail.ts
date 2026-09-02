import { useEffect, useState } from 'react';

const ASK_RAIL_PX = 320;
const TERM_RAIL_PX = 400;
export const READING_MIN_PX = 560;

export function shouldHideTermRail(
  askOpen: boolean,
  viewportWidth: number,
  navWidth: number,
): boolean {
  if (!askOpen) return false;
  const remaining = viewportWidth - navWidth - ASK_RAIL_PX - TERM_RAIL_PX;
  return remaining < READING_MIN_PX;
}

export function measureNavWidth(): number {
  if (typeof document === 'undefined') return 0;
  const nav = document.querySelector('.app-nav');
  if (!(nav instanceof HTMLElement)) return 0;
  const style = window.getComputedStyle(nav);
  if (style.display === 'none') return 0;
  return nav.getBoundingClientRect().width;
}

export function useHideTermRail(askOpen: boolean): boolean {
  const [hide, setHide] = useState(false);
  useEffect(() => {
    function measure(): void {
      setHide(shouldHideTermRail(askOpen, window.innerWidth, measureNavWidth()));
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [askOpen]);
  return hide;
}
