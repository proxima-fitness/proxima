import {
    Dialog,
    DialogContent,
    DialogTitle,
  } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea"
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon, CopyIcon, DownloadIcon, FileDownIcon, PartyPopperIcon, SaveIcon } from "lucide-react";
import { toast } from "sonner";

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

        useEffect(() => {
            if (typeof window !== undefined) {
                const localStorageProgram = localStorage.getItem("program-in-progress");
                if (localStorageProgram) {
                    setProgram(JSON.parse(localStorageProgram));
                }
            }
        }, []);

        console.log(program);


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
                    <span>
                        <Textarea className="h-96" readOnly aria-readonly value={ JSON.stringify(program, null, 4) } />
                    </span>
                    <span className="w-full flex flex-row items-center justify-between">
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
                        <span>
                            <Button
                                variant="outline"
                                className="w-56 h-10 uppercase"
                            >
                                <FileDownIcon /> Download PDF
                            </Button>
                        </span>
                        <span>
                            <Button
                                className="w-56 h-10 uppercase bg-lightSecondary hover:text-white hover:bg-lightSecondary text-white"
                            >
                                Save Program
                                <ArrowRightIcon />
                            </Button>
                        </span>
                    </span>
            </DialogContent>
        </Dialog>
    );
};
