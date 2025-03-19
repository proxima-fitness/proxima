"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { EllipsisIcon, CopyIcon, PlusIcon } from "lucide-react";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropIndicator } from "@/components/drag-and-drop/DropIndicator";
import { HevyExerciseVisualizer } from "./HevyExerciseVisualizer";
import { HevyDuplicateDay } from "./HevyDuplicateDay";
import { Option } from "@/components/ui/multi-select";
import { convertHevyExerciseIntoHevyAddExercise } from "@/utils/general/helpers";

interface IProps {
    day: THevyRoutine;
    title: string;
    folder_id: number;
    programLength: number;
    handleDragStart: (e: DragEvent, card: THevyCard) => void;
    handleEditTitle: (id: string, title: string) => void;
    handleDeleteDay: (id: string) => void;
    handleOpenGenerateDayDialog: (generateDayDialog: THevyDialog) => void;
    handleOpenAddExerciseDialog: (addExerciseDialog: THevyDialog) => void;
    handleDuplicateDay: (fromWeekOrder: number, fromDayOrder: number, toWeekOrder: number, toDayIndexArray: Option[]) => void;    // handleGenerateDayDialog: (generateDayDialog: TDialog) => void;
    handleDeleteExercise: (folder_id: number, dayOrder: number, exerciseIndex: number) => void;
    handleIsEditExercise: (isEditExercise: boolean) => void;
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
        handleDuplicateDay,
        handleOpenGenerateDayDialog,
        handleDeleteExercise,
        handleIsEditExercise,
    } = props;

    const [duplicateDayOpen, setDuplicateDayOpen] = useState(false);
    const [editTitleOpen, setEditTitleOpen] = useState(false);
    const [currentTitle, setCurrentTitle] = useState(day.title ?? "");

    const handleEdit = (currentWeek: number, currentDay: number, exerciseIndex: number, editExercise: THevyExercise ) => {
            handleIsEditExercise(true);
            handleOpenAddExerciseDialog({folder_id: currentWeek, dayOrder: currentDay, isOpen: true, exerciseIndex: exerciseIndex, editExercise: convertHevyExerciseIntoHevyAddExercise(editExercise) });
    };

    const cardVal: THevyCard = {
        title,
        order: day?.order ?? "",
        day_title: day?.title ?? "",
        exercises: day?.exercises ?? [],
        id: day?.id ?? "",
        folder_id,
    };

    return (
        <>
            <DropIndicator beforeId={ day.id } weekOrder={ String(folder_id) } />
            <motion.div
                layout
                layoutId={ day.id }
                draggable="true"
                onDragStart={ (e: DragEvent) => handleDragStart(e, cardVal) }
                className="cursor-grab rounded active:cursor-grabbing gap-4"
            >
                <Card className="group py-4 px-4 min-w-[440px] max-w-[440px] bg-lightGray my-2">
                    <div className="flex flex-row justify-between items-center">
                        <div className="font-main text-xl flex flex-row">
                            Day {day.order}
                        </div>
                        <div className="font-secondary text-xl">
                            { editTitleOpen ?
                                <Input
                                    value={ currentTitle }
                                    onInput={ (event) => setCurrentTitle(String(event.currentTarget.value) ?? "") }
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
                                <>
                                    {day.title}
                                </>
                            }
                        </div>
                        <div className="flex flex-row gap-4">
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    className="cursor-pointer group-hover:opacity-100 group-active:opacity-100 group-hover:pointer-events-auto group-active:pointer-events-auto opacity-0 pointer-events-none"
                                    asChild
                                >
                                    <EllipsisIcon />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" side="bottom">
                                    <DropdownMenuItem
                                        className="cursor-pointer"
                                        onClick={ () => {
                                            handleDeleteDay(day.id);
                                            } }>
                                        Delete Day
                                        <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={ () => setEditTitleOpen(true) } className="cursor-pointer">
                                        Edit Title
                                        <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={ () => {
                                        handleOpenGenerateDayDialog({ folder_id: Number(folder_id), dayOrder: Number(day.order), isOpen: true });
                                    } }
                                        className="cursor-pointer"
                                    >
                                        Generate Day
                                        <DropdownMenuShortcut>⌘G</DropdownMenuShortcut>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <TooltipProvider delayDuration={ 0 }>
                                <Tooltip>
                                    <TooltipTrigger
                                        className="cursor-pointer group-hover:opacity-100 group-active:opacity-100 group-hover:pointer-events-auto group-active:pointer-events-auto opacity-0 pointer-events-none"
                                    >
                                        <div onClick={ () => setDuplicateDayOpen(true) }>
                                            <CopyIcon />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-gray-600 text-white rounded-lg">
                                        <p>Duplicate Day</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </div>
                    <div className="text-sm flex flex-row justify-between mt-4 gap-4 border-t-2 border-b-2 py-2 border-gray-200">
                        <div className="flex flex-row gap-4 max-w-[50%]">
                            <div>
                                #
                            </div>
                            <div>
                                Exercise
                            </div>
                        </div>
                        <div className="flex flex-row justify-center items-center gap-4 max-w-[50%] w-[50%]">
                            <div className="flex flex-row justify-end items-center min-w-[33%]">
                                Sets
                            </div>
                            <div className="flex flex-row justify-center items-center min-w-[33%]">
                                Reps
                            </div>
                            <div className=" flex flex-row justify-start items-center min-w-[33%]">
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
                        />
                    </div>


                    <div
                        className="flex items-center justify-center"
                        onClick={ () => {
                            handleOpenAddExerciseDialog({folder_id: Number(folder_id), dayOrder: Number(day.order), isOpen: true});
                         } }>
                        <Button variant="ghost" className="mt-1 w-full font-bold uppercase h-12 hover:bg-gray-200 text-black"><PlusIcon />Add Exercise</Button>
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
