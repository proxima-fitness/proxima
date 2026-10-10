// SPDX-License-Identifier: AGPL-3.0-only

"use client";

/*
 * @module ExerciseStalls
 * @description Presentational component that lists exercises with recent history, trend lines, and stall indicators, with optional pagination and upsell.
 * @dependsOn Card, button, separator, pagination, and skeleton UI primitives, media query hooks, and unit formatting helpers.
 * @usedBy `BlindSpotAnalysisSection` to visualize potential lift plateaus and provide navigation to explore fixes or more exercises.
 */
import * as React from "react";
import { useState, useMemo } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, ArrowRight, PlusIcon, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useMediaQuery } from "@/hooks/use-media-query";
import { usePoundsOrKgContext } from "@/contexts/PoundsOrKgContext";
import { formatWeight as formatWeightUtil, getWeightUnit as getWeightUnitUtil } from "@/lib/weightUtils";
import Link from "next/link";
import {
    Pagination,
    PaginationContent,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

const BLIND_SPOT_STRINGS = {
    BlindSpotAnalysis: "Blind Spot Analysis",
    Last15Workouts: "Last 15 workouts",
    NoData: "No data",
    RecentSessions: "Recent sessions",
    Volume: "Volume",
    MaxWeight: "Max weight",
    StallDetected: "Stall detected",
    ExploreFixes: "Explore fixes",
    ViewMoreExercises: "View more exercises",
} as const;

function getPaginationPages(currentPage: number, totalPages: number): (number | "…")[] {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 3) return [1, 2, 3, "…", totalPages];
    if (currentPage >= totalPages - 2) return [1, "…", totalPages - 2, totalPages - 1, totalPages];
    return [1, "…", currentPage, "…", totalPages];
}

interface IProps {
    exercises: TExerciseStallResult[];
    onExploreFixes?: (exercise: TExerciseStallResult) => void;
    onViewMore?: () => void;
    viewMoreHref?: string;
    /** When false, the "View more exercises" button is hidden (e.g. when all exercises are already shown). Default true. */
    showViewMore?: boolean;
    /** When true, cards show exercise names but skeleton placeholders for weight, trend, and session data (e.g. while exercise history is loading). */
    dataLoading?: boolean;
    /** Current page (1-based). When set with totalPages and onPageChange, pagination UI is shown. */
    currentPage?: number;
    /** Total number of pages. When > 1 and onPageChange is set, pagination UI is shown. */
    totalPages?: number;
    /** Label above the exercise grid (depth hint). */
    performancesLabel?: string;
    /** Called when user selects a page. */
    onPageChange?: (page: number) => void;
}

/** Status accent colors — muted so the rail doesn't read as a traffic-light stripe. */
const STATUS_INK: Record<string, string> = {
    green: "#5B8F6E",
    yellow: "#C4A35A",
    red: "#C47A74",
};

function statusInk(color: string): string {
    return STATUS_INK[color] ?? "var(--muted-foreground)";
}

const MiniTrendGraph: React.FC<{ trend: number[]; color: string }> = ({ trend, color }) => {
    const maxValue = Math.max(...trend);
    const minValue = Math.min(...trend);
    const range = maxValue - minValue || 1;
    const width = 60;
    const height = 30;
    const padding = 4;

    const points = trend.map((value, index) => {
        const x = padding + (index / (trend.length - 1 || 1)) * (width - 2 * padding);
        const y = height - padding - ((value - minValue) / range) * (height - 2 * padding);
        return `${x},${y}`;
    }).join(" ");

    return (
        <svg width={width} height={height} className="block">
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};

/**
 * ExerciseStalls renders a responsive grid of exercise cards with trendlines, expandable session history, stall warnings, and optional pagination.
 */
export const ExerciseStalls: React.FC<IProps> = (props) => {
    const {
        exercises,
        onExploreFixes,
        onViewMore,
        viewMoreHref,
        showViewMore = true,
        dataLoading = false,
        currentPage,
        totalPages,
        onPageChange,
        performancesLabel = BLIND_SPOT_STRINGS.Last15Workouts,
    } = props;
    const { isInLbs } = usePoundsOrKgContext();

    const isLg = useMediaQuery("(min-width: 1024px)");
    const isSm = useMediaQuery("(min-width: 640px)");
    const gridColumns = useMemo(() => (isLg ? 3 : isSm ? 2 : 1), [isLg, isSm]);
    const [expandedRow, setExpandedRow] = useState<number | null>(null);

    const handleExploreFixes = (exercise: TExerciseStallResult) => {
        onExploreFixes?.(exercise);
    };

    const handleViewMore = () => {
        onViewMore?.();
    };

    const handleExerciseClick = (cardIndex: number) => {
        const rowIndex = Math.floor(cardIndex / gridColumns);
        if (expandedRow === rowIndex) {
            setExpandedRow(null);
        } else {
            setExpandedRow(rowIndex);
        }
    };

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        } catch {
            return dateString;
        }
    };

    return (
        <div className="pt-2 w-full max-w-full overflow-hidden px-0 box-border">
            <div className="flex justify-between items-center mb-2 w-full max-w-full box-border">
                <div className="text-xs text-muted-foreground shrink-0">
                    {performancesLabel}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-3 w-full max-w-full box-border items-stretch">
                {exercises.map((exercise, index) => {
                    const rowIndex = Math.floor(index / gridColumns);
                    const colorValue = exercise.weight > 0 ? statusInk(exercise.color) : "var(--muted-foreground)";
                    const isExpanded = expandedRow === rowIndex;
                    const hasSessions = !dataLoading && exercise.sessions && exercise.sessions.length > 0;
                    const showStallFooter = exercise.hasStall && exercise.weight > 0 && !dataLoading;

                    return (
                        <Card
                            key={exercise.name}
                            className="relative flex h-full w-full flex-col box-border border border-border/40 bg-muted/20 shadow-none"
                        >
                            <span
                                aria-hidden
                                className="pointer-events-none absolute inset-y-2.5 left-2 w-0.5 rounded-full opacity-70"
                                style={{ backgroundColor: colorValue }}
                            />
                            <CardContent className="flex flex-1 flex-col p-3 pl-4">
                                {/* Top section: Exercise name, weight, and trend line */}
                                <div
                                    className={`flex justify-between items-center w-full ${isExpanded ? "mb-2" : ""} ${hasSessions ? "cursor-pointer" : ""}`}
                                    onClick={(e) => {
                                        if (hasSessions) {
                                            e.stopPropagation();
                                            handleExerciseClick(index);
                                        }
                                    }}
                                >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <div
                                            className="w-2.5 h-2.5 rounded-full shrink-0"
                                            style={{ backgroundColor: dataLoading ? "var(--muted-foreground, #999)" : colorValue }}
                                        />
                                        <div className="flex-1 min-w-0 overflow-hidden">
                                            <div className="text-sm font-bold mb-0.5 overflow-hidden text-ellipsis whitespace-nowrap">
                                                {exercise.name}
                                            </div>
                                            {dataLoading ? (
                                                <div className="flex items-baseline gap-1 min-h-6">
                                                    <Skeleton className="h-4 w-14 rounded-full bg-muted-foreground/15" />
                                                    <Skeleton className="h-3 w-6 rounded-full bg-muted-foreground/10" />
                                                </div>
                                            ) : exercise.weight > 0 ? (
                                                <div className="text-base font-bold text-gray-500 dark:text-offWhite min-h-6 flex items-center">
                                                    {formatWeightUtil(exercise.weight, isInLbs, "lbs")} {getWeightUnitUtil(isInLbs)}
                                                </div>
                                            ) : (
                                                <div className="text-xs text-muted-foreground min-h-6 flex items-center">
                                                    {BLIND_SPOT_STRINGS.NoData}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {dataLoading ? (
                                            <div className="flex items-end gap-0.5 h-[30px] w-[60px]" aria-hidden>
                                                {[0.4, 0.6, 0.35, 0.75, 0.5, 0.65, 0.45, 0.8, 0.55, 0.7].map((h, i) => (
                                                    <Skeleton
                                                        key={i}
                                                        className="flex-1 min-w-[3px] rounded-t bg-muted-foreground/15"
                                                        style={{ height: `${Math.max(20, h * 100)}%` }}
                                                    />
                                                ))}
                                            </div>
                                        ) : (
                                            <MiniTrendGraph trend={exercise.trend} color={colorValue} />
                                        )}
                                        {hasSessions && (
                                            <span className="text-muted-foreground">
                                                {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Expanded session history */}
                                {isExpanded && hasSessions && !dataLoading && (
                                    <>
                                        <Separator className="my-2" />
                                        <div className="pt-0 pb-2 w-full">
                                            <div className="text-[11px] font-bold text-muted-foreground mb-1.5 uppercase">
                                                {BLIND_SPOT_STRINGS.RecentSessions}
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                {exercise.sessions?.map((session) => (
                                                    <div
                                                        key={session.workoutId}
                                                        className="flex justify-between items-center py-1.5 px-2.5 rounded-md bg-muted/50 dark:bg-black/20"
                                                    >
                                                        <div className="flex flex-col gap-1">
                                                            <div className="text-xs text-muted-foreground">
                                                                {formatDate(session.date)}
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-4 items-center">
                                                            <div className="flex flex-col items-end gap-0.5">
                                                                <div className="text-[10px] text-muted-foreground uppercase">
                                                                    {BLIND_SPOT_STRINGS.Volume}
                                                                </div>
                                                                <div className="text-sm font-bold text-foreground">
                                                                    {session.totalVolume < 0.01
                                                                        ? (session.totalReps ?? 0) > 0
                                                                            ? `${session.totalReps} reps x BW`
                                                                            : "BW"
                                                                        : `${formatWeightUtil(session.totalVolume, isInLbs, "lbs")} ${getWeightUnitUtil(isInLbs)}`}
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col items-end gap-0.5">
                                                                <div className="text-[10px] text-muted-foreground uppercase">
                                                                    {BLIND_SPOT_STRINGS.MaxWeight}
                                                                </div>
                                                                <div className="text-sm font-bold text-darkGray dark:text-offWhite">
                                                                    {session.maxWeight < 0.01
                                                                        ? `BW ${getWeightUnitUtil(isInLbs)}`
                                                                        : `${formatWeightUtil(session.maxWeight, isInLbs, "lbs")} ${getWeightUnitUtil(isInLbs)}`}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div
                                    className={`mt-auto flex min-h-10 items-center pt-2 ${
                                        showStallFooter ? "border-t border-border" : ""
                                    }`}
                                >
                                    {showStallFooter ? (
                                        <div className="flex w-full flex-row items-center justify-between gap-2">
                                            <div className="flex min-w-0 flex-1 items-center gap-2">
                                                <AlertTriangle className="size-4 shrink-0 text-red-600" />
                                                <span className="text-xs text-red-600">
                                                    {BLIND_SPOT_STRINGS.StallDetected}
                                                </span>
                                            </div>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleExploreFixes(exercise)}
                                                className="h-8 shrink-0 px-3 text-xs text-white hover:bg-red-900 bg-red-700 dark:bg-destructive dark:text-destructive-foreground dark:hover:bg-destructive/90"
                                            >
                                                {BLIND_SPOT_STRINGS.ExploreFixes}{" "}
                                                <ArrowRight className="ml-1 size-4" />
                                            </Button>
                                        </div>
                                    ) : null}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {totalPages != null && totalPages > 1 && currentPage != null && onPageChange && (
                <Pagination className="pt-2">
                    <PaginationContent>
                        <PaginationPrevious
                            className="h-9 text-sm"
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                if (currentPage > 1) onPageChange(currentPage - 1);
                            }}
                        />
                        {getPaginationPages(currentPage, totalPages).map((page, index) =>
                            page === "…" ? (
                                <PaginationLink
                                    key={index}
                                    className="h-9 text-sm"
                                    href="#"
                                    onClick={(e) => e.preventDefault()}
                                >
                                    …
                                </PaginationLink>
                            ) : (
                                <PaginationLink
                                    key={index}
                                    className="h-9 text-sm"
                                    href="#"
                                    isActive={currentPage === page}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onPageChange(page);
                                    }}
                                >
                                    {page}
                                </PaginationLink>
                            ),
                        )}
                        <PaginationNext
                            className="h-9 text-sm"
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                if (currentPage < totalPages) onPageChange(currentPage + 1);
                            }}
                        />
                    </PaginationContent>
                </Pagination>
            )}

            {showViewMore && (
                <div className="w-full pt-2 max-w-full box-border overflow-hidden flex justify-center">
                    {viewMoreHref ? (
                        <Button size="sm" asChild className="mt-1 w-[200px] bg-lightGold text-black hover:bg-lightGold hover:text-black">
                            <Link href={viewMoreHref}>
                                {BLIND_SPOT_STRINGS.ViewMoreExercises}
                                <Crown className="size-4 ml-1" />
                            </Link>
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            onClick={handleViewMore}
                            className="mt-1 w-[200px] bg-lightGold text-black hover:bg-lightGold hover:text-black"
                        >
                            {BLIND_SPOT_STRINGS.ViewMoreExercises}
                            <PlusIcon className="size-4 ml-1" />
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
};
