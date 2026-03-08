"use client";

import dynamic from "next/dynamic";

/**
 * Client-only wrapper for AppSidebar so it can be loaded with ssr: false
 * (dynamic with ssr: false is only allowed in Client Components).
 */
export const AppSidebarDynamic = dynamic(
    () => import("@/components/AppSidebar").then((m) => ({ default: m.AppSidebar })),
    { ssr: false }
);
