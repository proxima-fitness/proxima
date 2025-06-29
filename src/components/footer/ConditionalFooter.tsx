"use client";

import { usePathname } from "next/navigation";
import { Footer } from "./Footer";
import styles from "@/style";

export function ConditionalFooter() {
    const pathname = usePathname();

    // Don't render footer on program-builder pages
    if (pathname?.includes("program-builder") || pathname?.includes("chat")) {
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
