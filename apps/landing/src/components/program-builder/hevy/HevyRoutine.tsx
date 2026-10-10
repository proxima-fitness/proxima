"use client";

/**
 * @module HevyRoutine
 * Main Hevy program builder view: week columns (or single week on mobile with prev/next), scroll and step UI,
 * and dialogs for add exercise, add note, add exercise note. Delegates to HevyColumn per week.
 * Depends on: HevyColumn, HevyAddExerciseDialog, HevyAddNoteDialog, HevyExerciseNotesDialog, Stepper.
 * Used by: BuildProgramClient.
 */

import { useHevyCustomExercises, useHevyExercises, useHevySecret } from "@/api/hooks";
import { HevyColumn } from "./HevyColumn";
import { HevyAddExerciseDialog } from "./HevyAddExerciseDialog";
import { HevyAddNoteDialog } from "./HevyAddNoteDialog";
import { HevyExerciseNotesDialog } from "./HevyExerciseNotesDialog";
import { Stepper } from "@/components/ui/stepper";
import { programBuilderSteps } from "@/assets/constants";
import { SetTypesLegend } from "../shared/SetTypesLegend";
import { useUserContext } from "@/contexts/UserContext";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { useBuilderWeek } from "@/contexts/ProgramMutationContext";

/** sessionStorage key — hide signed-out step guide for rest of tab session. */
const STEPPER_DISMISSED_KEY = "build-program-stepper-dismissed";

function readStepperDismissed(): boolean {
    try {
        return sessionStorage.getItem(STEPPER_DISMISSED_KEY) === "true";
    } catch {
        return false;
    }
}

function writeStepperDismissed() {
    try {
        sessionStorage.setItem(STEPPER_DISMISSED_KEY, "true");
    } catch {
        // ignore
    }
}

/** Props for the main Hevy routine builder (columns + dialogs). */
interface IProps {
    /** Flat list of all days (routines) in the program. */
    hevyProgram: THevyRoutine[];
    /** When true, single-week view with prev/next; when false, horizontal scroll of all weeks. */
    isMobile: boolean;
    /** State for the add/edit exercise dialog. */
    addExerciseDialog: THevyDialog;
    /** State for the add routine note dialog. */
    addNoteDialog: THevyDialog;
    /** State for the add exercise note dialog. */
    addExerciseNoteDialog: THevyDialog;
    /** Whether add-exercise dialog is in edit mode. */
    isEditExercise: boolean;
    /** Setter for edit mode. */
    handleIsEditExercise: (isEditExercise: boolean) => void;
    /** Duplicate a week to one or more target weeks. */
    handleDuplicateWeek: (fromWeekIndex: number, toWeekIndexes: number[]) => void;
    /** Delete a week and reindex remaining weeks. */
    handleDeleteWeek: (folder_id: number) => void;
    /** Duplicate a day to a target week and day slots. */
    handleDuplicateDay: (fromWeekOrder: number, fromDayOrder: number, toWeekOrder: number, toDayIndexArray: TSelectOption[]) => void;
    /** Open/close add exercise dialog. */
    handleOpenAddExerciseDialog: (addExerciseDialog: THevyDialog) => void;
    /** Open/close add note dialog. */
    handleOpenAddNoteDialog: (addNoteDialog: THevyDialog) => void;
    /** Open/close add exercise note dialog. */
    handleOpenAddExerciseNoteDialog: (addExerciseNoteDialog: THevyDialog) => void;
    /** Add an empty day to a week. */
    handleAddDay: (folder_id: number) => void;
    /** Delete a day by id. */
    handleDeleteDay: (id: string) => void;
    /** Update a day title by id. */
    handleEditTitle: (id: string, title: string) => void;
    /** Delete an exercise from a day. */
    handleDeleteExercise: (folder_id: number, dayOrder: number, exerciseIndex: number) => void;
    /** Add a Hevy routine as a day in a week. */
    handleAddRoutineAsDay: (routine: THevyRoutine, folder_id: number) => void;
    /** Create a superset from selected exercises in a day. */
    handleCreateSuperset: (dayId: string, selectedExercises: number[]) => void;
    /** Remove an exercise from its superset. */
    handleRemoveFromSuperset: (dayId: string, exerciseIndex: number) => void;
    /** Apply edit to an existing exercise (from add-exercise dialog). */
    handleEditExercise: (editExercise: THevyDialog) => void;
    /** Id of the focused day card. */
    focusedCardId: string;
    /** Set focused day card. */
    setFocusedCardId: (focusedCardId: string) => void;
    /** Total number of weeks. */
    numberOfWeeks: number;
    /** Array of week indices used to map columns. */
    numberOfWeeksArr: number[];
    /** Add a new exercise to a day. */
    handleAddExercise: (folder_id: number, dayOrder: number, exercise: THevyAddExercise) => Promise<void>;
    /** Add a note to a day. */
    handleAddRoutineNote: (folder_id: number, dayOrder: number, prompt: string) => void;
    /** Add a note to an exercise. */
    handleAddExerciseNote: (folder_id: number, dayOrder: number, exerciseIndex: number, prompt: string) => void;
}

/**
 * Renders week columns, scroll/stepper, and add-exercise/note dialogs.
 */
export const HevyRoutine: React.FC<IProps> = (props) => {

    const {
        hevyProgram,
        isMobile,
        addExerciseDialog,
        addNoteDialog,
        addExerciseNoteDialog,
        isEditExercise,
        handleIsEditExercise,
        handleDuplicateWeek,
        handleDeleteWeek,
        handleDuplicateDay,
        handleOpenAddExerciseDialog,
        handleOpenAddNoteDialog,
        handleOpenAddExerciseNoteDialog,
        handleAddDay,
        handleDeleteDay,
        handleEditTitle,
        handleDeleteExercise,
        handleAddExercise,
        handleAddRoutineAsDay,
        handleAddRoutineNote,
        handleAddExerciseNote,
        handleCreateSuperset,
        handleRemoveFromSuperset,
        handleEditExercise,
        focusedCardId,
        setFocusedCardId,
        numberOfWeeks,
        numberOfWeeksArr,
    } = props;

    const { user } = useUserContext();
    const { data: hevyApiKey } = useHevySecret(user);
    const { data: customExercises } = useHevyCustomExercises(user, hevyApiKey ?? "");
    const { data: hevyExercises } = useHevyExercises();

    const { setWeekIndex, weekIndex } = useBuilderWeek();
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);
    // Lazy init OK: HevyRoutine mounts client-side after program load.
    const [stepperDismissed, setStepperDismissed] = useState(readStepperDismissed);
    const maxWeekIndex = Math.max(0, numberOfWeeks - 1);
    const activeWeekIndex = Math.min(weekIndex, maxWeekIndex);

    // Update scroll button visibility based on scroll position
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container || isMobile) return;

        const updateScrollButtons = () => {
            const { scrollLeft, scrollWidth, clientWidth } = container;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
        };

        updateScrollButtons();
        container.addEventListener('scroll', updateScrollButtons);
        window.addEventListener('resize', updateScrollButtons);

        return () => {
            container.removeEventListener('scroll', updateScrollButtons);
            window.removeEventListener('resize', updateScrollButtons);
        };
    }, [isMobile, numberOfWeeks]);

    const handlePreviousWeek = () => {
        setWeekIndex((prev) => Math.max(0, prev - 1));
    };

    const handleNextWeek = () => {
        setWeekIndex((prev) => Math.min(maxWeekIndex, prev + 1));
    };

    const handleScrollLeft = () => {
        if (scrollContainerRef.current) {
            // Each week card is 400px wide + 16px gap (gap-4)
            const scrollAmount = 416;
            scrollContainerRef.current.scrollBy({
                left: -scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    const handleScrollRight = () => {
        if (scrollContainerRef.current) {
            // Each week card is 400px wide + 16px gap (gap-4)
            const scrollAmount = 416;
            scrollContainerRef.current.scrollBy({
                left: scrollAmount,
                behavior: 'smooth'
            });
        }
    };


    return (
        <>
            { !user && !stepperDismissed &&
                <div className="max-sm:hidden flex flex-row justify-between items-start gap-2 max-sm:px-4 sm:px-0 pb-2 max-sm:pb-0">
                    <Stepper steps={programBuilderSteps} currentStep={2} legend={isMobile ? <SetTypesLegend /> : undefined} />
                    <button
                        type="button"
                        onClick={() => {
                            writeStepperDismissed();
                            setStepperDismissed(true);
                        }}
                        className="mt-2 flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label="Dismiss step guide"
                        data-testid="hevy-routine-stepper-dismiss"
                    >
                        <X className="size-3.5" aria-hidden />
                    </button>
                </div>
            }
            { isMobile ? (
                        <div className="flex flex-col h-full w-full max-w-full overflow-hidden">
                            <div className="flex flex-row items-center justify-between px-4 py-1 h-9 border-b shrink-0 w-full max-w-full">
                                <Button
                                    onClick={ handlePreviousWeek }
                                    disabled={ activeWeekIndex === 0 }
                                    variant="ghost"
                                    size="icon"
                                    className={ `size-9 shrink-0 rounded-full ${activeWeekIndex === 0 ? "opacity-50 cursor-not-allowed" : ""}` }
                                    aria-label="Previous week"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </Button>
                                <div className="text-sm font-semibold shrink-0">
                                    Week { activeWeekIndex + 1 } / { numberOfWeeks }
                                </div>
                                <Button
                                    onClick={ handleNextWeek }
                                    disabled={ activeWeekIndex >= maxWeekIndex }
                                    variant="ghost"
                                    size="icon"
                                    className={ `size-9 shrink-0 rounded-full ${activeWeekIndex >= maxWeekIndex ? "opacity-50 cursor-not-allowed" : ""}` }
                                    aria-label="Next week"
                                >
                                    <ChevronRight className="h-5 w-5" />
                                </Button>
                            </div>
                            <div className="overflow-y-auto overflow-x-hidden flex-1 w-full max-w-full">
                                { numberOfWeeksArr[activeWeekIndex] !== undefined && (
                                    <HevyColumn
                                        key={ `Week ${activeWeekIndex + 1}` }
                                        title={ `Week ${activeWeekIndex + 1}` }
                                        programLength={ numberOfWeeks }
                                        hevyProgram={ hevyProgram }
                                        folder_id={ activeWeekIndex }
                                        handleAddDay={ handleAddDay }
                                        handleDeleteDay={ handleDeleteDay }
                                        handleEditTitle={ handleEditTitle }
                                        handleIsEditExercise={ handleIsEditExercise }
                                        handleDuplicateWeek={ handleDuplicateWeek }
                                        handleDeleteWeek={ handleDeleteWeek }
                                        handleDuplicateDay={ handleDuplicateDay }
                                        handleOpenAddExerciseDialog={ handleOpenAddExerciseDialog }
                                        handleOpenAddNoteDialog={ handleOpenAddNoteDialog }
                                        handleOpenAddExerciseNoteDialog={ handleOpenAddExerciseNoteDialog }
                                        handleDeleteExercise={ handleDeleteExercise }
                                        focusedCardId={ focusedCardId }
                                        setFocusedCardId={ setFocusedCardId }
                                        handleCreateSuperset={ handleCreateSuperset }
                                        handleRemoveFromSuperset={ handleRemoveFromSuperset }
                                        handleAddRoutineAsDay={ handleAddRoutineAsDay }
                                        customExercises={ customExercises }
                                        hevyExercises={ hevyExercises }
                                        isMobile={ true }
                                    />
                                ) }
                            </div>
                        </div>
                    ) : (
                        <div className="relative w-full flex-1 min-h-0">
                            <div
                                ref={scrollContainerRef}
                                className={`flex flex-row gap-4 h-full overflow-auto w-full ${!user && !stepperDismissed ? "border-t-4 border-lightGray" : ""}`}
                            >
                                { numberOfWeeksArr.map((_, index) => (
                                    <HevyColumn
                                        key={ `Week ${index + 1}` }
                                        title={ `Week ${index + 1}` }
                                        programLength={ numberOfWeeks }
                                        hevyProgram={ hevyProgram }
                                        folder_id={ index }
                                        handleAddDay={ handleAddDay }
                                        handleDeleteDay={ handleDeleteDay }
                                        handleEditTitle={ handleEditTitle }
                                        handleIsEditExercise={ handleIsEditExercise }
                                        handleDuplicateWeek={ handleDuplicateWeek }
                                        handleDeleteWeek={ handleDeleteWeek }
                                        handleDuplicateDay={ handleDuplicateDay }
                                        handleOpenAddExerciseDialog={ handleOpenAddExerciseDialog }
                                        handleOpenAddNoteDialog={ handleOpenAddNoteDialog }
                                        handleOpenAddExerciseNoteDialog={ handleOpenAddExerciseNoteDialog }
                                        handleDeleteExercise={ handleDeleteExercise }
                                        focusedCardId={ focusedCardId }
                                        setFocusedCardId={ setFocusedCardId }
                                        handleCreateSuperset={ handleCreateSuperset }
                                        handleRemoveFromSuperset={ handleRemoveFromSuperset }
                                        handleAddRoutineAsDay={ handleAddRoutineAsDay }
                                        customExercises={ customExercises }
                                        hevyExercises={ hevyExercises }
                                        isMobile={ false }
                                    />
                                ) ) }
                            </div>
                            {/* Left Arrow Button */}
                            {canScrollLeft && (
                                <Button
                                    onClick={handleScrollLeft}
                                    variant="outline"
                                    size="icon"
                                    className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white dark:bg-lightSecondary dark:hover:bg-lightSecondary shadow-lg border-2 h-12 w-12 rounded-full transition-opacity flex items-center justify-center p-0"
                                    aria-label="Scroll left"
                                >
                                    <ChevronLeft className="h-6 w-6" />
                                </Button>
                            )}
                            {/* Right Arrow Button */}
                            {canScrollRight && (
                                <Button
                                    onClick={handleScrollRight}
                                    variant="outline"
                                    size="icon"
                                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white dark:bg-lightSecondary dark:hover:bg-lightSecondary shadow-lg border-2 h-12 w-12 rounded-full transition-opacity flex items-center justify-center p-0"
                                    aria-label="Scroll right"
                                >
                                    <ChevronRight className="h-6 w-6" />
                                </Button>
                            )}
                        </div>
                    ) }
                    { addExerciseDialog.isOpen &&
                        <HevyAddExerciseDialog
                            addExerciseDialog={ addExerciseDialog }
                            isEditExercise={ isEditExercise }
                            handleEditExercise={ handleEditExercise }
                            handleAddExercise={ handleAddExercise }
                            handleOpenAddExerciseDialog={ handleOpenAddExerciseDialog }
                        />
                    }
                    {/* <HevyGenerateDayDialog
                        handleGenerateDay={ handleGenerateDay }
                        generateDayDialog={ generateDayDialog }
                        handleOpenGenerateDayDialog={ handleOpenGenerateDayDialog }
                    /> */}
                    { addNoteDialog.isOpen &&
                        <HevyAddNoteDialog
                            handleAddRoutineNote={ handleAddRoutineNote }
                            addNoteDialog={ addNoteDialog }
                            handleOpenAddNoteDialog={ handleOpenAddNoteDialog }
                        />
                    }
                    { addExerciseNoteDialog.isOpen &&
                        <HevyExerciseNotesDialog
                            handleAddExerciseNote={ handleAddExerciseNote }
                            addExerciseNoteDialog={ addExerciseNoteDialog }
                            handleOpenAddExerciseNoteDialog={ handleOpenAddExerciseNoteDialog }
                        />
                    }

        </>
    );
};
