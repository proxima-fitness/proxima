/**
 * @module profileSectionChrome
 *
 * Shared profile section Card class + header (icon / title / description / action).
 * One outer surface per profile section — no nested decorative cards.
 *
 * Used by: ProfileContent, ProgramOverviewSection, ProfileStatisticsSection,
 *          ProfileCalendarSection, BlindSpotAnalysisSection, RecentWorkoutsSection
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Outer profile section Card — roomy padding, single surface. */
export const PROFILE_SECTION_CARD_CLASS =
    "rounded-2xl border border-border/60 bg-card px-4 py-5 shadow-sm sm:px-6 sm:py-6";

export type TProfileSectionHeaderProps = {
    id?: string;
    title: ReactNode;
    icon?: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
    className?: string;
};

/**
 * Quiet section header: h2 + optional description + optional right action.
 */
export function ProfileSectionHeader({
    id,
    title,
    icon,
    description,
    action,
    className,
}: TProfileSectionHeaderProps) {
    return (
        <div
            className={cn(
                "flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between",
                className,
            )}
        >
            <div className="min-w-0 space-y-0.5">
                <h2
                    id={id}
                    className="flex flex-wrap items-center gap-1.5 text-lg font-semibold tracking-tight text-foreground"
                >
                    {icon}
                    {title}
                </h2>
                {description ? (
                    <div className="text-xs text-muted-foreground">{description}</div>
                ) : null}
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
        </div>
    );
}
