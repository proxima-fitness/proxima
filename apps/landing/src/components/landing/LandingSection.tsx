// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module LandingSection
 * Shared section shell for homepage bands - alternating elevated / recessed surfaces.
 */

import { cn } from "@/lib/utils";
import styles, { layout } from "@/style";

interface ILandingSectionProps {
    id?: string;
    variant: TLandingSectionVariant;
    children: React.ReactNode;
    className?: string;
}

/** Dark: tint stays blueGray/40 (How it works unchanged); white recesses for contrast. */
const variantClasses: Record<TLandingSectionVariant, string> = {
    white: "bg-white dark:bg-background",
    tint: "bg-[#f2f5f8] dark:bg-blueGray/40",
};

export const LandingSection: React.FC<ILandingSectionProps> = ({
    id,
    variant,
    children,
    className,
}) => {
    return (
        <section
            id={id}
            className={cn(
                variantClasses[variant],
                layout.sectionTop,
                styles.paddingX,
                "pt-10 pb-12",
                className,
            )}
        >
            <div className={cn(styles.boxWidth, "mx-auto w-full")}>{children}</div>
        </section>
    );
};
