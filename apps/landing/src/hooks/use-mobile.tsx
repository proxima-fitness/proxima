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
  const query = `(max-width: ${breakpoint - 1}px)`;

  const subscribe = React.useCallback(
    (onStoreChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onStoreChange);
      return () => mql.removeEventListener("change", onStoreChange);
    },
    [query],
  );

  const getSnapshot = React.useCallback(() => window.matchMedia(query).matches, [query]);

  return React.useSyncExternalStore(subscribe, getSnapshot, () => false);
}
