"use client";

/**
 * @module HevyExerciseVisualizer
 * Renders the list of exercises for one day: each row shows thumbnail, title, sets/reps/intensity, superset styling,
 * and tooltip/actions (reason, notes, rest, details, add note, delete). Supports edit mode for superset selection (checkboxes).
 * Depends on: HevyExerciseGif, HevyExerciseDetailsDialog, formatWeight, Tooltip.
 * Used by: HevyDayCard.
 */

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePoundsOrKgContext } from "@/contexts/PoundsOrKgContext";
import {
    renderRepsColumn,
    renderRpeColumn,
    renderSetsCount,
    renderWeightColumn,
} from "./hevyPrescriptionDisplay";
import { InfoIcon, LinkIcon, NotebookTextIcon, TimerIcon, Trash2Icon, XIcon } from "lucide-react";
import { HevyExerciseGif } from "./HevyExerciseGif";
import { HevyExerciseDetailsDialog } from "./HevyExerciseDetailsDialog";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useState } from "react";
import { useIsAgentStreaming } from "@/contexts/ProgramMutationContext";

/** Props for the exercise list within a day card. */
interface IProps {
    /** The day (routine) whose exercises are displayed. */
    day: THevyRoutine;
    /** Week index (folder_id) for callbacks. */
    folder_id: number;
    /** Deletes an exercise at the given week/day/index. */
    handleDeleteExercise?: (folder_id: number, dayOrder: number, exerciseIndex: number) => void;
    /** Opens the add-exercise dialog in edit mode with the given exercise data. */
    handleEdit?: (currentWeek: number, currentDay: number, exerciseIndex: number, editExercise: THevyExercise) => void;
    /** Opens the add-exercise-note dialog for a specific exercise. */
    handleOpenAddExerciseNoteDialog?: (addExerciseNoteDialog: THevyDialog) => void;
    /** When true, rows show checkboxes for superset selection instead of opening edit. */
    editMode: boolean;
    /** Indices of exercises currently selected for superset. */
    selectedExercises: number[];
    /** Toggles selection of an exercise by index. */
    toggleExerciseSelection: (exerciseIndex: number) => void;
    /** Removes an exercise from its superset. */
    removeFromSuperset: (exerciseIndex: number) => void;
    /** Global Hevy exercise library from parent (for thumbnails); undefined while loading. */
    hevyExercises?: THevyExerciseTemplate[];
    /** Read-only logged workout rows — no edit/delete/add-note actions. */
    readOnly?: boolean;
}

// Color palette for supersets - distinct colors that work in both light and dark modes
const SUPERSET_COLORS = [
    "#fbbf24", // Golden yellow (contrasts well with lightSecondary teal)
    "#8b5cf6", // Purple
    "#10b981", // Green
    "#f59e0b", // Orange
    "#ef4444", // Red
    "#3b82f6", // Blue
    "#ec4899", // Pink
    "#14b8a6", // Cyan
];

/**
 * Gets the border color for a superset ID
 * @param supersetId - The superset ID (can be null)
 * @returns Border color string, or null if not part of a superset
 */
const getSupersetColor = (supersetId: number | null | undefined): string | null => {
    if (supersetId === null || supersetId === undefined) {
        return null;
    }
    return SUPERSET_COLORS[supersetId % SUPERSET_COLORS.length];
};

/** Normalizes CRLF and literal "\\n" sequences (e.g. from serialized AI copy) for multiline display. */
const normalizeMultilineExerciseText = (s: string): string =>
    s.replace(/\r\n/g, "\n").replace(/\\n/g, "\n");

/**
 * Renders the exercise rows for one day with thumbnails, sets/reps/intensity, superset styling, tooltips, and edit/superset actions.
 */
export const HevyExerciseVisualizer: React.FC<IProps> = (props) => {
    const {
        day,
        folder_id,
        handleEdit,
        handleDeleteExercise,
        handleOpenAddExerciseNoteDialog,
        editMode,
        selectedExercises,
        toggleExerciseSelection,
        removeFromSuperset,
        hevyExercises,
        readOnly = false,
    } = props;

    const { isInLbs } = usePoundsOrKgContext();
    const isSm = useMediaQuery("(min-width: 640px)");
    const mutationsLocked = useIsAgentStreaming();
    const [detailsExercise, setDetailsExercise] = useState<THevyExerciseTemplate | undefined>(undefined);

    const editHandler = (e: React.MouseEvent<HTMLButtonElement>, folder_id: number, dayOrder: number, i: number, exercise: THevyExercise) => {
        if (readOnly || mutationsLocked) return;
        if (editMode) {
            e.stopPropagation();
            toggleExerciseSelection(i);
        } else {
            handleEdit?.(folder_id, Number(day.order), i, exercise);
        }
    }

    return (
        <div>
            <HevyExerciseDetailsDialog
                isOpen={!!detailsExercise}
                onClose={() => setDetailsExercise(undefined)}
                exercise={detailsExercise}
            />
            {day?.exercises?.map((exercise: THevyExercise, i: number) => {
                if (exercise == null) return null;
                const exerciseTitle = exercise.title ?? "Unknown exercise";
                const isSelected = selectedExercises.includes(i);
                const supersetColor = getSupersetColor(exercise.supersets_id);
                const isEvenRow = i % 2 === 0;
                const isLastRow = i === (day?.exercises?.length ?? 0) - 1;
                const sets = (exercise.sets ?? []).filter((s): s is THevySets => s != null);

                // Build dynamic styles for superset border
                const borderStyle = supersetColor && !isSelected ? {
                    borderRightColor: supersetColor,
                    borderRightWidth: '4px',
                    borderRightStyle: 'solid' as const
                } : {};

                // Alternating row colors: selected state takes precedence
                const rowBackgroundClass = isSelected
                    ? 'bg-lightSecondary text-white'
                    : isEvenRow
                        ? 'bg-white dark:bg-darkGray'
                        : 'bg-extraLightGray dark:bg-midDarkGray';

                const rowProps = {
                    onClick: readOnly || mutationsLocked ? undefined : (e: React.MouseEvent) => editHandler(e as unknown as React.MouseEvent<HTMLButtonElement>, Number(folder_id), Number(day.order), i, exercise),
                    className: `w-full min-h-14 border-gray-200 appearance-none p-0 m-0 text-left font-inherit focus:outline-hidden focus-visible:ring-2 focus-visible:ring-lightSecondary focus-visible:ring-inset ${readOnly || mutationsLocked ? "cursor-default" : "cursor-pointer"} ${rowBackgroundClass} ${supersetColor && !isSelected ? 'border-r-4' : ''}`,
                    style: supersetColor && !isSelected ? borderStyle : {},
                };

                const rowContent = (
                                    <div
                                        role={readOnly ? undefined : "button"}
                                        tabIndex={readOnly ? undefined : 0}
                                        className="w-full"
                                        onKeyDown={readOnly ? undefined : (e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault();
                                                if (mutationsLocked) return;
                                                if (editMode) {
                                                    toggleExerciseSelection(i);
                                                } else {
                                                    handleEdit?.(Number(folder_id), Number(day.order), i, exercise);
                                                }
                                            }
                                        }}
                                    >
                                        {exercise.supersets_id !== null && exercise.supersets_id !== undefined && !editMode && (
                                            readOnly ? (
                                                <span className="flex flex-row justify-end items-center w-full pt-2">
                                                    <span className="text-xs flex flex-row items-center gap-2 pr-2 dark:text-offWhite">
                                                        <LinkIcon className="w-4 h-4" /> Superset {exercise.supersets_id + 1}
                                                    </span>
                                                </span>
                                            ) : (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (mutationsLocked) return;
                                                    removeFromSuperset(i);
                                                }}
                                                disabled={mutationsLocked}
                                                className="text-black w-full pt-2 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                                title="Remove from superset"
                                                aria-label="Remove from superset"
                                            >
                                                <span className="flex flex-row justify-between items-center w-full dark:text-white">
                                                    <XIcon className="w-4 h-4" />
                                                    <span className="text-xs flex flex-row items-center gap-2 pr-2"> <LinkIcon className="w-4 h-4" /> Superset {exercise.supersets_id + 1}</span>
                                                </span>
                                            </button>
                                            )
                                        )}
                                        { exercise.supersets_id !== null && exercise.supersets_id !== undefined && editMode && (
                                                <span className="flex flex-row justify-end items-center w-full pt-2">
                                                <span className={`text-xs flex flex-row items-center gap-2 pr-2 ${isSelected ? 'text-white' : ''}`}> <LinkIcon className="w-4 h-4" /> Superset {exercise.supersets_id + 1}</span>
                                            </span>
                                        ) }
                                <div className={`flex flex-row justify-between items-center text-xs ${isLastRow ? '' : 'border-b'} ${exercise.supersets_id && !editMode ? 'pb-2' : 'py-2'}  relative`}>
                                    <div className="flex flex-row gap-2 items-center justify-start max-w-[50%]">
                                        <div className="text-lightSecondary dark:text-white pr-1 pl-2">
                                            {editMode ? (
                                                <div className="" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        disabled={mutationsLocked}
                                                        onChange={() => { if (!mutationsLocked) toggleExerciseSelection(i); }}
                                                        className="w-4 h-4 accent-white"
                                                    />
                                                </div>
                                            ) : (
                                                <span className="hidden sm:block">{i + 1}</span>
                                            )}
                                            {!editMode && !readOnly && (
                                                <Trash2Icon
                                                    className={`block sm:hidden size-4 ${mutationsLocked ? "opacity-50 cursor-not-allowed" : ""}`}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        if (mutationsLocked) return;
                                                        handleDeleteExercise?.(Number(folder_id), Number(day.order), i);
                                                    }}
                                                />
                                            )}
                                        </div>
                                        <HevyExerciseGif thumbnailOrImage={"thmb"} name={exerciseTitle} gif_id={hevyExercises?.find((hevyExercise: THevyExerciseTemplate) => hevyExercise.id === exercise.exercise_template_id)?.gif_id} resolution={"180"} file_type={'jpg'} />
                                        <div className="flex flex-row items-center justify-between">
                                            <div className={isSelected ? 'text-white' : 'dark:text-offWhite'}>
                                                {exerciseTitle}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`text-center flex flex-row items-center justify-end max-w-[50%] w-[50%] ${isSelected ? 'text-white' : 'dark:text-offWhite'}`}>
                                        <div className="min-w-[25%] flex flex-col justify-center items-center gap-0.5">
                                            {renderSetsCount(sets, { selected: isSelected })}
                                        </div>
                                        <div className="min-w-[25%] flex flex-col justify-center items-center gap-0.5">
                                            {renderRepsColumn(sets, { selected: isSelected })}
                                        </div>
                                        <div className="min-w-[25%] flex flex-col justify-center items-center h-full gap-0.5">
                                            {renderWeightColumn(sets, isInLbs, { selected: isSelected })}
                                        </div>
                                        <div className="min-w-[25%] flex flex-col justify-center items-center h-full gap-0.5">
                                            {renderRpeColumn(sets, { selected: isSelected })}
                                        </div>
                                    </div>
                                    </div>
                                </div>
                );

                const hasExerciseTooltipContent =
                    Boolean(exercise.reason) ||
                    Boolean(exercise.notes) ||
                    Boolean(exercise.rest_seconds && Number(exercise.rest_seconds) > 0);
                const useRowTooltip = isSm || (readOnly && hasExerciseTooltipContent);

                return (
                    <span key={"Week" + (Number(folder_id) + 1) + "Day" + i} className="contents">
                        {useRowTooltip ? (
                            <TooltipProvider delayDuration={0}>
                                <Tooltip>
                                    <TooltipTrigger
                                        asChild
                                        {...rowProps}
                                    >
                                        {rowContent}
                                    </TooltipTrigger>
                                    <TooltipContent
                                        side="right"
                                        className="bg-popover text-popover-foreground border border-border border-l-4 border-l-lightSecondary flex flex-col p-3 max-w-[360px] rounded-md shadow-lg"
                                    >
                                {exercise.reason && (
                                    <>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                                            Why this exercise?
                                        </p>
                                        <p className="text-sm text-left leading-snug whitespace-pre-line">
                                            {normalizeMultilineExerciseText(exercise.reason)}
                                        </p>
                                    </>
                                )}
                                <div
                                    className={`flex flex-col ${exercise.reason && exercise.notes ? "border-t border-border pt-2 mt-1" : ""}`}
                                >
                                    {exercise.notes && (
                                        <div className="mb-2">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                                                Exercise Note
                                            </p>
                                            <p className="text-sm text-left leading-snug whitespace-pre-line">
                                                {normalizeMultilineExerciseText(exercise.notes)}
                                            </p>
                                        </div>
                                    )}
                                    {exercise.rest_seconds && Number(exercise.rest_seconds) > 0 && (
                                        <div className="border-t border-b border-border py-2 my-2 flex items-center gap-1.5 text-sm">
                                            <TimerIcon className="shrink-0 size-5" />
                                            Rest time {exercise.rest_seconds} s
                                        </div>
                                    )}
                                    {!readOnly && (
                                    <div className="flex flex-row flex-nowrap items-center gap-3">
                                        <button
                                            type="button"
                                            className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 text-sm text-foreground"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDetailsExercise(
                                                    hevyExercises?.find(
                                                        (h) => h.id === exercise.exercise_template_id,
                                                    ),
                                                );
                                            }}
                                            aria-label="Exercise details"
                                        >
                                            <InfoIcon className="shrink-0 size-5" />
                                            <span>Details</span>
                                        </button>
                                        <button
                                            type="button"
                                            className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 text-sm text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                                            disabled={mutationsLocked}
                                            onClick={() => {
                                                if (mutationsLocked) return;
                                                handleOpenAddExerciseNoteDialog?.({folder_id: Number(folder_id), dayOrder: Number(day.order), exerciseIndex: i, isOpen: true});
                                            }}
                                            aria-label="Add note to exercise"
                                        >
                                            <NotebookTextIcon className="shrink-0 size-5" />
                                            <span>Add note</span>
                                        </button>
                                        <button
                                            type="button"
                                            className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 text-sm text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                                            disabled={mutationsLocked}
                                            onClick={() => {
                                                if (mutationsLocked) return;
                                                handleDeleteExercise?.(Number(folder_id), Number(day.order), i);
                                            }}
                                            aria-label="Delete exercise"
                                        >
                                            <Trash2Icon className="shrink-0 size-5" />
                                            <span>Delete</span>
                                        </button>
                                    </div>
                                    )}
                                </div>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ) : (
                            <div {...rowProps}>
                                {rowContent}
                            </div>
                        )}
                    </span>
                );
            })}
        </div>
    );
};
