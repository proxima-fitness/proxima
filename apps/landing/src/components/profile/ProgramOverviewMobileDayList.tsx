// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module ProgramOverviewMobileDayList
 *
 * Under-md Week preview body: compact exercise rows (thumbnail, title,
 * sets · reps) instead of HevyDayCard. First {@link MOBILE_DAY_LIST_PREVIEW_COUNT}
 * exercises, then "+N more". Tap opens HevyExerciseDetailsDialog.
 * Planned vs completed = stacked lists with Day card source badges.
 *
 * Depends on: HevyExerciseGif, HevyExerciseDetailsDialog, DayCardSourceBadge,
 *             ProgramOverviewWeekPreviewModel, WeekPreviewSources
 * Used by: ProgramOverviewWeekPreview
 */

"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { HevyExerciseDetailsDialog } from "@/components/program-builder/hevy/HevyExerciseDetailsDialog";
import { HevyExerciseGif } from "@/components/program-builder/hevy/HevyExerciseGif";
import { cn } from "@/lib/utils";
import { DayCardSourceBadge } from "./DayCardSourceBadge";
import {
    MOBILE_DAY_LIST_PREVIEW_COUNT,
    summarizeExercisePrescription,
} from "./ProgramOverviewWeekPreviewModel";
import {
    EMPTY_IN_HEVY_FOLDER_EXPLAINER,
    EMPTY_IN_HEVY_FOLDER_TITLE,
    type TWeekPreviewSlot,
} from "./WeekPreviewSources";

export type TProgramOverviewMobileDayListProps = {
    slots: readonly TWeekPreviewSlot[];
    hevyExercises: THevyExerciseTemplate[] | undefined;
};

function findTemplate(
    hevyExercises: THevyExerciseTemplate[] | undefined,
    templateId: string | undefined,
): THevyExerciseTemplate | undefined {
    if (!templateId || !hevyExercises) {
        return undefined;
    }
    return hevyExercises.find((template) => template.id === templateId);
}

function MobileExerciseRows({
    routine,
    hevyExercises,
    onOpenDetails,
}: {
    routine: THevyRoutine;
    hevyExercises: THevyExerciseTemplate[] | undefined;
    onOpenDetails: (template: THevyExerciseTemplate | undefined) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const exercises = (routine.exercises ?? []).filter(
        (exercise): exercise is THevyExercise => exercise != null,
    );
    const visible = expanded
        ? exercises
        : exercises.slice(0, MOBILE_DAY_LIST_PREVIEW_COUNT);
    const hiddenCount = exercises.length - visible.length;

    return (
        <div className="flex flex-col">
            {visible.map((exercise, index) => {
                const title = exercise.title ?? "Unknown exercise";
                const template = findTemplate(
                    hevyExercises,
                    exercise.exercise_template_id,
                );
                const summary = summarizeExercisePrescription(exercise.sets);
                return (
                    <button
                        key={`${exercise.exercise_template_id ?? title}-${index}`}
                        type="button"
                        className={cn(
                            "flex w-full items-center gap-3 border-b border-border/40 py-3 text-left last:border-b-0",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lightSecondary focus-visible:ring-inset",
                        )}
                        onClick={() => onOpenDetails(template)}
                    >
                        <div className="size-11 shrink-0 overflow-hidden rounded-md bg-muted">
                            <HevyExerciseGif
                                thumbnailOrImage="thmb"
                                name={title}
                                gif_id={template?.gif_id}
                                resolution="180"
                                file_type="jpg"
                            />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-foreground">
                                {title}
                            </p>
                            {summary ? (
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {summary}
                                </p>
                            ) : null}
                        </div>
                        <ChevronRight
                            className="size-4 shrink-0 text-muted-foreground"
                            aria-hidden
                        />
                    </button>
                );
            })}
            {hiddenCount > 0 ? (
                <button
                    type="button"
                    className="w-full py-2.5 text-center text-sm text-muted-foreground hover:text-foreground"
                    onClick={() => setExpanded(true)}
                >
                    +{hiddenCount} more exercise{hiddenCount === 1 ? "" : "s"}
                </button>
            ) : null}
        </div>
    );
}

function MobileSlotBody({
    slot,
    hevyExercises,
    onOpenDetails,
}: {
    slot: TWeekPreviewSlot;
    hevyExercises: THevyExerciseTemplate[] | undefined;
    onOpenDetails: (template: THevyExerciseTemplate | undefined) => void;
}) {
    if (slot.routine == null) {
        const isEmptyHevyFolder = slot.source === "In Hevy";
        return (
            <div
                className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-center"
                data-day-source={slot.source}
            >
                {isEmptyHevyFolder ? (
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">
                            {EMPTY_IN_HEVY_FOLDER_TITLE}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {EMPTY_IN_HEVY_FOLDER_EXPLAINER}
                        </p>
                    </div>
                ) : slot.emptyCopy ? (
                    <p className="text-sm text-muted-foreground">{slot.emptyCopy}</p>
                ) : null}
            </div>
        );
    }

    return (
        <div data-day-source={slot.source}>
            {slot.routine.title ? (
                <p className="mb-1 text-sm font-medium text-foreground">
                    {slot.routine.title}
                </p>
            ) : null}
            <MobileExerciseRows
                routine={slot.routine}
                hevyExercises={hevyExercises}
                onOpenDetails={onOpenDetails}
            />
        </div>
    );
}

/**
 * Compact mobile Week preview for one day's slot(s).
 */
export function ProgramOverviewMobileDayList({
    slots,
    hevyExercises,
}: TProgramOverviewMobileDayListProps) {
    const [detailsExercise, setDetailsExercise] = useState<
        THevyExerciseTemplate | undefined
    >(undefined);
    const isPair = slots.length > 1;

    return (
        <div className="flex flex-col gap-4" data-mobile-day-list>
            <HevyExerciseDetailsDialog
                isOpen={!!detailsExercise}
                onClose={() => setDetailsExercise(undefined)}
                exercise={detailsExercise}
            />
            {slots.map((slot, slotIndex) => (
                <div key={`${slot.source}-${slotIndex}`} className="min-w-0">
                    {isPair ? (
                        <div className="mb-2 flex justify-end">
                            <DayCardSourceBadge source={slot.source} />
                        </div>
                    ) : null}
                    <MobileSlotBody
                        slot={slot}
                        hevyExercises={hevyExercises}
                        onOpenDetails={setDetailsExercise}
                    />
                </div>
            ))}
        </div>
    );
}
