"use client";

import { Button } from "@/components/ui/button";
import { ArrowRightIcon, ShareIcon } from "lucide-react";
import { useState } from "react";
import { SaveDialog } from "./SaveDialog";
import { usePreview } from "@/contexts/PreviewContext";
import { usePathname } from "next/navigation";
import { ShareDialog } from "./ShareDialog";

export const StepButton: React.FC = () => {

    const { isPreview, setIsPreview } = usePreview();

    const path = usePathname();
    const segments = path.split("/").filter(Boolean);
    const [openSaveDialog, setOpenSaveDialog] = useState(false);
    const [openShareDialog, setOpenShareDialog] = useState(false);

    const handleOpenSaveDialog = (openSaveDialog: boolean) => {
        setOpenSaveDialog(openSaveDialog);
    };
    const handleOpenShareDialog = (openShareDialog: boolean) => {
        setOpenShareDialog(openShareDialog);
    };

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
                onClick={ () => setIsPreview(true) }
            >
                Review Program
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

                <Button
                    onClick={ () => handleOpenSaveDialog(true) }
                    variant="default"
                    className="text-white bg-lightSecondary hover:bg-black"
                >
                    Save
                    <ArrowRightIcon />
                </Button>
                { openSaveDialog &&
                    <SaveDialog
                        handleOpenSaveDialog={ handleOpenSaveDialog }
                        openSaveDialog={ openSaveDialog }
                    />
                }
                { openShareDialog &&
                    <ShareDialog
                        handleOpenShareDialog={ handleOpenShareDialog }
                        openShareDialog={ openShareDialog }
                    />
                }
            </div>

        );

    }
};
