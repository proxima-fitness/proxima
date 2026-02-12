/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useIsHevy } from "@/contexts/HevyContext";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Redo2Icon, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export const ResumeDraftBanner: React.FC = () => {


    const { isHevy } = useIsHevy();
    const [hevyRoutine, setHevyRoutine] = useState<THevyRoutine[]>();
    const [program, setProgram] = useState<TProgramCreatorDay[][]>();
    const [clearDialogOpen, setClearDialogOpen] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const localStorageProgram = localStorage.getItem(isHevy ? "hevy-program-in-progress" : "program-in-progress");
            if (localStorageProgram) {
                if (isHevy) {
                    setHevyRoutine(JSON.parse(localStorageProgram));
                } else {
                    setProgram(JSON.parse(localStorageProgram));
                }
            }
        }
    }, [isHevy]);

    const handleClearProgram = () => {
        const key = isHevy ? "hevy-program-in-progress" : "program-in-progress";
        if (typeof window !== "undefined") {
            localStorage.removeItem(key);
        }
        setHevyRoutine(undefined);
        setProgram(undefined);
        setClearDialogOpen(false);
    };

    if (!hevyRoutine && !program) {
        return (
            <></>
        )
    }

    return (
        <div className="relative flex flex-col sm:flex-row sm:justify-between sm:items-center w-full max-w-3xl mx-0 sm:mx-auto px-4 sm:px-8 py-3 mb-8 rounded-xl bg-black/10 dark:bg-white/10">
            <Button
                type="button"
                variant="outline"
                onClick={() => setClearDialogOpen(true)}
                className="order-first sm:order-last self-end sm:self-center h-8 w-8 p-0 min-w-8 sm:h-10 sm:min-h-10 sm:min-w-10 bg-transparent border-none shrink-0"
                title="Clear program in progress"
                aria-label="Clear program in progress"
            >
                <X className="size-3.5 sm:size-4" />
            </Button>
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 order-last sm:order-first">
                <span className="text-sm sm:text-base font-medium text-black dark:text-white text-center sm:text-left block sm:hidden">
                    Pick up where you left off.
                </span>
                <span className="text-sm sm:text-base font-medium text-black dark:text-white text-center sm:text-left hidden sm:block">
                    You have a program in progress. Pick up where you left off.
                </span>
                <Link
                    href={"/build-program?resume=true&edit=true"}
                    target="_self"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 sm:h-10 text-sm sm:text-base rounded-lg bg-lightSecondary text-white font-medium hover:bg-black hover:text-white transition-colors shadow shrink-0"
                >
                    <Redo2Icon className="size-3.5 sm:size-4" />
                    Resume program
                </Link>
            </div>
            <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
                <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
                    <DialogHeader className="pb-">
                        <DialogTitle>Clear program in progress?</DialogTitle>
                        <DialogDescription>
                            This will permanently remove your program in progress.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex flex-row gap-2 justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full sm:w-auto"
                            onClick={() => setClearDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            className="w-full sm:w-auto"
                            onClick={handleClearProgram}
                        >
                            Clear
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
};
