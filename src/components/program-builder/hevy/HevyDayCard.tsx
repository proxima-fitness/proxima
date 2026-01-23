"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { EllipsisIcon, PlusIcon, NotebookTextIcon, LinkIcon } from "lucide-react";
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
import { IOption } from "@/components/ui/multi-select";
import { convertHevyExerciseIntoHevyAddExercise } from "../utils";
import { useHevyCustomExercises, useHevySecret } from "@/api/hooks";
import { useUserContext } from "@/contexts/UserContext";
import { useTheme } from "next-themes";

interface IProps {
    day: THevyRoutine;
    title: string;
    folder_id: number;
    programLength: number;
    handleDragStart: (e: DragEvent, card: THevyCard) => void;
    handleEditTitle: (id: string, title: string) => void;
    handleDeleteDay: (id: string) => void;
    handleOpenAddNoteDialog: (addNoteDialog: THevyDialog) => void;
    handleOpenAddExerciseDialog: (addExerciseDialog: THevyDialog) => void;
    handleOpenAddExerciseNoteDialog: (addExerciseNoteDialog: THevyDialog) => void;
    handleDuplicateDay: (fromWeekOrder: number, fromDayOrder: number, toWeekOrder: number, toDayIndexArray: IOption[]) => void;
    handleDeleteExercise: (folder_id: number, dayOrder: number, exerciseIndex: number) => void;
    handleIsEditExercise: (isEditExercise: boolean) => void;
    focusedCardId: string;
    setFocusedCardId: (focusedCardId: string) => void;
    handleCreateSuperset: (dayId: string, selectedExercises: number[]) => void;
    handleRemoveFromSuperset: (dayId: string, exerciseIndex: number) => void;
}

export const HevyDayCard: React.FC<IProps> = (props) => {

    const {
        day,
        title,
        folder_id,
        handleDragStart,
        handleDeleteDay,
        programLength,
        handleEditTitle,
        handleOpenAddExerciseDialog,
        handleOpenAddExerciseNoteDialog,
        handleOpenAddNoteDialog,
        handleDuplicateDay,
        handleDeleteExercise,
        handleIsEditExercise,
        focusedCardId,
        setFocusedCardId,
        handleCreateSuperset,
        handleRemoveFromSuperset,
    } = props;

    const { resolvedTheme } = useTheme();
    const [duplicateDayOpen, setDuplicateDayOpen] = useState(false);
    const [editTitleOpen, setEditTitleOpen] = useState(false);
    const [currentTitle, setCurrentTitle] = useState(day.title ?? "");
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedExercises, setSelectedExercises] = useState<number[]>([]);
    const { user } = useUserContext();
    const { data: hevyApiKey } = useHevySecret(user);
    const { data: customExercises } = useHevyCustomExercises(user, hevyApiKey);

    const handleEdit = async (currentWeek: number, currentDay: number, exerciseIndex: number, editExercise: THevyExercise ) => {
            handleIsEditExercise(true);
            const convertedExercise = await convertHevyExerciseIntoHevyAddExercise(editExercise, customExercises);
            handleOpenAddExerciseDialog({folder_id: currentWeek, dayOrder: currentDay, isOpen: true, exerciseIndex: exerciseIndex, editExercise: convertedExercise });
    };

    const handleFocus = () => {
        setFocusedCardId(day.id ?? "");
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
        const handleKeyDown = (event: KeyboardEvent) => {
            if (focusedCardId === day.id) {
                if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "e") {
                    event.preventDefault();
                    setEditTitleOpen(true);
                } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "d") {
                    event.preventDefault();
                    handleDeleteDay(day.id);
                }
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [day.id, day.order, focusedCardId, folder_id, handleDeleteDay, handleOpenAddNoteDialog]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (focusedCardId === day.id) {
                if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "g") {
                    event.preventDefault();
                    // handleOpenGenerateDayDialog({ folder_id: Number(folder_id), dayOrder: Number(day.order), isOpen: true });
                }
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [day.id, day.order, focusedCardId, folder_id, handleDeleteDay]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (focusedCardId === day.id) {
                if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "v") {
                    event.preventDefault();
                    handleOpenAddNoteDialog({ folder_id: Number(folder_id), dayOrder: Number(day.order), isOpen: true });
                }
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [day.id, day.order, focusedCardId, folder_id, handleDeleteDay, handleOpenAddNoteDialog]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (focusedCardId === day.id) {
                if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") {
                    event.preventDefault();
                    setDuplicateDayOpen(true);
                }
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [day.id, focusedCardId, setDuplicateDayOpen]);

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
        handleCreateSuperset(day.id, selectedExercises);
        setSelectedExercises([]);
        setEditMode(false);
    };

    const removeFromSuperset = (exerciseIndex: number) => {
        handleRemoveFromSuperset(day.id, exerciseIndex);
    };

    return (
        <>
            <DropIndicator beforeId={ day.id } weekOrder={ String(folder_id) } />
            <motion.div
                layout
                layoutId={ `${day.id}-${folder_id}` }
                draggable="true"
                onDragStart={ (e: DragEvent) => handleDragStart(e, cardVal) }
                className="cursor-grab rounded active:cursor-grabbing gap-4 w-full max-w-full"
                style={{ opacity: 1, visibility: 'visible' }}
            >
                <Card
                    tabIndex={ 0 }
                    onClick={ handleFocus }
                    className={`border-[3px] border-gray-100 ${resolvedTheme === "dark" ? "border-extraDarkGray bg-extraDarkGray shadow-xl shadow-black/20" : "border-gray-100 bg-lightGray shadow-lg shadow-gray-200/50"} dark:border-extraDarkGray dark:bg-extraDarkGray dark:shadow-xl dark:shadow-black/20 focus:dark:border-lightSecondary focus:border-gray-300 w-full max-w-full group py-4 sm:pt-2 px-1 sm:px-0 sm:min-w-[400px] sm:max-w-[400px] my-2 box-border`}>
                    <div className="flex flex-row justify-between items-center px-3 py-1">
                        <div className="font-main text-lg flex flex-row whitespace-nowrap">
                            Day {day.order}
                        </div>
                        <div className="font-secondary text-md min-w-0 flex-1">
                            { editTitleOpen ?
                                <Input
                                    value={ currentTitle }
                                    onInput={ (event) => setCurrentTitle(String(event.currentTarget.value)) }
                                    onBlur={ (event) => {
                                        handleEditTitle(day.id, String(event.currentTarget.value));
                                        setEditTitleOpen(false);
                                    } }
                                    onKeyDown={ (e) => {
                                        if (e.key === 'Enter') {
                                            handleEditTitle(day.id, e.currentTarget.value);
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
                        <div className="flex flex-col gap-2">
                            { day.notes && day.notes.length > 0 &&
                            <TooltipProvider delayDuration={ 0 }>
                                <Tooltip>
                                    <TooltipTrigger
                                        className="cursor-pointer group-hover:opacity-100 group-active:opacity-100 opacity-0"
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
                                    onClick={ () => setDropdownOpen(true) }
                                    className="cursor-pointer group-hover:opacity-100 group-active:opacity-100 opacity-0"
                                    asChild
                                >
                                    <EllipsisIcon />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" side="bottom">
                                    <DropdownMenuItem
                                        className="cursor-pointer bg-red-500 text-white hover:bg-red-500"
                                        onClick={ () => {
                                            handleDeleteDay(day.id);
                                            } }>
                                        Delete Day
                                        <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={ () => { setEditTitleOpen(true); setDropdownOpen(false) } } className="cursor-pointer">
                                        Edit Title
                                        <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={ () => { handleOpenAddNoteDialog({ folder_id: Number(folder_id), dayOrder: Number(day.order), isOpen: true }); setDropdownOpen(false) } } className="cursor-pointer">
                                        Add Note
                                        <DropdownMenuShortcut>⌘V</DropdownMenuShortcut>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={ () => { setDuplicateDayOpen(true); setDropdownOpen(false) } } className="cursor-pointer">
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

                    <div className="text-xs mt-2 flex flex-row justify-between pl-2 pr-2 gap-2 sm:gap-4 border-t border-b py-2 border-gray-200 dark:text-offWhite dark:border-darkGray bg-[#e8e8e8] dark:bg-[#0a0f1a]">
                        <div className="flex flex-row gap-2 sm:gap-4 flex-shrink min-w-0">
                            <div className="flex-shrink-0">
                                #
                            </div>
                            <div className="min-w-0 truncate">
                                Exercise
                            </div>
                        </div>
                        <div className="text-center flex flex-row items-center justify-end max-w-[50%] w-[50%] dark:text-offWhite">
                            <div className="min-w-[33%] flex flex-col justify-center items-center">
                                Sets
                            </div>
                            <div className="min-w-[33%] flex flex-col justify-center items-center">
                                Reps
                            </div>
                            <div className="min-w-[33%] flex flex-col justify-center items-center h-full whitespace-nowrap">
                                Intensity
                            </div>
                        </div>
                    </div>
                    <div>
                        <HevyExerciseVisualizer
                            day={ day }
                            folder_id={ folder_id }
                            handleEdit={ handleEdit }
                            handleDeleteExercise={ handleDeleteExercise }
                            handleOpenAddExerciseNoteDialog={ handleOpenAddExerciseNoteDialog }
                            editMode={editMode}
                            selectedExercises={selectedExercises}
                            toggleExerciseSelection={toggleExerciseSelection}
                            removeFromSuperset={removeFromSuperset}
                        />
                    </div>
                    <div
                        className="flex items-center justify-center px-3 py-2"
                        onClick={ () => {
                            handleOpenAddExerciseDialog({folder_id: Number(folder_id), dayOrder: Number(day.order), isOpen: true});
                         } }>
                        <Button variant="ghost" className="mt-1 w-full font-bold uppercase h-12 hover:bg-gray-200 dark:hover:bg-darkGray text-black dark:text-white"><PlusIcon />Add Exercise</Button>
                    </div>
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
                                        disabled={selectedExercises.length < 2}
                                        className={`flex-1 py-2 rounded-md font-medium
                                            ${selectedExercises.length < 2 ? 'bg-lightSecondary opacity-50 text-white' : 'bg-lightSecondary text-white hover:bg-black'}`}
                                    >
                                        Create Superset
                                    </button>
                                    <button
                                        onClick={() => {
                                            setEditMode(false);
                                            setSelectedExercises([]);
                                        }}
                                        className="flex-1 py-2 rounded-md font-medium border border-gray-300 hover:bg-gray-100"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <Button
                                variant="ghost"
                                disabled={!day.exercises || day.exercises.length < 2}
                                className="mt-1 w-full font-bold bg-lightGray dark:bg-darkGray text-lightSecondary disabled:text-gray-500 uppercase hover:text-lightSecondary hover:bg-gray-200 h-12 border-2 border-lightSecondary dark:border-darkGray disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-lightGray dark:disabled:hover:bg-darkGray disabled:border-gray-300 dark:disabled:border-gray-600"
                                onClick={() => {
                                    if (day.exercises && day.exercises.length >= 2) {
                                        setEditMode(true);
                                    }
                                }}
                            >
                                <LinkIcon className="mr-2" />Create Superset
                            </Button>
                        )}
                    </div>
                </Card>
            </motion.div>
            <HevyDuplicateDay
                programLength={ programLength }
                folder_id={ folder_id }
                day={ day }
                duplicateDayOpen={ duplicateDayOpen }
                setDuplicateDayOpen={ setDuplicateDayOpen }
                handleDuplicateDay={ handleDuplicateDay }
            />
        </>
    );
};
