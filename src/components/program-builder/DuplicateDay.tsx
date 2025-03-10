"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MultiSelect, { Option } from "@/components/ui/multi-select";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface IProps {
    day: TProgramCreatorDay;
    days: number;
    weekIndex: number;
    programLength: number;
    duplicateDayOpen: boolean;
    setDuplicateDayOpen: (duplicateDayOpen: boolean) => void;
    handleDuplicateDay: (currentWeek: number, currentDay: number, duplicatedToWeek: number, duplicatedToDays: Option[]) => void;
}

export const DuplicateDay: React.FC<IProps> = (props) => {

    const {
        day,
        days,
        weekIndex,
        programLength,
        duplicateDayOpen,
        setDuplicateDayOpen,
        handleDuplicateDay,
    } = props;

    const programLengthArray = Array.from({ length: programLength }, (_, index) => index + 1);
    const daysArray = Array.from({length: 7 }, (_, index) => index + 1);
    const daysOptions: Option[] = daysArray.map((d) => ({ label: `Day ${d}`, value: String(d)}));
    const [selectedDays, setSelectedDays] = useState<Option[]>();
    const [selectedWeek, setSelectedWeek ] = useState<string>(String(weekIndex + 1));

    return (
        <>
            <Dialog open={ duplicateDayOpen } onOpenChange={ () => setDuplicateDayOpen(false) }>
                <DialogContent hideClose className="max-w-3xl w-full">
                    <DialogTitle className="font-bold flex items-center justify-center pb-4 border-b-2">
                        Duplicate Week {weekIndex + 1} Day {day.order} to
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
                    <span className="flex flex-row justify-between items-center gap-2 border-t-2 pt-4">
                        <span className="w-full flex items-center justify-center">
                            <Button onClick={ () => setDuplicateDayOpen(false) } variant="ghost" className="w-full h-12">
                                Cancel
                            </Button>
                        </span>
                        <span className="w-full flex items-center justify-center">
                            <Button
                                onClick={ () => {
                                    handleDuplicateDay(weekIndex, Number(day.order) - 1, Number(selectedWeek) - 1, selectedDays);
                                    setDuplicateDayOpen(false);
                                } }
                                variant="ghost"
                                className="bg-lightSecondary text-white hover:bg-lightSecondary w-full h-12"
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
