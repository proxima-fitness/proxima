// SPDX-License-Identifier: AGPL-3.0-only

"use client";

/*
 * @module ConditionalFooter
 * @description Wrapper component that decides whether to render the global footer based on the current route.
 * @dependsOn Next.js pathname hook, shared layout styles, and the `Footer` presentational component.
 * @usedBy Application shell layouts so program-builder style flows can opt out of showing the marketing footer.
 */

import { usePathname } from "next/navigation";
import { Footer } from "./Footer";
import styles from "@/style";

/**
 * ConditionalFooter hides the footer on focus-first flows such as the program builder while rendering it elsewhere.
 */
export function ConditionalFooter() {
    const pathname = usePathname();

    // Don't render footer on program-builder pages
    if (pathname?.includes("build-program") || pathname?.includes("program-filters")) {
        return null;
    }

    return (
        <div className={ `bg-primary ${styles.paddingX} ${styles.flexCenter} flex-col` }>
            <div className={ `${styles.boxWidth}` }>
                <Footer />
            </div>
        </div>
    );
}
