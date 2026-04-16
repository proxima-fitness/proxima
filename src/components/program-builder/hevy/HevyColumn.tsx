/**
 * @module HevyColumn
 * One week column in the Hevy program builder: header (week title, duplicate week), drop zone for day cards,
 * drag-and-drop reorder, Add Day dropdown (empty day or add Hevy routine), and HevyDuplicateWeek / HevyAddRoutineDialog.
 * Depends on: HevyDayCard, HevyDuplicateWeek, HevyAddRoutineDialog, DropIndicator, reorderHevy.
 * Used by: HevyRoutine (one per week).
 */

import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BookOpen, CopyIcon, Plus, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropIndicator } from "@/components/program-builder/shared/DropIndicator";
import { HevyDayCard } from "./HevyDayCard";
import { HevyDuplicateWeek } from "./HevyDuplicateWeek";
import { IOption } from "@/components/ui/multi-select";
import { reorderHevy } from "../utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { HevyAddRoutineDialog } from "./HevyAddRoutineDialog";

/** Props for a single week column in the program builder. */
interface IProps {
    /** Column header label (e.g. "Week 1"). */
    title: string;
    /** Week index (folder_id) this column represents. */
    folder_id: number;
    /** Total number of weeks in the program (for duplicate-week target list). */
    programLength: number;
    /** Flat list of all days (routines); this column filters by folder_id. */
    hevyProgram: THevyRoutine[];
    /** Updater for the full program when days are reordered or added. */
    setHevyProgram: React.Dispatch<React.SetStateAction<THevyRoutine[]>>;
    /** Adds an empty day to this week. */
    handleAddDay: (folder_id: number) => void;
    /** Opens the add-note dialog for a day. */
    handleOpenAddNoteDialog: (addNoteDialog: THevyDialog) => void;
    /** Opens the add-exercise-note dialog. */
    handleOpenAddExerciseNoteDialog: (addExerciseNoteDialog: THevyDialog) => void;
    /** Deletes a day by id. */
    handleDeleteDay: (id: string) => void;
    /** Updates a day's title by id. */
    handleEditTitle: (id: string, title: string) => void;
    /** Sets edit mode for the add-exercise dialog (add vs edit). */
    handleIsEditExercise: (isEditExercise: boolean) => void;
    /** Duplicates this week to one or more target week indexes. */
    handleDuplicateWeek: (fromWeekIndex: number, toWeekIndexes: number[]) => void;
    /** Duplicates a day to a target week and selected day slots. */
    handleDuplicateDay: (fromWeekOrder: number, fromDayOrder: number, toWeekOrder: number, toDayIndexArray: IOption[]) => void;
    /** Opens the add/edit exercise dialog for a given week/day. */
    handleOpenAddExerciseDialog: (addExerciseDialog: THevyDialog) => void;
    /** Deletes an exercise from a day. */
    handleDeleteExercise: (folder_id: number, dayOrder: number, exerciseIndex: number) => void;
    /** Id of the day card that currently has focus (for keyboard shortcuts). */
    focusedCardId: string;
    /** Sets the focused day card id. */
    setFocusedCardId: (focusedCardId: string) => void;
    /** Groups selected exercises in a day into a superset. */
    handleCreateSuperset: (dayId: string, selectedExercises: number[]) => void;
    /** Removes an exercise from its superset. */
    handleRemoveFromSuperset: (dayId: string, exerciseIndex: number) => void;
    /** Adds a Hevy routine as a new day in this week. */
    handleAddRoutineAsDay: (routine: THevyRoutine, folder_id: number) => void;
    /** Custom exercises from Hevy (for edit in day cards). */
    customExercises?: THevyExerciseTemplate[];
    /** Global Hevy exercise library (for edit in day cards). */
    hevyExercises?: THevyExerciseTemplate[];
    /** When true (mobile), day cards use fade-in instead of layout animation. */
    isMobile?: boolean;
}

/**
 * Renders one week column: day cards for this week, drop indicators, drag-and-drop, Add Day menu, duplicate week/dialog.
 */
export const HevyColumn: React.FC<IProps> = (props) => {

    const {
        title,
        hevyProgram,
        folder_id,
        programLength,
        setHevyProgram,
        handleAddDay,
        handleOpenAddNoteDialog,
        handleOpenAddExerciseNoteDialog,
        handleDeleteDay,
        handleEditTitle,
        handleIsEditExercise,
        handleDuplicateWeek,
        handleDuplicateDay,
        handleOpenAddExerciseDialog,
        handleDeleteExercise,
        focusedCardId,
        setFocusedCardId,
        handleCreateSuperset,
        handleRemoveFromSuperset,
        handleAddRoutineAsDay,
        customExercises,
        hevyExercises,
        isMobile = false,
    } = props;

    const [active, setActive] = useState(false);

    const [duplicateWeekOpen, setDuplicateWeekOpen] = useState(false);
    const [routineDialogOpen, setRoutineDialogOpen] = useState(false);

    const [dropdownOpen, setDropdownOpen] = useState(false);

    const handleDuplicateWeekOpen = (duplicateWeekOpen: boolean) => {
        setDuplicateWeekOpen(duplicateWeekOpen);
    };
    // Identify the grabbed card and store it by it's uuid in event handler
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleDragStart = (e: any, card: THevyCard) => {
        e.dataTransfer.setData("cardId", card.id);
    };

    // Add background style while a card is being dragged and set card to active
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleDragOver = (e: any) => {
        e.preventDefault();
        highlightIndicator(e);

        setActive(true);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleDragEnd = (e: any) => {
        const cardId = e.dataTransfer.getData("cardId");
        setActive(false);
        clearHighlights();

        const indicators = getIndicators();
        const { element } = getNearestIndicator(e, indicators);

        const before = element.dataset.before || "-1";

        if (before !== cardId) {
            let copy = [...hevyProgram];

            let cardToTransfer = copy.find((c) => c.id === cardId);
            if (!cardToTransfer) return;
            cardToTransfer = { ...cardToTransfer, folder_id };

            copy = copy.filter((c) => c.id !== cardId);

            const moveToBack = before === "-1";

            if (moveToBack) {
                copy.push(cardToTransfer);
            } else {
                const insertAtIndex = copy.findIndex((el) => el.id === before);
                if (insertAtIndex === undefined) return;

                copy.splice(insertAtIndex, 0, cardToTransfer);
            }

            copy = reorderHevy(copy);
            setHevyProgram(copy);
        }
    };


    /******* FUNCTIONS FOR STYLING THE DRAG EFFECT  *******/
    /***********************************************************************************/
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clearHighlights = (els?: any) => {
        const indicators = els || getIndicators();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        indicators.forEach((i: any) => {
            if (!(i instanceof HTMLElement)) {
                console.error(`Expected a object of Type HTMLElement`);
            }
            i.style.opacity = "0";
        });
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const highlightIndicator = (e: any) => {
        const indicators = getIndicators();

        clearHighlights(indicators);

        const el = getNearestIndicator(e, indicators);

        el.element.style.opacity = "1";
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getNearestIndicator = (e: any, indicators: any) => {
        const DISTANCE_OFFSET = 50;

        const el = indicators.reduce(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (closest: any, child: any) => {
                const box = child.getBoundingClientRect();

                const offset = e.clientY - (box.top + DISTANCE_OFFSET);

                if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
                } else {
                return closest;
                }
            },
            {
                offset: Number.NEGATIVE_INFINITY,
                element: indicators[indicators.length - 1],
            },
        );

        return el;
    };

    const getIndicators = () => {
        return Array.from(document.querySelectorAll(`[data-column="${folder_id}"]`));
    };

    const handleDragLeave = () => {
        clearHighlights();
        setActive(false);
    };
    /***********************************************************************************/

    const filteredWeek = hevyProgram.filter((dy) => dy.folder_id === folder_id);

    return (
        <div className="flex flex-col w-full sm:min-w-[320px] sm:max-w-[320px] md:min-w-[340px] md:max-w-[340px] lg:min-w-[400px] lg:max-w-[400px] items-center max-w-full max-sm:overflow-x-hidden">
            <div className="pt-2 w-full sm:min-w-[320px] sm:max-w-[320px] md:min-w-[340px] md:max-w-[340px] lg:min-w-[400px] lg:max-w-[400px] max-w-full">
                <div className="py-1 sm:h-[40px] sm:py-[10px] flex flex-row justify-between items-center px-2 sm:px-4 box-border">
                    <div className="text-sm sm:text-md dark:text-offWhite">
                        { title }
                    </div>
                    <div className="flex flex-row gap-2 sm:gap-4">
                        <TooltipProvider delayDuration={ 0 }>
                            <Tooltip>
                                <TooltipTrigger className="">
                                    <div
                                        onClick={ () => handleDuplicateWeekOpen(true) }
                                        className="[&_svg]:w-4 [&_svg]:h-4 sm:[&_svg]:w-5 sm:[&_svg]:h-5"
                                    >
                                        <CopyIcon />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent className="bg-gray-600 text-white dark:text-offWhite rounded-lg">
                                    <p>Duplicate Week</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>
            </div>
            <div
                onDrop={ handleDragEnd }
                onDragOver={ handleDragOver }
                onDragLeave={ handleDragLeave }
                className={ `h-full w-full max-w-full gap-4 transition-colors max-sm:overflow-x-hidden ${
                    active ?  "bg-gray-200 dark:bg-darkGray" : "bg-white dark:bg-darkGray"
                }` }
            >
                { filteredWeek.map((dy) => {
                    return (
                        <HevyDayCard
                            key={ dy.id }
                            day={ dy }
                            title={ title }
                            folder_id={ dy.folder_id }
                            programLength={ programLength }
                            handleDragStart={ handleDragStart }
                            handleDeleteDay={ handleDeleteDay }
                            handleEditTitle={ handleEditTitle }
                            handleDuplicateDay={ handleDuplicateDay }
                            handleOpenAddExerciseDialog={ handleOpenAddExerciseDialog }
                            handleOpenAddNoteDialog={ handleOpenAddNoteDialog }
                            handleOpenAddExerciseNoteDialog={ handleOpenAddExerciseNoteDialog }
                            handleIsEditExercise={ handleIsEditExercise }
                            handleDeleteExercise={ handleDeleteExercise }
                            focusedCardId={ focusedCardId }
                            setFocusedCardId={ setFocusedCardId }
                            handleCreateSuperset={ handleCreateSuperset }
                            handleRemoveFromSuperset={ handleRemoveFromSuperset }
                            customExercises={ customExercises }
                            hevyExercises={ hevyExercises }
                            isMobile={ isMobile }
                        />
                    );
                })}
                <DropIndicator beforeId={ null } weekOrder={ String(folder_id) } />
                <div className="flex justify-center">
                    <DropdownMenu open={ dropdownOpen } onOpenChange={ () => setDropdownOpen(false) }>
                        <DropdownMenuTrigger asChild>
                            <Button
                                onClick={ () => setDropdownOpen(true) }
                                className="mb-4 h-12 w-44 rounded-full bg-lightSecondary font-semibold uppercase text-white hover:bg-lightSecondary/90"
                                aria-label="Add day to week">
                                <PlusIcon />
                                Add Day
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={ () => handleAddDay(folder_id) }
                            >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Empty Day
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={ () => { setRoutineDialogOpen(true); setDropdownOpen(false); } }
                            >
                            <BookOpen className="w-4 h-4 mr-2" />
                            Add Hevy Routine
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            <HevyDuplicateWeek
                folder_id={ folder_id }
                programLength={ programLength }
                duplicateWeekOpen={ duplicateWeekOpen }
                setDuplicateWeekOpen={ setDuplicateWeekOpen }
                handleDuplicateWeek={ handleDuplicateWeek }
            />
            { routineDialogOpen &&
                <HevyAddRoutineDialog
                    routineDialogOpen={ routineDialogOpen }
                    setRoutineDialogOpen={ setRoutineDialogOpen }
                    folder_id={ folder_id }
                    handleAddRoutineAsDay={ handleAddRoutineAsDay }
                />
            }
        </div>
    );
  };
