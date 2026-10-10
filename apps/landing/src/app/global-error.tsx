"use client";

/**
 * @module global-error
 *
 * Root-level error boundary for the app. Renders a full-document fallback when
 * an uncaught error occurs anywhere in the tree (replaces the root layout).
 * Sits at src/app/global-error.tsx; Next.js mounts it in place of the normal
 * layout when a critical error is thrown.
 *
 * Used by: Next.js App Router (automatic).
 */

/**
 * Renders the global error UI. Must return a full <html><body> shell because
 * it replaces the root layout.
 *
 * @param props.error - The thrown Error instance (logged to console).
 */

export default function GlobalError({
    error,
    reset,
  }: {
    error: Error & { digest?: string }
    reset: () => void
  }) {
    console.error("global-error:", error);
    return (
      // global-error must include html and body tags
      <html>
        <body>
          <h2>Something went wrong!</h2>
          <button onClick={() => reset()}>Try again</button>
        </body>
      </html>
    )
  }
