// SPDX-License-Identifier: AGPL-3.0-only

"use client";

/**
 * @module HevyDuplicateWeek
 * Dialog to duplicate the current week to one or more other weeks. User toggles target weeks (or Select All) and confirms.
 * Depends on: Dialog, DialogBadge, Button.
 * Used by: HevyColumn (when user clicks duplicate week icon).
 */

import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DialogBadge } from "@/components/ui/dialog-badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useProgramMutation } from "@/contexts/ProgramMutationContext";

/** Props for the duplicate-week dialog. */
interface IProps {
    /** Source week index to duplicate. */
    folder_id: number;
    /** Total number of weeks (for target week badges). */
    programLength: number;
    /** Whether the dialog is open. */
    duplicateWeekOpen: boolean;
    /** Setter to open/close the dialog. */
    setDuplicateWeekOpen: (duplicateWeekOpen: boolean) => void;
    /** Called with source week index and array of target week indexes to perform the duplicate. */
    handleDuplicateWeek: (fromWeekIndex: number, toWeekIndexes: number[]) => void;
}

/**
 * Dialog: select target weeks via badges (or Select All), then call handleDuplicateWeek and close.
 */
export const HevyDuplicateWeek: React.FC<IProps> = (props) => {
    const {
        folder_id,
        programLength,
        duplicateWeekOpen,
        setDuplicateWeekOpen,
        handleDuplicateWeek,
    } = props;

    const { isAgentStreaming } = useProgramMutation();
    const mutationsLocked = isAgentStreaming;

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
                    Duplicate Week {folder_id + 1} to
                </DialogTitle>
                <DialogDescription className="flex flex-row justify-between items-center">
                    <span className="grid grid-cols-6 gap-2 max-sm:text-center sm:gap-6 sm:p-8 w-full">
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
                            if (wk !== folder_id + 1) {
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
                <span className="flex flex-col gap-2 border-t border-border/40 pt-4 sm:flex-row-reverse sm:justify-stretch">
                    <span className="flex w-full items-center justify-center">
                        <Button
                            onClick={ () => {
                                if (mutationsLocked) return;
                                handleDuplicateWeek(
                                    folder_id,
                                    toWeekIndexes(),
                                );
                                setDuplicateWeekOpen(false);
                                }
                            }
                            disabled={mutationsLocked}
                            className="h-11 w-full rounded-full bg-lightSecondary text-white hover:bg-lightSecondary/90 sm:h-12 disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Duplicate week"
                        >
                            Duplicate
                        </Button>
                    </span>
                    <span className="flex w-full items-center justify-center">
                        <Button
                            onClick={ () => setDuplicateWeekOpen(false) }
                            variant="outline"
                            className="h-11 w-full rounded-full border-border/80 sm:h-12"
                            aria-label="Cancel duplicate week"
                        >
                            Cancel
                        </Button>
                    </span>
                </span>
            </DialogContent>
        </Dialog>
    );
};
