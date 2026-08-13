import { useCallback, useState } from 'react';

export const DESKTOP_NAV_EXPANDED_KEY = 'yukcsca.desktopNavExpanded';

function readStoredExpanded(): boolean {
  try {
    return window.localStorage.getItem(DESKTOP_NAV_EXPANDED_KEY) !== '0';
  } catch {
    return true;
  }
}

export function useDesktopNavExpanded(): {
  expanded: boolean;
  toggle: () => void;
} {
  const [expanded, setExpanded] = useState(readStoredExpanded);

  const toggle = useCallback(() => {
    setExpanded((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(DESKTOP_NAV_EXPANDED_KEY, next ? '1' : '0');
      } catch {
        /* private mode */
      }
      return next;
    });
  }, []);

  return { expanded, toggle };
}
