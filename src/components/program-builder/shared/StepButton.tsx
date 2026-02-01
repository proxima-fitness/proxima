"use client";

import { Button } from "@/components/ui/button";
import { ArrowRightIcon, Download } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { ExportDialog } from "./ExportDialog";
import { useUserContext } from "@/contexts/UserContext";
// import { ShareDialog } from "./ShareDialog";

const BUILD_PROGRAM_PATH = "/build-program";
const LOGIN_WITH_NEXT = `/auth/login?next=${encodeURIComponent(BUILD_PROGRAM_PATH)}`;

export const StepButton: React.FC = () => {

    const { user, isLoading } = useUserContext();
    const [openExportDialog, setOpenExportDialog] = useState(false);

    // const { isPreview, setIsPreview } = usePreview();
    // const { isHevy } = useIsHevy();
    // const searchParams = useSearchParams();
    // const shareId = searchParams.get('shareId') ?? '';

    // const [openShareDialog, setOpenShareDialog] = useState(false);

    // const [savingRoutine, setSavingRoutine] = useState(false);
    // const [programId, setProgramId] = useState("");

    // const handleOpenShareDialog = (openShareDialog: boolean) => {
    //     setOpenShareDialog(openShareDialog);
    // };

    // const saveProgram = async () => {
    //     setIsPreview(true);
    //     if (typeof window !== "undefined") {
    //         const localStorageProgram = localStorage.getItem(isHevy ? "hevy-program-in-progress" : "program-in-progress");
    //         const localStoragePrompt = localStorage.getItem("prompt");
    //         const localStorageRequest = localStorage.getItem( isHevy ? "hevy-request" : "request");

    //         let parsedProgram: THevyRoutine[] | TProgramCreatorDay[][] | undefined;


    //         if (localStorageProgram) {
    //             if (isHevy) {
    //                 parsedProgram = JSON.parse(localStorageProgram) as THevyRoutine[];
    //             } else {
    //                 parsedProgram = JSON.parse(localStorageProgram) as TProgramCreatorDay[][];
    //             }
    //         }
    //         let parsedRequest: TTextToJsonRequest | undefined;
    //         if (localStorageRequest) {
    //             parsedRequest = JSON.parse(localStorageRequest);
    //         }

    //         if (parsedProgram !== undefined && parsedRequest !== undefined && isHevy) {
    //             const new_id = uuidv4();
    //             if (new_id !== undefined) {
    //                 setProgramId(new_id);
    //                 setSavingRoutine(true);
    //                 await createProgram(new_id, parsedProgram as THevyRoutine[], localStoragePrompt ?? "", parsedRequest);
    //                 setSavingRoutine(false);
    //             }
    //         }
    //     }
    // }

    if (isLoading) {
        return (
            <Button
                variant="default"
                className="text-white bg-lightSecondary hover:bg-black"
                disabled
            >
                <span className="hidden sm:inline">Loading...</span>
                <ArrowRightIcon />
            </Button>
        );
    }

    if (!user) {
        return (
            <Link href={LOGIN_WITH_NEXT}>
                <Button
                    variant="default"
                    className="text-white bg-lightSecondary hover:bg-black"
                >
                    <span className="hidden sm:inline">Sign in to save</span>
                    <span className="sm:hidden">Sign in</span>
                    <ArrowRightIcon />
                </Button>
            </Link>
        );
    }

    return (
        <>
            <Button
                variant="default"
                className="text-white bg-lightSecondary hover:bg-black"
                onClick={() => setOpenExportDialog(true)}
            >
                <span className="hidden sm:inline">Export</span>
                <span className="sm:hidden">Export</span>
                <Download />
            </Button>
            <ExportDialog
                open={openExportDialog}
                onOpenChange={setOpenExportDialog}
                programId={0}
            />
            {/* ShareDialog (commented out)
            { openShareDialog &&
                <ShareDialog
                    handleOpenShareDialog={ handleOpenShareDialog }
                    openShareDialog={ openShareDialog }
                    programId={ programId }
                />
            }
            */}
        </>
    );
};
