"use client";

/**
 * @module HevyDayCard
 * Single day card in the Hevy program builder: draggable card with title, notes indicator, exercise list,
 * add exercise button, superset creation, and dropdown (delete, edit title, add note, duplicate day). Keyboard shortcuts when focused.
 * Depends on: HevyExerciseVisualizer, HevyDuplicateDay, DropIndicator, convertHevyExerciseIntoHevyAddExercise, DayCardSourceBadge, SessionGoalBadge.
 * Used by: HevyColumn (one per day in that week).
 */

import { motion } from "framer-motion";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EllipsisIcon, PlusIcon, NotebookTextIcon, LinkIcon, Check } from "lucide-react";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropIndicator } from "@/components/program-builder/shared/DropIndicator";
import { HevyExerciseVisualizer } from "./HevyExerciseVisualizer";
import { HevyDuplicateDay } from "./HevyDuplicateDay";
import { convertHevyExerciseIntoHevyAddExercise } from "../utils";
import { useTheme } from "next-themes";
import { usePoundsOrKgContext } from "@/contexts/PoundsOrKgContext";
import { useIsDayLocked, useCompletedHevyRoutineIds } from "@/contexts/ProgramMutationContext";
import {
    convertSupabaseDateToReadable,
    formatWorkoutWallDuration,
} from "@/utils/general/helpers";
import { DayCardSourceBadge } from "@/components/profile/DayCardSourceBadge";
import { SessionGoalBadge } from "@/components/profile/SessionGoalBadge";

/** Props for a single day card within a week column. */
interface IProps {
    /** The day (routine) data: id, order, title, exercises, notes. */
    day: THevyRoutine;
    /** Read-only backup workout card — hides builder shell. */
    variant?: "read-only";
    /** Week preview source badge. Default off (builder / Recent workouts). */
    source?: "Planned" | "In Hevy" | "Completed";
    /** Total exercises when preview is capped (logged variant). */
    totalExerciseCount?: number;
    /** Backup workout id for preview CTA (defaults to `day.id`). */
    workoutId?: string;
    /** Override href for "See more exercises" (defaults to `/workout/{workoutId}`). */
    seeMoreHref?: string;
    /** Week label (e.g. "Week 1") for context. */
    title?: string;
    /** Week index (folder_id) this day belongs to. */
    folder_id?: number;
    /** Total number of weeks (used by duplicate-day target list). */
    programLength?: number;
    /** Called when user starts dragging this card (sets cardId on dataTransfer). */
    handleDragStart?: (e: DragEvent, card: THevyCard) => void;
    /** Updates this day's title. */
    handleEditTitle?: (id: string, title: string) => void;
    /** Deletes this day. */
    handleDeleteDay?: (id: string) => void;
    /** Opens the add-note dialog for this day. */
    handleOpenAddNoteDialog?: (addNoteDialog: THevyDialog) => void;
    /** Opens the add-exercise dialog for this day. */
    handleOpenAddExerciseDialog?: (addExerciseDialog: THevyDialog) => void;
    /** Opens the add-exercise-note dialog. */
    handleOpenAddExerciseNoteDialog?: (addExerciseNoteDialog: THevyDialog) => void;
    /** Duplicates this day to a target week and day slots. */
    handleDuplicateDay?: (fromWeekOrder: number, fromDayOrder: number, toWeekOrder: number, toDayIndexArray: TSelectOption[]) => void;
    /** Deletes an exercise from this day. */
    handleDeleteExercise?: (folder_id: number, dayOrder: number, exerciseIndex: number) => void;
    /** Sets add-exercise dialog to edit mode and passes exercise data. */
    handleIsEditExercise?: (isEditExercise: boolean) => void;
    /** Id of the card that currently has focus. */
    focusedCardId?: string;
    /** Sets focused card (this card calls it on click). */
    setFocusedCardId?: (focusedCardId: string) => void;
    /** Creates a superset from the selected exercise indices in this day. */
    handleCreateSuperset?: (dayId: string, selectedExercises: number[]) => void;
    /** Removes an exercise from its superset in this day. */
    handleRemoveFromSuperset?: (dayId: string, exerciseIndex: number) => void;
    /** Custom exercises from Hevy (lifted from HevyRoutine to avoid duplicate subscriptions). */
    customExercises?: THevyExerciseTemplate[];
    /** Global Hevy exercise library (lifted from HevyRoutine to avoid duplicate subscriptions). */
    hevyExercises?: THevyExerciseTemplate[];
    /** When true (mobile), use fade-in instead of layout animation to avoid slide-from-top-left. */
    isMobile?: boolean;
    /** Read-only: show session goal pill in card header (default true). */
    showSessionGoalBadge?: boolean;
}

/**
 * Renders one draggable day card: header (day #, title, notes, menu), exercise table, add exercise, superset UI.
 */
export const HevyDayCard: React.FC<IProps> = (props) => {

    const {
        day,
        variant,
        source,
        totalExerciseCount,
        workoutId,
        seeMoreHref,
        title = "",
        folder_id = 0,
        handleDragStart,
        handleDeleteDay,
        programLength = 0,
        handleEditTitle,
        handleOpenAddExerciseDialog,
        handleOpenAddExerciseNoteDialog,
        handleOpenAddNoteDialog,
        handleDuplicateDay,
        handleDeleteExercise,
        handleIsEditExercise,
        focusedCardId = "",
        setFocusedCardId,
        handleCreateSuperset,
        handleRemoveFromSuperset,
        customExercises,
        hevyExercises,
        isMobile = false,
        showSessionGoalBadge = true,
    } = props;

    const isReadOnly = variant === "read-only";

    const { resolvedTheme } = useTheme();
    const { isInLbs } = usePoundsOrKgContext();
    const mutationsLocked = useIsDayLocked(day.hevyRoutineId);
    const completedHevyRoutineIds = useCompletedHevyRoutineIds();
    const isDayComplete =
        day.hevyRoutineId != null && completedHevyRoutineIds.includes(day.hevyRoutineId);
    const [duplicateDayOpen, setDuplicateDayOpen] = useState(false);
    const [editTitleOpen, setEditTitleOpen] = useState(false);
    const [currentTitle, setCurrentTitle] = useState(day.title ?? "");
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedExercises, setSelectedExercises] = useState<number[]>([]);

    const handleEdit = async (currentWeek: number, currentDay: number, exerciseIndex: number, editExercise: THevyExercise ) => {
            handleIsEditExercise?.(true);
            const convertedExercise = await convertHevyExerciseIntoHevyAddExercise(editExercise, customExercises, hevyExercises);
            handleOpenAddExerciseDialog?.({folder_id: currentWeek, dayOrder: currentDay, isOpen: true, exerciseIndex: exerciseIndex, editExercise: convertedExercise });
    };

    const handleFocus = () => {
        setFocusedCardId?.(day.id ?? "");
    }

    const cardVal: THevyCard = {
        title,
        order: day?.order ?? "",
        day_title: day?.title ?? "",
        exercises: day?.exercises ?? [],
        id: day?.id ?? "",
        folder_id,
    };

    useEffect(() => {
        if (isReadOnly) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (mutationsLocked) return;
            if (focusedCardId !== day.id) return;
            if (!(event.metaKey || event.ctrlKey)) return;
            const key = event.key.toLowerCase();
            if (key === "e") {
                event.preventDefault();
                setEditTitleOpen(true);
            } else if (key === "d") {
                event.preventDefault();
                handleDeleteDay?.(day.id);
            } else if (key === "p") {
                event.preventDefault();
                handleOpenAddNoteDialog?.({ folder_id: Number(folder_id), dayOrder: Number(day.order), isOpen: true });
            } else if (key === "y") {
                event.preventDefault();
                setDuplicateDayOpen(true);
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [day.id, day.order, focusedCardId, folder_id, handleDeleteDay, handleOpenAddNoteDialog, isReadOnly, mutationsLocked]);

    const toggleExerciseSelection = (exerciseIndex: number) => {
        if (selectedExercises.includes(exerciseIndex)) {
            setSelectedExercises(selectedExercises.filter((id) => id !== exerciseIndex));
        } else {
            setSelectedExercises([...selectedExercises, exerciseIndex]);
        }
    };


    const createSuperset = () => {
        if (selectedExercises.length < 2) {
            return;
        }
        handleCreateSuperset?.(day.id, selectedExercises);
        setSelectedExercises([]);
        setEditMode(false);
    };

    const removeFromSuperset = (exerciseIndex: number) => {
        handleRemoveFromSuperset?.(day.id, exerciseIndex);
    };

    const showSeeMore =
        isReadOnly &&
        totalExerciseCount != null &&
        totalExerciseCount > (day.exercises?.length ?? 0);
    const resolvedWorkoutId = workoutId ?? day.id;

    return (
        <>
            {!isReadOnly && <DropIndicator beforeId={ day.id } weekOrder={ String(folder_id) } />}
            <motion.div
                layout={ !isMobile }
                layoutId={ isMobile ? undefined : `${day.id}-${folder_id}` }
                initial={ isMobile ? { opacity: 0 } : false }
                animate={ isMobile ? { opacity: 1 } : undefined }
                transition={ isMobile ? { duration: 0.2 } : undefined }
                draggable={ !isReadOnly && !mutationsLocked }
                onDragStart={ !isReadOnly && !mutationsLocked && handleDragStart ? (e: DragEvent) => handleDragStart(e, cardVal) : undefined }
                className={`rounded gap-4 w-full max-w-full ${!isReadOnly && !mutationsLocked ? "active:cursor-grabbing cursor-grab" : ""}`}
                style={ isMobile ? undefined : { opacity: 1, visibility: 'visible' } }
            >
                <Card
                    tabIndex={ isReadOnly ? undefined : 0 }
                    onClick={ isReadOnly ? undefined : handleFocus }
                    className={`border-[3px] border-gray-100 ${resolvedTheme === "dark" ? "border-extraDarkGray bg-extraDarkGray shadow-xl shadow-black/20" : "border-gray-100 bg-lightGray shadow-lg shadow-gray-200/50"} dark:border-extraDarkGray dark:bg-extraDarkGray dark:shadow-xl dark:shadow-black/20 ${!isReadOnly ? "focus:dark:border-lightSecondary focus:border-gray-300 group" : ""} w-full max-w-full py-4 sm:pt-2 px-1 sm:px-0 sm:min-w-[360px] sm:max-w-[360px] md:min-w-[385px] md:max-w-[385px] lg:min-w-[450px] lg:max-w-[450px] my-2 box-border`}>
                    {isReadOnly ? (
                        <div className="flex flex-row justify-between items-start px-3 py-2 gap-2">
                            <div className="min-w-0 flex-1">
                                <div className="font-tertiary text-lg truncate">{day.title}</div>
                                <div className="font-secondary text-sm text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                                    {convertSupabaseDateToReadable(day.started_at) && (
                                        <span>{convertSupabaseDateToReadable(day.started_at)}</span>
                                    )}
                                    {formatWorkoutWallDuration(day.started_at, day.ended_at) && (
                                        <span>{formatWorkoutWallDuration(day.started_at, day.ended_at)}</span>
                                    )}
                                    {showSessionGoalBadge && <SessionGoalBadge day={day} />}
                                </div>
                            </div>
                            <div className="flex items-start gap-2 shrink-0">
                                {source ? <DayCardSourceBadge source={source} /> : null}
                                { day.notes && day.notes.length > 0 &&
                                <TooltipProvider delayDuration={ 0 }>
                                    <Tooltip>
                                        <TooltipTrigger className="cursor-pointer shrink-0 pt-0.5">
                                            <NotebookTextIcon />
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-gray-600 text-white rounded-lg">
                                            <p>{ day.notes }</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                }
                            </div>
                        </div>
                    ) : (
                    <div className="flex flex-row justify-between items-center px-3 py-1">
                        <div className="font-main text-lg flex flex-row whitespace-nowrap items-center gap-2">
                            Day {day.order}
                        </div>
                        <div className="font-secondary text-md min-w-0 flex-1">
                            { editTitleOpen ?
                                <Input
                                    value={ currentTitle }
                                    disabled={mutationsLocked}
                                    onInput={ (event) => setCurrentTitle(String(event.currentTarget.value)) }
                                    onBlur={ (event) => {
                                        handleEditTitle?.(day.id, String(event.currentTarget.value));
                                        setEditTitleOpen(false);
                                    } }
                                    onKeyDown={ (e) => {
                                        if (e.key === 'Enter') {
                                            handleEditTitle?.(day.id, e.currentTarget.value);
                                            setEditTitleOpen(false);
                                        }
                                    } }
                                    autoFocus
                                />
                                :
                                <TooltipProvider delayDuration={ 0 }>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="truncate px-4">
                                                {day.title}
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-gray-600 text-white rounded-lg">
                                            <p>{day.title}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            }
                        </div>
                        <div className="flex flex-row items-center gap-1.5 shrink-0">
                            {isDayComplete ? (
                                <span
                                    className="flex flex-row items-center gap-1 shrink-0 text-lightSecondary"
                                    aria-label="Day complete"
                                >
                                    <Check className="h-4 w-4" aria-hidden="true" />
                                    <span className="font-secondary text-sm">Complete</span>
                                </span>
                            ) : null}
                            <div className="flex flex-col gap-2">
                            { day.notes && day.notes.length > 0 &&
                            <TooltipProvider delayDuration={ 0 }>
                                <Tooltip>
                                    <TooltipTrigger
                                        className="cursor-pointer opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-active:opacity-100"
                                    >
                                        <NotebookTextIcon className="cursor-pointer" />
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-gray-600 text-white rounded-lg">
                                        <p>{ day.notes }</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            }
                            <DropdownMenu open={ dropdownOpen } onOpenChange={ () => setDropdownOpen(false) }>
                                <DropdownMenuTrigger
                                    onClick={ () => { if (!mutationsLocked) setDropdownOpen(true); } }
                                    disabled={mutationsLocked}
                                    className={`opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-active:opacity-100 ${mutationsLocked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                                    asChild
                                >
                                    <EllipsisIcon />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" side="bottom">
                                    <DropdownMenuItem
                                        className="cursor-pointer bg-red-500 text-white hover:bg-red-500"
                                        disabled={mutationsLocked}
                                        onClick={ () => {
                                            if (mutationsLocked) return;
                                            handleDeleteDay?.(day.id);
                                            } }>
                                        Delete Day
                                        <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem disabled={mutationsLocked} onClick={ () => { if (mutationsLocked) return; setEditTitleOpen(true); setDropdownOpen(false); } } className="cursor-pointer">
                                        Edit Title
                                        <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem disabled={mutationsLocked} onClick={ () => { if (mutationsLocked) return; handleOpenAddNoteDialog?.({ folder_id: Number(folder_id), dayOrder: Number(day.order), isOpen: true }); setDropdownOpen(false); } } className="cursor-pointer">
                                        Add Note
                                        <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem disabled={mutationsLocked} onClick={ () => { if (mutationsLocked) return; setDuplicateDayOpen(true); setDropdownOpen(false); } } className="cursor-pointer">
                                        Duplicate Day
                                        <DropdownMenuShortcut>⌘Y</DropdownMenuShortcut>
                                    </DropdownMenuItem>
                                    {/* <DropdownMenuItem onClick={ () => {
                                        // handleOpenGenerateDayDialog({ folder_id: Number(folder_id), dayOrder: Number(day.order), isOpen: true });
                                        setDropdownOpen(false);
                                    } }
                                        className="cursor-pointer"
                                    >
                                        Generate Day
                                        <DropdownMenuShortcut>⌘G</DropdownMenuShortcut>
                                    </DropdownMenuItem> */}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            </div>
                        </div>
                    </div>
                    )}

                    <div className="text-xs mt-2 flex flex-row justify-between pl-2 pr-2 gap-2 sm:gap-4 border-t border-b py-2 border-gray-200 dark:text-offWhite dark:border-darkGray bg-[#e8e8e8] dark:bg-extraDarkGray">
                        <div className="flex flex-row gap-2 sm:gap-4 shrink min-w-0">
                            <div className="shrink-0">
                                #
                            </div>
                            <div className="min-w-0 truncate">
                                Exercise
                            </div>
                        </div>
                        <div className="text-center flex flex-row items-center justify-end max-w-[50%] w-[50%] dark:text-offWhite">
                            <div className="min-w-[25%] flex flex-col justify-center items-center">
                                Sets
                            </div>
                            <div className="min-w-[25%] flex flex-col justify-center items-center">
                                Reps
                            </div>
                            <div className="min-w-[25%] flex flex-col justify-center items-center whitespace-nowrap">
                                {isInLbs ? "Lbs" : "Kg"}
                            </div>
                            <div className="min-w-[25%] flex flex-col justify-center items-center h-full whitespace-nowrap">
                                RPE
                            </div>
                        </div>
                    </div>
                    <div>
                        <HevyExerciseVisualizer
                            day={ day }
                            folder_id={ folder_id }
                            readOnly={ isReadOnly }
                            handleEdit={ isReadOnly ? undefined : handleEdit }
                            handleDeleteExercise={ isReadOnly ? undefined : handleDeleteExercise }
                            handleOpenAddExerciseNoteDialog={ isReadOnly ? undefined : handleOpenAddExerciseNoteDialog }
                            editMode={editMode}
                            selectedExercises={selectedExercises}
                            toggleExerciseSelection={toggleExerciseSelection}
                            removeFromSuperset={removeFromSuperset}
                            hevyExercises={ hevyExercises }
                        />
                    </div>
                    {!isReadOnly && (
                    <div
                        className={`flex items-center justify-center px-3 py-2 ${mutationsLocked ? "opacity-50 cursor-not-allowed" : ""}`}
                        onClick={ () => {
                            if (mutationsLocked) return;
                            handleOpenAddExerciseDialog?.({folder_id: Number(folder_id), dayOrder: Number(day.order), isOpen: true});
                         } }>
                        <Button variant="ghost" disabled={mutationsLocked} className="mt-1 w-full rounded-full font-bold h-9 sm:h-12 text-sm sm:text-base hover:bg-gray-200 dark:hover:bg-darkGray text-black dark:text-white disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Add exercise to this day"><PlusIcon />Add Exercise</Button>
                    </div>
                    )}
                    {!isReadOnly && (
                    <div className="flex flex-row justify-between items-center px-3">
                        {editMode ? (
                            <div className="w-full p-4 bg-[#e6f7f9] dark:bg-darkGray border-t border-[#33bbcf]">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="font-medium flex items-center">
                                        <LinkIcon className="w-4 h-4 mr-1" />
                                        Create Superset
                                    </div>
                                </div>
                                <div className="text-xs text-gray-600 mb-3">
                                    {selectedExercises.length === 0
                                        ? 'Select exercises to group into a superset'
                                        : `${selectedExercises.length} exercise${selectedExercises.length !== 1 ? 's' : ''} selected`}
                                </div>
                                <div className="flex space-x-3">
                                    <button
                                        onClick={createSuperset}
                                        disabled={mutationsLocked || selectedExercises.length < 2}
                                        className={`flex-1 py-1.5 sm:py-2 text-sm sm:text-base rounded-full font-medium
                                            ${selectedExercises.length < 2 ? 'bg-lightSecondary opacity-50 text-white' : 'bg-lightSecondary text-white hover:bg-black'}`}
                                        aria-label="Create superset"
                                    >
                                        Create Superset
                                    </button>
                                    <button
                                        onClick={() => {
                                            setEditMode(false);
                                            setSelectedExercises([]);
                                        }}
                                        className="flex-1 py-1.5 sm:py-2 text-sm sm:text-base rounded-full font-medium border border-gray-300 hover:bg-gray-100"
                                        aria-label="Cancel superset"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <Button
                                variant="ghost"
                                disabled={mutationsLocked || !day.exercises || day.exercises.length < 2}
                                className="mt-1 w-full rounded-full font-bold bg-lightGray dark:bg-darkGray text-lightSecondary disabled:text-gray-500 hover:text-lightSecondary hover:bg-gray-200 h-9 sm:h-12 text-sm sm:text-base border-2 border-lightSecondary dark:border-darkGray disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-lightGray dark:disabled:hover:bg-darkGray disabled:border-gray-300 dark:disabled:border-gray-600"
                                onClick={() => {
                                    if (mutationsLocked) return;
                                    if (day.exercises && day.exercises.length >= 2) {
                                        setEditMode(true);
                                    }
                                }}
                                aria-label="Create superset from selected exercises"
                            >
                                <LinkIcon className="mr-2" />Create Superset
                            </Button>
                        )}
                    </div>
                    )}
                    {showSeeMore && (
                        <div className="px-3 pb-3 pt-1 text-center">
                            <Link
                                href={seeMoreHref ?? `/workout/${resolvedWorkoutId}`}
                                className="text-sm font-medium text-lightSecondary hover:underline dark:text-lightSecondary"
                            >
                                See more exercises
                            </Link>
                        </div>
                    )}
                </Card>
            </motion.div>
            {!isReadOnly && programLength > 0 && handleDuplicateDay && (
            <HevyDuplicateDay
                programLength={ programLength }
                folder_id={ folder_id }
                day={ day }
                duplicateDayOpen={ duplicateDayOpen }
                setDuplicateDayOpen={ setDuplicateDayOpen }
                handleDuplicateDay={ handleDuplicateDay }
            />
            )}
        </>
    );
};
