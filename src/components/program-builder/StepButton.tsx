"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { FinishDialog } from "./FinishDialog";

export const StepButton: React.FC = () => {


    const path = usePathname();
    const segments = path.split("/").filter(Boolean);

    const [openFinishDialog, setOpenFinishDialog] = useState(false);

    const handleOpenFinishDialog = (openFinishDialog: boolean) => {
        setOpenFinishDialog(openFinishDialog);
    };

    const isProgramBuilder = segments.includes("program-builder");
    const isBuildProgram = segments.includes("build-program");
    const isReviewProgram = segments.includes("review-program");

    if (isProgramBuilder && !isBuildProgram && !isReviewProgram) {
        return (
            <div></div>
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
                    onClick={ () => setOpenFinishDialog(true) }
                    variant="default"
                    className="text-white bg-lightSecondary hover:bg-lightSecondary"
                >
                    Finish
                    <ArrowRightIcon />
                </Button>
                <FinishDialog
                    handleOpenFinishDialog={ handleOpenFinishDialog }
                    openFinishDialog={ openFinishDialog }
                />
            </>

        );

    }
};
