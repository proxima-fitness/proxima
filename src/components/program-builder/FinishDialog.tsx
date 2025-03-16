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
import { deFlattenHevyRoutine, programCreatorDayToScheduleWorkouts, removeOrderHevy } from "@/utils/helpers";
import { useIsHevy } from "@/contexts/HevyContext";
import { HevyPdfRenderer } from "./hevy/HevyPdfRenderer";
import { v4 as uuidv4 } from 'uuid';

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
        const [uuid, setUuid] = useState<string | null>(null);

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

    const copyAndSendUUID = (uuid: string) => {
        navigator.clipboard.writeText(JSON.stringify(uuid));
        // TODO: Send UUID to server (jack)
        return true;
    };
    const ogDialog = () => {
        return (
            <DialogContent hideClose className="max-w-5xl h-[95%]">
                <DialogTitle className="font-bold flex items-center justify-center pb-4 gap-2 border-b-2">
                    Congrats !!! You have created your first Program <PartyPopperIcon />
                </DialogTitle>
                <span className="flex flex-row justify-center items-center gap-2">
                    <Button
                    onClick={ () => setIsPreview(false) }
                    variant={ isPreview ? "ghost" : "outline" }
                    className="w-56 h-10 uppercase"
                >
                        View JSON
                    </Button>
                    <Button
                    onClick={ () => setIsPreview(true) }
                    variant={ isPreview ? "outline" : "ghost" }
                    className="w-56 h-10 uppercase"
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
                        <Textarea className="h-[50vh]" readOnly aria-readonly value={ (isHevy && hevyRoutine) ? JSON.stringify(removeOrderHevy(hevyRoutine), null, 4) : program && JSON.stringify(program, null, 4) } />
                    }
                </span>
                <span className="w-full flex flex-row items-center justify-between">
                    { isPreview ?
                        <div>
                        </div>
                    :
                        <div className="flex flex-row items-center justify-center gap-2">
                            <span>
                                <Button
                                    onClick={ handleCopyJson }
                                    variant="outline"
                                    className="w-56 h-10 uppercase"
                                >
                                    <CopyIcon /> Copy JSON
                                </Button>
                            </span>
                            <span>
                                <Button
                                    onClick={ handleDownloadJson }
                                    variant="outline"
                                    className="w-56 h-10 uppercase"
                                >
                                    <DownloadIcon /> Download JSON
                                </Button>
                            </span>
                        </div>
                    }
                    <span>
                        <Button
                            onClick={ () => (setUuid(uuidv4())) }
                            className="w-56 h-10 uppercase bg-lightSecondary hover:text-white hover:bg-lightSecondary text-white"
                        >
                            Save Program
                            <LogInIcon />
                        </Button>
                    </span>
                </span>
            </DialogContent>
);
    };
    return (
        <>
            <Dialog open={ openFinishDialog } onOpenChange={ () => handleOpenFinishDialog(false) } >
                {(uuid) ? copyAndSendUUID(uuid) && (<DialogContent> <span className="items-center justify-center">Your Program ID is {uuid}</span><span className="items-center justify-center">it has been coppied to your clipboard </span> </DialogContent>) : ogDialog()}
            </Dialog>
        </>
    );;
};
