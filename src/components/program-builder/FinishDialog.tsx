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
    const [isPreview, setIsPreview] = useState(true);
    const [savingRoutine, setSavingRoutine] = useState(false);

    const handleCloseDialog = () => {
        handleOpenFinishDialog(false);
    };

    useEffect(() => {

        const copyAndSendUUID = async (new_id: string) => {
            setSavingRoutine(true);
            navigator.clipboard.writeText(new_id);
            if (hevyRoutine !== undefined ) {
                const response = await postHevyRoutineProgram(new_id, hevyRoutine) as { status: string };
                if (response?.status !== "success") {
                    console.error("Error saving program");
                    toast.error("Error saving program");
                }
                setSavingRoutine(false);
            } else {
                setSavingRoutine(false);
            }
        };

        const handleUuid = () => {
            const new_id = uuidv4();
            if (new_id !== undefined) {
                copyAndSendUUID(new_id);
            }

        };

        handleUuid();
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

    return (
        <>
            <Dialog open={ openFinishDialog } onOpenChange={ handleCloseDialog }>
                <DialogContent className="sm:max-w-5xl max-sm:w-screen h-[95%]">
                    <DialogTitle className="font-bold flex max-sm:flex-col max-sm:text-center items-center justify-center max-sm:pb-0 pb-4 gap-2 border-b-2">
                        Congrats !!! You have created your first Program <PartyPopperIcon />
                    </DialogTitle>
                    <span className="flex flex-row justify-center items-center gap-2">
                        <Button
                            onClick={ () => setIsPreview(false) }
                            variant={ isPreview ? "ghost" : "outline" }
                            className="max-sm:w-auto w-56 h-12 uppercase"
                        >
                            View JSON
                        </Button>
                        <Button
                            onClick={ () => setIsPreview(true) }
                            variant={ isPreview ? "outline" : "ghost" }
                            className="max-sm:w-auto w-56 h-12 uppercase"
                        >
                            Preview PDF
                        </Button>
                    </span>
                    <span>
                        { isPreview ?
                            <PDFViewer className="w-full max-sm:h-[30vh] h-[60vh]">
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
                                        className="max-sm:w-auto w-56 h-12 uppercase"
                                    >
                                        <CopyIcon /> Copy JSON
                                    </Button>
                                </span>
                                <span>
                                    <Button
                                        onClick={ handleDownloadJson }
                                        variant="outline"
                                        className="max-sm:w-auto w-56 h-12 uppercase"
                                    >
                                        <DownloadIcon /> Download JSON
                                    </Button>
                                </span>
                            </div>
                        }
                        <span>
                            { savingRoutine && <span className="pr-4">Saving routine...</span> }
                            <a href="https://app.proximafitness.com/" className={`w-full  ${savingRoutine ? "pointer-events-none" : "" }`}>
                                <Button
                                    disabled={ savingRoutine }
                                    className="max-sm:w-auto w-92 h-12 uppercase bg-lightSecondary hover:text-white hover:bg-lightSecondary text-white"
                                >
                                    Save Program
                                    <LogInIcon />
                                </Button>
                            </a>
                        </span>
                    </span>
                </DialogContent>
            </Dialog>
        </>
    );;
};
