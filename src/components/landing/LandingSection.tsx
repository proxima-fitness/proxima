/**
 * @module LandingSection
 * Shared section shell for homepage bands - teal tint or white surfaces with consistent padding.
 */

import { cn } from "@/lib/utils";
import styles, { layout } from "@/style";

export type LandingSectionVariant = "white" | "tint";

interface ILandingSectionProps {
    id?: string;
    variant: LandingSectionVariant;
    children: React.ReactNode;
    className?: string;
}

const variantClasses: Record<LandingSectionVariant, string> = {
    white: "bg-white dark:bg-darkGray",
    tint: "bg-extraLightGray dark:bg-blueGray/40",
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
