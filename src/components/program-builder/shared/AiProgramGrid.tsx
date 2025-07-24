"use client";

import { ArrowDownIcon, EditIcon, EyeIcon, SplitIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { quotes } from "public";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfilePictureByID, useUserFullName, useCommunityAiProgramsPaginated } from "@/api/hooks";
import { memo, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { lightColours } from "@/assets/constants";

const ProgramItem: React.FC<{ item: TProgram }> = memo(({ item }) => {

    const randomColour = useMemo(() => {
        return lightColours[Math.floor(Math.random() * lightColours.length)];
    }, []);


    const { data: profilePic } = useProfilePictureByID(item.user_id);
    const { data: fullName } = useUserFullName(item.user_id, "user");

    // Get the first letter of the user's name for the avatar fallback
    const getInitial = () => {
        if (!fullName || fullName === "Anonymous") return "AN";
        const nameParts = fullName.split(' ');
        if (nameParts.length >= 2) {
            return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
        }
        return fullName.charAt(0).toUpperCase();
    };

    // Get the profile picture URL
    const getProfilePicUrl = () => {
        if (profilePic instanceof Blob) {
            return URL.createObjectURL(profilePic);
        }
        return "";
    };

    return (
        <div className="flex flex-col gap-4">
            <div  className="relative group bg-white dark:bg-darkGray h-[200px] rounded-lg shadow-lg">
                <div className="absolute inset-0 transition duration-300 group-hover:blur-sm z-0">
                    <img
                        src={quotes.src}
                        alt="Program Thumbnail"
                        className="p-4 object-contain"
                    />
                    <div className="p-4 space-y-2">
                        <div className="font-third text-sm overflow-hidden text-ellipsis line-clamp-5">
                            {item.prompt ? item.prompt : item.id}
                        </div>
                    </div>
                </div>

                <div className="absolute inset-0 rounded-lg bg-black bg-opacity-40 backdrop-blur-sm flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                    <Link
                        href={ `/build-program?shareId=${item.id}&edit=true` }
                        rel="noopener noreferrer"
                        className="w-[50%]"
                        target="_self"
                    >
                        <button className="my-2 py-2 w-full hover:bg-black hover:text-white bg-white text-black rounded-lg shadow flex flex-row items-center justify-center gap-2"><EditIcon />Edit</button>
                    </Link>
                    <Link
                        href={ `/build-program?shareId=${item.id}` }
                        rel="noopener noreferrer"
                        className="w-[50%]"
                        target="_self"
                    >
                        <button className="my-2 py-2 w-full hover:bg-black hover:text-white bg-lightSecondary text-white rounded-lg shadow flex flex-row items-center justify-center gap-2"><EyeIcon />View</button>
                    </Link>
                </div>

            </div>
            <div className="flex flex-row items-center justify-start gap-2">
            <Avatar className="w-10 h-10" >
                <AvatarImage src={getProfilePicUrl()} />
                <AvatarFallback className="bg-white" style={{ backgroundColor: randomColour }}>
                    {getInitial()}
                </AvatarFallback>
            </Avatar>
            <SplitIcon className="w-4 h-4" />
            <span className="text-sm">{item.saves + 1} {(item.saves + 1) === 1 ? "Remix" : "Remixes"}</span>
            </div>
        </div>
    );
});

// Add display name for debugging
ProgramItem.displayName = "ProgramItem";

export const AiProgramGrid: React.FC = () => {
    const [offset, setOffset] = useState(0);
    const [allPrograms, setAllPrograms] = useState<TProgram[]>([]);
    const pageSize = 20;

    const { data: programs, isLoading } = useCommunityAiProgramsPaginated(pageSize, offset);

    // Update all programs when new data is fetched
    useMemo(() => {
        if (programs && programs.length > 0) {
            if (offset === 0) {
                // First page, replace all programs
                setAllPrograms(programs);
            } else {
                // Subsequent pages, append to existing programs
                setAllPrograms(prev => [...prev, ...programs]);
            }
        }
    }, [programs, offset]);

    const handleSeeMore = () => {
        setOffset(prev => prev + pageSize);
    };


    return (
        <>
            <div className="flex flex-col gap-2 bg-lightGray dark:bg-extraDarkGray sm:mx-12">
                <span className="text-2xl font-bold px-8 pt-8 flex flex-row items-center justify-start gap-2">
                    <UsersIcon />
                    From the Community
                    </span>
                <span className="text-xs text-start px-8 pt-4">All programs shown in the community are voluntarily shared by users. The platform does not display any content without user consent.</span>
                <div className="py-8 px-8">
                    <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-1">
                        {allPrograms.map((item: TProgram) => (
                            <ProgramItem key={item.id} item={item} />
                        ))}
                    </div>

                    <div className="flex justify-center mt-8">
                        <Button
                            onClick={handleSeeMore}
                            disabled={isLoading}
                            className="bg-lightSecondary text-white hover:bg-black hover:text-white"
                        >
                            <ArrowDownIcon />
                            {isLoading ? "Loading..." : "See More"}
                        </Button>
                    </div>

                </div>
        </div>
        </>
    );
};
