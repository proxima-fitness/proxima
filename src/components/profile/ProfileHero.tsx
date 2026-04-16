"use client";

/**
 * @module ProfileHero
 * Profile hero section: avatar, stats (lifts/followers/following), primary name with optional @username, bio, and Edit profile.
 * Rendered at the top of the profile page when the user is logged in.
 * Depends on: UserContext, ProfilePictureContext, useUserMetadata, useProfilePictureByID, useUserFullName, useFollowersMyProfile, useFollowingMyProfile, Button, Avatar, Skeleton.
 * Used by: ProfileContent.
 */

import { useUserContext } from "@/contexts/UserContext";
import { useProfilePictureContext } from "@/contexts/ProfilePictureContext";
import { useUserMetadata, useProfilePictureByID, useUserFullName, useFollowersMyProfile, useFollowingMyProfile } from "@/api/hooks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";

interface IProfileHeroProps {
    onEditProfileClick: () => void;
}

export function ProfileHero({ onEditProfileClick }: IProfileHeroProps) {
    const { user } = useUserContext();
    const { profilePicture: contextProfilePic } = useProfilePictureContext();
    const { data: metaData } = useUserMetadata(user?.id ?? "");
    const { data: profilePicBlob } = useProfilePictureByID(user?.id ?? "");
    const { data: fullName } = useUserFullName(user?.id ?? undefined, "user");
    const { data: followers, isLoading: loadingFollowers } = useFollowersMyProfile(user?.id ?? "", user);
    const { data: following, isLoading: loadingFollowing } = useFollowingMyProfile(user?.id ?? "", user);

    const effectiveProfilePic = contextProfilePic ?? profilePicBlob;
    const profilePicUrl = useMemo(() => {
        if (!effectiveProfilePic) return null;
        return URL.createObjectURL(effectiveProfilePic);
    }, [effectiveProfilePic]);



    if (!user) return null;

    const fullNameLine = [metaData?.first_name, metaData?.last_name].filter(Boolean).join(" ");
    const displayName = fullName && fullName !== "Anonymous" ? fullName : fullNameLine || "User";
    const username = metaData?.username?.trim() ?? "";
    /** Single primary line: real name when present, else @handle or display name. */
    const primaryName =
        fullNameLine ||
        (fullName && fullName !== "Anonymous" ? fullName : "") ||
        (username ? `@${username}` : displayName);
    const showUsernameSubline =
        Boolean(username) && Boolean(fullNameLine || (fullName && fullName !== "Anonymous"));
    const initials = displayName
        .split(" ")
        .map((s) => s[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || "?";

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-row items-start gap-6">
                <div className="relative shrink-0">
                    <Avatar className="h-[90px] w-[90px] md:h-[120px] md:w-[120px] rounded-full border border-border/80 shadow-sm">
                        {profilePicUrl ? (
                            <AvatarImage src={profilePicUrl} alt="" className="object-cover" />
                        ) : null}
                        <AvatarFallback className="text-lg md:text-xl font-semibold bg-muted text-foreground">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                </div>
                <div className="flex flex-1 flex-col gap-1 min-w-0">
                    <div className="flex flex-row gap-8 sm:gap-20 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                            <span className="text-sm tabular-nums tracking-tight text-foreground/90">0</span>
                            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                                lifts
                            </span>
                        </div>
                        <div className="flex flex-col items-center gap-0.5">
                            {loadingFollowers ? (
                                <Skeleton className="h-4 w-6" />
                            ) : (
                                <span className="text-sm tabular-nums tracking-tight text-foreground/90">
                                    {followers?.length ?? 0}
                                </span>
                            )}
                            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                                followers
                            </span>
                        </div>
                        <div className="flex flex-col items-center gap-0.5">
                            {loadingFollowing ? (
                                <Skeleton className="h-4 w-6" />
                            ) : (
                                <span className="text-sm tabular-nums tracking-tight text-foreground/90">
                                    {following?.length ?? 0}
                                </span>
                            )}
                            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                                following
                            </span>
                        </div>
                    </div>
                    <p className="text-2xl font-semibold tracking-tight text-foreground pt-2">{primaryName}</p>
                    {showUsernameSubline ? (
                        <p className="text-sm text-muted-foreground">@{username}</p>
                    ) : null}
                    {metaData?.bio ? (
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{metaData.bio}</p>
                    ) : null}
                </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
                <Button
                    variant="default"
                    size="sm"
                    className="rounded-full bg-lightSecondary px-5 text-white hover:bg-lightSecondary/90"
                    onClick={onEditProfileClick}
                >
                    Edit profile
                </Button>
            </div>
        </div>
    );
}
