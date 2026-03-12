"use client";

import { useState, useCallback, memo } from "react";
import { hevyAddExerciseToHevySetsConverter, reorderHevy, sortHevyByOrder } from "@/components/program-builder/utils";
import { IOption } from "@/components/ui/multi-select";
import { toast } from "sonner";
import { ProgramGrid } from "./ProgramGrid";

interface IProps {
    orderedProgram: THevyRoutine[];
    setHevyProgram: React.Dispatch<React.SetStateAction<THevyRoutine[]>>;
    isMobile: boolean;
}

function ProgramEditorInner(props: IProps) {
    const { orderedProgram, setHevyProgram, isMobile } = props;

    const [addExerciseDialog, setAddExerciseDialog] = useState<THevyDialog>({ folder_id: 0, dayOrder: 0, isOpen: false });
    const [addNoteDialog, setAddNoteDialog] = useState<THevyDialog>({ folder_id: 0, dayOrder: 0, isOpen: false });
    const [addExerciseNoteDialog, setAddExerciseNoteDialog] = useState<THevyDialog>({ folder_id: 0, dayOrder: 0, isOpen: false });
    const [isEditExercise, setIsEditExercise] = useState(false);
    const [focusedCardId, setFocusedCardId] = useState<string>("");

    const handleIsEditExercise = useCallback((isEditExercise: boolean) => {
    setIsEditExercise(isEditExercise);
}, []);

// // Duplicates the selected week to other selected weeks
const handleDuplicateWeek = useCallback((fromWeekIndex: number, toWeekIndexes: number[]) => {
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
}, [setHevyProgram]);

// Duplicates the selected day to other days in the program on the selected week
const handleDuplicateDay = useCallback((fromWeekOrder: number, fromDayOrder: number, toWeekOrder: number, toDayOrderArray: IOption[]) => {
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
}, [setHevyProgram]);

// State for opening the Add Exercise Dialog with the correct week and day
const handleOpenAddExerciseDialog = useCallback((addExerciseDialog: THevyDialog) => {
    if (addExerciseDialog.isOpen === false) {
        setIsEditExercise(false);
    }
    setAddExerciseDialog(addExerciseDialog);
}, []);

// State for opening the Add Note Dialog with the correct week and day
const handleOpenAddNoteDialog = useCallback((addNoteDialog: THevyDialog) => {
    setAddNoteDialog(addNoteDialog);
}, []);

// State for opening the Add Exercise Note Dialog with the correct week and day
const handleOpenAddExerciseNoteDialog = useCallback((addExerciseNoteDialog: THevyDialog) => {
    setAddExerciseNoteDialog(addExerciseNoteDialog);
}, []);

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
const handleAddDay = useCallback((folder_id: number) => {
    setHevyProgram((prev) => {
        const daysInFolder = prev.filter((day) => day.folder_id === folder_id);
        if (daysInFolder.length >= 7) {
            toast.error("Maximum 7 days per week");
            return prev;
        }
        const nthDayOrder = daysInFolder.length + 1;
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
}, [setHevyProgram]);

const handleDeleteDay = useCallback((id: string) => {
    setHevyProgram((prev) => {
        let newDays = prev.filter((day) => day.id !== id);
        newDays = reorderHevy(newDays);
        return newDays;
    });
}, [setHevyProgram]);

const handleEditTitle = useCallback((id: string, title: string) => {
    setHevyProgram((prev) =>
        prev.map((day) => (day.id === id ? { ...day, title } : day))
    );
}, [setHevyProgram]);

const handleDeleteExercise = useCallback((folder_id: number, dayOrder: number, exerciseIndex: number) => {
    setHevyProgram((prev) =>
        prev.map((day) => {
            if (Number(day.folder_id) === folder_id && Number(day.order) === dayOrder) {
                return {
                    ...day,
                    exercises: day.exercises.filter((_, index) => index !== exerciseIndex),
                };
            }
            return day;
        })
    );
}, [setHevyProgram]);

const handleAddExercise = useCallback(async (folder_id: number, dayOrder: number, exercise: THevyAddExercise) => {
    const sets = hevyAddExerciseToHevySetsConverter(exercise);
    setHevyProgram((prev) =>
        prev.map((day) => {
            if (Number(day.folder_id) === folder_id && Number(day.order) === dayOrder) {
                return {
                    ...day,
                    exercises: [
                        ...day.exercises,
                        {
                            index: day.exercises.length + 1,
                            title: exercise?.selectedExercise?.title ?? "",
                            notes: "",
                            exercise_template_id: exercise?.selectedExercise?.id ?? "",
                            supersets_id: null,
                            sets,
                            rest_seconds: exercise?.restSeconds ?? null,
                        },
                    ],
                };
            }
            return day;
        })
    );
}, [setHevyProgram]);

const handleAddRoutineAsDay = useCallback((routine: THevyRoutine, folder_id: number) => {
    setHevyProgram((prev) => {
        const daysInFolder = prev.filter((day) => day.folder_id === folder_id);
        if (daysInFolder.length >= 7) {
            toast.error("Maximum 7 days per week");
            return prev;
        }
        const nthDayOrder = daysInFolder.length + 1;
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
}, [setHevyProgram]);

const handleAddRoutineNote = useCallback((folder_id: number, dayOrder: number, prompt: string) => {
    setHevyProgram((prev) =>
        prev.map((day) => {
            if (Number(day.folder_id) === folder_id && Number(day.order) === dayOrder) {
                return { ...day, notes: prompt };
            }
            return day;
        })
    );
}, [setHevyProgram]);

const handleAddExerciseNote = useCallback((folder_id: number, dayOrder: number, exerciseIndex: number, prompt: string) => {
    setHevyProgram((prev) =>
        prev.map((day) => {
            if (Number(day.folder_id) === folder_id && Number(day.order) === dayOrder) {
                return {
                    ...day,
                    exercises: day.exercises.map((exercise, index) =>
                        index === exerciseIndex ? { ...exercise, notes: prompt } : exercise
                    ),
                };
            }
            return day;
        })
    );
}, [setHevyProgram]);

const getNextSupersetId = useCallback((day: THevyRoutine) => {
    const currentSupersetIds = Array.from(new Set(
        day.exercises
            .filter((e) => e.supersets_id !== null)
            .map((e) => e.supersets_id)
    )).sort((a, b) => (a || 0) - (b || 0));
    let nextId = 0;
    for (const currentId of currentSupersetIds) {
        if (currentId !== nextId) return nextId;
        nextId++;
    }
    return nextId;
}, []);

const handleCreateSuperset = useCallback((dayId: string, selectedExercises: number[]) => {
    if (selectedExercises.length < 2) return;
    setHevyProgram((prev) =>
        prev.map((routine) => {
            if (routine.id !== dayId) return routine;
            const nextSupersetId = getNextSupersetId(routine);
            return {
                ...routine,
                exercises: routine.exercises.map((exercise, index) =>
                    selectedExercises.includes(index) ? { ...exercise, supersets_id: nextSupersetId } : exercise
                ),
            };
        })
    );
}, [getNextSupersetId, setHevyProgram]);

const handleRemoveFromSuperset = useCallback((dayId: string, exerciseIndex: number) => {
    setHevyProgram((prev) =>
        prev.map((routine) => {
            if (routine.id !== dayId) return routine;
            return {
                ...routine,
                exercises: routine.exercises.map((exercise, index) =>
                    index === exerciseIndex ? { ...exercise, supersets_id: null } : exercise
                ),
            };
        })
    );
}, [setHevyProgram]);

const handleEditExercise = useCallback((editExercise: THevyDialog) => {
    if (editExercise.editExercise) {
        const sets = hevyAddExerciseToHevySetsConverter(editExercise.editExercise);
        setHevyProgram((prev) =>
            prev.map((day) => {
                if (Number(day.folder_id) !== editExercise.folder_id || Number(day.order) !== editExercise.dayOrder) {
                    return day;
                }
                return {
                    ...day,
                    exercises: day.exercises.map((exercise, index) =>
                        index === editExercise.exerciseIndex
                            ? {
                                  ...exercise,
                                  index: day.exercises.length + 1,
                                  title: editExercise?.editExercise?.selectedExercise?.title ?? "",
                                  notes: exercise?.notes ?? "",
                                  reason: exercise?.reason ?? "",
                                  exercise_template_id: editExercise?.editExercise?.selectedExercise?.id ?? "",
                                  supersets_id: exercise?.supersets_id ?? null,
                                  sets,
                                  rest_seconds: editExercise?.editExercise?.restSeconds ?? null,
                              }
                            : exercise
                    ),
                };
            })
        );
    }
    setIsEditExercise(false);
}, [setHevyProgram]);

    return (
        <ProgramGrid
            orderedProgram={orderedProgram}
            setHevyProgram={setHevyProgram}
            isMobile={isMobile}
            addExerciseDialog={addExerciseDialog}
            addNoteDialog={addNoteDialog}
            addExerciseNoteDialog={addExerciseNoteDialog}
            isEditExercise={isEditExercise}
            handleIsEditExercise={handleIsEditExercise}
            handleDuplicateWeek={handleDuplicateWeek}
            handleDuplicateDay={handleDuplicateDay}
            handleOpenAddExerciseDialog={handleOpenAddExerciseDialog}
            handleOpenAddNoteDialog={handleOpenAddNoteDialog}
            handleOpenAddExerciseNoteDialog={handleOpenAddExerciseNoteDialog}
            handleAddDay={handleAddDay}
            handleDeleteDay={handleDeleteDay}
            handleEditTitle={handleEditTitle}
            handleDeleteExercise={handleDeleteExercise}
            handleAddExercise={handleAddExercise}
            handleAddRoutineAsDay={handleAddRoutineAsDay}
            handleAddRoutineNote={handleAddRoutineNote}
            handleAddExerciseNote={handleAddExerciseNote}
            getNextSupersetId={getNextSupersetId}
            handleCreateSuperset={handleCreateSuperset}
            handleRemoveFromSuperset={handleRemoveFromSuperset}
            handleEditExercise={handleEditExercise}
            focusedCardId={focusedCardId}
            setFocusedCardId={setFocusedCardId}
        />
    );
}

export const ProgramEditor = memo(ProgramEditorInner);
