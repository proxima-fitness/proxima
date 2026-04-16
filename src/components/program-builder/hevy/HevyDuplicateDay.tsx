"use client";

/**
 * @module HevyDuplicateDay
 * Dialog to duplicate one day to another week and selected day slots. User picks target week and multiple days, then confirms.
 * Depends on: Dialog, Select, MultiSelect, Button.
 * Used by: HevyDayCard (when user chooses Duplicate Day).
 */

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MultiSelect, { IOption } from "@/components/ui/multi-select";
import { Button } from "@/components/ui/button";
import { useState } from "react";

/** Props for the duplicate-day dialog. */
interface IProps {
    /** The day (routine) to duplicate. */
    day: THevyRoutine;
    /** Source week index (folder_id). */
    folder_id: number;
    /** Total number of weeks (for target week dropdown). */
    programLength: number;
    /** Whether the dialog is open. */
    duplicateDayOpen: boolean;
    /** Setter to open/close the dialog. */
    setDuplicateDayOpen: (duplicateDayOpen: boolean) => void;
    /** Called with source week/day, target week, and selected day options to perform the duplicate. */
    handleDuplicateDay: (fromWeekOrder: number, fromDayOrder: number, toWeekOrder: number, toDayIndexArray: IOption[]) => void;
}

/**
 * Dialog: select target week and day(s), then call handleDuplicateDay and close.
 */
export const HevyDuplicateDay: React.FC<IProps> = (props) => {

    const {
        day,
        folder_id,
        programLength,
        duplicateDayOpen,
        setDuplicateDayOpen,
        handleDuplicateDay,
    } = props;

    const programLengthArray = Array.from({ length: programLength }, (_, index) => index + 1);
    const daysArray = Array.from({length: 7 }, (_, index) => index + 1);
    const daysOptions: IOption[] = daysArray.map((d) => ({ label: `Day ${d}`, value: String(d)}));
    const [selectedDays, setSelectedDays] = useState<IOption[]>([]);
    const [selectedWeek, setSelectedWeek ] = useState<string>(String(folder_id + 1));

    return (
        <>
            <Dialog open={ duplicateDayOpen } onOpenChange={ () => setDuplicateDayOpen(false) }>
                <DialogContent hideClose className="max-w-3xl w-full">
                    <DialogTitle className="font-bold flex items-center justify-center pb-4 border-b-2">
                        Duplicate Week {folder_id + 1} Day {day.order} to
                    </DialogTitle>
                    <span className="flex flex-row p-8 gap-8 w-full">
                        <Select onValueChange={ (value) => setSelectedWeek(value) } value={ selectedWeek } defaultValue={ selectedWeek }>
                            <SelectTrigger className="h-10">
                                <SelectValue placeholder="Week" />
                            </SelectTrigger>
                            <SelectContent>
                                { programLengthArray.map((wk) => {
                                    return (
                                        <SelectItem key={ wk } value={ String(wk) }>Week {wk}</SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                        <MultiSelect
                            badgeClassName="bg-[#33bbcf] hover:bg-[#33bbcf]"
                            defaultOptions={ daysOptions }
                            onChange={ (options) => setSelectedDays(options) }
                            value={ selectedDays }
                            placeholder="Day"
                            emptyIndicator={ (
                                <span className="text-center h-6 text-sm text-gray-600 dark:text-gray-400">
                                    no results found.
                                </span>
                          ) }
                            />
                    </span>
                    <span className="flex flex-col gap-2 border-t border-border/40 pt-4 sm:flex-row sm:justify-stretch">
                        <span className="flex w-full items-center justify-center">
                            <Button
                                onClick={ () => setDuplicateDayOpen(false) }
                                variant="outline"
                                className="h-11 w-full rounded-full border-border/80 sm:h-12"
                                aria-label="Cancel duplicate day"
                            >
                                Cancel
                            </Button>
                        </span>
                        <span className="flex w-full items-center justify-center">
                            <Button
                                onClick={ () => {
                                    handleDuplicateDay(folder_id, Number(day.order), Number(selectedWeek) - 1, selectedDays);
                                    setDuplicateDayOpen(false);
                                } }
                                className="h-11 w-full rounded-full bg-lightSecondary text-white hover:bg-lightSecondary/90 sm:h-12"
                                aria-label="Duplicate day to selected week"
                            >
                                Duplicate
                            </Button>
                        </span>
                    </span>
                </DialogContent>
            </Dialog>
        </>
    );
};
