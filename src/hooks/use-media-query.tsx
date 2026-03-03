import * as React from "react"

/**
 * @module use-media-query
 * React hook wrapper around `window.matchMedia` for subscribing to CSS media query changes.
 *
 * Depends on: browser `matchMedia` API, React hooks.
 * Used by: Components that need to adapt layout or behavior based on viewport characteristics.
 */

/**
 * Subscribes to a CSS media query and returns whether it currently matches.
 *
 * @param query Media query string, for example `(max-width: 768px)`.
 * @returns `true` when the query matches the current viewport, otherwise `false`.
 */
export function useMediaQuery(query: string) {
  const [value, setValue] = React.useState(false)

  React.useEffect(() => {
    function onChange(event: MediaQueryListEvent) {
      setValue(event.matches)
    }

    const result = matchMedia(query)
    result.addEventListener("change", onChange)
    setValue(result.matches)

    return () => result.removeEventListener("change", onChange)
  }, [query])

  return value
}