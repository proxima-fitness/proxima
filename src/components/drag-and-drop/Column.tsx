import { useState } from "react";
import { DropIndicator } from "./DropIndicator";
import { AddCard } from "./AddCard";
import { Card } from "./Card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CopyIcon } from "lucide-react";

interface IProps {
    title: string;
    weekOrder: string;
    flattenedProgramDays: TProgramCreatorDay[];
    setFlattenedProgramDays: (flattenedProgramDays: TProgramCreatorDay[]) => void;
}

export const Column: React.FC<IProps> = (props) => {

    const {
        title,
        flattenedProgramDays,
        weekOrder,
        setFlattenedProgramDays,
    } = props;

    const [active, setActive] = useState(false);

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
          let copy = [...flattenedProgramDays];

          let cardToTransfer = copy.find((c) => c.id === cardId);
          if (!cardToTransfer) return;
          cardToTransfer = { ...cardToTransfer, weekOrder };
          // just changing column name here ?
          // actually need to assign card to different column via handleNewProgram and re-positioning
          // it to the new weekOrder

          copy = copy.filter((c) => c.id !== cardId);

          const moveToBack = before === "-1";

          if (moveToBack) {
            copy.push(cardToTransfer);
          } else {
            const insertAtIndex = copy.findIndex((el) => el.id === before);
            if (insertAtIndex === undefined) return;

            copy.splice(insertAtIndex, 0, cardToTransfer);
          }

          setFlattenedProgramDays(copy);
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
        return Array.from(document.querySelectorAll(`[data-column="${weekOrder}"]`));
    };

    const handleDragLeave = () => {
        clearHighlights();
        setActive(false);
    };
    /***********************************************************************************/

    const filteredWeek = flattenedProgramDays.filter((dy) => dy.weekOrder === weekOrder);
    // if (weekOrder === "0" || weekOrder === "1") {
    //     console.log(`This week/columns day cards: ${weekOrder}`,filteredWeek);
    // }

    return (
      <div className="flex flex-col min-w-[440px] max-w-[440px] gap-4 items-center">
        <div className="pt-2 px-4 flex flex-row flex-nowrap gap-2">
            <div className="px-2 min-w-[440px] max-w-[440px] h-[40px] flex flex-row justify-between items-center">
                <div className="text-lg">
                    { title }
                </div>
                <div className="flex flex-row gap-4">
                    <TooltipProvider delayDuration={0}>
                        <Tooltip>
                            <TooltipTrigger className="">
                                <div>
                                {/* onClick={ () => handleDuplicateWeekOpen(weekIndex, true) } */}
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
            className={`h-full w-full transition-colors ${
                active ?  "bg-gray-200" : "bg-white"
            }`}
        >
          {filteredWeek.map((dy) => {
            return (
                <Card
                    key={ dy.id }
                    order={ dy.order }
                    day_title={ dy.day_title }
                    exercises={ dy.exercises }
                    weekOrder={ dy.weekOrder }
                    id={ dy.id }
                    title={ title }
                    handleDragStart={handleDragStart}
                />
          )})}
          <DropIndicator beforeId={null} weekOrder={weekOrder} />
          <AddCard filteredWeek={ filteredWeek } weekLength={ filteredWeek.length } weekOrder={weekOrder} />
        </div>
      </div>
    );
  };
