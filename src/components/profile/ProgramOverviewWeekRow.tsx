/**
 * @module ProgramOverviewWeekRow
 *
 * One consecutive week row inside a Program overview slide (ADR 0010).
 * Status label + optional CTAs on the current week (Mark complete / Edit week).
 *
 * Depends on: cn, Button, Link, ProgramOverviewWeekStatus
 * Used by: ProgramOverviewWeekList
 */

import Link from "next/link";
import { Check, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    weekStatusLabel,
    type TProgramOverviewWeekStatus,
} from "./ProgramOverviewWeekStatus";

export type TProgramOverviewWeekRowProps = {
    week: number;
    status: TProgramOverviewWeekStatus;
    programId: number;
    /** Show Mark complete + Edit current week (current week only). */
    showActions?: boolean;
    canMarkComplete?: boolean;
    onMarkComplete?: () => void;
    markCompleteDisabled?: boolean;
};

function statusClassName(status: TProgramOverviewWeekStatus): string {
    switch (status) {
        case "current":
            return "font-medium text-lightSecondary";
        case "complete":
            return "text-muted-foreground";
        case "not_exported":
            return "text-muted-foreground/80";
    }
}

/**
 * Renders a single overview week row (label + status + optional CTAs).
 */
export function ProgramOverviewWeekRow({
    week,
    status,
    programId,
    showActions = false,
    canMarkComplete = false,
    onMarkComplete,
    markCompleteDisabled = false,
}: TProgramOverviewWeekRowProps) {
    const label = weekStatusLabel(status);
    return (
        <li
            className={cn(
                "flex flex-col gap-2 border-b border-border/40 py-2.5 last:border-b-0",
                status === "current" && "bg-muted/30 px-2 -mx-2 rounded-lg sm:px-3 sm:-mx-3",
            )}
        >
            <div className="flex items-center justify-between gap-3">
                <span
                    className={cn(
                        "text-sm text-foreground",
                        status === "current" ? "font-semibold" : "font-medium",
                    )}
                >
                    Week {week}
                </span>
                <span
                    className={cn("text-xs tracking-wide sm:text-sm", statusClassName(status))}
                    data-week-status={status}
                >
                    {label}
                </span>
            </div>
            {showActions ? (
                <div className="flex flex-wrap items-center gap-2">
                    {canMarkComplete ? (
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-full"
                            disabled={markCompleteDisabled}
                            onClick={onMarkComplete}
                        >
                            <Check className="size-3.5" aria-hidden />
                            Mark complete
                        </Button>
                    ) : null}
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 rounded-full text-muted-foreground"
                        asChild
                    >
                        {/* Stub until ADR 0013 Hevy-folder Edit current week arrival */}
                        <Link href={`/build-program?shareId=${programId}&editWeek=${week}`}>
                            <Pencil className="size-3.5" aria-hidden />
                            Edit week
                        </Link>
                    </Button>
                </div>
            ) : null}
        </li>
    );
}
