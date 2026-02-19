"use client";

import {  useHevyExercises } from "@/api/hooks";
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

interface IProps {
    hevyProgram: THevyRoutine[];
    setHevyProgram: React.Dispatch<React.SetStateAction<THevyRoutine[]>>;
    isMobile: boolean;
    addExerciseDialog: THevyDialog;
    addNoteDialog: THevyDialog;
    addExerciseNoteDialog: THevyDialog;
    isEditExercise: boolean;
    handleIsEditExercise: (isEditExercise: boolean) => void;
    handleDuplicateWeek: (fromWeekIndex: number, toWeekIndexes: number[]) => void;
    handleDuplicateDay: (fromWeekOrder: number, fromDayOrder: number, toWeekOrder: number, toDayIndexArray: IOption[]) => void;
    handleOpenAddExerciseDialog: (addExerciseDialog: THevyDialog) => void;
    handleOpenAddNoteDialog: (addNoteDialog: THevyDialog) => void;
    handleOpenAddExerciseNoteDialog: (addExerciseNoteDialog: THevyDialog) => void;
    handleAddDay: (folder_id: number) => void;
    handleDeleteDay: (id: string) => void;
    handleEditTitle: (id: string, title: string) => void;
    handleDeleteExercise: (folder_id: number, dayOrder: number, exerciseIndex: number) => void;
    handleAddRoutineAsDay: (routine: THevyRoutine, folder_id: number) => void;
    handleCreateSuperset: (dayId: string, selectedExercises: number[]) => void;
    handleRemoveFromSuperset: (dayId: string, exerciseIndex: number) => void;
    handleEditExercise: (editExercise: THevyDialog) => void;
    focusedCardId: string;
    setFocusedCardId: (focusedCardId: string) => void;
    numberOfWeeks: number;
    numberOfWeeksArr: number[];
    handleAddExercise: (folder_id: number, dayOrder: number, exercise: THevyAddExercise) => Promise<void>;
    handleAddRoutineNote: (folder_id: number, dayOrder: number, prompt: string) => void;
    handleAddExerciseNote: (folder_id: number, dayOrder: number, exerciseIndex: number, prompt: string) => void;
    getNextSupersetId: (day: THevyRoutine) => number;
}

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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { data: exercises }  = useHevyExercises(); // Pre-populating the HevyAddExerciseDialog
    const { isPreview } = usePreview();
    const { user } = useUserContext();


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
                        <div className="flex flex-row justify-start items-center max-sm:px-4 sm:px-0 pb-4 max-sm:pb-0 gap-16 max-sm:gap-4 max-sm:flex-wrap">
                            <Stepper steps={programBuilderSteps} currentStep={3} legend={isMobile ? <SetTypesLegend /> : undefined} />
                        </div>
                    }
                    <HevyRoutinePreview deflatHevyRoutine={ deFlattenHevyRoutine(hevyProgram) } />
                </div>
            :
                <>
                    { !user &&
                        <div className="flex flex-row justify-start items-center max-sm:px-4 sm:px-0 pb-4 max-sm:pb-0 gap-16 max-sm:gap-4 max-sm:flex-wrap">
                            <Stepper steps={programBuilderSteps} currentStep={2} legend={isMobile ? <SetTypesLegend /> : undefined} />
                        </div>
                    }
                    { isMobile ? (
                        <div className="flex flex-col max-h-screen w-full max-w-full overflow-hidden">
                            <div className="flex flex-row items-center justify-between px-4 py-2 border-b shrink-0 w-full max-w-full">
                                <Button
                                    onClick={ handlePreviousWeek }
                                    disabled={ currentWeekIndex === 0 }
                                    variant="ghost"
                                    size="icon"
                                    className={ `shrink-0 ${currentWeekIndex === 0 ? "opacity-50 cursor-not-allowed" : ""}` }
                                >
                                    <ChevronLeft className="h-6 w-6" />
                                </Button>
                                <div className="text-lg font-semibold shrink-0">
                                    Week { currentWeekIndex + 1 } / { numberOfWeeks }
                                </div>
                                <Button
                                    onClick={ handleNextWeek }
                                    disabled={ currentWeekIndex >= numberOfWeeks - 1 }
                                    variant="ghost"
                                    size="icon"
                                    className={ `shrink-0 ${currentWeekIndex >= numberOfWeeks - 1 ? "opacity-50 cursor-not-allowed" : ""}` }
                                >
                                    <ChevronRight className="h-6 w-6" />
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
