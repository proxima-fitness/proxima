import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CopyIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reorder, reorderHevy } from "@/utils/helpers";
import { Option } from "@/components/ui/multi-select";
import { DayCard } from "../DayCard";
import { DropIndicator } from "@/components/drag-and-drop/DropIndicator";
import { DuplicateWeek } from "../DuplicateWeek";
import { HevyDayCard } from "./HevyDayCard";

interface IProps {
    title: string;
    folder_id: number;
    programLength: number;
    hevyProgram: THevyRoutine[];
    setHevyProgram: (hevyProgram: THevyRoutine[]) => void;
    handleAddDay: (folder_id: number) => void;
    // handleOpenGenerateDayDialog: (generateDayDialog: TDialog) => void;
    handleDeleteDay: (id: string) => void;
    handleEditTitle: (id: string, title: string) => void;
    handleIsEditExercise: (isEditExercise: boolean) => void;
    // handleDuplicateWeek: (fromWeekIndex: number, toWeekIndexes: number[]) => void;
    // handleDuplicateDay: (fromWeekOrder: number, fromDayOrder: number, toWeekOrder: number, toDayIndexArray: Option[]) => void
    handleOpenAddExerciseDialog: (addExerciseDialog: THevyDialog) => void;
    // handleDeleteExercise: (weekOrder: number, dayOrder: number, exerciseIndex: number) => void;
}

export const HevyColumn: React.FC<IProps> = (props) => {

    const {
        title,
        hevyProgram,
        folder_id,
        programLength,
        setHevyProgram,
        handleAddDay,
        // handleOpenGenerateDayDialog,
        handleDeleteDay,
        handleEditTitle,
        handleIsEditExercise,
        // handleDuplicateWeek,
        // handleDuplicateDay,
        handleOpenAddExerciseDialog,
        // handleDeleteExercise,
    } = props;

    const [active, setActive] = useState(false);

    const [duplicateWeekOpen, setDuplicateWeekOpen] = useState(false);

    const handleDuplicateWeekOpen = (duplicateWeekOpen: boolean) => {
        setDuplicateWeekOpen(duplicateWeekOpen);
    };
    // Identify the grabbed card and store it by it's uuid in event handler
    const handleDragStart = (e, card) => {
        e.dataTransfer.setData("cardId", card.id);
    };

    // Add background style while a card is being dragged and set card to active
    const handleDragOver = (e) => {
        e.preventDefault();
        highlightIndicator(e);

        setActive(true);
    };


    const handleDragEnd = (e) => {
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
    const clearHighlights = (els?: any) => {
        const indicators = els || getIndicators();

        indicators.forEach((i) => {
          i.style.opacity = "0";
        });
    };

    const highlightIndicator = (e) => {
        const indicators = getIndicators();

        clearHighlights(indicators);

        const el = getNearestIndicator(e, indicators);

        el.element.style.opacity = "1";
    };

    const getNearestIndicator = (e, indicators) => {
        const DISTANCE_OFFSET = 50;

        const el = indicators.reduce(
          (closest, child) => {
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
          }
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
        <div className="flex flex-col min-w-[440px] max-w-[440px] items-center">
            <div className="pt-2 px-4 flex flex-row flex-nowrap gap-2">
                <div className="px-2 min-w-[440px] max-w-[440px] h-[40px] flex flex-row justify-between items-center">
                    <div className="text-lg">
                        { title }
                    </div>
                    <div className="flex flex-row gap-4">
                        <TooltipProvider delayDuration={0}>
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
                onDrop={handleDragEnd}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`h-full w-full gap-4 transition-colors ${
                    active ?  "bg-gray-200" : "bg-white"
                }`}
            >
                { filteredWeek.map((dy) => {
                    return (
                        <HevyDayCard
                            key={ dy.id }
                            day={ dy }
                            title={ title }
                            folder_id={ dy.folder_id }
                            programLength={ programLength }
                            handleDragStart={handleDragStart}
                            handleDeleteDay={ handleDeleteDay }
                            handleEditTitle={ handleEditTitle }
                            // handleDuplicateDay={ handleDuplicateDay }
                            // handleOpenGenerateDayDialog={ handleOpenGenerateDayDialog }
                            handleOpenAddExerciseDialog={ handleOpenAddExerciseDialog }
                            handleIsEditExercise={ handleIsEditExercise }
                            // handleDeleteExercise={ handleDeleteExercise }
                        />
                ) } ) }
                <DropIndicator beforeId={null} weekOrder={folder_id} />
                <div className="flex flex-row justify-center items-center">
                    <Button
                        onClick={ () => handleAddDay(folder_id) }
                        className="mb-4 w-44 font-bold uppercase h-12 rounded-lg bg-lightSecondary hover:bg-lightSecondary text-white">
                            <PlusIcon />
                            Add Day
                    </Button>
                </div>
            </div>
            {/* <DuplicateWeek
                weekOrder={ weekOrder }
                programLength={ programLength }
                duplicateWeekOpen={ duplicateWeekOpen }
                setDuplicateWeekOpen={ setDuplicateWeekOpen }
                handleDuplicateWeek={ handleDuplicateWeek }
            /> */}

        </div>
    );
  };
