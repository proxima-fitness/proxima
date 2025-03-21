import {
    Dialog,
    DialogContent,
    DialogTitle,
  } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {  CopyIcon, DownloadIcon, LogInIcon, PartyPopperIcon } from "lucide-react";
import { toast } from "sonner";
import { PDFViewer } from '@react-pdf/renderer';
import { PdfRenderer } from "../generic/PdfRenderer";
import { useIsHevy } from "@/contexts/HevyContext";
import { HevyPdfRenderer } from "./hevy/HevyPdfRenderer";
import { postHevyRoutineProgram } from "@/api/hevy";
import { v4 as uuidv4 } from "uuid";
import { deFlattenHevyRoutine, programCreatorDayToScheduleWorkouts, removeOrderHevy } from "@/utils/program-builder";

interface IProps {
    openFinishDialog: boolean;
    handleOpenFinishDialog: (openFinishDialog: boolean) => void;
}

export const FinishDialog: React.FC<IProps> = (props) => {

    const {
        openFinishDialog,
        handleOpenFinishDialog,
    } = props;

        const { isHevy } = useIsHevy();
        const [program, setProgram] = useState<TProgramCreatorDay[][]>();
        const [hevyRoutine, setHevyRoutine] = useState<THevyRoutine[]>();
        const [isPreview, setIsPreview] = useState(false);
        const [isProgramId, setIsProgramId] = useState(false);
        const [uuid, setUuid] = useState<string>("");

        const handleCloseDialog = () => {
            handleOpenFinishDialog(false);
            setIsProgramId(false);
        };

        useEffect(() => {
            if (typeof window !== undefined) {
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

    const handleCopyJson = () => {
        try {
            navigator.clipboard.writeText(JSON.stringify(program));
        } catch (error: unknown) {
            console.error("Error copying to clipboard",error);
            toast.error("Error copying to clipboard");
        }
        toast.success("Copied to clipboard");
    };

    const handleDownloadJson = () => {
        const dataStr = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(program));
        const download = document.createElement("a");
        download.setAttribute("href", dataStr);
        download.setAttribute("download", "program" + ".json");
        document.body.appendChild(download);
        download.click();
        download.remove();
    };

    if (!program && !hevyRoutine) {
        return <div></div>;
    }

    const handleUuid = () => {
        const new_id = uuidv4();
        copyAndSendUUID(new_id);
        setUuid(new_id);
    };

    const copyAndSendUUID = async (uuid: string) => {
        navigator.clipboard.writeText(uuid);
        if (hevyRoutine !== undefined) {
            await postHevyRoutineProgram(uuid, hevyRoutine);
        }
        toast.success("Program ID Copied to Clipboard");
        setIsProgramId(true);
    };

    const finishDialog = () => {
        return (
            <DialogContent className="sm:max-w-5xl max-sm:w-screen h-[95%]">
                <DialogTitle className="font-bold flex max-sm:flex-col max-sm:text-center items-center justify-center max-sm:pb-0 pb-4 gap-2 border-b-2">
                    Congrats !!! You have created your first Program <PartyPopperIcon />
                </DialogTitle>
                <span className="flex flex-row justify-center items-center gap-2">
                    <Button
                        onClick={ () => setIsPreview(false) }
                        variant={ isPreview ? "ghost" : "outline" }
                        className="max-sm:w-auto w-56 h-10 uppercase"
                    >
                        View JSON
                    </Button>
                    <Button
                        onClick={ () => setIsPreview(true) }
                        variant={ isPreview ? "outline" : "ghost" }
                        className="max-sm:w-auto w-56 h-10 uppercase"
                    >
                        Preview PDF
                    </Button>
                </span>
                <span>
                    { isPreview ?
                        <PDFViewer className="w-full h-[60vh]">
                            { (isHevy && hevyRoutine) ?
                                <HevyPdfRenderer hevyRoutine={ deFlattenHevyRoutine(hevyRoutine) } />
                            : program &&
                                <PdfRenderer program={ programCreatorDayToScheduleWorkouts(program) } />
                            }
                        </PDFViewer>
                        :
                        <Textarea className="max-sm:h-[30vh] h-[50vh]" readOnly aria-readonly value={ (isHevy && hevyRoutine) ? JSON.stringify(removeOrderHevy(hevyRoutine), null, 4) : program && JSON.stringify(program, null, 4) } />
                    }
                </span>
                <span className="w-full flex flex-row max-sm:flex-col items-center justify-between max-sm:justify-center gap-4">
                    { isPreview ?
                        <div>
                        </div>
                    :
                        <div className="flex flex-row items-center justify-center gap-2">
                            <span>
                                <Button
                                    onClick={ handleCopyJson }
                                    variant="outline"
                                    className="max-sm:w-auto w-56 h-10 uppercase"
                                >
                                    <CopyIcon /> Copy JSON
                                </Button>
                            </span>
                            <span>
                                <Button
                                    onClick={ handleDownloadJson }
                                    variant="outline"
                                    className="max-sm:w-auto w-56 h-10 uppercase"
                                >
                                    <DownloadIcon /> Download JSON
                                </Button>
                            </span>
                        </div>
                    }
                    <span>
                        <Button
                            disabled
                            onClick={ handleUuid }
                            className="max-sm:w-auto w-92 h-10 uppercase bg-lightSecondary hover:text-white hover:bg-lightSecondary text-white"
                        >
                            Save Program (Feature Coming Soon...)
                            <LogInIcon />
                        </Button>
                    </span>
                </span>
            </DialogContent>
        );
    };

    return (
        <>
            <Dialog open={ openFinishDialog } onOpenChange={ handleCloseDialog }>
                { isProgramId ?
                    (
                        <DialogContent hideClose>
                            <DialogTitle className="text-center">PROGRAM ID</DialogTitle>
                            <span className="flex items-center justify-center">
                                Your Program ID is {uuid}
                            </span>
                            <span className="flex items-center justify-center font-sm">
                                ID is automatically copied to clipboard
                            </span>
                            <a href="https://app.proximafitness.com/" className="w-full">
                                <Button
                                    className="w-full h-10 uppercase bg-lightSecondary hover:text-white hover:bg-lightSecondary text-white"
                                >
                                    Sign in to view your Program
                                    <LogInIcon />
                                </Button>
                            </a>
                        </DialogContent>)
                    : finishDialog()
                }
            </Dialog>
        </>
    );;
};
