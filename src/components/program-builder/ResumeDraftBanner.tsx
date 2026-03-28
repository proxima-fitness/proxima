"use client";

/**
 * @module ResumeDraftBanner
 *
 * Banner shown when the user has an in-progress program (Proxima or Hevy format)
 * stored in localStorage. Renders "Resume program" and "Clear" actions; on clear,
 * opens a confirmation dialog and removes the draft, persisted chat (anonymous),
 * and related build-program keys from localStorage.
 *
 * Depends on: Dialog/Button (ui), Link (next/link), lucide-react (Redo2Icon, X).
 * Uses global types THevyRoutine. Used by: program-builder/shared/Prompt.tsx, profile/ProfileContent.tsx.
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
import { useState } from "react";
import { CHAT_MESSAGES_KEY } from "@/assets/constants/ui-constants";

const DRAFT_STORAGE_KEY = "hevy-program-in-progress";
/** Persisted program request filters; see BuildProgram debounced localStorage write. */
const HEVY_REQUEST_KEY = "hevy-request";
/** Persisted prompt title; see BuildProgram debounced localStorage write. */
const PROMPT_KEY = "prompt";

function readDraftFromStorage(): THevyRoutine[] | undefined {
    if (typeof window === "undefined") return undefined;
    try {
        const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (!raw) return undefined;
        return JSON.parse(raw) as THevyRoutine[];
    } catch {
        return undefined;
    }
}

/**
 * Banner component with no props. Reads draft from localStorage on first render
 * (lazy init) and renders resume/clear UI or null.
 */
export const ResumeDraftBanner: React.FC = () => {
    const [hevyRoutine, setHevyRoutine] = useState<THevyRoutine[] | undefined>(readDraftFromStorage);
    const [clearDialogOpen, setClearDialogOpen] = useState(false);

    const handleClearProgram = () => {
        if (typeof window !== "undefined") {
            localStorage.removeItem(DRAFT_STORAGE_KEY);
            localStorage.removeItem(CHAT_MESSAGES_KEY);
            localStorage.removeItem(HEVY_REQUEST_KEY);
            localStorage.removeItem(PROMPT_KEY);
        }
        setHevyRoutine(undefined);
        setClearDialogOpen(false);
    };

    if (!hevyRoutine) {
        return null;
    }

    return (
        <div className="relative flex w-full max-w-3xl mx-0 sm:mx-auto mb-4 sm:mb-8 flex-col sm:flex-row flex-nowrap items-center gap-4 rounded-2xl border border-border bg-muted/40 px-5 py-4 shadow-xs">
            <div className="w-full sm:flex-1 sm:min-w-0">
                <span className="text-sm sm:text-base font-medium text-foreground">
                    Pick up where you left off.
                </span>
            </div>
            <div className="flex flex-row items-center justify-end sm:justify-start gap-2 w-full sm:w-auto shrink-0">
                <Button asChild size="default" className="shrink-0 bg-lightSecondary text-white">
                    <Link
                        href="/build-program?resume=true"
                        target="_self"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2"
                    >
                        <Redo2Icon className="size-4" />
                        Resume program
                    </Link>
                </Button>
                <div className="flex items-center sm:border-l sm:border-border sm:pl-4 sm:ml-0">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setClearDialogOpen(true)}
                        className="h-9 px-3 text-muted-foreground hover:text-foreground sm:h-10 sm:w-10 sm:p-0 shrink-0"
                        title="Clear program and chat"
                        aria-label="Clear program and chat"
                    >
                        <span className="sm:hidden">Clear</span>
                        <X className="hidden sm:block size-4" aria-hidden />
                    </Button>
                </div>
            </div>
            <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
                <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
                    <DialogHeader className="pb-2">
                        <DialogTitle>Clear program and chat?</DialogTitle>
                        <DialogDescription>
                            This will permanently remove your program draft and your current chat. Sign in first if you want to save your work.
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
    );
};
