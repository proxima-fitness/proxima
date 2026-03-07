"use client";

/**
 * @module HevyRoutine
 * Main Hevy program builder view: week columns (or single week on mobile with prev/next), scroll and step UI,
 * and dialogs for add exercise, add note, add exercise note. Delegates to HevyColumn per week; in preview mode shows HevyRoutinePreview.
 * Depends on: HevyColumn, HevyAddExerciseDialog, HevyAddNoteDialog, HevyExerciseNotesDialog, HevyRoutinePreview, deFlattenHevyRoutine, Stepper.
 * Used by: BuildProgramClient.
 */

import { useHevyCustomExercises, useHevyExercises, useHevySecret } from "@/api/hooks";
import { HevyColumn } from "./HevyColumn";
import { HevyAddExerciseDialog } from "./HevyAddExerciseDialog";
import { deFlattenHevyRoutine } from "../utils";
import { HevyAddNoteDialog } from "./HevyAddNoteDialog";
import { HevyExerciseNotesDialog } from "./HevyExerciseNotesDialog";
import { HevyRoutinePreview } from "./HevyRoutinePreview";
import { usePreview } from "@/contexts/PreviewContext";
import { Stepper } from "@/components/ui/stepper";
import { programBuilderSteps } from "@/assets/constants";
import { SetTypesLegend } from "../shared/SetTypesLegend";
import { useUserContext } from "@/contexts/UserContext";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IOption } from "@/components/ui/multi-select";
import { useEffect, useRef, useState } from "react";

/** Props for the main Hevy routine builder (columns + dialogs). */
interface IProps {
    /** Flat list of all days (routines) in the program. */
    hevyProgram: THevyRoutine[];
    /** Updater for the full program. */
    setHevyProgram: React.Dispatch<React.SetStateAction<THevyRoutine[]>>;
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
    /** Duplicate a day to a target week and day slots. */
    handleDuplicateDay: (fromWeekOrder: number, fromDayOrder: number, toWeekOrder: number, toDayIndexArray: IOption[]) => void;
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
    /** Returns next superset id for a day (used when creating supersets). */
    getNextSupersetId: (day: THevyRoutine) => number;
}

/**
 * Renders either preview (HevyRoutinePreview) or builder: week columns, scroll/stepper, and add-exercise/note dialogs.
 */
export const HevyRoutine: React.FC<IProps> = (props) => {

    const {
        hevyProgram,
        setHevyProgram,
        isMobile,
        addExerciseDialog,
        addNoteDialog,
        addExerciseNoteDialog,
        isEditExercise,
        handleIsEditExercise,
        handleDuplicateWeek,
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

    const { isPreview } = usePreview();


    const [currentWeekIndex, setCurrentWeekIndex] = useState(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

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
        if (currentWeekIndex > 0) {
            setCurrentWeekIndex(currentWeekIndex - 1);
        }
    };

    const handleNextWeek = () => {
        if (currentWeekIndex < numberOfWeeks - 1) {
            setCurrentWeekIndex(currentWeekIndex + 1);
        }
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
            { isPreview ?
                <div className="sm:pl-8">
                    { !user &&
                        <div className="max-sm:hidden flex flex-row justify-start items-center max-sm:px-4 sm:px-0 pb-4 max-sm:pb-0 max-sm:gap-4 max-sm:flex-wrap">
                            <Stepper steps={programBuilderSteps} currentStep={3} legend={isMobile ? <SetTypesLegend /> : undefined} />
                        </div>
                    }
                    <HevyRoutinePreview deflatHevyRoutine={ deFlattenHevyRoutine(hevyProgram) } />
                </div>
            :
                <>
                    { !user &&
                        <div className="max-sm:hidden flex flex-row justify-start items-center max-sm:px-4 sm:px-0 pb-2 max-sm:pb-0 max-sm:gap-4 max-sm:flex-wrap">
                            <Stepper steps={programBuilderSteps} currentStep={2} legend={isMobile ? <SetTypesLegend /> : undefined} />
                        </div>
                    }
                    { isMobile ? (
                        <div className="flex flex-col max-h-screen w-full max-w-full overflow-hidden">
                            <div className="flex flex-row items-center justify-between px-4 py-1 h-9 border-b shrink-0 w-full max-w-full">
                                <Button
                                    onClick={ handlePreviousWeek }
                                    disabled={ currentWeekIndex === 0 }
                                    variant="ghost"
                                    size="icon"
                                    className={ `shrink-0 ${currentWeekIndex === 0 ? "opacity-50 cursor-not-allowed" : ""}` }
                                    aria-label="Previous week"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </Button>
                                <div className="text-sm font-semibold shrink-0">
                                    Week { currentWeekIndex + 1 } / { numberOfWeeks }
                                </div>
                                <Button
                                    onClick={ handleNextWeek }
                                    disabled={ currentWeekIndex >= numberOfWeeks - 1 }
                                    variant="ghost"
                                    size="icon"
                                    className={ `shrink-0 ${currentWeekIndex >= numberOfWeeks - 1 ? "opacity-50 cursor-not-allowed" : ""}` }
                                    aria-label="Next week"
                                >
                                    <ChevronRight className="h-5 w-5" />
                                </Button>
                            </div>
                            <div className="overflow-y-auto overflow-x-hidden flex-1 w-full max-w-full">
                                { numberOfWeeksArr[currentWeekIndex] !== undefined && (
                                    <HevyColumn
                                        key={ `Week ${currentWeekIndex + 1}` }
                                        title={ `Week ${currentWeekIndex + 1}` }
                                        programLength={ numberOfWeeks }
                                        hevyProgram={ hevyProgram }
                                        folder_id={ currentWeekIndex }
                                        setHevyProgram={ setHevyProgram }
                                        handleAddDay={ handleAddDay }
                                        handleDeleteDay={ handleDeleteDay }
                                        handleEditTitle={ handleEditTitle }
                                        handleIsEditExercise={ handleIsEditExercise }
                                        handleDuplicateWeek={ handleDuplicateWeek }
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
                        <div className="relative w-full">
                            <div
                                ref={scrollContainerRef}
                                className={`flex flex-row gap-4 h-screen overflow-scroll w-full ${!user ? "border-t-4 border-lightGray" : ""}`}
                            >
                                { numberOfWeeksArr.map((_, index) => (
                                    <HevyColumn
                                        key={ `Week ${index + 1}` }
                                        title={ `Week ${index + 1}` }
                                        programLength={ numberOfWeeks }
                                        hevyProgram={ hevyProgram }
                                        folder_id={ index }
                                        setHevyProgram={ setHevyProgram }
                                        handleAddDay={ handleAddDay }
                                        handleDeleteDay={ handleDeleteDay }
                                        handleEditTitle={ handleEditTitle }
                                        handleIsEditExercise={ handleIsEditExercise }
                                        handleDuplicateWeek={ handleDuplicateWeek }
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

            }
        </>
    );
};
