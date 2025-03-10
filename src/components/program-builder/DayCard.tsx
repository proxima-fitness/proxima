"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { EllipsisIcon, CopyIcon, PlusIcon } from "lucide-react";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "../ui/button";
import { DuplicateDay } from "./DuplicateDay";
import { useState, FC } from "react";
import { Option } from "@/components/ui/multi-select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";
import { Input } from "../ui/input";
import { convertProgramCreatorExerciseToAddExercise } from "@/utils/helpers";
import { DropIndicator } from "../drag-and-drop/DropIndicator";
import { TooltipExerciseVisualizer } from "../generic/TooltipExerciseVisualizer";

interface IProps {
    day: TProgramCreatorDay;
    title: string;
    weekOrder: string;
    programLength: number;
    handleDragStart: (e: DragEvent, card: TCard) => void;
    handleEditTitle: (id: string, day_title: string) => void;
    handleDeleteDay: (id: string) => void;
    handleOpenGenerateDayDialog: (generateDayDialog: TDialog) => void;
    handleOpenAddExerciseDialog: (addExerciseDialog: TDialog) => void;
    handleDuplicateDay: (fromWeekOrder: number, fromDayOrder: number, toWeekOrder: number, toDayIndexArray: Option[]) => void;    // handleGenerateDayDialog: (generateDayDialog: TDialog) => void;
    handleDeleteExercise: (weekOrder: number, dayOrder: number, exerciseIndex: number) => void;
    handleIsEditExercise: (isEditExercise: boolean) => void;
}

export const DayCard: FC<IProps> = (props) => {

    const {
        day,
        title,
        weekOrder,
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
    const [currentTitle, setCurrentTitle] = useState(day.day_title ?? "");

    const handleEdit = (currentWeek: number, currentDay: number, exerciseIndex: number, editExercise: TProgramCreatorExercise ) => {
            handleIsEditExercise(true);
            handleOpenAddExerciseDialog({weekOrder: currentWeek, dayOrder: currentDay, isOpen: true, exerciseIndex: exerciseIndex, editExercise: convertProgramCreatorExerciseToAddExercise(editExercise) });
    };


    const cardVal: TCard = {
        title,
        order: day.order,
        day_title: day.day_title,
        exercises: day.exercises,
        id: day.id,
        weekOrder,
    };

    return (
        <>
            <DropIndicator beforeId={ day.id } weekOrder={ weekOrder } />
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
                                    {day.day_title}
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
                                    <DropdownMenuItem className="cursor-pointer" onClick={ () => handleDeleteDay(day.id) }>
                                        Delete Day
                                        <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={ () => setEditTitleOpen(true) } className="cursor-pointer">
                                        Edit Title
                                        <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={ () => {
                                        handleOpenGenerateDayDialog({ weekOrder: Number(weekOrder), dayOrder: Number(day.order), isOpen: true });
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
                    <TooltipExerciseVisualizer
                            day={ day }
                            weekOrder={ weekOrder }
                            handleEdit={ handleEdit }
                            handleDeleteExercise={ handleDeleteExercise }
                        />
                    <div
                        className="flex items-center justify-center"
                        onClick={ () => {
                            handleOpenAddExerciseDialog({weekOrder: Number(weekOrder), dayOrder: Number(day.order), isOpen: true}); }
                        }>
                        <Button variant="ghost" className="mt-1 w-full font-bold uppercase h-12 hover:bg-gray-200 text-black"><PlusIcon />Add Exercise</Button>
                    </div>
                </Card>
            </motion.div>
            <DuplicateDay
                programLength={ programLength }
                weekOrder={ weekOrder }
                day={ day }
                duplicateDayOpen={ duplicateDayOpen }
                setDuplicateDayOpen={ setDuplicateDayOpen }
                handleDuplicateDay={ handleDuplicateDay }
            />
        </>
    );
};
