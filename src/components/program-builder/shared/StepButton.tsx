"use client";

import { Button } from "@/components/ui/button";
import { ArrowRightIcon, ShareIcon } from "lucide-react";
import { useState } from "react";
import { usePreview } from "@/contexts/PreviewContext";
import { usePathname, useSearchParams } from "next/navigation";
import { ShareDialog } from "./ShareDialog";
import { useIsHevy } from "@/contexts/HevyContext";
import { v4 as uuidv4 } from "uuid";
import { createProgram } from "@/app/api/programs/programs";

export const StepButton: React.FC = () => {

    const { isPreview, setIsPreview } = usePreview();
    const { isHevy } = useIsHevy();
    const path = usePathname();
    const searchParams = useSearchParams();
    const shareId = searchParams.get('shareId') ?? '';

    const segments = path.split("/").filter(Boolean);
    const [openShareDialog, setOpenShareDialog] = useState(false);

    const [savingRoutine, setSavingRoutine] = useState(false);
    const [programId, setProgramId] = useState("");

    const handleOpenShareDialog = (openShareDialog: boolean) => {
        setOpenShareDialog(openShareDialog);
    };

    const saveProgram = async () => {
        setIsPreview(true);
        if (typeof window !== "undefined") {
            const localStorageProgram = localStorage.getItem(isHevy ? "hevy-program-in-progress" : "program-in-progress");
            const localStoragePrompt = localStorage.getItem("prompt");
            const localStorageRequest = localStorage.getItem( isHevy ? "hevy-request" : "request");

            let parsedProgram: THevyRoutine[] | TProgramCreatorDay[][] | undefined;


            if (localStorageProgram) {
                if (isHevy) {
                    parsedProgram = JSON.parse(localStorageProgram) as THevyRoutine[];
                } else {
                    parsedProgram = JSON.parse(localStorageProgram) as TProgramCreatorDay[][];
                }
            }
            let parsedRequest: TTextToJsonRequest | undefined;
            if (localStorageRequest) {
                parsedRequest = JSON.parse(localStorageRequest);
            }

            if (parsedProgram !== undefined && parsedRequest !== undefined && isHevy) {
                const new_id = uuidv4();
                if (new_id !== undefined) {
                    setProgramId(new_id);
                    setSavingRoutine(true);
                    await createProgram(new_id, parsedProgram as THevyRoutine[], localStoragePrompt ?? "", parsedRequest);
                    setSavingRoutine(false);
                }
            }
        }
    }


    if (segments.length === 1) {
        return (
            <Button
                disabled
                variant="ghost"
                className="w-80"
            />
        )
    }

    if (!isPreview) {
        return (
            <Button
                variant="default"
                className="text-white bg-lightSecondary hover:bg-black"
                onClick={ saveProgram }
            >
                Finish and Review
                <ArrowRightIcon />
            </Button>
        );
    } else if (isPreview ) {
        return (
            <div className="flex flex-row gap-2">
                <Button
                    onClick={ () => handleOpenShareDialog(true) }
                    variant="default"
                    className="text-white bg-gray-400 hover:bg-black"
                >
                    Share
                    <ShareIcon />
                </Button>

                <a href={ `https://app.proximafitness.com?program_id=${programId.length > 0 ? programId : shareId}` } className="w-full">
                    <Button
                        variant="default"
                        className="text-white bg-lightSecondary hover:bg-black"
                    >
                        { !savingRoutine ?
                            <>
                                <span className="hidden sm:inline">Sign in to save</span>
                                <span className="sm:hidden">Save</span>
                            </>
                        :
                            <span className="">Saving...</span>
                        }
                        <ArrowRightIcon />
                    </Button>
                </a>
                { openShareDialog &&
                    <ShareDialog
                        handleOpenShareDialog={ handleOpenShareDialog }
                        openShareDialog={ openShareDialog }
                        programId={ programId }
                    />
                }
            </div>

        );

    }
};
