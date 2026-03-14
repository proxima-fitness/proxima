"use client";

/**
 * Syncs the theme-color meta tag with the resolved theme from next-themes.
 * Ensures the PWA status bar (e.g. on iOS) matches light/dark mode.
 * Must be rendered inside ThemeProvider.
 */
import { useEffect } from "react";
import { useTheme } from "next-themes";

export function ThemeColorMeta() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (typeof document === "undefined" || !resolvedTheme) return;

    // Remove any existing theme-color metas (from viewport export or prior updates)
    document.querySelectorAll('meta[name="theme-color"]').forEach((el) => el.remove());

    const meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    meta.setAttribute("content", resolvedTheme === "light" ? "#ffffff" : "#000000");
    document.head.appendChild(meta);
  }, [resolvedTheme]);

  return null;
}
