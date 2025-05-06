"use client";

import { useIsHevy } from "@/contexts/HevyContext";
import { Redo2Icon, StepForwardIcon } from "lucide-react";
import Link from "next/link";
import { quotes } from "public";
import { useEffect, useState } from "react";

export const RecentProgramsGrid: React.FC = () => {

    const { isHevy } = useIsHevy();
    const [prompt, setPrompt] = useState<string>("");
    const [hevyRoutine, setHevyRoutine] = useState<THevyRoutine[]>();
    const [program, setProgram] = useState<TProgramCreatorDay[][]>();

    useEffect(() => {
        if (typeof window !== "undefined") {
            const localStorageProgram = localStorage.getItem(isHevy ? "hevy-program-in-progress" : "program-in-progress");
            const localStoragePrompt = localStorage.getItem("prompt");
            if (localStoragePrompt) {
                setPrompt(localStoragePrompt);
            }
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
        <div className="flex flex-col gap-2 bg-gray-100">
            <span className="text-2xl px-8 pt-8 flex flex-row items-center justify-center gap-2">
                <StepForwardIcon />
                Resume Building Program
            </span>
            <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-1 py-8 px-8">
                { hevyRoutine &&
                    <div key={ hevyRoutine[0].id } className="relative group bg-white h-[200px] rounded-lg shadow-lg">
                    <div className="absolute inset-0 transition duration-300 group-hover:blur-sm z-0">
                        <img
                            src={quotes.src}
                            alt="Program Thumbnail"
                            className="p-4 object-contain"
                        />
                        <div className="p-4 space-y-2">
                            <div className="font-third text-sm overflow-hidden text-ellipsis line-clamp-5">
                                { prompt.length === 2 ? "No prompt provided" : prompt }
                            </div>
                        </div>
                    </div>

                    <div className="absolute inset-0 rounded-lg bg-black bg-opacity-40 backdrop-blur-sm flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                        <Link
                            href={ `/program-builder/build-program?resume=true` }
                            target="_self"
                            rel="noopener noreferrer"
                            className="w-[50%]"
                        >
                            <button className="my-2 py-2 w-full bg-white text-black hover:bg-black hover:text-white rounded-lg shadow flex flex-row items-center justify-center gap-2"><Redo2Icon />Resume</button>
                        </Link>
                    </div>
                </div>
                }
                { program &&
                    <div key={ program[0][0].id } className="relative group bg-lightGray h-[200px] rounded-lg shadow-lg">
                        <div className="absolute inset-0 transition duration-300 group-hover:blur-sm z-0">
                            <img
                                src={quotes.src}
                                alt="Program Thumbnail"
                                className="p-4 object-contain"
                            />
                            <div className="p-4 space-y-2">
                                <div className="font-third text-sm overflow-hidden text-ellipsis line-clamp-5">
                                        {/* {program[0][0].prompt ? program[0][0].prompt : program[0][0].id} */}
                                </div>
                            </div>
                        </div>

                        <div className="absolute inset-0 rounded-lg bg-black bg-opacity-40 backdrop-blur-sm flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                            <button className="my-2 py-2 w-[50%] bg-white text-black hover:bg-black hover:text-white rounded-lg shadow flex flex-row items-center justify-center gap-2"><Redo2Icon/>Resume</button>
                        </div>
                    </div>
                }

            </div>
        </div>
    );
};
