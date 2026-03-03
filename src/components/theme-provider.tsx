"use client"

/**
 * @module theme-provider
 * Wraps next-themes ThemeProvider so the app can switch and persist light/dark/system theme.
 * Depends on: next-themes.
 * Used by: root layout (wraps app tree).
 */
import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

/** Props: same as next-themes ThemeProvider (e.g. children, defaultTheme, storageKey). */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
