import { useState } from "react";
import { DropIndicator } from "../shared/DropIndicator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CopyIcon, PlusIcon } from "lucide-react";
import { DayCard } from "./DayCard";
import { Button } from "@/components/ui/button";
import { DuplicateWeek } from "./DuplicateWeek";
import { IOption } from "@/components/ui/multi-select";
import { reorder } from "../utils";

interface IProps {
    title: string;
    weekOrder: string;
    programLength: number;
    flattenedProgramDays: TProgramCreatorDay[];
    setFlattenedProgramDays: (flattenedProgramDays: TProgramCreatorDay[]) => void;
    handleAddDay: (weekOrder: string) => void;
    handleOpenGenerateDayDialog: (generateDayDialog: TDialog) => void;
    handleDeleteDay: (id: string) => void;
    handleEditTitle: (id: string, day_title: string) => void;
    handleIsEditExercise: (isEditExercise: boolean) => void;
    handleDuplicateWeek: (fromWeekIndex: number, toWeekIndexes: number[]) => void;
    handleDuplicateDay: (fromWeekOrder: number, fromDayOrder: number, toWeekOrder: number, toDayIndexArray: IOption[]) => void
    handleOpenAddExerciseDialog: (addExerciseDialog: TDialog) => void;
    handleDeleteExercise: (weekOrder: number, dayOrder: number, exerciseIndex: number) => void;
    focusedCardId: string;
    setFocusedCardId: (focusedCardId: string) => void;
}

export const Column: React.FC<IProps> = (props) => {

    const {
        title,
        flattenedProgramDays,
        weekOrder,
        programLength,
        setFlattenedProgramDays,
        handleAddDay,
        handleOpenGenerateDayDialog,
        handleDeleteDay,
        handleEditTitle,
        handleIsEditExercise,
        handleDuplicateWeek,
        handleDuplicateDay,
        handleOpenAddExerciseDialog,
        handleDeleteExercise,
        focusedCardId,
        setFocusedCardId,
    } = props;

    const [active, setActive] = useState(false);

    const [duplicateWeekOpen, setDuplicateWeekOpen] = useState(false);

    const handleDuplicateWeekOpen = (duplicateWeekOpen: boolean) => {
        setDuplicateWeekOpen(duplicateWeekOpen);
    };
    // Identify the grabbed card and store it by it's uuid in event handler
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleDragStart = (e: any, card: TCard) => {
        if (e.dataTransfer) {
            e.dataTransfer.setData("cardId", card.id);
        }
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
            let copy = [...flattenedProgramDays];

            let cardToTransfer = copy.find((c) => c.id === cardId);
            if (!cardToTransfer) return;
            cardToTransfer = { ...cardToTransfer, weekOrder };

            copy = copy.filter((c) => c.id !== cardId);

            const moveToBack = before === "-1";

            if (moveToBack) {
                copy.push(cardToTransfer);
            } else {
                const insertAtIndex = copy.findIndex((el) => el.id === before);
                if (insertAtIndex === undefined) return;

                copy.splice(insertAtIndex, 0, cardToTransfer);
            }

            copy = reorder(copy);
            setFlattenedProgramDays(copy);
        }
    };


    /******* FUNCTIONS FOR STYLING THE DRAG EFFECT  *******/
    /***********************************************************************************/
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clearHighlights = (els?: any) => {
        const indicators = els || getIndicators();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        indicators.forEach((i: any) => {
          i.style.opacity = "0";
        });
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const highlightIndicator = (e: any) => {
      const indicators: Element[] = getIndicators();

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
        return Array.from(document.querySelectorAll(`[data-column="${weekOrder}"]`));
    };

    const handleDragLeave = () => {
        clearHighlights();
        setActive(false);
    };
    /***********************************************************************************/

    const filteredWeek = flattenedProgramDays.filter((dy) => dy.weekOrder === weekOrder);

    return (
        <div className="flex flex-col min-w-[440px] max-w-[440px] items-center">
            <div className="pt-2 px-4 flex flex-row flex-nowrap gap-2">
                <div className="px-2 min-w-[440px] max-w-[440px] h-[40px] flex flex-row justify-between items-center">
                    <div className="text-lg">
                        { title }
                    </div>
                    <div className="flex flex-row gap-4">
                        <TooltipProvider delayDuration={ 0 }>
                            <Tooltip>
                                <TooltipTrigger className="">
                                    <div
                                        onClick={ () => handleDuplicateWeekOpen(true) }>
                                        <CopyIcon />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent className="bg-gray-600 text-white rounded-lg">
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
                className={ `h-full w-full gap-4 transition-colors ${
                    active ?  "bg-gray-200" : "bg-white"
                }` }
            >
                { filteredWeek.map((dy) => {
                    return (
                        <DayCard
                            key={ dy.id }
                            day={ dy }
                            title={ title }
                            weekOrder={ dy?.weekOrder ?? "0" }
                            programLength={ programLength }
                            handleDragStart={ handleDragStart }
                            handleDeleteDay={ handleDeleteDay }
                            handleEditTitle={ handleEditTitle }
                            handleDuplicateDay={ handleDuplicateDay }
                            handleOpenGenerateDayDialog={ handleOpenGenerateDayDialog }
                            handleOpenAddExerciseDialog={ handleOpenAddExerciseDialog }
                            handleIsEditExercise={ handleIsEditExercise }
                            handleDeleteExercise={ handleDeleteExercise }
                            focusedCardId={ focusedCardId }
                            setFocusedCardId={ setFocusedCardId }
                        />
                ); } ) }
                <DropIndicator beforeId={ null } weekOrder={ weekOrder } />
                <div className="flex flex-row justify-center items-center">
                    <Button
                        onClick={ () => handleAddDay(weekOrder) }
                        className="mb-4 w-44 font-bold uppercase h-12 rounded-lg bg-lightSecondary hover:bg-lightSecondary text-white">
                        <PlusIcon />
                        Add Day
                    </Button>
                </div>
            </div>
            <DuplicateWeek
                weekOrder={ weekOrder }
                programLength={ programLength }
                duplicateWeekOpen={ duplicateWeekOpen }
                setDuplicateWeekOpen={ setDuplicateWeekOpen }
                handleDuplicateWeek={ handleDuplicateWeek }
            />

        </div>
    );
  };
