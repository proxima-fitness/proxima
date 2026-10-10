// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module DayCardSourceBadge
 *
 * Corner label on a HevyDayCard (and empty Week preview slots) naming which
 * document the card shows. Tooltip is a positive one-liner; no contrast-with-
 * the-other-document copy.
 *
 * Depends on: WeekPreviewSources, tooltip
 * Used by: HevyDayCard, ProgramOverviewWeekPreview
 */

"use client";

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    DAY_CARD_SOURCE_TOOLTIPS,
    type TDayCardSource,
} from "./WeekPreviewSources";

export type TDayCardSourceBadgeProps = {
    source: TDayCardSource;
};

/**
 * @param source - Planned / In Hevy / Completed
 */
export function DayCardSourceBadge({ source }: TDayCardSourceBadgeProps) {
    const tooltip = DAY_CARD_SOURCE_TOOLTIPS[source];

    return (
        <TooltipProvider delayDuration={0}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span
                        className="cursor-help rounded-full border border-border/60 px-2 py-0.5 font-secondary text-xs text-muted-foreground"
                        data-day-source={source}
                        aria-label={`${source}: ${tooltip}`}
                        tabIndex={0}
                    >
                        {source}
                    </span>
                </TooltipTrigger>
                <TooltipContent
                    side="top"
                    className="max-w-[240px] bg-lightSecondary text-left leading-snug text-white"
                >
                    {tooltip}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
