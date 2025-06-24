"use client";
import { useCommunityAiPrograms } from "@/api/hooks";
import { EditIcon, EyeIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { quotes } from "public";


export const AiProgramGrid: React.FC = () => {

    const { data: programs } = useCommunityAiPrograms();

    return (
        <>
        { programs &&
            <div className="flex flex-col gap-2 bg-lightGray sm:mx-12">
                <span className="text-2xl font-bold px-8 pt-8 flex flex-row items-center justify-start gap-2">
                    <UsersIcon />
                    From the Community
                    </span>
                <span className="text-xs text-start px-8 pt-4">All programs shown in the community are voluntarily shared by users. The platform does not display any content without user consent.</span>
                <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-1 py-8 px-8">
                    { programs?.map((program) => (
                            <div key={ program.id } className="relative group bg-white h-[200px] rounded-lg shadow-lg">
                                <div className="absolute inset-0 transition duration-300 group-hover:blur-sm z-0">
                                    <img
                                        src={quotes.src}
                                        alt="Program Thumbnail"
                                        className="p-4 object-contain"
                                    />
                                    <div className="p-4 space-y-2">
                                        <div className="font-third text-sm overflow-hidden text-ellipsis line-clamp-5">
                                            {program.prompt ? program.prompt : program.id}
                                        </div>
                                    </div>
                                </div>

                                <div className="absolute inset-0 rounded-lg bg-black bg-opacity-40 backdrop-blur-sm flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                                    <Link
                                        href={ `/program-builder/build-program?shareId=${program.id}&edit=true` }
                                        rel="noopener noreferrer"
                                        className="w-[50%]"
                                        target="_self"
                                    >
                                        <button className="my-2 py-2 w-full hover:bg-black hover:text-white bg-white text-black rounded-lg shadow flex flex-row items-center justify-center gap-2"><EditIcon />Edit</button>
                                    </Link>
                                    <Link
                                        href={ `/program-builder/build-program?shareId=${program.id}` }
                                        rel="noopener noreferrer"
                                        className="w-[50%]"
                                        target="_self"
                                    >
                                        <button className="my-2 py-2 w-full hover:bg-black hover:text-white bg-lightSecondary text-white rounded-lg shadow flex flex-row items-center justify-center gap-2"><EyeIcon />View</button>
                                    </Link>
                                </div>
                            </div>
                    ))}
                </div>
        </div>
        }
        </>
    );
};
