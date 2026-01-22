"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import {  useHevyExercises } from "@/api/hooks";
import { HevyColumn } from "./HevyColumn";
import { HevyAddExerciseDialog } from "./HevyAddExerciseDialog";
// import { HevyGenerateDayDialog } from "./HevyGenerateDayDialog";
import { IOption } from "@/components/ui/multi-select";
import { toast } from "sonner";
import { deFlattenHevyRoutine, getNumberRoutineFolders, hevyAddExerciseToHevySetsConverter, reorderHevy, sortHevyByOrder } from "../utils";
import { HevyAddNoteDialog } from "./HevyAddNoteDialog";
import { HevyExerciseNotesDialog } from "./HevyExerciseNotesDialog";
import { HevyRoutinePreview } from "./HevyRoutinePreview";
import { usePreview } from "@/contexts/PreviewContext";
import { Stepper } from "@/components/ui/stepper";
import { programBuilderSteps } from "@/assets/constants";
import { SetTypesLegend } from "../shared/SetTypesLegend";
import { useUserContext } from "@/contexts/UserContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface IProps {
    request: TTextToJsonRequest;
    hevyProgram: THevyRoutine[];
    setHevyProgram: React.Dispatch<React.SetStateAction<THevyRoutine[]>>;
}

export const HevyRoutine: React.FC<IProps> = (props) => {

    const {
        hevyProgram,
        request,
        setHevyProgram,
    } = props;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { data: exercises }  = useHevyExercises(); // Pre-populating the HevyAddExerciseDialog
    const { isPreview } = usePreview();
    const { user } = useUserContext();

    const [addExerciseDialog, setAddExerciseDialog] = useState<THevyDialog>({folder_id: 0, dayOrder: 0, isOpen: false});
    // const [generateDayDialog, setGenerateDayDialog] = useState<THevyDialog>({folder_id: 0, dayOrder: 0, isOpen: false});
    const [addNoteDialog, setAddNoteDialog] = useState<THevyDialog>({folder_id: 0, dayOrder: 0, isOpen: false});
    const [addExerciseNoteDialog, setAddExerciseNoteDialog] = useState<THevyDialog>({folder_id: 0, dayOrder: 0, isOpen: false});
    const [isEditExercise, setIsEditExercise] = useState(false);

    const handleIsEditExercise = (isEditExercise: boolean) => {
        setIsEditExercise(isEditExercise);
    };

    // // Duplicates the selected week to other selected weeks
    const handleDuplicateWeek = (fromWeekIndex: number, toWeekIndexes: number[]) => {

        setHevyProgram((prev) => {

            const filteredPrev = prev.filter((day) => !toWeekIndexes.includes(day.folder_id));

            const daysToCopy = prev.filter((day) => day.folder_id === fromWeekIndex);

            let maxId = Math.max(...prev.map((d) => Number(d.id)));

            const newDays = toWeekIndexes.flatMap((week) =>
                daysToCopy.map((day) => ({
                    ...day,
                    id: String(++maxId),
                    folder_id: week,
                })),
            );

            return reorderHevy([...filteredPrev, ...newDays]);
        });
    };

    // Duplicates the selected day to other days in the program on the selected week
    const handleDuplicateDay = (fromWeekOrder: number, fromDayOrder: number, toWeekOrder: number, toDayOrderArray: IOption[]) => {

        const toDayOrders = toDayOrderArray.map((day) => Number(day.value)).sort((a, b) => a - b);

        setHevyProgram((prev) => {
            const dayToCopy = prev.find((day) => Number(day.folder_id) === fromWeekOrder && Number(day.order) === fromDayOrder);

            if (!dayToCopy) return prev;

            const existingDaysInTargetWeek = prev.filter((day) => Number(day.folder_id) === toWeekOrder);
            const maxExistingOrderinTargetWeek = Math.max(...existingDaysInTargetWeek.map((day) => Number(day.order)), 0);

            let newId = Math.max(...prev.map((day) => Number(day.id)), 0) + 1;
            let updatedDays = [...prev];

            const maxToDayOrder = Math.max(...toDayOrders);

            if (maxToDayOrder > maxExistingOrderinTargetWeek) {
                for (let i = maxExistingOrderinTargetWeek + 1; i <= maxToDayOrder; i++) {
                    if (
                        !existingDaysInTargetWeek.some((day) => Number(day.order) === i) &&
                        !toDayOrders.includes(i)
                    ) {
                        updatedDays.push({
                            id: String(newId++),
                            folder_id: toWeekOrder,
                            order: String(i),
                            exercises: [],
                            title: "",
                            notes: "",
                        });
                    }
                }
            }

            // Remove days that are going to be replaced
            updatedDays = updatedDays.filter((day) => !(day.folder_id === toWeekOrder && toDayOrders.includes(Number(day.order))));

            // Add new days in their place
            const newDays = toDayOrders.map((dayOrder) => ({
                ...dayToCopy,
                id: String(newId++),
                folder_id: toWeekOrder,
                order: String(dayOrder),
            }));

            return sortHevyByOrder([...newDays,...updatedDays]);
        });
    };

    // State for opening the Add Exercise Dialog with the correct week and day
    const handleOpenAddExerciseDialog = (addExerciseDialog: THevyDialog) => {
        if (addExerciseDialog.isOpen === false) {
            setIsEditExercise(false);
        }
        setAddExerciseDialog(addExerciseDialog);
    };

    // State for opening the Generate Day Dialog with the correct week and day
    // const handleOpenGenerateDayDialog = (generateDayDialog: THevyDialog) => {
    //     setGenerateDayDialog(generateDayDialog);
    // };

    // State for opening the Add Note Dialog with the correct week and day
    const handleOpenAddNoteDialog = (addNoteDialog: THevyDialog) => {
        setAddNoteDialog(addNoteDialog);
    };

    // State for opening the Add Exercise Note Dialog with the correct week and day
    const handleOpenAddExerciseNoteDialog = (addExerciseNoteDialog: THevyDialog) => {
        setAddExerciseNoteDialog(addExerciseNoteDialog);
    };

    // // Will re-generate the currently selected day based on a prompt
    // const handleGenerateDay = async (folder_id: number, dayOrder:number, prompt: string) => {
    //     const response = await aiRequest(1, prompt);
    //     if (response === undefined) {
    //         toast.error("Error generating day");
    //         return;
    //     }

    //     const parsedResponse = JSON.parse(response);
    //     // const oneDayRoutine = await buildHevyProgram(parsedResponse,1,1,"","","");
    //     if (oneDayRoutine) {
    //         setHevyProgram((prevProgram) =>
    //             prevProgram.map((routine) =>
    //                 routine.folder_id === folder_id && routine.order === dayOrder.toString()
    //                     ? { exercises: oneDayRoutine[0].exercises, id: routine.id, folder_id, order: dayOrder.toString(), title: oneDayRoutine[0].title ?? routine.title, notes: "" }
    //                     : routine
    //             )
    //         );
    //     }
    // };


    // Adds an empty day to the selected week
    const handleAddDay = (folder_id: number) => {

        const daysInFolder = hevyProgram.filter((day) => day.folder_id === folder_id);

        if (daysInFolder.length >= 7) {
            toast.error("Maximum 7 days per week");
            return;
        }

        setHevyProgram((prev) => {
            const nthDayOrder = prev.filter((day) => day.folder_id === folder_id).length + 1;

            const maxId = Math.max(...prev.map((d) => Number(d.id)));

            const newEmptyDay: THevyRoutine = {
                id: String(maxId + 1),
                folder_id,
                order: String(nthDayOrder),
                exercises: [],
                title: "",
                notes: "",
            };

            return [...prev, newEmptyDay];
        });
    };

    // // Deletes selected day from selected week by id
    const handleDeleteDay = (id: string) => {
        setHevyProgram((prev) => {
            let newDays = prev.filter((day) => day.id !== id);
            newDays = reorderHevy(newDays);
            return newDays;
        });
    };


    const handleEditTitle = (id: string, title: string) => {
        setHevyProgram((prev) =>
            prev.map((day) =>
                day.id === id ? { ...day, title: title} : day,
            ),
        );
    };

    // // Deletes an exercise from a workout day
    const handleDeleteExercise = (folder_id: number, dayOrder: number, exerciseIndex: number) => {
        setHevyProgram((prev) => {
            return prev.map((day) => {
                if (Number(day.folder_id) === folder_id && Number(day.order) === dayOrder) {
                    return {
                        ...day,
                        exercises: day.exercises.filter((_, index) => index !== exerciseIndex),
                    };
                }
                return day;
            });
        });
    };

    // Adds an exercise to the workout day
    const handleAddExercise = async (folder_id: number, dayOrder: number, exercise: THevyAddExercise) => {

        const sets = hevyAddExerciseToHevySetsConverter(exercise);

        setHevyProgram((prev) => {
            return prev.map((day) => {
                if (Number(day.folder_id) === folder_id && Number(day.order) === dayOrder) {
                    return {
                        ...day,
                        exercises: [...day.exercises,
                            {
                                index: day.exercises.length + 1,
                                title: exercise?.selectedExercise?.title ?? "",
                                notes: "",
                                exercise_template_id: exercise?.selectedExercise?.id ?? "",
                                supersets_id: null,
                                sets: sets,
                                rest_seconds: exercise?.restSeconds ?? null,
                            },
                            ],
                    };
                }
                return day;
            });
        });
    };

    // Adds a routine as a day to the selected week
    const handleAddRoutineAsDay = (routine: THevyRoutine, folder_id: number) => {

        const daysInFolder = hevyProgram.filter((day) => day.folder_id === folder_id);

        if (daysInFolder.length >= 7) {
            toast.error("Maximum 7 days per week");
            return;
        }

        setHevyProgram((prev) => {
            const nthDayOrder = prev.filter((day) => day.folder_id === folder_id).length + 1;

            const maxId = Math.max(...prev.map((d) => Number(d.id)));

            const newEmptyDay: THevyRoutine = {
                id: String(maxId + 1),
                folder_id,
                order: String(nthDayOrder),
                exercises: routine.exercises,
                title: routine.title ?? "",
                notes: routine.notes ?? "",
            };

            return [...prev, newEmptyDay];
        });
    };

    // Adds a note to the selected day (routine)
    const handleAddRoutineNote = (folder_id: number, dayOrder: number, prompt: string) => {
        setHevyProgram((prev) => {
            return prev.map((day) => {
                if (Number(day.folder_id) === folder_id && Number(day.order) === dayOrder) {
                    return { ...day, notes: prompt };
                }
                return day;
            });
        });
    };

    // Adds a note to an exercise on a workout day
    const handleAddExerciseNote = (folder_id: number, dayOrder: number, exerciseIndex: number, prompt: string) => {
        setHevyProgram((prev) => {
            return prev.map((day) => {
                if (Number(day.folder_id) === folder_id && Number(day.order) === dayOrder) {
                    return {
                        ...day,
                        exercises: day.exercises.map((exercise, index) => index === exerciseIndex ? { ...exercise, notes: prompt } : exercise),
                    };
                } else {
                    return day;
                }
            });
        });
    };

    const getNextSupersetId = (day: THevyRoutine) => {
        const currentSupersetIds = Array.from(new Set(
            day.exercises
                .filter((e) => e.supersets_id !== null)
                .map((e) => e.supersets_id)
        )).sort((a, b) => (a || 0) - (b || 0));

        let nextId = 0;
        for (const currentId of currentSupersetIds) {
            if (currentId !== nextId) {
                return nextId;
            }
            nextId++;
        }
        return nextId;
    };

    const handleCreateSuperset = (dayId: string, selectedExercises: number[]) => {
        if (selectedExercises.length < 2) {
            return;
        }
        setHevyProgram((prev) => {
            return prev.map((routine) => {
                if (routine.id === dayId) {
                    const nextSupersetId = getNextSupersetId(routine);
                    return {
                        ...routine,
                        exercises: routine.exercises.map((exercise, index) => {
                            if (selectedExercises.includes(index)) {
                                return {
                                    ...exercise,
                                    supersets_id: nextSupersetId,
                                };
                            }
                            return exercise;
                        }),
                    };
                }
                return routine;
            });
        });
    };

    const handleRemoveFromSuperset = (dayId: string, exerciseIndex: number) => {
        setHevyProgram((prev) => {
            return prev.map((routine) => {
                if (routine.id === dayId) {
                    return {
                        ...routine,
                        exercises: routine.exercises.map((exercise, index) => {
                            if (index === exerciseIndex) {
                                return {
                                    ...exercise,
                                    supersets_id: null,
                                };
                            }
                            return exercise;
                        }),
                    };
                }
                return routine;
            });
        });
    };

    // // Edits an exercise on a workout day
    const handleEditExercise = async (editExercise: THevyDialog) => {

        if (editExercise.editExercise) {
            const sets = hevyAddExerciseToHevySetsConverter(editExercise.editExercise);

            setHevyProgram((prev) => {
                return prev.map((day) => {
                    if (Number(day.folder_id) === editExercise.folder_id && Number(day.order) === editExercise.dayOrder) {
                        return {
                            ...day,
                            exercises: day.exercises.map((exercise, index) => index === editExercise.exerciseIndex ? {
                                index: day.exercises.length + 1,
                                title: editExercise?.editExercise?.selectedExercise?.title ?? "",
                                notes: exercise?.notes ?? "",
                                exercise_template_id: editExercise?.editExercise?.selectedExercise?.id ?? "",
                                supersets_id: null,
                                sets: sets,
                                rest_seconds: editExercise?.editExercise?.restSeconds ?? null,
                            } : exercise),
                        };
                    }
                    return day;
                });
            });
        }

        setIsEditExercise(false);
    };

    const [focusedCardId, setFocusedCardId] = useState<string>("");
    const [currentWeekIndex, setCurrentWeekIndex] = useState(0);
    const isMobile = useIsMobile();
    const numberOfWeeks = useMemo(() => getNumberRoutineFolders(hevyProgram), [hevyProgram]);
    const numberOfWeeksArr = useMemo(() => Array.from({ length: numberOfWeeks }, (_, i) => i), [numberOfWeeks]);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem("hevy-program-in-progress", JSON.stringify(hevyProgram));
            localStorage.setItem("hevy-request", JSON.stringify(request));
        }
    }, [hevyProgram, request]);

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
                        <div className="flex flex-col max-h-[85vh] w-full max-w-full overflow-hidden">
                            <div className="flex flex-row items-center justify-between px-4 py-2 border-b flex-shrink-0 w-full max-w-full">
                                <Button
                                    onClick={ handlePreviousWeek }
                                    disabled={ currentWeekIndex === 0 }
                                    variant="ghost"
                                    size="icon"
                                    className={ `flex-shrink-0 ${currentWeekIndex === 0 ? "opacity-50 cursor-not-allowed" : ""}` }
                                >
                                    <ChevronLeft className="h-6 w-6" />
                                </Button>
                                <div className="text-lg font-semibold flex-shrink-0">
                                    Week { currentWeekIndex + 1 } / { numberOfWeeks }
                                </div>
                                <Button
                                    onClick={ handleNextWeek }
                                    disabled={ currentWeekIndex >= numberOfWeeks - 1 }
                                    variant="ghost"
                                    size="icon"
                                    className={ `flex-shrink-0 ${currentWeekIndex >= numberOfWeeks - 1 ? "opacity-50 cursor-not-allowed" : ""}` }
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
                                className={`flex flex-row gap-4 h-[85vh] overflow-scroll w-full ${!user ? "border-t-4 border-lightGray" : ""}`}
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
