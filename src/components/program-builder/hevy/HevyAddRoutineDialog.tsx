"use client";

import { useHevyRoutines, useHevySecret } from "@/api/hooks";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { useUserContext } from "@/contexts/UserContext";
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

    const handleAddRoutine = (routine: THevyRoutine) => {
        handleAddRoutineAsDay(routine, folder_id);
        setRoutineDialogOpen(false);
    };

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
            <DrawerContent
                className="max-h-[98%] sm:max-h-[100%] sm:max-w-[50%]"
            >
                <div className="overflow-y-scroll mx-auto w-full max-w-3xl">
                    <DrawerTitle className="font-bold flex items-center justify-center p-4">
                        Add Hevy Routine
                    </DrawerTitle>
                    { isLoadingHevyRoutines ?
                        <div className="flex items-center justify-center h-full">
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
                </div>
            </DrawerContent>
        </Drawer>
    );
};
