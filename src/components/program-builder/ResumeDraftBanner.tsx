/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useIsHevy } from "@/contexts/HevyContext";
import { Redo2Icon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export const ResumeDraftBanner: React.FC = () => {


    const { isHevy } = useIsHevy();
    const [hevyRoutine, setHevyRoutine] = useState<THevyRoutine[]>();
    const [program, setProgram] = useState<TProgramCreatorDay[][]>();

    useEffect(() => {
        if (typeof window !== "undefined") {
            const localStorageProgram = localStorage.getItem(isHevy ? "hevy-program-in-progress" : "program-in-progress");
            if (localStorageProgram) {
                if (isHevy) {
                    setHevyRoutine(JSON.parse(localStorageProgram));
                } else {
                    setProgram(JSON.parse(localStorageProgram));
                }
            }
        }
    }, [isHevy]);

    if (!hevyRoutine && !program) {
        return (
            <></>
        )
    }

    return (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full max-w-3xl mx-4 sm:mx-auto px-6 sm:px-8 py-3 rounded-xl bg-black/10 dark:bg-white/10">
            <span className="text-sm sm:text-base font-medium text-black dark:text-white text-center sm:text-left">
                You have a program in progress. Pick up where you left off.
            </span>
            <Link
                href={"/build-program?resume=true&edit=true"}
                target="_self"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-lightSecondary text-white font-medium hover:bg-black hover:text-white transition-colors shadow shrink-0 min-h-[44px] min-w-[44px] sm:min-w-0 sm:min-h-0"
            >
                <Redo2Icon className="size-4" />
                Resume program
            </Link>
        </div>
    )
};
