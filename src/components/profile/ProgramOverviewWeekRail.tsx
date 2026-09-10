/**
 * @module ProgramOverviewWeekRail
 *
 * Week status rail for Program overview (ADR 0020 / 02): vertical list on md+,
 * horizontal scroll chips on small screens. Selection drives Selected week.
 *
 * Depends on: cn, ProgramOverviewWeekStatus
 * Used by: ProgramOverviewWeekList
 */

import { cn } from "@/lib/utils";
import {
    weekStatusLabel,
    type TProgramOverviewWeekRowModel,
    type TProgramOverviewWeekStatus,
} from "./ProgramOverviewWeekStatus";

export type TProgramOverviewWeekRailProps = {
    rows: readonly TProgramOverviewWeekRowModel[];
    selectedWeek: number;
    onSelectWeek: (week: number) => void;
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
}: TProgramOverviewWeekRailProps) {
    return (
        <>
            <div
                className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:hidden"
                role="listbox"
                aria-label="Program weeks"
            >
                {rows.map((row) => {
                    const selected = row.week === selectedWeek;
                    return (
                        <button
                            key={row.week}
                            type="button"
                            role="option"
                            aria-selected={selected}
                            data-week-status={row.status}
                            onClick={() => onSelectWeek(row.week)}
                            className={cn(
                                "shrink-0 rounded-full border px-3 py-1.5 text-left text-xs font-medium tracking-wide transition-colors",
                                chipTone(row.status, selected),
                            )}
                        >
                            <span className="block">Week {row.week}</span>
                            <span className="block opacity-80">{weekStatusLabel(row.status)}</span>
                        </button>
                    );
                })}
            </div>

            <nav
                className="hidden w-40 shrink-0 md:block lg:w-44"
                aria-label="Program weeks"
            >
                <ul className="flex list-none flex-col p-0" role="listbox">
                    {rows.map((row) => {
                        const selected = row.week === selectedWeek;
                        return (
                            <li key={row.week} className="list-none">
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={selected}
                                    data-week-status={row.status}
                                    onClick={() => onSelectWeek(row.week)}
                                    className={cn(
                                        "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition-colors",
                                        selected
                                            ? "bg-muted/50"
                                            : "hover:bg-muted",
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "text-sm",
                                            selected
                                                ? "font-semibold text-foreground"
                                                : "font-medium text-foreground",
                                        )}
                                    >
                                        Week {row.week}
                                    </span>
                                    <span
                                        className={cn(
                                            "text-xs tracking-wide",
                                            statusTone(row.status),
                                            selected && row.status === "current" && "font-medium",
                                        )}
                                    >
                                        {weekStatusLabel(row.status)}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </>
    );
}
