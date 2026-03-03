/**
 * @module SetTypesToggle
 * Single-set type selector: warmup, dropset, failure (normal implied). Used per set in the program editor.
 * Depends on: ToggleGroup, Tooltip. Used by: program builder set rows.
 */
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TooltipContent } from "@/components/ui/tooltip";
import { TooltipTrigger } from "@/components/ui/tooltip";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Tooltip } from "@/components/ui/tooltip";
import { ActivityIcon, TrendingDownIcon } from "lucide-react";
import { SkullIcon } from "lucide-react";
import { useState } from "react";

/** Props for the set-type toggle group. */
interface IProps {
    /** Index of the set in the exercise; passed to handleSetType. */
    setIndex: number;
    /** Current type for this set. */
    setType: ("normal" | "warmup" | "dropset" | "failure");
    /** Called when user selects a type; (value, setIndex). */
    handleSetType: (value: "normal" | "warmup" | "dropset" | "failure", index: number) => void
}

/** Toggle group for warmup / dropset / failure; "normal" is default (no icon selected). */
export const SetTypesToggle = (props: IProps) => {

    const { setIndex, setType, handleSetType } = props;

    const [currentValue, setCurrentValue] = useState(setType);

    return (
        <>
            <TooltipProvider delayDuration={ 0 }>
                <ToggleGroup value={ currentValue } onValueChange={ (value: "normal" | "warmup" | "dropset" | "failure") => { handleSetType(value, setIndex); setCurrentValue(value); } } type="single" size="sm">
                    <Tooltip>
                        <TooltipTrigger asChild className="">
                            <ToggleGroupItem value="warmup" aria-label="Toggle warmup">
                                <ActivityIcon className="w-4 h-4" />
                            </ToggleGroupItem>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-600 text-white rounded-lg">
                            Warmup Set
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild className="">
                            <ToggleGroupItem value="dropset" aria-label="Toggle drop">
                                <TrendingDownIcon className="w-4 h-4" />
                            </ToggleGroupItem>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-600 text-white rounded-lg">
                            Drop Set
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild className="">
                            <ToggleGroupItem value="failure" aria-label="Toggle failure">
                                <SkullIcon className="w-4 h-4" />
                            </ToggleGroupItem>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-600 text-white rounded-lg">
                            Failure Set
                        </TooltipContent>
                    </Tooltip>
                </ToggleGroup>
            </TooltipProvider>
        </>
    );
};