

"use client";

import { useEffect, useState } from "react";
import {  useHevyExercises } from "@/api/hooks";
import { appendOrderToHevyRoutines, getHevyExerciseFromLocalStorageByID, getNumberRoutineFolders, hevyAddExerciseToHevySetsConverter, reorderHevy } from "@/utils/helpers";
import { HevyColumn } from "./hevy/HevyColumn";
import { HevyAddExerciseDialog } from "./hevy/HevyAddExerciseDialog";
import { HevyGenerateDayDialog } from "./hevy/HevyGenerateDayDialog";
import { Option } from "@/components/ui/multi-select";

interface IProps {
    program: THevyRoutine[];
}

export const HevyRoutine: React.FC<IProps> = (props) => {

    const {
        program,
    } = props;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { data: exercises }  = useHevyExercises(); // Pre-populating the HevyAddExerciseDialog

    const [addExerciseDialog, setAddExerciseDialog] = useState<THevyDialog>({folder_id: undefined, dayOrder: undefined, isOpen: false});
    const [generateDayDialog, setGenerateDayDialog] = useState<THevyDialog>({folder_id: undefined, dayOrder: undefined, isOpen: false});
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

    // // Duplicates the selected day to other days in the program on the selected week
    const handleDuplicateDay = (fromWeekOrder: number, fromDayOrder: number, toWeekOrder: number, toDayOrderArray: Option[]) => {

        const toDayOrders = toDayOrderArray.map((day) => Number(day.value)).sort((a, b) => a - b);

        setHevyProgram((prev) => {
            const dayToCopy = prev.find((day) => Number(day.folder_id) === fromWeekOrder && Number(day.order) === fromDayOrder);

            if (!dayToCopy) return prev;

            const existingDaysInTargetWeek = prev.filter((day) => Number(day.folder_id) === toWeekOrder);
            const maxExistingOrder = Math.max(...existingDaysInTargetWeek.map((day) => Number(day.order)), 0);

            let newId = Math.max(...prev.map((day) => Number(day.id)), 0) + 1;
            let updatedDays = [...prev];

            const maxToDayOrder = Math.max(...toDayOrders);

            if (maxToDayOrder > maxExistingOrder) {
                for (let i = maxExistingOrder + 1; i <= maxToDayOrder; i++) {
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
                        });
                    }
                }
            }

            updatedDays = updatedDays.filter((day) => !(day.folder_id === toWeekOrder && toDayOrders.includes(Number(day.order))));

            const newDays = toDayOrders.map((dayOrder) => ({
                ...dayToCopy,
                id: String(newId++),
                folder_id: toWeekOrder,
                order: String(dayOrder),
            }));

            return reorderHevy([...updatedDays, ...newDays]);
        });
    };

    // // // State for opening the Add Exercise Dialog with the correct week and day
    const handleOpenAddExerciseDialog = (addExerciseDialog: THevyDialog) => {
        if (addExerciseDialog.isOpen === false) {
            setIsEditExercise(false);
        }
        setAddExerciseDialog(addExerciseDialog);
    };

    // // // State for opening the Generate Day Dialog with the correct week and day
    const handleOpenGenerateDayDialog = (generateDayDialog: THevyDialog) => {
        setGenerateDayDialog(generateDayDialog);
    };

    // // Will re-generate the currently selected day based on a prompt
    const handleGenerateDay = (folder_id: number, dayOrder:number, prompt: string) => {
        // TODO: Do AI re-generation of a day here
        console.log(folder_id, dayOrder, prompt);
    };


    // // Adds an empty day to the selected week
    const handleAddDay = (folder_id: number) => {
        setHevyProgram((prev) => {
            const nthDayOrder = prev.filter((day) => day.folder_id === folder_id).length + 1;

            const maxId = Math.max(...prev.map((d) => Number(d.id)));

            const newEmptyDay: THevyRoutine = {
                id: String(maxId + 1),
                folder_id,
                order: String(nthDayOrder),
                exercises: [],
                title: "",
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

    // // Adds an exercise to the workout day
    const handleAddExercise = async (folder_id: number, dayOrder: number, exercise: THevyAddExercise) => {

        const sets = hevyAddExerciseToHevySetsConverter(exercise);
        const exerciseTemplate = await getHevyExerciseFromLocalStorageByID(exercise.id);

        setHevyProgram((prev) => {
            return prev.map((day) => {
                if (Number(day.folder_id) === folder_id && Number(day.order) === dayOrder) {
                    return {
                        ...day,
                        exercises: [...day.exercises,
                            {
                                index: day.exercises.length + 1,
                                title: exerciseTemplate.title,
                                notes: "",
                                exercise_template_id: exercise.id,
                                supersets_id: null,
                                sets: sets,
                            },
                            ],
                    };
                }
                return day;
            });
        });
    };

    // // Edits an exercise on a workout day
    const handleEditExercise = async (editExercise: THevyDialog) => {

        const sets = hevyAddExerciseToHevySetsConverter(editExercise.editExercise);
        const exerciseTemplate = await getHevyExerciseFromLocalStorageByID(editExercise.editExercise.id);

        setHevyProgram((prev) => {
            return prev.map((day) => {
                if (Number(day.folder_id) === editExercise.folder_id && Number(day.order) === editExercise.dayOrder) {
                    return {
                        ...day,
                        exercises: day.exercises.map((exercise, index) => index === editExercise.exerciseIndex ? {
                            index: day.exercises.length + 1,
                            title: exerciseTemplate.title,
                            notes: "",
                            exercise_template_id: exerciseTemplate.id,
                            supersets_id: null,
                            sets: sets,
                        } : exercise),
                    };
                }
                return day;
            });
        });

        setIsEditExercise(false);
    };

    const [hevyProgram, setHevyProgram] = useState<THevyRoutine[]>(appendOrderToHevyRoutines(program));
    const numberOfWeeks = getNumberRoutineFolders(hevyProgram);
    const numberOfWeeksArr = Array.from({ length: numberOfWeeks }, (_, i) => i);

    useEffect(() => {
        if (typeof window !== undefined) {
            localStorage.setItem("hevy-program-in-progress", JSON.stringify(hevyProgram));
        }
    }, [hevyProgram]);

    return (
        <>
            <div className="flex flex-row gap-4 h-full w-full">

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
                        handleOpenGenerateDayDialog={ handleOpenGenerateDayDialog }
                        handleOpenAddExerciseDialog={ handleOpenAddExerciseDialog }
                        handleDeleteExercise={ handleDeleteExercise }
                    />
                ) ) }
            </div>
            { addExerciseDialog.isOpen &&
                <HevyAddExerciseDialog
                    addExerciseDialog={ addExerciseDialog }
                    isEditExercise={ isEditExercise }
                    handleEditExercise={ handleEditExercise }
                    handleAddExercise={ handleAddExercise }
                    handleOpenAddExerciseDialog={ handleOpenAddExerciseDialog }
                />
            }
            <HevyGenerateDayDialog
                handleGenerateDay={ handleGenerateDay }
                generateDayDialog={ generateDayDialog }
                handleOpenGenerateDayDialog={ handleOpenGenerateDayDialog }
            />
        </>
    );
};
