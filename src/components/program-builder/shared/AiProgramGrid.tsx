/* eslint-disable @next/next/no-img-element */
/**
 * @module AiProgramGrid
 * Renders a paginated grid of community-shared AI programs with edit/view links, avatars, and save counts.
 * Depends on: useCommunityAiProgramsPaginated, useUsersBatch, Avatar, Button. Used by: program builder / landing.
 */
"use client";

import { ArrowDownIcon, EditIcon, EyeIcon, SplitIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { quotes } from "public";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCommunityAiProgramsPaginated, useUsersBatch } from "@/api/hooks";
import { memo, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { lightColours } from "@/assets/constants";

/** Props for a single program card in the community grid. */
interface IProgramItemProps {
    /** Shared program record. */
    item: TProgram;
    /** Author display name and profile image (optional). */
    userData?: { fullName: string; profilePic: Blob | null };
}

/** Single program card with hover actions (Edit/View) and avatar. */
const ProgramItem: React.FC<IProgramItemProps> = memo(({ item, userData }) => {

    const fullName = userData?.fullName || "Anonymous";
    const profilePic = userData?.profilePic || null;

    const avatarColour = useMemo(() => {
        let hash = 0;
        for (let i = 0; i < fullName.length; i++) {
            hash = (hash * 31 + fullName.charCodeAt(i)) | 0;
        }
        return lightColours[Math.abs(hash) % lightColours.length];
    }, [fullName]);

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
                <div className="absolute inset-0 transition duration-300 group-hover:blur-xs z-0">
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

                <div className="absolute inset-0 rounded-lg bg-black bg-opacity-40 backdrop-blur-xs flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                    <Link
                        href={ `/build-program?shareId=${item.id}` }
                        rel="noopener noreferrer"
                        className="w-[50%]"
                        target="_self"
                    >
                        <button className="my-2 py-2 w-full hover:bg-black hover:text-white bg-white text-black rounded-lg shadow-sm flex flex-row items-center justify-center gap-2" aria-label="Edit this program"><EditIcon />Edit</button>
                    </Link>
                    <Link
                        href={ `/build-program?shareId=${item.id}` }
                        rel="noopener noreferrer"
                        className="w-[50%]"
                        target="_self"
                    >
                        <button className="my-2 py-2 w-full hover:bg-black hover:text-white bg-lightSecondary text-white rounded-lg shadow-sm flex flex-row items-center justify-center gap-2" aria-label="View this program"><EyeIcon />View</button>
                    </Link>
                </div>

            </div>
            <div className="flex flex-row items-center justify-start gap-2">
            <Avatar className="w-10 h-10" >
                <AvatarImage src={getProfilePicUrl()} alt="Creator avatar" />
                <AvatarFallback className="bg-white" style={{ backgroundColor: avatarColour }}>
                    {getInitial()}
                </AvatarFallback>
            </Avatar>
            <SplitIcon className="w-4 h-4" />
            <span className="text-sm">{item.saves + 1} {(item.saves + 1) === 1 ? "Save" : "Saves"}</span>
            </div>
        </div>
    );
});

// Add display name for debugging
ProgramItem.displayName = "ProgramItem";

/** Paginated grid of community AI programs with "See More" and skeleton loading. */
export const AiProgramGrid: React.FC = () => {
    const pageSize = 9; // Reduced from 20 to 9 for faster initial load

    const {
        data,
        isLoading,
        fetchNextPage,
        isFetchingNextPage,
    } = useCommunityAiProgramsPaginated(pageSize);

    const allPrograms = useMemo(
        () => data?.pages.flatMap((page) => page) ?? [],
        [data?.pages],
    );

    // Extract unique user IDs from all loaded programs
    const userIds = Array.from(new Set(allPrograms.map(p => p.user_id).filter((id): id is string => id != null)));

    // Batch fetch user data for all programs (non-blocking)
    const { data: usersBatchData } = useUsersBatch(userIds);

    const handleSeeMore = () => {
        void fetchNextPage();
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
                    {isLoading && allPrograms.length === 0 ? (
                        <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-1">
                            {Array.from({ length: pageSize }).map((_, index) => (
                                <div key={index} className="flex flex-col gap-4">
                                    <div className="bg-white dark:bg-darkGray h-[200px] rounded-lg shadow-lg animate-pulse" />
                                    <div className="flex flex-row items-center gap-2">
                                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
                                        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-1">
                            {allPrograms.map((item: TProgram) => {
                                const userData = item.user_id ? usersBatchData?.[item.user_id] : undefined;
                                return (
                                    <ProgramItem
                                        key={item.id}
                                        item={item}
                                        userData={userData}
                                    />
                                );
                            })}
                        </div>
                    )}

                    <div className="flex justify-center mt-8">
                        <Button
                            onClick={handleSeeMore}
                            disabled={isLoading || isFetchingNextPage}
                            className="bg-lightSecondary text-white hover:bg-black hover:text-white"
                            aria-label="Load more community programs"
                        >
                            <ArrowDownIcon />
                            {isLoading || isFetchingNextPage ? "Loading..." : "See More"}
                        </Button>
                    </div>

                </div>
        </div>
        </>
    );
};
