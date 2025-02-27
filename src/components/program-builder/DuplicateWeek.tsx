"use client";

import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DialogBadge } from "@/components/ui/dialog-badge";
import { Button } from "@/components/ui/button";

interface IProps {
    week: number;
    programLength: number;
    duplicateWeekOpen: boolean;
    setDuplicateWeekOpen: (duplicateWeekOpen: boolean) => void;
}

export const DuplicateWeek: React.FC<IProps> = (props) => {

    const {
        week,
        programLength,
        duplicateWeekOpen,
        setDuplicateWeekOpen,
    } = props;

    const programLengthArray = Array.from({ length: programLength }, (_, index) => index + 1);

    return (
        <>
            <Dialog open={ duplicateWeekOpen } onOpenChange={ () => setDuplicateWeekOpen(false) }>
                <DialogContent hideClose className="max-w-3xl w-full">
                    <DialogTitle className="font-bold flex items-center justify-center pb-4 border-b-2">
                        Duplicate Week {week} to
                    </DialogTitle>
                    <DialogDescription className="flex flex-row justify-between items-center">
                        <span className="grid grid-cols-6 gap-6 p-8 w-full ">
                            <DialogBadge key={ "select-all" } className={`flex items-center justify-center p-2 cursor-pointer ${ false ? "bg-[#37BCCF] hover:bg-[#37BCCF] text-white hover:text-white" : "bg-lightGray hover:bg-lightGray"}  `}>Select All</DialogBadge>
                            { programLengthArray.map((wk) => {
                                if ((wk) !== week) {
                                    return (
                                        <DialogBadge key={ wk } className={`flex items-center justify-center p-2 cursor-pointer ${ false ? "bg-[#37BCCF] hover:bg-[#37BCCF] text-white hover:text-white" : "bg-lightGray hover:bg-lightGray"}  `}>Week { wk }</DialogBadge>
                                    );
                                }
                            }
                            )}
                        </span>
                    </DialogDescription>
                    <span className="flex flex-row justify-between items-center gap-2 border-t-2 pt-4">
                        <span className="w-full flex items-center justify-center">
                            <Button onClick={ () => setDuplicateWeekOpen(false) } variant="ghost" className="w-full h-12">
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
