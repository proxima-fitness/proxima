"use client";

import { useEffect, useState } from "react";
import { AddExerciseDialog } from "./AddExerciseDialog";
import { IOption } from "@/components/ui/multi-select";
import { GenerateDayDialog } from "./GenerateDayDialog";
import { useExercises } from "@/api/hooks";
import { Column } from "./Column";
import { addExerciseToProgramCreatorExerciseConverter, aiRequest, appendWeekOrderAndIdToProgramDays, buildProgram, deFlattenProgram, flattenProgram, reorder } from "../utils";
import { toast } from "sonner";

interface IProps {
    program: TProgramCreatorDay[][];
}

export const ProximaProgram: React.FC<IProps> = (props) => {

    const {
        program,
    } = props;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { data: exercises }  = useExercises();

    const [addExerciseDialog, setAddExerciseDialog] = useState<TDialog>({weekOrder: 0, dayOrder: 0, isOpen: false});
    const [generateDayDialog, setGenerateDayDialog] = useState<TDialog>({weekOrder: 0, dayOrder: 0, isOpen: false});
    const [isEditExercise, setIsEditExercise] = useState(false);

    const handleIsEditExercise = (isEditExercise: boolean) => {
        setIsEditExercise(isEditExercise);
    };

    // Duplicates the selected week to other selected weeks
    const handleDuplicateWeek = (fromWeekIndex: number, toWeekIndexes: number[]) => {
        setFlattenedProgramDays((prev) => {

            const filteredPrev = prev.filter((day) => !toWeekIndexes.includes(Number(day.weekOrder)));

            const daysToCopy = prev.filter((day) => day.weekOrder === String(fromWeekIndex));

            let maxId = Math.max(...prev.map((d) => Number(d.id)));

            const newDays = toWeekIndexes.flatMap((week) =>
                daysToCopy.map((day) => ({
                    ...day,
                    id: String(++maxId),
                    weekOrder: String(week),
                })),
            );

            return reorder([...filteredPrev, ...newDays]);
        });
    };

    // Duplicates the selected day to other days in the program on the selected week
    const handleDuplicateDay = (fromWeekOrder: number, fromDayOrder: number, toWeekOrder: number, toDayOrderArray: IOption[]) => {

        const toDayOrders = toDayOrderArray.map((day) => Number(day.value)).sort((a, b) => a - b);

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
    const handleOpenAddExerciseDialog = (addExerciseDialog: TDialog) => {
        if (addExerciseDialog.isOpen === false) {
            setIsEditExercise(false);
        }
        setAddExerciseDialog(addExerciseDialog);
    };

    // // State for opening the Generate Day Dialog with the correct week and day
    const handleOpenGenerateDayDialog = (generateDayDialog: TDialog) => {
        setGenerateDayDialog(generateDayDialog);
    };

    // Will re-generate the currently selected day based on a prompt
    const handleGenerateDay = async (weekOrder: number, dayOrder: number, prompt: string) => {
        const response = await aiRequest(1, prompt);
        if (!response) {
            toast.error("Error generating day");
            return;
        }

        const parsedResponse = JSON.parse(response);
        const newDayRoutine = await buildProgram(parsedResponse, 1, 1);

        if (!newDayRoutine || !Array.isArray(newDayRoutine) || newDayRoutine.length === 0) {
            toast.error("Generated routine is invalid");
            return;
        }

        setFlattenedProgramDays((prevDays) =>
            prevDays.map((day) =>
                day.weekOrder === String(weekOrder) && day.order === String(dayOrder)
                    ? { day_title: newDayRoutine[0][0].day_title ?? day.day_title, exercises: newDayRoutine[0][0].exercises ?? day.exercises, order: String(dayOrder), weekOrder: String(weekOrder),  id: day.id }
                    : day
            )
        );
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


    const handleEditTitle = (id: string, day_title: string) => {
        setFlattenedProgramDays((prev) =>
            prev.map((day) =>
                day.id === id ? { ...day, day_title: day_title} : day,
            ),
        );
    };

    // Deletes an exercise from a workout day
    const handleDeleteExercise = (weekOrder: number, dayOrder: number, exerciseIndex: number) => {
        setFlattenedProgramDays((prev) => {
            return prev.map((day) => {
                if (Number(day.weekOrder) === weekOrder && Number(day.order) === dayOrder) {
                    return {
                        ...day,
                        exercises: day?.exercises?.filter((_, index) => index !== exerciseIndex) ?? [],
                    };
                }
                return day;
            });
        });
    };

    // Adds an exercise to the workout day
    const handleAddExercise = (weekOrder: number, dayOrder: number, exercise: TProgramCreatorExercise) => {
        setFlattenedProgramDays((prev) => {
            return prev.map((day) => {
                if (Number(day.weekOrder) === weekOrder && Number(day.order) === dayOrder) {
                    return {
                        ...day,
                        exercises: day?.exercises ? [...day.exercises, exercise] : [exercise],
                    };
                }
                return day;
            });
        });
    };

    // Edits an exercise on a workout day
    const handleEditExercise = async (editExercise: TDialog) => {

        if (editExercise.editExercise) {
            const convertedEditExercise = await addExerciseToProgramCreatorExerciseConverter(editExercise.editExercise);

            setFlattenedProgramDays((prev) => {
                return prev.map((day) => {
                    if (Number(day.weekOrder) === editExercise.weekOrder && Number(day.order) === editExercise.dayOrder) {
                        return {
                            ...day,
                            exercises: day?.exercises?.map((exercise, index) => index === editExercise.exerciseIndex ? convertedEditExercise : exercise) ?? [],
                        };
                    }
                    return day;
                });
            });
        }

        setIsEditExercise(false);
    };

    const [flattenedProgramDays, setFlattenedProgramDays] = useState<TProgramCreatorDay[]>(flattenProgram(appendWeekOrderAndIdToProgramDays(program)));
    const [focusedCardId, setFocusedCardId] = useState<string>("");

    useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem("program-in-progress", JSON.stringify(deFlattenProgram(flattenedProgramDays)));
        }
    }, [flattenedProgramDays]);

    return (
        <>
            <div className="flex flex-row gap-4 h-full w-full">
                { program.map((_, index) => (
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
                        handleIsEditExercise={ handleIsEditExercise }
                        handleDuplicateWeek={ handleDuplicateWeek }
                        handleDuplicateDay={ handleDuplicateDay }
                        handleOpenGenerateDayDialog={ handleOpenGenerateDayDialog }
                        handleOpenAddExerciseDialog={ handleOpenAddExerciseDialog }
                        handleDeleteExercise={ handleDeleteExercise }
                        focusedCardId={ focusedCardId }
                        setFocusedCardId={ setFocusedCardId }
                    />
                ) ) }
            </div>
            { addExerciseDialog.isOpen &&
                <AddExerciseDialog
                    addExerciseDialog={ addExerciseDialog }
                    isEditExercise={ isEditExercise }
                    handleEditExercise={ handleEditExercise }
                    handleAddExercise={ handleAddExercise }
                    handleOpenAddExerciseDialog={ handleOpenAddExerciseDialog }
                />
            }
            <GenerateDayDialog
                handleGenerateDay={ handleGenerateDay }
                generateDayDialog={ generateDayDialog }
                handleOpenGenerateDayDialog={ handleOpenGenerateDayDialog }
            />
        </>
    );
};
