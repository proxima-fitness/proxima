"use client";

/**
 * @module ProfileHero
 * Profile header: avatar, Hevy-style stat row (label above number), identity hierarchy,
 * bio, Link to Edit profile. Workouts stat folds in backup sync state with inline pause/play.
 *
 * Depends on: UserContext, ProfilePictureContext, useHevySecret, useWorkoutHistorySyncPoller,
 * useUserMetadata, useProfilePictureByID, useUserFullName, useFollowersMyProfile, useFollowingMyProfile
 * Used by: ProfileContent
 */

import { useUserContext } from "@/contexts/UserContext";
import { useProfilePictureContext } from "@/contexts/ProfilePictureContext";
import {
    useFollowersMyProfile,
    useFollowingMyProfile,
    useHevySecret,
    useProfilePictureByID,
    useProfileStatistics,
    useUserFullName,
    useUserMetadata,
} from "@/api/hooks";
import { getWorkoutHistorySyncStatus } from "@/api/workout-history-sync";
import { useWorkoutHistorySyncPoller } from "@/hooks/useWorkoutHistorySyncPoller";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Pause, PenBoxIcon, Play } from "lucide-react";
import Link from "next/link";
import { useMemo, type ReactNode } from "react";

const STATUS_DOT_CLASS: Record<
    NonNullable<ReturnType<typeof getWorkoutHistorySyncStatus>>,
    string
> = {
    synced: "bg-green-500",
    syncing: "bg-yellow-500 animate-pulse",
    error: "bg-red-500",
    paused: "bg-muted-foreground/60",
};

function StatCell({
    label,
    value,
    loading,
    dotClass,
    action,
}: {
    label: string;
    value: string;
    loading?: boolean;
    dotClass?: string;
    action?: ReactNode;
}) {
    return (
        <div className="flex min-w-0 flex-col items-start gap-0">
            <span className="max-w-full truncate text-xs leading-none text-muted-foreground">
                {label}
            </span>
            <div className="mt-0.5 flex min-w-0 max-w-full items-center gap-0.5 sm:gap-1">
                {loading ? (
                    <Skeleton className="h-4 w-8" />
                ) : (
                    <>
                        {dotClass ? (
                            <span
                                className={cn("size-2 shrink-0 rounded-full", dotClass)}
                                aria-hidden
                            />
                        ) : null}
                        <span className="truncate text-xs font-medium tabular-nums leading-none text-foreground sm:text-sm">
                            {value}
                        </span>
                        {action}
                    </>
                )}
            </div>
        </div>
    );
}

export function ProfileHero() {
    const { user } = useUserContext();
    const { profilePicture: contextProfilePic } = useProfilePictureContext();
    const { data: metaData } = useUserMetadata(user?.id ?? "");
    const { data: profilePicBlob } = useProfilePictureByID(user?.id ?? "");
    const { data: fullName } = useUserFullName(user?.id ?? undefined, "user");
    const { data: followers, isLoading: loadingFollowers } = useFollowersMyProfile(
        user?.id ?? "",
        user,
    );
    const { data: following, isLoading: loadingFollowing } = useFollowingMyProfile(
        user?.id ?? "",
        user,
    );
    const { data: hevyApiKey } = useHevySecret(user);
    const hevyConnected = Boolean(hevyApiKey);
    const { progress, pause, play, isPolling } = useWorkoutHistorySyncPoller(hevyConnected);
    const { data: statistics, isLoading: isLoadingStatistics } = useProfileStatistics(
        user,
        hevyConnected,
        12,
    );

    const effectiveProfilePic = contextProfilePic ?? profilePicBlob;
    const profilePicUrl = useMemo(() => {
        if (!effectiveProfilePic) return null;
        return URL.createObjectURL(effectiveProfilePic);
    }, [effectiveProfilePic]);

    if (!user) return null;

    const fullNameLine = [metaData?.first_name, metaData?.last_name].filter(Boolean).join(" ");
    const displayName =
        fullName && fullName !== "Anonymous" ? fullName : fullNameLine || "User";
    const username = metaData?.username?.trim() ?? "";
    const displayNameSecondary =
        fullNameLine || (fullName && fullName !== "Anonymous" ? fullName : "");
    const primaryLine = username ? `@${username}` : displayNameSecondary || displayName;
    const secondaryLine =
        username && displayNameSecondary ? displayNameSecondary : null;

    const initials =
        displayName
            .split(" ")
            .map((s) => s[0])
            .slice(0, 2)
            .join("")
            .toUpperCase() || "?";

    const syncStatus = hevyConnected ? getWorkoutHistorySyncStatus(progress) : null;
    const workoutsLoading = hevyConnected && !progress;
    const workoutsValue = !hevyConnected
        ? "-"
        : syncStatus === "synced"
          ? String(progress?.backedUpCount ?? 0)
          : `${progress?.backedUpCount ?? 0} / ${progress?.hevyCount ?? 0}`;
    const workoutsDotClass =
        syncStatus && syncStatus !== "synced" ? STATUS_DOT_CLASS[syncStatus] : undefined;
    const showPausePlay = syncStatus === "syncing" || syncStatus === "paused";

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-start gap-4 sm:gap-5">
                <div className="relative shrink-0">
                    <Avatar className="h-[72px] w-[72px] sm:h-[88px] sm:w-[88px] rounded-full border border-border/80 shadow-sm">
                        {profilePicUrl ? (
                            <AvatarImage src={profilePicUrl} alt="" className="object-cover" />
                        ) : null}
                        <AvatarFallback className="text-base font-semibold bg-muted text-foreground sm:text-lg">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="min-w-0 space-y-0.5">
                        <p className="truncate text-base font-semibold leading-tight text-foreground">
                            {primaryLine}
                        </p>
                        {secondaryLine ? (
                            <p className="truncate text-sm leading-tight text-muted-foreground">
                                {secondaryLine}
                            </p>
                        ) : null}
                    </div>

                    <div
                        className={cn(
                            "grid w-full min-w-0 gap-x-2 sm:flex sm:w-auto sm:items-start sm:gap-6 md:gap-8",
                            hevyConnected ? "grid-cols-4" : "grid-cols-3",
                        )}
                    >
                    <StatCell
                        label="Workouts"
                        value={workoutsValue}
                        loading={workoutsLoading}
                        dotClass={workoutsDotClass}
                        action={
                            showPausePlay ? (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-5 shrink-0 text-muted-foreground hover:text-foreground"
                                    disabled={syncStatus === "paused" && isPolling}
                                    aria-label={
                                        syncStatus === "paused"
                                            ? "Resume workout history sync"
                                            : "Pause workout history sync"
                                    }
                                    onClick={() => {
                                        if (syncStatus === "paused") {
                                            play();
                                        } else {
                                            void pause();
                                        }
                                    }}
                                >
                                    {syncStatus === "paused" ? (
                                        <Play className="size-3" aria-hidden />
                                    ) : (
                                        <Pause className="size-3" aria-hidden />
                                    )}
                                </Button>
                            ) : null
                        }
                    />
                    {hevyConnected ? (
                        <StatCell
                            label="Streak"
                            value={String(statistics?.weekStreak ?? 0)}
                            loading={isLoadingStatistics}
                        />
                    ) : null}
                    <StatCell
                        label="Followers"
                        value={String(followers?.length ?? 0)}
                        loading={loadingFollowers}
                    />
                    <StatCell
                        label="Following"
                        value={String(following?.length ?? 0)}
                        loading={loadingFollowing}
                    />
                </div>

                    {metaData?.bio ? (
                        <p className="text-sm leading-snug text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                            {metaData.bio}
                        </p>
                    ) : null}
                </div>
            </div>

            <Button
                asChild
                variant="default"
                size="sm"
                className="w-fit rounded-full bg-lightSecondary px-5 text-white hover:bg-lightSecondary/90"
            >
                <Link href="/profile/edit">
                    Edit profile
                    <PenBoxIcon className="size-4" />
                </Link>
            </Button>
        </div>
    );
}
