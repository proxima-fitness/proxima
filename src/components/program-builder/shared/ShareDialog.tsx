import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { BicepsFlexedIcon, CopyIcon } from "lucide-react";
import { useIsHevy } from "@/contexts/HevyContext";
import { v4 as uuidv4 } from "uuid";
import { postAIProgram } from "@/app/(app)/actions";
import { facebook, reddit } from "public";
import { Input } from "@/components/ui/input";
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
    const [savingRoutine, setSavingRoutine] = useState(false);
    const [programId, setProgramId] = useState("");
    const [prompt, setPrompt] = useState<string>("");
    const [request, setRequest] = useState<TTextToJsonRequest>();
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
            if (hevyRoutine !== undefined && request !== undefined) {
                const new_id = uuidv4();
                if (new_id !== undefined) {
                    setProgramId(new_id);
                    setSavingRoutine(true);
                    await postAIProgram(new_id, hevyRoutine, prompt, request);
                    setSavingRoutine(false);
                }
            }
        }
        saveProgram();
    }, [hevyRoutine, prompt, request]);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const localStorageProgram = localStorage.getItem(isHevy ? "hevy-program-in-progress" : "program-in-progress");
            const localStoragePrompt = localStorage.getItem("prompt");
            const localStorageRequest = localStorage.getItem( isHevy ? "hevy-request" : "request");
            if (localStoragePrompt) {
                setPrompt(localStoragePrompt);
            }
            if (localStorageProgram) {
                if (isHevy) {
                    setHevyRoutine(JSON.parse(localStorageProgram));
                } else {
                    setProgram(JSON.parse(localStorageProgram));
                }
            }
            if (localStorageRequest) {
                setRequest(JSON.parse(localStorageRequest));
            }
        }
    }, [isHevy]);

    if (!program && !hevyRoutine) {
        return <div></div>;
    }

    return (
        <>
            <Dialog open={ openShareDialog } onOpenChange={ handleCloseDialog }>
                <DialogContent className="sm:max-w-5xl max-sm:w-screen h-[30%]">
                    <DialogTitle className="font-bold font-main text-2xl flex max-sm:flex-col max-sm:text-center items-center justify-center max-sm:pb-0 pb-4 gap-2">
                        Share your Proxima AI Program with your friends<BicepsFlexedIcon />
                    </DialogTitle>
                    <span className="w-full flex flex-row max-sm:flex-col items-center justify-center max-sm:justify-center gap-4">
                        <span className="flex flex-row items-center justify-center gap-4">
                            {/* <Button
                                className="h-16 w-16 bg-lightSecondary"
                            >
                                <img src={ instagram.src } alt="Instagram" className="h-full w-full" />
                            </Button> */}
                            <a href={ `https://www.facebook.com/sharer/sharer.php?u=https://proximafitness.com/program-builder/build-program?shareId=${programId}&title=Check+Out+My+Custom+Workout+Program+Built+By+Proxima+AI!` } target="_blank" rel="noopener noreferrer">
                                <Button
                                    className="h-16 w-16 bg-lightSecondary"
                                >
                                    <img src={ facebook.src } alt="Facebook" className="h-full w-full" />
                                </Button>
                            </a>
                            <a href={ `https://www.reddit.com/submit?url=https://proximafitness.com/program-builder/build-program?shareId=${programId}&title=Check+Out+My+Custom+Workout+Program+Built+By+Proxima+AI!` } target="_blank" rel="noopener noreferrer">
                                <Button
                                    variant="outline"
                                    className="h-16 w-16"
                            >
                                <img src={ reddit.src } alt="Reddit" className="h-full w-full" />
                            </Button>
                            </a>
                            <div className="flex flex-row items-center justify-center gap-2">
                                <Input
                                    className="h-16 max-sm:w-full sm:w-[400px]"
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
                                { savingRoutine && <>Saving...</> }
                            </div>
                        </span>
                    </span>
                </DialogContent>
            </Dialog>
        </>
    );;
};
