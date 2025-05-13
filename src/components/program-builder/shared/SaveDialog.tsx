import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {   PartyPopperIcon } from "lucide-react";
// import { PDFViewer } from '@react-pdf/renderer';
// import { useIsHevy } from "@/contexts/HevyContext";
// import { v4 as uuidv4 } from "uuid";
// import { deFlattenHevyRoutine, programCreatorDayToScheduleWorkouts, removeOrderHevy } from "../utils";
// import { postAIProgram } from "@/app/(app)/actions";
// import { HevyPdfRenderer } from "../hevy/HevyPdfRenderer";
// import { PdfRenderer } from "../proxima/PdfRenderer";

interface IProps {
    openSaveDialog: boolean;
    handleOpenSaveDialog: (openSaveDialog: boolean) => void;
}

export const SaveDialog: React.FC<IProps> = (props) => {

    const {
        openSaveDialog,
        handleOpenSaveDialog,
    } = props;

    const [isPreview, setIsPreview] = useState(true);

    const handleCloseDialog = () => {
        handleOpenSaveDialog(false);
    };


    // const handleCopyJson = () => {
    //     try {
    //         navigator.clipboard.writeText(JSON.stringify(program));
    //     } catch (error: unknown) {
    //         console.error("Error copying to clipboard",error);
    //         toast.error("Error copying to clipboard");
    //     }
    //     toast.success("Copied to clipboard");
    // };

    // const handleDownloadJson = () => {
    //     const dataStr = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(program));
    //     const download = document.createElement("a");
    //     download.setAttribute("href", dataStr);
    //     download.setAttribute("download", "program" + ".json");
    //     document.body.appendChild(download);
    //     download.click();
    //     download.remove();
    // };

    // if (!program && !hevyRoutine) {
    //     return <div></div>;
    // }

    return (
        <>
            <Dialog open={ openSaveDialog } onOpenChange={ handleCloseDialog }>
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
                            className="max-sm:w-auto max-sm:hidden w-56 h-12 uppercase"
                        >
                            Preview PDF
                        </Button>
                    </span>
                    <span>
                        {/* { isPreview ?
                            <PDFViewer className="max-sm:hidden w-full max-sm:h-[30vh] h-[60vh]">
                                { (isHevy && hevyRoutine) ?
                                    <HevyPdfRenderer hevyRoutine={ deFlattenHevyRoutine(hevyRoutine) } />
                                : program &&
                                    <PdfRenderer program={ programCreatorDayToScheduleWorkouts(program) } />
                                }
                            </PDFViewer>
                            :
                            <Textarea className="max-sm:h-[30vh] h-[50vh]" readOnly aria-readonly value={ (isHevy && hevyRoutine) ? JSON.stringify(removeOrderHevy(hevyRoutine), null, 4) : program && JSON.stringify(program, null, 4) } />
                        } */}
                    </span>
                    <span className="w-full flex flex-row max-sm:flex-col items-center justify-between max-sm:justify-center gap-4">
                        {/* { isPreview ?
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
                        } */}
                        <span>
                            {/* { savingRoutine && <span className="pr-4"></span> }
                            <a href={ `https://app.proximafitness.com?program_id=${programId}` } className="w-full">
                                <Button
                                    disabled={ savingRoutine }
                                    className="max-sm:text-2xl max-sm:w-[30vh] max-sm:h-24 sm:w-92 h-12 uppercase bg-lightSecondary hover:text-white hover:bg-lightSecondary text-white"
                                >
                                    { savingRoutine ? "Saving routine..." :
                                        <div className="flex flex-row gap-4">
                                            Save Program
                                            <LogInIcon />
                                        </div>
                                    }

                                </Button>
                            </a> */ }
                        </span>
                    </span>
                </DialogContent>
            </Dialog>
        </>
    );;
};
