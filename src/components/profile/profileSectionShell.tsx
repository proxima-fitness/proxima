/**
 * @module profileSectionShell
 *
 * Shared profile section Card class + header (icon / title / description / action).
 * One outer surface per profile section — no nested decorative cards.
 *
 * Used by: ProfileContent, ProgramOverviewSection, ProfileStatisticsSection,
 *          ProfileCalendarSection, BlindSpotAnalysisSection, RecentWorkoutsSection,
 *          EditProfileContent
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** White Hevy-style card surface: no light-mode border or shadow. */
export const PROFILE_SECTION_CARD_SURFACE_CLASS =
    "rounded-2xl border-0 bg-card shadow-none dark:border dark:border-white/10";

/** Outer profile section Card — shared surface + section padding. */
export const PROFILE_SECTION_CARD_CLASS =
    `${PROFILE_SECTION_CARD_SURFACE_CLASS} px-4 py-5 sm:px-6 sm:py-6`;

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
