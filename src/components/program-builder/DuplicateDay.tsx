"use client";

import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DialogBadge } from "@/components/ui/dialog-badge";
import { Button } from "@/components/ui/button";

interface IProps {
    day: number;
    days: number[];
    week: number;
    duplicateDayOpen: boolean;
    setDuplicateDayOpen: (duplicateDayOpen: boolean) => void;
}

export const DuplicateDay: React.FC<IProps> = (props) => {

    const {
        day,
        days,
        week,
        duplicateDayOpen,
        setDuplicateDayOpen,
    } = props;

    return (
        <>
            <Dialog open={ duplicateDayOpen } onOpenChange={ () => setDuplicateDayOpen(false) }>
                <DialogContent hideClose className="max-w-3xl w-full">
                    <DialogTitle className="font-bold flex items-center justify-center pb-4 border-b-2">
                        Duplicate Week {week} Day {day} to
                    </DialogTitle>
                    <DialogDescription className="flex flex-row justify-between items-center">
                        <span className="grid grid-cols-6 gap-6 p-8 w-full ">
                            <DialogBadge key={ "select-all" } className={`flex items-center justify-center p-2 cursor-pointer ${ false ? "bg-[#37BCCF] hover:bg-[#37BCCF] text-white hover:text-white" : "bg-lightGray hover:bg-lightGray"}  `}>Select All</DialogBadge>
                            { days.map((d) => {
                                if ((d + 1) !== day) {
                                    return (
                                        <DialogBadge key={ d + 1 } className={`flex items-center justify-center p-2 cursor-pointer ${ false ? "bg-[#37BCCF] hover:bg-[#37BCCF] text-white hover:text-white" : "bg-lightGray hover:bg-lightGray"}  `}>Day { d + 1}</DialogBadge>
                                    );
                                }
                            }
                            )}
                        </span>
                    </DialogDescription>
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
