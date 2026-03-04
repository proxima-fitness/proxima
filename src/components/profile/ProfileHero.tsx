"use client";

/**
 * @module ProfileHero
 * Profile hero section: avatar, stats (lifts/followers/following), full name, bio, and Edit Profile button.
 * Rendered at the top of the profile page when the user is logged in.
 * Depends on: UserContext, useUserMetadata, useProfilePictureByID, useUserFullName, Button, Avatar.
 * Used by: DashboardContent.
 */

import { useUserContext } from "@/contexts/UserContext";
import { useUserMetadata, useProfilePictureByID, useUserFullName } from "@/api/hooks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";

interface IProfileHeroProps {
    onEditProfileClick: () => void;
}

export function ProfileHero({ onEditProfileClick }: IProfileHeroProps) {
    const { user } = useUserContext();
    const { data: metaData } = useUserMetadata(user?.id ?? "");
    const { data: profilePicBlob } = useProfilePictureByID(user?.id ?? "");
    const { data: fullName } = useUserFullName(user?.id ?? undefined, "user");

    const profilePicUrl = useMemo(() => {
        if (!profilePicBlob) return null;
        return URL.createObjectURL(profilePicBlob);
    }, [profilePicBlob]);



    if (!user) return null;

    const displayName = fullName && fullName !== "Anonymous" ? fullName : [metaData?.first_name, metaData?.last_name].filter(Boolean).join(" ") || "User";
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
                    <Avatar className="h-[90px] w-[90px] md:h-[120px] md:w-[120px] rounded-full border-2 border-border">
                        {profilePicUrl ? (
                            <AvatarImage src={profilePicUrl} alt="" className="object-cover" />
                        ) : null}
                        <AvatarFallback className="text-lg md:text-xl font-semibold bg-muted text-foreground">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                </div>
                <div className="flex flex-1 flex-col gap-1 min-w-0">
                    <div className="flex flex-row gap-6 sm:gap-24 text-center">
                        <div className="flex flex-col items-center">
                            <span className="text-base font-medium tabular-nums">0</span>
                            <span className="text-[11px] text-muted-foreground whitespace-nowrap">lifts</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-base font-medium tabular-nums">0</span>
                            <span className="text-[11px] text-muted-foreground whitespace-nowrap">followers</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-base font-medium tabular-nums">0</span>
                            <span className="text-[11px] text-muted-foreground whitespace-nowrap">following</span>
                        </div>
                    </div>
                    <p className="text-lg font-bold text-foreground pt-1">{displayName}</p>
                    {metaData?.bio ? (
                        <p className="text-sm text-muted-foreground line-clamp-2">{metaData.bio}</p>
                    ) : null}
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="default" size="sm" className="rounded-lg bg-lightSecondary text-white hover:bg-lightSecondary/90" onClick={onEditProfileClick}>
                    Edit Profile
                </Button>
            </div>
        </div>
    );
}
