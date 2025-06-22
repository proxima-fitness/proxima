"use client";

import { useHevyPrograms, useHevySecret } from "@/api/hooks";
import { useUserContext } from "@/contexts/UserContext";
import { NotepadTextIcon, EditIcon, EyeIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { quotes } from "public";

export const HevyProgramsGrid: React.FC = () => {

    const { user } = useUserContext();
    const { data: hevyApiKey } = useHevySecret(user);
    const { data: hevyPrograms } = useHevyPrograms(user, hevyApiKey);
    const router = useRouter();

    const handleEditProgram = (program: { program_title: string, program: THevyRoutine[] }, edit: boolean) => {
        // Store the Hevy program data in localStorage
        for (const routine of program.program) {
            routine.folder_id = 0;
        }
        localStorage.setItem('hevy-program-in-progress', JSON.stringify(program.program));
        // Set the Hevy context to true        // Navigate to the program builder
        router.push(`/program-builder/build-program?edit=${String(edit)}&resume=true`);
    };

    // useEffect(() => {
    //     if (typeof window !== "undefined") {
    //         const localStorageProgram = localStorage.getItem(isHevy ? "hevy-program-in-progress" : "program-in-progress");
    //         if (localStorageProgram) {
    //             if (isHevy) {
    //                 setHevyRoutine(JSON.parse(localStorageProgram));
    //             } else {
    //                 setProgram(JSON.parse(localStorageProgram));
    //             }
    //         }
    //     }
    // }, [isHevy]);

    if (!hevyPrograms) {
        return (
            <></>
        )
    }

    return (
        <div className="flex flex-col gap-2 bg-gray-600 text-white">
            <span className="text-2xl px-8 pt-8 flex flex-row items-center justify-center gap-2">
                <NotepadTextIcon />
                My Hevy Programs
            </span>
            <span className="text-xs text-center pt-4">These are your programs from Hevy. Click on a program to fork your program with AI.</span>
            <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-1 py-8 px-8">
                { hevyPrograms && hevyPrograms.map((program, index) => (
                    <div key={ index } className="relative group bg-white text-black h-[200px] rounded-lg shadow-lg">
                    <div className="absolute inset-0 transition duration-300 group-hover:blur-sm z-0">
                        <div className="flex flex-row items-center justify-start gap-2 font-main text-sm">
                            <img
                                src={quotes.src}
                                alt="Program Thumbnail"
                                className="p-4 object-contain"
                            />
                            { program?.program_title || "No title" }
                        </div>
                        <div className="p-4 space-y-2">
                            <div className="font-third text-sm overflow-hidden text-ellipsis line-clamp-5">
                                { program?.program.map((routine) => (
                                    <div key={ routine.id }>
                                        { routine.title }
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="absolute inset-0 rounded-lg bg-black bg-opacity-40 backdrop-blur-sm flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                        <button
                            className="my-2 py-2 w-[50%] bg-white text-black hover:bg-black hover:text-white rounded-lg shadow flex flex-row items-center justify-center gap-2"
                            onClick={() => handleEditProgram(program, true)}
                        >
                            <EditIcon />Edit
                        </button>
                        <button
                            className="my-2 py-2 w-[50%] bg-lightSecondary text-white hover:bg-black hover:text-white rounded-lg shadow flex flex-row items-center justify-center gap-2"
                            onClick={() => handleEditProgram(program, false)}
                        >
                            <EyeIcon />View
                        </button>
                    </div>
                </div>
            ))}
            </div>
        </div>
    );
};
