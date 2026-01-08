"use client";

import { useHevyRoutines, useHevySecret } from "@/api/hooks";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUserContext } from "@/contexts/UserContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Loader2 } from "lucide-react";
import { HevyRoutineCard } from "./HevyRoutineCard";

interface IProps {
    routineDialogOpen: boolean;
    setRoutineDialogOpen: (routineDialogOpen: boolean) => void;
    handleAddRoutineAsDay: (routine: THevyRoutine, folder_id: number) => void;
    folder_id: number;
}

export const HevyAddRoutineDialog: React.FC<IProps> = (props) => {

    const { routineDialogOpen, setRoutineDialogOpen, handleAddRoutineAsDay, folder_id } = props;

    const { user } = useUserContext();
    const { data: hevyApiKey } = useHevySecret(user);
    const { data: hevyRoutines, isLoading: isLoadingHevyRoutines } = useHevyRoutines(user, hevyApiKey);
    const isMobile = useIsMobile();

    const handleAddRoutine = (routine: THevyRoutine) => {
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
