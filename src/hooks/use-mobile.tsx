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
 * Returns whether the current viewport width is below the mobile breakpoint.
 *
 * @returns `true` when the viewport is narrower than `MOBILE_BREAKPOINT`, otherwise `false`.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
