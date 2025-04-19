"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SaveDialog } from "./SaveDialog";

export const StepButton: React.FC = () => {


    const path = usePathname();
    const segments = path.split("/").filter(Boolean);

    const [openSaveDialog, setOpenSaveDialog] = useState(false);

    const handleOpenSaveDialog = (openSaveDialog: boolean) => {
        setOpenSaveDialog(openSaveDialog);
    };

    const isProgramBuilder = segments.includes("program-builder");
    const isBuildProgram = segments.includes("build-program");
    const isReviewProgram = segments.includes("review-program");

    if (isProgramBuilder && !isBuildProgram && !isReviewProgram) {
        return (
            <Button
                disabled
                variant="ghost"
                className="w-80"
            >
        </Button>

        );
    } else if (isProgramBuilder && isBuildProgram && !isReviewProgram) {
        return (
            <Link
                href={ `/program-builder/build-program/review-program` }
                className="w-[33%] flex items-center justify-end"
            >
                <Button
                    variant="default"
                    className="text-white bg-lightSecondary hover:bg-lightSecondary"
                >
                    Review Program
                    <ArrowRightIcon />
                </Button>
            </Link>
        );

    } else if (isProgramBuilder && isBuildProgram && isReviewProgram) {
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

    }
};
