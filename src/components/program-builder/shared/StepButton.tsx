/**
 * @module StepButton
 * CTA for program builder: "Sign in to save" when anonymous, "Export" when logged in; opens ExportDialog.
 * Depends on: ExportDialog, useUserContext. Used by: build-program toolbar / steps.
 */
"use client";

import { Button } from "@/components/ui/button";
import { ArrowRightIcon, ArrowRightToLineIcon } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { ExportDialog } from "./ExportDialog";
import { useUserContext } from "@/contexts/UserContext";
import posthog from "posthog-js";
// import { ShareDialog } from "./ShareDialog";

const BUILD_PROGRAM_PATH = "/build-program?resume=true&edit=true";
const LOGIN_WITH_NEXT = `/auth/login?next=${encodeURIComponent(BUILD_PROGRAM_PATH)}`;

/** Shows Loading, Sign in link, or Export button; Export opens ExportDialog. */
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
                className="text-white bg-lightSecondary hover:bg-lightSecondary/80"
                onClick={() => {
                posthog.capture("opened_export_dialog", { user: user?.id ?? "user_id_unknown" });
                setOpenExportDialog(true);
            }}
            >
                <span className="hidden sm:inline">Export</span>
                <span className="sm:hidden">Export</span>
                <ArrowRightToLineIcon />
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
