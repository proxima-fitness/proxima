"use client";

/**
 * @module ComboBox
 * Filter dropdown for program discovery: Program Length, Workout Duration, etc. Uses Command/Popover;
 * clear via trailing control when a value is selected.
 * Depends on: UI Command, Popover, Button; lucide-react.
 * Used by: program discovery/filter UI.
 */
import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

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

function formatProgramLengthTrigger(value: string, options: string[]): string {
    const raw = options.find((option) => option === value);
    if (!raw) return "";
    return raw === "1" ? "1 week" : `${raw} weeks`;
}

function formatWorkoutDurationTrigger(value: string, options: string[]): string {
    const raw = options.find((option) => option === value);
    if (!raw) return "";
    return `${raw} min`;
}

/** Renders a searchable combobox with full-width trigger and inline clear. */
export const ComboBox: React.FC<IProps> = (props) => {

    const { options, title, handleSelectedFilters, value } = props;

    const [open, setOpen] = React.useState(false);

    const triggerLabel =
        title === "Workout Duration"
            ? (value ? formatWorkoutDurationTrigger(value, options) : null)
            : title === "Program Length"
              ? (value ? formatProgramLengthTrigger(value, options) : null)
              : null;

    const placeholder =
        title === "Workout Duration" ? "Duration" : title === "Program Length" ? "Length" : "Select";

    return (
        <Popover open={ open } onOpenChange={ setOpen }>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={ open }
                    className="h-11 w-full min-w-0 justify-between gap-2 rounded-2xl border-0 bg-muted/40 px-3 font-normal shadow-none ring-1 ring-black/[0.06] hover:bg-muted/55 dark:bg-muted/25 dark:ring-white/10 dark:hover:bg-muted/35"
                >
                    <span className={ cn("truncate text-left", !value && "text-muted-foreground") }>
                        { triggerLabel ?? placeholder }
                    </span>
                    <span className="flex shrink-0 items-center gap-0.5">
                        { value !== "" && (
                            <span
                                role="button"
                                tabIndex={ 0 }
                                aria-label={ `Clear ${title}` }
                                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                onClick={ (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleSelectedFilters("");
                                } }
                                onKeyDown={ (e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleSelectedFilters("");
                                    }
                                } }
                            >
                                <X className="h-4 w-4 pointer-events-none" aria-hidden />
                            </span>
                        ) }
                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] min-w-[var(--radix-popover-trigger-width)] p-0"
                align="start"
            >
                <Command className="rounded-xl">
                    <CommandInput placeholder="Search…" />
                    <CommandList>
                        <CommandEmpty>No results.</CommandEmpty>
                        <CommandGroup>
                            { options.map((option) => (
                                <CommandItem
                                    key={ option }
                                    value={ option }
                                    onSelect={ (currentValue) => {
                                        handleSelectedFilters(currentValue === value ? "" : currentValue);
                                        setOpen(false);
                                    } }
                                >
                                    <Check
                                        className={ cn(
                                            "mr-2 h-4 w-4",
                                            value === option ? "opacity-100" : "opacity-0",
                                        ) }
                                    />
                                    { title === "Workout Duration" && (
                                        <>{ option } min</>
                                    ) }
                                    { title === "Program Length" && (
                                        <>{ option } { option === "1" ? "week" : "weeks" }</>
                                    ) }
                                </CommandItem>
                            )) }
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};
