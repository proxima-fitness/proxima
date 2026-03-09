import * as React from "react";

/**
 * @module use-mobile
 * Convenience hook for determining whether the viewport is considered mobile.
 *
 * Depends on: browser `matchMedia` API, React hooks.
 * Used by: Layout and navigation components that need to switch between mobile and desktop UI.
 */

const MOBILE_BREAKPOINT = 768;

/**
 * Returns whether the current viewport width is below the given breakpoint.
 *
 * @param breakpoint - Width in px; viewport narrower than this is considered mobile (default 768).
 * @returns `true` when the viewport is narrower than the breakpoint, otherwise `false`.
 */
export function useIsMobile(breakpoint: number = MOBILE_BREAKPOINT) {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < breakpoint);
    return () => mql.removeEventListener("change", onChange);
  }, [breakpoint]);

  return !!isMobile;
}
