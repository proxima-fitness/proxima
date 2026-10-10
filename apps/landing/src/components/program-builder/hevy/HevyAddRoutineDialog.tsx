"use client";

/**
 * @module HevyAddRoutineDialog
 * Modal/drawer that lists the user's Hevy routines and lets them add one as a day into the current week.
 * Fetches routines via API; each routine is rendered as HevyRoutineCard. Responsive: drawer on mobile, dialog on desktop.
 * Depends on: HevyRoutineCard, useHevyRoutines, useHevySecret, Drawer/Dialog.
 * Used by: HevyColumn (when user chooses "Add Hevy Routine" from the Add Day dropdown).
 */

import { useHevyRoutines, useHevySecret } from "@/api/hooks";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUserContext } from "@/contexts/UserContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Loader2 } from "lucide-react";
import { HevyRoutineCard } from "./HevyRoutineCard";
import { useProgramMutation } from "@/contexts/ProgramMutationContext";

/** Props for the add routine-as-day dialog. */
interface IProps {
    /** Whether the dialog is open. */
    routineDialogOpen: boolean;
    /** Setter to open/close the dialog. */
    setRoutineDialogOpen: (routineDialogOpen: boolean) => void;
    /** Called when user selects a routine to add as a day in the given week (folder_id). */
    handleAddRoutineAsDay: (routine: THevyRoutine, folder_id: number) => void;
    /** Week index (folder_id) into which the selected routine will be added as a day. */
    folder_id: number;
}

/**
 * Lists Hevy routines; on selection, adds that routine as a day in the current week and closes.
 */
export const HevyAddRoutineDialog: React.FC<IProps> = (props) => {

    const { routineDialogOpen, setRoutineDialogOpen, handleAddRoutineAsDay, folder_id } = props;

    const { user } = useUserContext();
    const { data: hevyApiKey } = useHevySecret(user);
    const { isAgentStreaming } = useProgramMutation();
    const mutationsLocked = isAgentStreaming;

    const { data: hevyRoutines, isLoading: isLoadingHevyRoutines } = useHevyRoutines(user, hevyApiKey);
    const isMobile = useIsMobile();

    const handleAddRoutine = (routine: THevyRoutine) => {
        if (mutationsLocked) return;
        handleAddRoutineAsDay(routine, folder_id);
        setRoutineDialogOpen(false);
    };

    const dialogContent = (
        <>
            { isLoadingHevyRoutines ?
                <div className="flex items-center justify-center h-full min-h-[200px]">
                    <Loader2 className="w-8 h-8 animate-spin" />
                </div>
                :
                <div className="flex flex-col gap-4 p-4">
                    { hevyRoutines?.map((routine) => (
                        <HevyRoutineCard
                            key={ routine.id }
                            routine={ routine }
                            handleAddRoutine={ handleAddRoutine }
                        />
                    )) }
                </div>
            }
        </>
    );

    if (isMobile) {
        return (
            <Drawer
                open={ routineDialogOpen }
                modal={ routineDialogOpen }
                onOpenChange={
                    () => {
                        setRoutineDialogOpen(false);
                    }
                }
            >
                <DrawerContent className="max-h-[98%]">
                <div className="overflow-y-auto">
                    <DrawerTitle className="font-bold flex items-center justify-center p-4">
                        Add Hevy Routine
                    </DrawerTitle>
                    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
                        {dialogContent}
                    </div>
                </div>
            </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog
            open={ routineDialogOpen }
            onOpenChange={
                () => {
                    setRoutineDialogOpen(false);
                }
            }
        >
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onOpenAutoFocus={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle className="font-bold text-center">
                        Add Hevy Routine
                    </DialogTitle>
                </DialogHeader>
                <div className="overflow-y-auto flex-1">
                    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
                        {dialogContent}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
