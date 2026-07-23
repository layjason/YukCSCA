import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export function RouteFocusManager(): React.JSX.Element | null {
  const location = useLocation();
  const previousPath = useRef(location.pathname);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      previousPath.current = location.pathname;
      return;
    }

    if (previousPath.current === location.pathname) return;
    previousPath.current = location.pathname;

    const target =
      document.querySelector<HTMLElement>('#main-content h1') ??
      document.querySelector<HTMLElement>('#main-content [data-focus-target]');

    if (target) {
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: false });
    }
  }, [location.pathname]);

  return null;
}
