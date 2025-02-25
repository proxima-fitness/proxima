"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MultiSelect, { Option } from "@/components/ui/multi-select";
import { Button } from "@/components/ui/button";

interface IProps {
    day: number;
    days: number[];
    week: number;
    weeks: number[];
    duplicateDayOpen: boolean;
    setDuplicateDayOpen: (duplicateDayOpen: boolean) => void;
}

export const DuplicateDay: React.FC<IProps> = (props) => {

    const {
        day,
        days,
        week,
        weeks,
        duplicateDayOpen,
        setDuplicateDayOpen,
    } = props;

    const daysOptions: Option[] = days.filter((d) => d !== day).map((d) => ({ label: `Day ${d}`, value: String(d)}));

    return (
        <>
            <Dialog open={ duplicateDayOpen } onOpenChange={ () => setDuplicateDayOpen(false) }>
                <DialogContent hideClose className="max-w-3xl w-full">
                    <DialogTitle className="font-bold flex items-center justify-center pb-4 border-b-2">
                        Duplicate Week {week} Day {day} to
                    </DialogTitle>
                    <span className="flex flex-row p-8 gap-8 w-full">
                        <Select defaultValue={ String(week) }>
                            <SelectTrigger className="h-10">
                                <SelectValue placeholder="Week" />
                            </SelectTrigger>
                            <SelectContent>
                                { weeks.map((wk) => {
                                    return (
                                        <SelectItem key={ wk } value={ String(wk) }>Week {wk}</SelectItem>
                                    )
                                })}
                            </SelectContent>
                        </Select>
                        <MultiSelect
                            badgeClassName="bg-[#33bbcf] hover:bg-[#33bbcf]"
                            defaultOptions={ daysOptions }
                            placeholder="Day"
                            emptyIndicator={
                            <span className="text-center h-6 text-sm text-gray-600 dark:text-gray-400">
                                no results found.
                            </span>
                            }
                            />
                    </span>
                    <span className="flex flex-row justify-between items-center gap-2 border-t-2 pt-4">
                        <span className="w-full flex items-center justify-center">
                            <Button onClick={ () => setDuplicateDayOpen(false) } variant="ghost" className="w-full h-12">
                                    Cancel
                            </Button>
                        </span>
                        <span className="w-full flex items-center justify-center">
                            <Button variant="ghost" className="bg-lightSecondary text-white hover:bg-lightSecondary w-full h-12">
                                    Duplicate
                            </Button>
                        </span>
                    </span>
                </DialogContent>
        </Dialog>
        </>
    );
};
