/**
 * @module AiWeekSuggestPanel
 *
 * **AI week suggest** disclosure on a Program overview slide (ADR 0012 / 02).
 * Collapsed by default; the first expand POSTs `/api/programs/week-suggest`,
 * so nothing is generated on mark-complete, Export, or a plain profile visit.
 * The server caches one generation per program + completed week, so re-opening
 * (or a remount) replays the same suggestion without another model call.
 *
 * Apply lands in Sub-plan 3 — pass `onApply` to enable the button.
 *
 * Depends on: react-query, PoundsOrKgContext, Collapsible, Button, Skeleton,
 *             week-suggest response types
 * Used by: ProgramOverviewCtas (AI week suggest slot)
 */

"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Sparkles } from "lucide-react";
import type {
    TWeekSuggestChange,
    TWeekSuggestResponse,
} from "@/app/api/programs/week-suggest/input";
import { usePoundsOrKgContext } from "@/contexts/PoundsOrKgContext";
import { Button } from "@/components/ui/button";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Query key root — Sub-plan 3 invalidates this after an apply. */
export const AI_WEEK_SUGGEST_QUERY_KEY = ["ai-week-suggest"] as const;

export type TAiWeekSuggestPanelProps = {
    programId: number;
    /** Weeks with a Program–Hevy link (a linked week N+1 is already exported). */
    linkedWeeks: readonly number[];
    /** Weeks that are Week complete (persisted or auto-derived). */
    completedWeeks: readonly number[];
    programLength: number | null;
    /** Apply handler (ADR 0012 / 03); omitted → Apply renders disabled. */
    onApply?: (suggestion: {
        targetWeek: number;
        changes: TWeekSuggestChange[];
    }) => void;
    isApplying?: boolean;
};

export type TWeekSuggestEntry =
    | { visible: false }
    | { visible: true; basedOnWeek: number; targetWeek: number };

/**
 * Whether the suggest disclosure belongs on this slide, and for which weeks.
 * Mirrors the server's target rule so a program with nothing to suggest never
 * renders a trigger — the endpoint stays authoritative for the content.
 *
 * @param completedWeeks - Weeks marked Week complete
 * @param linkedWeeks - Weeks already exported to Hevy
 * @param programLength - Weeks in the prescription (null = unknown)
 */
export function resolveWeekSuggestEntry(
    completedWeeks: readonly number[],
    linkedWeeks: readonly number[],
    programLength: number | null,
): TWeekSuggestEntry {
    if (completedWeeks.length === 0) {
        return { visible: false };
    }

    const basedOnWeek = Math.max(...completedWeeks);
    const targetWeek = basedOnWeek + 1;

    if (programLength != null && programLength > 0 && targetWeek > programLength) {
        return { visible: false };
    }

    if (linkedWeeks.includes(targetWeek)) {
        return { visible: false };
    }

    return { visible: true, basedOnWeek, targetWeek };
}

/**
 * Fetches (or replays the cached) suggestion for this program's next week.
 *
 * @param programId - Proxima program id
 * @param isInLbs - User weight display preference, for sensible increments
 */
async function fetchWeekSuggestion(
    programId: number,
    isInLbs: boolean,
): Promise<TWeekSuggestResponse> {
    const response = await fetch("/api/programs/week-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId, isInLbs }),
    });

    if (!response.ok) {
        throw new Error(`Week suggest failed (${response.status})`);
    }

    return (await response.json()) as TWeekSuggestResponse;
}

function PanelSkeleton() {
    return (
        <div className="space-y-2 pt-1" aria-hidden>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-2/3" />
        </div>
    );
}

function formatGeneratedAt(generatedAt: string): string | null {
    const parsed = new Date(generatedAt);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }
    return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Collapsed suggest disclosure; generates week N+1 changes on first expand.
 */
export function AiWeekSuggestPanel({
    programId,
    linkedWeeks,
    completedWeeks,
    programLength,
    onApply,
    isApplying = false,
}: TAiWeekSuggestPanelProps) {
    const { isInLbs } = usePoundsOrKgContext();
    const [open, setOpen] = useState(false);

    const entry = resolveWeekSuggestEntry(completedWeeks, linkedWeeks, programLength);
    const basedOnWeek = entry.visible ? entry.basedOnWeek : null;

    const {
        data,
        isFetching,
        isError,
        refetch,
    } = useQuery({
        queryKey: [...AI_WEEK_SUGGEST_QUERY_KEY, programId, basedOnWeek],
        queryFn: () => fetchWeekSuggestion(programId, isInLbs),
        // Fetch on expand only — never on mount, never on mark-complete.
        enabled: open && entry.visible,
        staleTime: Infinity,
        retry: false,
        refetchOnWindowFocus: false,
    });

    if (!entry.visible) {
        return null;
    }

    const suggestion = data?.status === "ok" ? data : null;
    const notReady = data?.status === "not_ready" ? data : null;
    const generatedAt = suggestion ? formatGeneratedAt(suggestion.generatedAt) : null;

    return (
        <Collapsible
            open={open}
            onOpenChange={setOpen}
            className="rounded-xl border border-border/50 bg-muted/20"
            data-ai-week-suggest
        >
            <CollapsibleTrigger
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
                aria-label={
                    open
                        ? `Collapse AI suggestions for week ${entry.targetWeek}`
                        : `Suggest changes for week ${entry.targetWeek}`
                }
            >
                <Sparkles className="size-4 shrink-0 text-lightSecondary" aria-hidden />
                <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">
                        Suggest week {entry.targetWeek}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                        Progression from how week {entry.basedOnWeek} went
                    </span>
                </span>
                <ChevronRight
                    className={cn(
                        "size-4 shrink-0 text-muted-foreground transition-transform",
                        open && "rotate-90",
                    )}
                    aria-hidden
                />
            </CollapsibleTrigger>

            <CollapsibleContent className="px-3 pb-3">
                {isFetching ? (
                    <PanelSkeleton />
                ) : isError ? (
                    <div className="space-y-2 pt-1">
                        <p className="text-sm text-muted-foreground">
                            Couldn&apos;t generate suggestions right now.
                        </p>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-full"
                            onClick={() => {
                                void refetch();
                            }}
                        >
                            Try again
                        </Button>
                    </div>
                ) : notReady ? (
                    <p className="pt-1 text-sm text-muted-foreground">{notReady.message}</p>
                ) : suggestion ? (
                    <div className="space-y-3 pt-1">
                        <p className="text-sm text-foreground">{suggestion.summary}</p>

                        {suggestion.changes.length > 0 ? (
                            <ul className="space-y-1.5">
                                {suggestion.changes.map((change, index) => (
                                    <li
                                        key={`${change.operation.op}-${change.operation.dayOrder}-${change.operation.exerciseIndex}-${index}`}
                                        className="flex gap-2 text-sm text-muted-foreground"
                                    >
                                        <span aria-hidden>·</span>
                                        <span className="min-w-0">{change.description}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                No changes suggested — export week {suggestion.targetWeek} as
                                planned.
                            </p>
                        )}

                        <div className="flex flex-wrap items-center gap-2">
                            {suggestion.changes.length > 0 ? (
                                <Button
                                    type="button"
                                    size="sm"
                                    className="h-8 rounded-full bg-lightSecondary text-white hover:bg-lightSecondary/90"
                                    // Apply write lands in ADR 0012 / 03.
                                    disabled={!onApply || isApplying}
                                    title={
                                        onApply
                                            ? undefined
                                            : "Applying suggestions is coming soon."
                                    }
                                    onClick={() =>
                                        onApply?.({
                                            targetWeek: suggestion.targetWeek,
                                            changes: suggestion.changes,
                                        })
                                    }
                                >
                                    {isApplying
                                        ? "Applying…"
                                        : `Apply to week ${suggestion.targetWeek}`}
                                </Button>
                            ) : null}
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-8 rounded-full text-muted-foreground"
                                onClick={() => setOpen(false)}
                            >
                                Skip
                            </Button>
                        </div>

                        {generatedAt ? (
                            <p className="text-[11px] text-muted-foreground">
                                Generated {generatedAt}
                            </p>
                        ) : null}
                    </div>
                ) : null}
            </CollapsibleContent>
        </Collapsible>
    );
}
