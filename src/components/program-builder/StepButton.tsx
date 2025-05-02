"use client";

import { Button } from "@/components/ui/button";
import { ArrowRightIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SaveDialog } from "./SaveDialog";
import { usePreview } from "@/contexts/PreviewContext";

export const StepButton: React.FC = () => {

    const { isPreview, setIsPreview } = usePreview();

    const path = usePathname();
    const segments = path.split("/").filter(Boolean);

    const [openSaveDialog, setOpenSaveDialog] = useState(false);

    const handleOpenSaveDialog = (openSaveDialog: boolean) => {
        setOpenSaveDialog(openSaveDialog);
    };

    const isProgramBuilder = segments.includes("program-builder");


    if (isProgramBuilder && !isPreview) {
        return (
            <Button
                variant="default"
                className="text-white bg-lightSecondary hover:bg-lightSecondary"
                onClick={ () => setIsPreview(true) }
            >
                Review Program
                <ArrowRightIcon />
            </Button>
        );

    } else if (isProgramBuilder  && isPreview) {
        return (
            <>
                <Button
                    onClick={ () => setOpenSaveDialog(true) }
                    variant="default"
                    className="text-white bg-lightSecondary hover:bg-lightSecondary"
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
            </>

        );

    } else {
        return (
            <Button
                disabled
                variant="ghost"
                className="w-80"
            >
        </Button>
        )
    }
};
