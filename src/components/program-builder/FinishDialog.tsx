import {
    Dialog,
    DialogContent,
    DialogTitle,
  } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea"
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {  CopyIcon, DownloadIcon, FileDownIcon, LogInIcon, PartyPopperIcon } from "lucide-react";
import { toast } from "sonner";
import { PDFViewer } from '@react-pdf/renderer';
import { PdfRenderer } from "../generic/PdfRenderer";
import { programCreatorDayToScheduleWorkouts } from "@/utils/helpers";

interface IProps {
    openFinishDialog: boolean;
    handleOpenFinishDialog: (openFinishDialog: boolean) => void;
}

export const FinishDialog: React.FC<IProps> = (props) => {

    const {
        openFinishDialog,
        handleOpenFinishDialog,
    } = props;

        const [program, setProgram] = useState<TProgramCreatorDay[][]>();
        const [isPreview, setIsPreview] = useState(false);

        useEffect(() => {
            if (typeof window !== undefined) {
                const localStorageProgram = localStorage.getItem("program-in-progress");
                if (localStorageProgram) {
                    setProgram(JSON.parse(localStorageProgram));
                }
            }
        }, []);

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

    return (
        <Dialog open={ openFinishDialog } onOpenChange={ () => handleOpenFinishDialog(false)} >
            <DialogContent hideClose className="max-w-5xl">
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
                        <PDFViewer className="w-full h-[50vh]">
                            <PdfRenderer program={ programCreatorDayToScheduleWorkouts(program) } />
                        </PDFViewer>
                        :
                        <Textarea className="h-[50vh]" readOnly aria-readonly value={ JSON.stringify(program, null, 4) } />
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
                            className="w-56 h-10 uppercase bg-lightSecondary hover:text-white hover:bg-lightSecondary text-white"
                        >
                            Save Program
                            <LogInIcon />
                        </Button>
                    </span>
                </span>
            </DialogContent>
        </Dialog>
    );
};
