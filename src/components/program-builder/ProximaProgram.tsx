"use client";

import { useState } from "react";
import { toast } from "sonner"
import { AddExerciseDialog } from "./AddExerciseDialog";
import { Option } from "@/components/ui/multi-select";
import { GenerateDayDialog } from "./GenerateDayDialog";
import { v4 as uuidv4 } from "uuid";
import { appendWeekOrderAndIdToProgramDays, flattenProgram, reorder } from "@/utils/helpers";
import { useExercises } from "@/api/hooks";
import { Column } from "../drag-and-drop/Column";

interface IProps {
    program: TProgramCreatorDay[][];
}

export const ProximaProgram: React.FC<IProps> = (props) => {

    const {
        program,
    } = props;

    const { data: exercises }  = useExercises();

    // const [addExerciseDialog, setAddExerciseDialog] = useState<TDialog>({currentWeek: undefined, currentDay: undefined, isOpen: false});
    const [generateDayDialog, setGenerateDayDialog] = useState<TDialog>({currentWeek: undefined, currentDay: undefined, isOpen: false});
    // const [isEditExercise, setIsEditExercise] = useState(false);

    // const handleIsEditExercise = (isEditExercise: boolean) => {
    //     setIsEditExercise(isEditExercise);
    // };

    // Duplicates the selected week to other selected weeks
    const handleDuplicateWeek = (fromWeekIndex: number, toWeekIndexes: number[]) => {
        setFlattenedProgramDays((prev) => {

            const filteredPrev = prev.filter((day) => !toWeekIndexes.includes(Number(day.weekOrder)));

            const daysToCopy = prev.filter((day) => day.weekOrder === String(fromWeekIndex));

            let newId = filteredPrev.length + 1;

            const newDays = toWeekIndexes.flatMap((week) =>
                daysToCopy.map((day) => ({
                    ...day,
                    id: String(newId++),
                    weekOrder: String(week),
                }))
            );

            return reorder([...filteredPrev, ...newDays]);
        });
    };

    // Duplicates the selected day to other days in the program on the selected week
    const handleDuplicateDay = (fromWeekOrder: number, fromDayOrder: number, toWeekOrder: number, toDayOrderArray: Option[]) => {

        const toDayOrders = toDayOrderArray.map((day) => Number(day.value)).sort((a, b) => a - b);
        console.log(toDayOrders);
        setFlattenedProgramDays((prev) => {
            const dayToCopy = prev.find((day) => Number(day.weekOrder) === fromWeekOrder && Number(day.order) === fromDayOrder);

            if (!dayToCopy) return prev;

            const existingDaysInTargetWeek = prev.filter((day) => Number(day.weekOrder) === toWeekOrder);
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
                            weekOrder: String(toWeekOrder),
                            order: String(i),
                            exercises: [],
                        });
                    }
                }
            }

            updatedDays = updatedDays.filter((day) => !(Number(day.weekOrder) === toWeekOrder && toDayOrders.includes(Number(day.order))));

            const newDays = toDayOrders.map((dayOrder) => ({
                ...dayToCopy,
                id: String(newId++),
                weekOrder: String(toWeekOrder),
                order: String(dayOrder),
            }));

            return reorder([...updatedDays, ...newDays]);
        });
    };

    // // State for opening the Add Exercise Dialog with the correct week and day
    // const handleAddExerciseDialog = (addExerciseDialog: TDialog) => {
    //     setAddExerciseDialog(addExerciseDialog);
    // };

    // // State for opening the Generate Day Dialog with the correct week and day
    const handleOpenGenerateDayDialog = (generateDayDialog: TDialog) => {
        setGenerateDayDialog(generateDayDialog);
    };

    // Will re-generate the currently selected day based on a prompt
    const handleGenerateDay = (weekOrder: number, dayOrder:number, prompt: string) => {
        // Do AI re-generation of a day here
        console.log(weekOrder, dayOrder, prompt);
    };


    // Adds an empty day to the selected week
    const handleAddDay = (weekOrder: string) => {
        setFlattenedProgramDays((prev) => {
            const nthDayOrder = prev.filter((day) => day.weekOrder === weekOrder).length + 1;

            const newEmptyDay: TProgramCreatorDay = {
                id: String(flattenedProgramDays.length + 1),
                weekOrder,
                order: String(nthDayOrder),
                exercises: [],
            };

            return [...prev, newEmptyDay];
        });
    };

    // Deletes selected day from selected week by id
    const handleDeleteDay = (id: string) => {
        setFlattenedProgramDays((prev) => {
            let newDays = prev.filter((day) => day.id !== id);
            newDays = reorder(newDays);
            return newDays;
        });
    };

    // // Adds an exercise to the workout day
    // const handleAddExercise = (currentWeekIndex: number, currentDay: number, exercise: TProgramCreatorExercise) => {
    //     const tmpProgram = structuredClone(newProgram);

    //     if (tmpProgram[currentWeekIndex][currentDay - 1].exercises.length === 10) {
    //         toast.error("Maximum 10 Exercises per day");
    //         return;
    //     }
    //     tmpProgram[currentWeekIndex][currentDay - 1].exercises.push(exercise);
    //     setNewProgram(tmpProgram);
    //     return;
    // };

    const handleEditTitle = (id: string, day_title: string) => {
        setFlattenedProgramDays((prev) =>
            prev.map((day) =>
                day.id === id ? { ...day, day_title: day_title} : day
            )
        );
    };

    // const handleEditTitle = (currentWeek: number, currentDay: number, day_title: string) => {
    //     const tmpProgram = structuredClone(newProgram);
    //     tmpProgram[currentWeek][currentDay - 1].day_title = day_title;
    //     setNewProgram(tmpProgram);
    // };

    // const handleDeleteExercise = (currentWeekIndex: number, currentDay: number, exerciseIndex: number) => {
    //     const tmpProgram = structuredClone(newProgram);

    //     tmpProgram[currentWeekIndex][currentDay - 1].exercises = tmpProgram[currentWeekIndex][currentDay - 1].exercises.filter(
    //         (_, index) => index !== exerciseIndex
    //     );

    //     setNewProgram(tmpProgram);
    // };

    // const handleEditExercise = async (editExercise: TDialog) => {
    //     const tmpProgram = structuredClone(newProgram);
    //     const convertedEditExercise = await addExerciseToProgramCreatorExerciseConverter(editExercise.editExercise);
    //     tmpProgram[editExercise.currentWeek][editExercise.currentDay - 1].exercises[editExercise.exerciseIndex] = convertedEditExercise;
    //     setNewProgram(tmpProgram);
    //     setIsEditExercise(false);
    //     return;
    // };
    const [flattenedProgramDays, setFlattenedProgramDays] = useState<TProgramCreatorDay[]>(flattenProgram(appendWeekOrderAndIdToProgramDays(program)));

    console.log(flattenedProgramDays.map((day) => day.id));

    return (
        <>
            <div className="flex flex-row gap-4 h-full w-full">
                { program.map((days, index) => (
                    <Column
                        key={ `Week ${index + 1}` }
                        title={ `Week ${index + 1}` }
                        programLength={ program.length }
                        flattenedProgramDays={ flattenedProgramDays }
                        weekOrder={ String(index) }
                        setFlattenedProgramDays={ setFlattenedProgramDays }
                        handleAddDay={ handleAddDay }
                        handleDeleteDay={ handleDeleteDay }
                        handleEditTitle={ handleEditTitle }
                        handleDuplicateWeek={ handleDuplicateWeek }
                        handleDuplicateDay={ handleDuplicateDay }
                        handleOpenGenerateDayDialog={ handleOpenGenerateDayDialog }
                    />
                ) ) }
            </div>
            {/* { addExerciseDialog.isOpen &&
                <AddExerciseDialog
                    addExerciseDialog={ addExerciseDialog }
                    isEditExercise={ isEditExercise }
                    handleEditExercise={ handleEditExercise }
                    handleAddExercise={ handleAddExercise }
                    handleAddExerciseDialog={ handleAddExerciseDialog }
                />
            } */ }
            <GenerateDayDialog
                handleGenerateDay={ handleGenerateDay }
                generateDayDialog={ generateDayDialog }
                handleOpenGenerateDayDialog={ handleOpenGenerateDayDialog }
            />
        </>
    );
};
