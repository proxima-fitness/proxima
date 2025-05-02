import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CopyIcon, FlameIcon } from "lucide-react";
import { useIsHevy } from "@/contexts/HevyContext";
import { v4 as uuidv4 } from "uuid";
import { postAIProgram } from "@/app/(app)/actions";
import { facebook, instagram } from "public";
import { Input } from "../ui/input";
import { toast } from "sonner";

interface IProps {
    openShareDialog: boolean;
    handleOpenShareDialog: (openShareDialog: boolean) => void;
}

export const ShareDialog: React.FC<IProps> = (props) => {

    const {
        openShareDialog,
        handleOpenShareDialog,
    } = props;

    const { isHevy } = useIsHevy();
    const [program, setProgram] = useState<TProgramCreatorDay[][]>();
    const [hevyRoutine, setHevyRoutine] = useState<THevyRoutine[]>();
    const [programId, setProgramId] = useState("");

    const handleCloseDialog = () => {
        handleOpenShareDialog(false);
    };

    const handleCopyShareId = () => {
        try {
            navigator.clipboard.writeText(`https://proximafitness.com/program-builder/build-program?shareId=${programId}`);
        } catch (error: unknown) {
            console.error("Error copying to clipboard",error);
            toast.error("Error copying to clipboard");
        }
        toast.success("Copied to clipboard");
    };


    useEffect(() => {
        const saveProgram = async () => {
            if (hevyRoutine !== undefined) {
                const new_id = uuidv4();
                if (new_id !== undefined) {
                    setProgramId(new_id);
                    await postAIProgram(new_id, hevyRoutine);
                }
            }
        }
        saveProgram();
    }, [hevyRoutine]);

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

    if (!program && !hevyRoutine) {
        return <div></div>;
    }

    return (
        <>
            <Dialog open={ openShareDialog } onOpenChange={ handleCloseDialog }>
                <DialogContent className="sm:max-w-5xl max-sm:w-screen h-[20%]">
                    <DialogTitle className="font-bold font-main text-2xl flex max-sm:flex-col max-sm:text-center items-center justify-center max-sm:pb-0 pb-4 gap-2">
                        Share your Proxima AI Program with your friends<FlameIcon />
                    </DialogTitle>
                    <span className="w-full flex flex-row max-sm:flex-col items-center justify-center max-sm:justify-center gap-4">
                        <span className="flex flex-row items-center justify-center gap-4">
                            <Button
                                className="h-16 w-16"
                            >
                                <img src={ instagram.src } alt="Instagram" className="h-full w-full" />
                            </Button>
                            <Button
                                className="h-16 w-16"
                            >
                                <img src={ facebook.src } alt="Facebook" className="h-full w-full" />
                            </Button>
                            <div className="flex flex-row items-center justify-center gap-2">
                                <Input
                                    className="h-16 w-full"
                                    readOnly
                                    value={ `https://proximafitness.com/program-builder/build-program?shareId=${programId}` }
                                />
                                <Button
                                    variant="outline"
                                    className="h-16 w-16"
                                    onClick={ handleCopyShareId }
                                >
                                    <CopyIcon className="h-full w-full text-lightSecondary" />
                                </Button>

                            </div>
                        </span>
                    </span>
                </DialogContent>
            </Dialog>
        </>
    );;
};
