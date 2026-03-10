/* eslint-disable react-hooks/set-state-in-effect */
"use client";

/**
 * @module ResumeDraftBanner
 *
 * Banner shown when the user has an in-progress program (Proxima or Hevy format)
 * stored in localStorage. Renders "Resume program" and "Clear" actions; on clear,
 * opens a confirmation dialog and removes the draft from localStorage.
 *
 * Depends on: HevyContext (useIsHevy), Dialog/Button (ui), Link (next/link),
 * lucide-react (Redo2Icon, X). Uses global types THevyRoutine, TProgramCreatorDay.
 * Used by: program-builder/shared/Prompt.tsx, profile/ProfileContent.tsx.
 */

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

/**
 * Banner component with no props. Reads draft from localStorage on mount
 * (key depends on Hevy vs Proxima mode) and renders resume/clear UI or null.
 */
export const ResumeDraftBanner: React.FC = () => {
    const [hevyRoutine, setHevyRoutine] = useState<THevyRoutine[]>();
    const [clearDialogOpen, setClearDialogOpen] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const key = "hevy-program-in-progress";
            const localStorageProgram = localStorage.getItem(key);
            if (localStorageProgram) {
                setHevyRoutine(JSON.parse(localStorageProgram));
            }
        }
    }, []);

    const handleClearProgram = () => {
        const key = "hevy-program-in-progress";
        if (typeof window !== "undefined") {
            localStorage.removeItem(key);
        }
        setHevyRoutine(undefined);
        setClearDialogOpen(false);
    };

    if (!hevyRoutine) {
        return <></>;
    }

    return (
        <div className="relative flex flex-row items-center w-full max-w-3xl mx-0 sm:mx-auto px-3 py-2 mb-4 sm:px-8 sm:py-3 sm:m-8 rounded-xl bg-transparent sm:bg-black/10 sm:dark:bg-white/10">
            {/* Mobile: centered group of both buttons */}
            <div className="flex sm:hidden flex-1 justify-center items-center gap-2">
                <Link
                    href={"/build-program?resume=true&edit=true"}
                    target="_self"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 h-9 text-sm rounded-lg bg-lightSecondary text-white font-medium hover:bg-black hover:text-white transition-colors shadow-sm shrink-0"
                >
                    <Redo2Icon className="size-3.5" />
                    Resume program
                </Link>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => setClearDialogOpen(true)}
                    className="shrink-0 h-9 px-2.5 bg-transparent border-none text-sm"
                    title="Clear program in progress"
                    aria-label="Clear program in progress"
                >
                    Clear
                </Button>
            </div>
            {/* Desktop: text + link left, X button right */}
            <div className="hidden sm:flex flex-1 flex-row items-center justify-between gap-4">
                <div className="flex flex-row items-center gap-4">
                    <span className="text-base font-medium text-black dark:text-white">
                        Pick up where you left off.
                    </span>
                    <Link
                        href={"/build-program?resume=true&edit=true"}
                        target="_self"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 h-10 text-base rounded-lg bg-lightSecondary text-white font-medium hover:bg-black hover:text-white transition-colors shadow-sm shrink-0"
                    >
                        <Redo2Icon className="size-4" />
                        Resume program
                    </Link>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => setClearDialogOpen(true)}
                    className="shrink-0 h-10 w-10 p-0 min-w-10 bg-transparent border-none"
                    title="Clear program in progress"
                    aria-label="Clear program in progress"
                >
                    <X className="size-4" />
                </Button>
            </div>
            <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
                {/* onOpenAutoFocus preventDefault avoids stealing focus from the Clear button that opened the dialog. */}
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
