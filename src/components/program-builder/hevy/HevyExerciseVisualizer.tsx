"use client";

/**
 * @module HevyExerciseVisualizer
 * Renders the list of exercises for one day: each row shows thumbnail, title, sets/reps/intensity, superset styling,
 * and tooltip/actions (reason, notes, rest, add note, delete). Supports edit mode for superset selection (checkboxes).
 * Depends on: HevyExerciseGif, useHevyExercises, formatWeight/getWeightUnit, Tooltip.
 * Used by: HevyDayCard.
 */

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePoundsOrKgContext } from "@/contexts/PoundsOrKgContext";
import { formatWeight, getWeightUnit } from "@/lib/weightUtils";
import { LinkIcon, NotebookTextIcon, TimerIcon, Trash2Icon, XIcon } from "lucide-react";
import { HevyExerciseGif } from "./HevyExerciseGif";
import { useHevyExercises } from "@/api/hooks";
import { useMediaQuery } from "@/hooks/use-media-query";

/** Props for the exercise list within a day card. */
interface IProps {
    /** The day (routine) whose exercises are displayed. */
    day: THevyRoutine;
    /** Week index (folder_id) for callbacks. */
    folder_id: number;
    /** Deletes an exercise at the given week/day/index. */
    handleDeleteExercise: (folder_id: number, dayOrder: number, exerciseIndex: number) => void;
    /** Opens the add-exercise dialog in edit mode with the given exercise data. */
    handleEdit: (currentWeek: number, currentDay: number, exerciseIndex: number, editExercise: THevyExercise) => void;
    /** Opens the add-exercise-note dialog for a specific exercise. */
    handleOpenAddExerciseNoteDialog: (addExerciseNoteDialog: THevyDialog) => void;
    /** When true, rows show checkboxes for superset selection instead of opening edit. */
    editMode: boolean;
    /** Indices of exercises currently selected for superset. */
    selectedExercises: number[];
    /** Toggles selection of an exercise by index. */
    toggleExerciseSelection: (exerciseIndex: number) => void;
    /** Removes an exercise from its superset. */
    removeFromSuperset: (exerciseIndex: number) => void;
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
    } = props;

    const { isInLbs } = usePoundsOrKgContext();
    const { data: hevyExercises, isLoading } = useHevyExercises();
    const isSm = useMediaQuery("(min-width: 640px)");

    const editHandler = (e: React.MouseEvent<HTMLButtonElement>, folder_id: number, dayOrder: number, i: number, exercise: THevyExercise) => {
        if (editMode) {
            e.stopPropagation();
            toggleExerciseSelection(i);
        } else {
            handleEdit(folder_id, Number(day.order), i, exercise);
        }
    }

    // Wait for hevyExercises to load before rendering to ensure images display
    if (isLoading || !hevyExercises) {
        return <div></div>;
    }

    return (
        <div>
            {day?.exercises?.map((exercise: THevyExercise, i: number) => {
                const isSelected = selectedExercises.includes(i);
                const supersetColor = getSupersetColor(exercise.supersets_id);
                const isEvenRow = i % 2 === 0;
                const isLastRow = i === (day?.exercises?.length ?? 0) - 1;

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
                        : 'bg-extraLightGray dark:bg-[#1a2332]';

                const rowProps = {
                    onClick: (e: React.MouseEvent) => editHandler(e as unknown as React.MouseEvent<HTMLButtonElement>, Number(folder_id), Number(day.order), i, exercise),
                    className: `w-full min-h-14 border-gray-200 cursor-pointer appearance-none p-0 m-0 text-left font-inherit focus:outline-hidden focus-visible:ring-2 focus-visible:ring-lightSecondary focus-visible:ring-inset ${rowBackgroundClass} ${supersetColor && !isSelected ? 'border-r-4' : ''}`,
                    style: supersetColor && !isSelected ? borderStyle : {},
                };

                const rowContent = (
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        className="w-full"
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault();
                                                if (editMode) {
                                                    toggleExerciseSelection(i);
                                                } else {
                                                    handleEdit(Number(folder_id), Number(day.order), i, exercise);
                                                }
                                            }
                                        }}
                                    >
                                        {exercise.supersets_id !== null && exercise.supersets_id !== undefined && !editMode && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeFromSuperset(i);
                                                }}
                                                className="text-black w-full pt-2 hover:text-red-500"
                                                title="Remove from superset"
                                            >
                                                <span className="flex flex-row justify-between items-center w-full dark:text-white">
                                                    <XIcon className="w-4 h-4" />
                                                    <span className="text-xs flex flex-row items-center gap-2 pr-2"> <LinkIcon className="w-4 h-4" /> Superset {exercise.supersets_id + 1}</span>
                                                </span>
                                            </button>
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
                                                        onChange={() => toggleExerciseSelection(i)}
                                                        className="w-4 h-4 accent-white"
                                                    />
                                                </div>
                                            ) : (
                                                <span className="hidden sm:block">{i + 1}</span>
                                            )}
                                            {!editMode && (
                                                <Trash2Icon
                                                    className="block sm:hidden size-4"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        handleDeleteExercise(Number(folder_id), Number(day.order), i);
                                                    }}
                                                />
                                            )}
                                        </div>
                                        <HevyExerciseGif thumbnailOrImage={"thmb"} name={exercise.title} gif_id={hevyExercises?.find((hevyExercise: THevyExerciseTemplate) => hevyExercise.id === exercise.exercise_template_id)?.gif_id} resolution={"180"} file_type={'jpg'} />
                                        <div className="flex flex-row items-center justify-between">
                                            <div className={isSelected ? 'text-white' : 'dark:text-offWhite'}>
                                                {exercise.title}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`text-center flex flex-row items-center justify-end max-w-[50%] w-[50%] ${isSelected ? 'text-white' : 'dark:text-offWhite'}`}>
                                        <div className="min-w-[33%] flex flex-col justify-center items-center">
                                            {exercise.sets.length}
                                        </div>
                                        <div className="min-w-[33%] flex flex-col justify-center items-center">
                                            {exercise.sets[0] && exercise.sets[0].reps !== null && exercise.sets[0].reps > 0 && (
                                                (exercise.sets.every((reps, i, arr) => reps.reps === arr[0].reps) && exercise.sets.every((reps, i, arr) => reps.type === arr[0].type)) ? (
                                                    <div className="flex flex-row">
                                                        {exercise.sets[0].reps}
                                                    </div>
                                                ) : (
                                                    exercise.sets.map((set, index) => (
                                                        <div key={index} className={`flex flex-row ${set.type === "warmup" ? "text-white bg-gray-300 px-1 rounded-sm" : set.type === "dropset" ? "text-white bg-[#33bbcf] px-1 rounded-sm" : set.type === "failure" ? "text-white bg-[#01579B] px-1 rounded-sm" : ""}`}>
                                                            {set.reps}
                                                        </div>
                                                    ))
                                                )
                                            )}
                                            {exercise.sets[0] && exercise.sets[0].distance_meters !== null && exercise.sets[0].distance_meters > 0 && (
                                                (exercise.sets.every((reps, i, arr) => reps.distance_meters === arr[0].distance_meters) && exercise.sets.every((reps, i, arr) => reps.type === arr[0].type)) ? (
                                                    <div className="flex flex-row">{exercise.sets[0].distance_meters} m</div>
                                                ) : (
                                                    exercise.sets.map((set, index) => (
                                                        <div key={index} className={`flex flex-row ${set.type === "warmup" ? "text-white bg-gray-300 px-1 rounded-sm" : set.type === "dropset" ? "text-white bg-[#33bbcf] px-1 rounded-sm" : set.type === "failure" ? "text-white bg-[#01579B] px-1 rounded-sm" : ""}`}>
                                                            {set.distance_meters} m
                                                        </div>
                                                    ))
                                                )
                                            )}
                                            {exercise.sets[0] && exercise.sets[0].duration_seconds !== null && exercise.sets[0].duration_seconds > 0 && (
                                                (exercise.sets.every((reps, i, arr) => reps.duration_seconds === arr[0].duration_seconds) && exercise.sets.every((reps, i, arr) => reps.type === arr[0].type)) ? (
                                                    <div className="flex flex-row">{exercise.sets[0].duration_seconds} s</div>
                                                ) : (
                                                    exercise.sets.map((set, index) => (
                                                        <div key={index} className={`flex flex-row ${set.type === "warmup" ? "text-white bg-gray-300 px-1 rounded-sm" : set.type === "dropset" ? "text-white bg-[#33bbcf] px-1 rounded-sm" : set.type === "failure" ? "text-white bg-[#01579B] px-1 rounded-sm" : ""}`}>
                                                            {set.duration_seconds} s
                                                        </div>
                                                    ))
                                                )
                                            )}
                                            {exercise.sets[0] && exercise.sets[0].custom_metric !== null && exercise.sets[0].custom_metric > 0 && (
                                                (exercise.sets.every((reps, i, arr) => reps.custom_metric === arr[0].custom_metric) && exercise.sets.every((reps, i, arr) => reps.type === arr[0].type)) ? (
                                                    <div className="flex flex-row">{exercise.sets[0].custom_metric}</div>
                                                ) : (
                                                    exercise.sets.map((set, index) => (
                                                        <div key={index} className={`flex flex-row ${set.type === "warmup" ? "text-white bg-gray-300 px-1 rounded-sm" : set.type === "dropset" ? "text-white bg-[#33bbcf] px-1 rounded-sm" : set.type === "failure" ? "text-white bg-[#01579B] px-1 rounded-sm" : ""}`}>
                                                            {set.custom_metric}
                                                        </div>
                                                    ))
                                                )
                                            )}
                                        </div>
                                        <div className="min-w-[33%] flex flex-col justify-center items-center h-full">
                                            {exercise.sets[0] && exercise.sets[0].weight_kg !== null && exercise.sets[0].weight_kg > 0 && (
                                                exercise.sets.every((intensity, i, arr) => intensity.weight_kg === arr[0].weight_kg) ? (
                                                    <div>{ formatWeight(exercise.sets[0].weight_kg, isInLbs, "kg") } {getWeightUnit(isInLbs)}</div>
                                                ) : (
                                                    exercise.sets.map((set, index) => (
                                                        <div key={index} className={`${set.type === "warmup" ? "text-white bg-gray-300 px-1 rounded-sm" : set.type === "dropset" ? "text-white bg-[#33bbcf] px-1 rounded-sm" : set.type === "failure" ? "text-white bg-[#01579B] px-1 rounded-sm" : ""}`}>
                                                            { formatWeight(set.weight_kg ?? 0, isInLbs, "kg") } {getWeightUnit(isInLbs)}
                                                        </div>
                                                    ))
                                                )
                                            )}
                                            {exercise.sets.some((set) => set.rpe != null && set.rpe > 0) && (
                                                (() => {
                                                    const rpeValues = exercise.sets.map((s) => s.rpe).filter((r): r is number => r != null && r > 0);
                                                    const allSameRpe = rpeValues.length > 0 && rpeValues.every((v) => v === rpeValues[0]);
                                                    return allSameRpe ? (
                                                        <div>{rpeValues[0]} RPE</div>
                                                    ) : (
                                                        exercise.sets.map((set, index) => (
                                                            <div key={index} className={`${set.type === "warmup" ? "text-white bg-gray-300 px-1 rounded-sm" : set.type === "dropset" ? "text-white bg-[#33bbcf] px-1 rounded-sm" : set.type === "failure" ? "text-white bg-[#01579B] px-1 rounded-sm" : ""}`}>
                                                                {set.rpe != null && set.rpe > 0 ? `${set.rpe} RPE` : ""}
                                                            </div>
                                                        ))
                                                    );
                                                })()
                                            )}
                                        </div>
                                    </div>
                                    </div>
                                </div>
                );

                return (
                    <span key={"Week" + (Number(folder_id) + 1) + "Day" + i} className="contents">
                        {isSm ? (
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
                                        className="bg-lightSecondary text-white flex flex-col p-3 max-w-[260px] rounded-md shadow-lg"
                                    >
                                {exercise.reason && (
                                    <>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-white/90 mb-1.5">
                                            Why this exercise?
                                        </p>
                                        <p className="text-sm text-left leading-snug whitespace-normal">
                                            {exercise.reason}
                                        </p>
                                    </>
                                )}
                                <div
                                    className={`flex flex-col ${exercise.reason && exercise.notes ? "border-t border-white/25 pt-2 mt-1" : ""}`}
                                >
                                    {exercise.notes && (
                                        <div className="mb-2">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-white/90 mb-1.5">
                                                Exercise Note
                                            </p>
                                            <p className="text-sm text-left leading-snug whitespace-normal">
                                                {exercise.notes}
                                            </p>
                                        </div>
                                    )}
                                    {exercise.rest_seconds && Number(exercise.rest_seconds) > 0 && (
                                        <div className="border-t border-b border-white/25 py-2 my-2 flex items-center gap-1.5 text-sm">
                                            <TimerIcon className="shrink-0 size-5" />
                                            Rest time {exercise.rest_seconds} s
                                        </div>
                                    )}
                                    <div className="flex flex-row items-center gap-4">
                                        <button
                                            type="button"
                                            className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 text-sm"
                                            onClick={() => handleOpenAddExerciseNoteDialog({folder_id: Number(folder_id), dayOrder: Number(day.order), exerciseIndex: i, isOpen: true})}
                                        >
                                            <NotebookTextIcon className="shrink-0 size-5" />
                                            <span>Add note</span>
                                        </button>
                                        <button
                                            type="button"
                                            className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 text-sm"
                                            onClick={() => {
                                                handleDeleteExercise(Number(folder_id), Number(day.order), i);
                                            }}
                                        >
                                            <Trash2Icon className="shrink-0 size-5" />
                                            <span>Delete</span>
                                        </button>
                                    </div>
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
