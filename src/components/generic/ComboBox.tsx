"use client";

/**
 * @module ComboBox
 * Filter dropdown for program discovery: Program Length, Workout Duration, etc. Uses Command/Popover;
 * displays value with "Mins" or "Weeks" suffix and a Reset button when a value is selected.
 * Depends on: UI Command, Popover, Button; lucide-react.
 * Used by: program discovery/filter UI.
 */
import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/** @property options - Choices shown in the dropdown. */
/** @property title - Filter type; drives label and unit (Mins/Weeks). */
/** @property handleSelectedFilters - Called with selected option or "" when cleared. */
/** @property value - Currently selected option (empty string = none). */
interface IProps {
    options: string[];
    title: "Program Length" | "Workout Duration" | "Equipment" | "Specialization" | "Difficulty";
    handleSelectedFilters: (filterKey: string) => void;
    value: string;
}

/** Renders a searchable combobox and optional Reset for the filter. */
export const ComboBox: React.FC<IProps> = (props) => {

    const { options, title, handleSelectedFilters, value } = props;

    const [open, setOpen] = React.useState(false);
    // const [value, setValue] = React.useState("")

    return (
        <>
            <Popover open={ open } onOpenChange={ setOpen }>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={ open }
                        className="w-[200px] justify-between"
                    >
                        { title === "Workout Duration" &&
                    (
                        <>
                            { value ? `${options.find((option) => option === value)} Mins` : "Select duration..."}
                        </>
                    )
                }
                        { title === "Program Length" &&
                    (
                        <>
                            { value ? `${options.find((option) => option === value)} Weeks` : "Select length..."}
                        </>
                    )
                }
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                    <Command>
                        <CommandInput placeholder="Quick search..." />
                        <CommandList>
                            <CommandEmpty>No framework found.</CommandEmpty>
                            <CommandGroup>
                                {options.map((option) => (
                                    <CommandItem
                                        key={ option }
                                        value={ option }
                                        onSelect={ (currentValue) => {
                                            handleSelectedFilters(currentValue === value ? "" : currentValue);
                                            // setValue(currentValue === value ? "" : currentValue)
                                            setOpen(false);
                                        } }
                                    >
                                        <Check
                                            className={ cn(
                                            "mr-2 h-4 w-4",
                                            value === option ? "opacity-100" : "opacity-0",
                                            ) }
                                        />
                                        { title === "Workout Duration" &&
                                            (
                                                <>
                                                    {option} Mins
                                                </>
                                            )
                                        }
                                        { title === "Program Length" &&
                                            (
                                                <>
                                                    {option} { option === "1" ? "Week" : "Weeks"}
                                                </>
                                            )
                                        }
                                    </CommandItem>
                                ) ) }
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            { value !== "" && <Button onClick={ () => { handleSelectedFilters(""); } } className={ "text-[#37BCCF]" } variant="ghost">Reset</Button> }
        </>
    );
};
