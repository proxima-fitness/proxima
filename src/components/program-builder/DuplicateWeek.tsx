"use client";

import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DialogBadge } from "@/components/ui/dialog-badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface IProps {
    weekOrder: string;
    programLength: number;
    duplicateWeekOpen: boolean;
    setDuplicateWeekOpen: (duplicateWeekOpen: boolean) => void;
    handleDuplicateWeek: (fromWeekIndex: number, toWeekIndexes: number[]) => void;
}

export const DuplicateWeek: React.FC<IProps> = (props) => {
    const {
        weekOrder,
        programLength,
        duplicateWeekOpen,
        setDuplicateWeekOpen,
        handleDuplicateWeek,
    } = props;

    const [selectedWeeks, setSelectedWeeks] = useState<boolean[]>(Array(programLength).fill(false));

    const toWeekIndexes = () => {
        return selectedWeeks
        .map((selected, index) => (selected ? index  : undefined))
        .filter((wk) => wk !== undefined) as number[];
    };

    const toggleWeekSelection = (wk: number) => {
        setSelectedWeeks((prev) =>
            prev.map((selected, index) => (index === wk - 1 ? !selected : selected)),
        );
    };

    const selectAllWeeks = () => {
        const allSelected = selectedWeeks.every((selected) => selected);
        setSelectedWeeks(Array(programLength).fill(!allSelected));
    };

    return (
        <Dialog open={ duplicateWeekOpen } onOpenChange={ () => setDuplicateWeekOpen(false) }>
            <DialogContent hideClose className="max-w-3xl w-full">
                <DialogTitle className="font-bold flex items-center justify-center pb-4 border-b-2">
                    Duplicate Week {Number(weekOrder) + 1} to
                </DialogTitle>
                <DialogDescription className="flex flex-row justify-between items-center">
                    <span className="grid grid-cols-6 gap-6 p-8 w-full">
                        <DialogBadge
                            key="select-all"
                            onClick={ selectAllWeeks }
                            className={ `flex items-center justify-center p-2 cursor-pointer ${
                                selectedWeeks.every((s) => s) ? "bg-[#37BCCF] hover:bg-[#37BCCF] text-white" : "bg-lightGray hover:bg-lightGray"
                            }` }
                        >
                            Select All
                        </DialogBadge>
                        {Array.from({ length: programLength }, (_, index) => index + 1).map((wk) => {
                            if (wk !== Number(weekOrder) + 1) {
                                return (
                                    <DialogBadge
                                        key={ wk }
                                        onClick={ () => toggleWeekSelection(wk) }
                                        className={ `flex items-center justify-center p-2 cursor-pointer ${
                                            selectedWeeks[wk - 1] ? "bg-[#37BCCF] hover:bg-[#37BCCF] text-white" : "bg-lightGray hover:bg-lightGray"
                                        }` }
                                    >
                                        Week {wk}
                                    </DialogBadge>
                                );
                            }
                        })}
                    </span>
                </DialogDescription>
                <span className="flex flex-row justify-between items-center gap-2 border-t-2 pt-4">
                    <span className="w-full flex items-center justify-center">
                        <Button onClick={ () => setDuplicateWeekOpen(false) } variant="ghost" className="w-full h-12">
                            Cancel
                        </Button>
                    </span>
                    <span className="w-full flex items-center justify-center">
                        <Button
                            onClick={ () => {
                                handleDuplicateWeek(
                                    Number(weekOrder),
                                    toWeekIndexes(),
                                );
                                setDuplicateWeekOpen(false);
                                }
                            }
                            variant="ghost"
                            className="bg-lightSecondary text-white hover:bg-lightSecondary w-full h-12"
                        >
                            Duplicate
                        </Button>
                    </span>
                </span>
            </DialogContent>
        </Dialog>
    );
};
