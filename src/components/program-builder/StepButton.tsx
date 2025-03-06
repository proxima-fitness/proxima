"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon } from "lucide-react";
import { usePathname } from "next/navigation";

export const StepButton: React.FC = () => {


    const path = usePathname();
    const segments = path.split("/").filter(Boolean);

    const isProgramBuilder = segments.includes("program-builder");
    const isBuildProgram = segments.includes("build-program");
    const isReviewProgram = segments.includes("review-program");
    console.log(isProgramBuilder, isBuildProgram, isReviewProgram);

    if (isProgramBuilder && !isBuildProgram && !isReviewProgram) {
        return (
            <div></div>
        )
    } else if (isProgramBuilder && isBuildProgram && !isReviewProgram) {
        return (
            <Link
                href={ `/program-builder/build-program/review-program`}
                className="w-[33%] flex items-center justify-end"
            >
                <Button
                    variant="ghost"
                    className="text-black"
                >
                    Review Program
                    <ArrowRightIcon />
                </Button>
            </Link>
        )

    } else if (isProgramBuilder && isBuildProgram && isReviewProgram) {
        return (
            <Button
                variant="ghost"
                className="text-black"
            >
                Finish
                <ArrowRightIcon />
            </Button>
        )

    }
};
