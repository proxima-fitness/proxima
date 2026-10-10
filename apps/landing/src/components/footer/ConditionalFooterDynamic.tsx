// SPDX-License-Identifier: AGPL-3.0-only

"use client";

import dynamic from "next/dynamic";

/**
 * Client-only wrapper for ConditionalFooter so it can be loaded with ssr: false
 * (dynamic with ssr: false is only allowed in Client Components).
 */
export const ConditionalFooterDynamic = dynamic(
    () => import("./ConditionalFooter").then((m) => ({ default: m.ConditionalFooter })),
    { ssr: false }
);
