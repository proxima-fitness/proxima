// SPDX-License-Identifier: AGPL-3.0-only

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

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { BUILDER_DRAFT_KEY, clearBuilderDraft } from "@/lib/builder-draft";
import { Redo2Icon, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

function readDraftFromStorage(): THevyRoutine[] | undefined {
    if (typeof window === "undefined") return undefined;
    try {
        const raw = localStorage.getItem(BUILDER_DRAFT_KEY);
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
        clearBuilderDraft();
        setHevyRoutine(undefined);
    };

    if (!hevyRoutine) {
        return null;
    }

    return (
        <div className="relative flex w-full min-w-0 max-w-2xl flex-col items-stretch gap-3 rounded-2xl border border-border bg-muted/40 px-4 py-3 shadow-xs sm:flex-row sm:flex-nowrap sm:items-center sm:gap-4 sm:px-6">
            <div className="min-w-0 sm:flex-1">
                <span className="text-sm font-medium text-foreground sm:text-base">
                    Pick up where you left off.
                </span>
            </div>
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap sm:justify-start">
                <Button asChild size="default" className="h-9 max-w-full shrink bg-lightSecondary px-4 text-white hover:bg-lightSecondary/90 sm:shrink-0 sm:px-5">
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
                <div className="flex items-center sm:ml-0 sm:border-l sm:border-border sm:pl-4">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setClearDialogOpen(true)}
                        className="h-9 shrink-0 px-3 text-muted-foreground hover:text-foreground sm:h-9 sm:w-10 sm:p-0"
                        title="Clear program and chat"
                        aria-label="Clear program and chat"
                    >
                        <span className="sm:hidden">Clear</span>
                        <X className="hidden sm:block size-4" aria-hidden />
                    </Button>
                </div>
            </div>
            <ConfirmDialog
                open={clearDialogOpen}
                onOpenChange={setClearDialogOpen}
                title="Clear program and chat?"
                description="This will permanently remove your program draft and your current chat. Sign in first if you want to save your work."
                confirmLabel="Clear"
                onConfirm={handleClearProgram}
                preventAutoFocus
            />
        </div>
    );
};
