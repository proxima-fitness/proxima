// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module ProgramOverviewWeekRail
 *
 * Week status rail for Program overview (ADR 0020 / 02): vertical list on md+,
 * horizontal scroll chips on small screens. Selection drives Selected week.
 * The status dot is only on the Selected week; its color is that week's state
 * (not started / exported / complete). Not exported and Current have no text
 * label; Exported / Complete still do. Mobile: right-edge fade so later weeks
 * aren't flush-cut.
 *
 * Depends on: cn, ProgramOverviewWeekStatus
 * Used by: ProgramOverviewWeekList
 */

import { cn } from "@/lib/utils";
import {
    weekStatusLabel,
    weekStatusVisibleLabel,
    type TProgramOverviewWeekRowModel,
    type TProgramOverviewWeekStatus,
} from "./ProgramOverviewWeekStatus";

export type TProgramOverviewWeekRailProps = {
    rows: readonly TProgramOverviewWeekRowModel[];
    selectedWeek: number;
    onSelectWeek: (week: number) => void;
    /**
     * `both` (default): responsive chips + desktop rail.
     * `mobile` / `desktop`: one layout only (for sticky mobile chrome vs side rail).
     */
    layout?: "both" | "mobile" | "desktop";
};

function statusTone(status: TProgramOverviewWeekStatus): string {
    switch (status) {
        case "current":
            return "text-lightSecondary";
        case "complete":
            return "text-muted-foreground";
        case "exported":
            return "text-muted-foreground";
        case "not_exported":
            return "text-muted-foreground/80";
    }
}

function weekStatusDotClass(status: TProgramOverviewWeekStatus): string {
    switch (status) {
        case "not_exported":
            return "bg-foreground/25";
        case "complete":
            return "bg-green-600/55 dark:bg-green-500/55";
        case "current":
        case "exported":
            return "bg-lightSecondary/55";
    }
}

function WeekStatusDot({ status }: { status: TProgramOverviewWeekStatus }) {
    return (
        <span
            className={cn("size-1.5 shrink-0 rounded-full", weekStatusDotClass(status))}
            data-week-status-dot={status}
            aria-hidden
        />
    );
}

function chipTone(
    status: TProgramOverviewWeekStatus,
    selected: boolean,
): string {
    if (selected) {
        return "border-lightSecondary/50 bg-lightSecondary/15 text-foreground";
    }
    switch (status) {
        case "current":
            return "border-lightSecondary/40 text-lightSecondary";
        case "complete":
            return "border-border/60 text-muted-foreground";
        case "exported":
            return "border-border/50 text-muted-foreground";
        case "not_exported":
            return "border-border/40 text-muted-foreground/80";
    }
}

/**
 * Mobile chips + desktop vertical rail for picking Selected week.
 */
export function ProgramOverviewWeekRail({
    rows,
    selectedWeek,
    onSelectWeek,
    layout = "both",
}: TProgramOverviewWeekRailProps) {
    const showMobile = layout === "both" || layout === "mobile";
    const showDesktop = layout === "both" || layout === "desktop";

    return (
        <>
            {showMobile ? (
                <div
                    className={cn(
                        "flex min-w-0 items-stretch gap-1.5",
                        layout === "both" && "md:hidden",
                    )}
                    data-week-rail-mobile
                >
                    <div
                        className={cn(
                            "-mx-1 flex min-w-0 flex-1 gap-2 overflow-x-auto px-1 pb-1",
                            "[mask-image:linear-gradient(to_right,black_calc(100%-2rem),transparent)]",
                        )}
                        role="listbox"
                        aria-label="Program weeks"
                        data-week-rail-scroll
                    >
                        {rows.map((row) => {
                            const selected = row.week === selectedWeek;
                            const visibleStatus = weekStatusVisibleLabel(row.status);
                            return (
                                <button
                                    key={row.week}
                                    type="button"
                                    role="option"
                                    aria-selected={selected}
                                    aria-label={
                                        visibleStatus == null
                                            ? `Week ${row.week}, ${weekStatusLabel(row.status)}`
                                            : undefined
                                    }
                                    data-week-status={row.status}
                                    onClick={() => onSelectWeek(row.week)}
                                    className={cn(
                                        "grid shrink-0 grid-cols-[auto_0.375rem] items-center gap-x-1.5 rounded-full border px-3 py-1.5 text-left text-xs font-medium tracking-wide transition-colors",
                                        chipTone(row.status, selected),
                                    )}
                                >
                                    <span>Week {row.week}</span>
                                    {selected ? <WeekStatusDot status={row.status} /> : null}
                                    {visibleStatus != null ? (
                                        <span className="col-start-1 opacity-80">
                                            {visibleStatus}
                                        </span>
                                    ) : null}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : null}

            {showDesktop ? (
                <nav
                    className="hidden w-40 shrink-0 md:block lg:w-44"
                    aria-label="Program weeks"
                >
                    <ul className="flex list-none flex-col p-0" role="listbox">
                        {rows.map((row) => {
                            const selected = row.week === selectedWeek;
                            const visibleStatus = weekStatusVisibleLabel(row.status);
                            return (
                                <li key={row.week} className="list-none">
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected={selected}
                                        aria-label={
                                            visibleStatus == null
                                                ? `Week ${row.week}, ${weekStatusLabel(row.status)}`
                                                : undefined
                                        }
                                        data-week-status={row.status}
                                        onClick={() => onSelectWeek(row.week)}
                                        className={cn(
                                            "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 rounded-lg px-2.5 py-2 text-left transition-colors",
                                            selected
                                                ? "bg-muted/50"
                                                : "hover:bg-muted",
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "flex min-w-0 items-center gap-2 text-sm",
                                                selected
                                                    ? "font-semibold text-foreground"
                                                    : "font-medium text-foreground",
                                            )}
                                        >
                                            Week {row.week}
                                            {visibleStatus != null ? (
                                                <span
                                                    className={cn(
                                                        "text-xs font-medium tracking-wide",
                                                        statusTone(row.status),
                                                    )}
                                                >
                                                    {visibleStatus}
                                                </span>
                                            ) : null}
                                        </span>
                                        {selected ? (
                                            <WeekStatusDot status={row.status} />
                                        ) : null}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </nav>
            ) : null}
        </>
    );
}
