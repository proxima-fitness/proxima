"use client";

/**
 * @module program-builder/shared/agent/ConstraintProfilePeek
 *
 * Read-only Constraint profile peek for build-program chat chrome near the prompt.
 * Condensed summary via toConstraintProfileSummary; link to Edit profile; no edit controls.
 *
 * Depends on: useUserConstraints, constraint-profile-view, HoverCard/Popover UI
 * Used by: Chat footer
 */

import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { Brain } from "lucide-react";

import { useUserConstraints } from "@/api/hooks";
import type { TConstraintProfile } from "@/app/api/chat/constraints";
import { Button } from "@/components/ui/button";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
    isConstraintProfileEmpty,
    toConstraintProfileSummary,
    type TConstraintProfileSummary,
} from "@/lib/constraint-profile-view";
import { cn } from "@/lib/utils";

/** Default Edit profile route for peek CTA. */
export const CONSTRAINT_PROFILE_EDIT_HREF = "/account/edit-profile";

const PREFERENCE_LABELS: Record<keyof TConstraintProfile["preferences"], string> = {
    splitType: "Preferred split",
    exerciseVariability: "Exercise variability",
    progressionSystem: "Progression system",
    deloadWeek: "Deload week",
    peakWeek: "Peak week",
    warmupExercises: "Warmup exercises",
};

export interface IConstraintProfilePeekProps {
    user: User;
    /** Override Edit profile href (defaults to `/account/edit-profile`). */
    editProfileHref?: string;
    className?: string;
}

function SummarySection({
    title,
    values,
}: {
    title: string;
    values: string[];
}) {
    if (values.length === 0) return null;

    return (
        <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <ul className="space-y-0.5">
                {values.map((value) => (
                    <li key={`${title}-${value}`} className="text-sm leading-snug">
                        {value}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function preferenceLines(
    preferences: TConstraintProfileSummary["preferences"],
): string[] {
    if (!preferences) return [];

    return (
        Object.entries(preferences) as Array<
            [keyof TConstraintProfile["preferences"], string]
        >
    )
        .filter(([, value]) => value.trim() !== "")
        .map(([key, value]) => `${PREFERENCE_LABELS[key]}: ${value}`);
}

function PeekBody({
    isLoading,
    isError,
    isEmpty,
    summary,
    editProfileHref,
}: {
    isLoading: boolean;
    isError: boolean;
    isEmpty: boolean;
    summary: TConstraintProfileSummary;
    editProfileHref: string;
}) {
    if (isLoading) {
        return (
            <div className="flex min-h-16 items-center justify-center py-2">
                <Spinner size="small" />
            </div>
        );
    }

    if (isError) {
        return (
            <p className="text-sm text-destructive">
                Could not load Constraint profile.
            </p>
        );
    }

    return (
        <div className="space-y-3">
            <div className="space-y-1">
                <h4 className="text-sm font-semibold">Constraint profile</h4>
                {isEmpty ? (
                    <p className="text-sm text-muted-foreground">
                        No constraints saved yet. Add injuries, equipment, or prefs on
                        Edit profile.
                    </p>
                ) : (
                    <div className="space-y-3">
                        <SummarySection title="Injuries" values={summary.injuries ?? []} />
                        <SummarySection
                            title="Excluded equipment"
                            values={summary.excludedEquipment ?? []}
                        />
                        <SummarySection
                            title="Excluded areas"
                            values={summary.excludedAreas ?? []}
                        />
                        <SummarySection
                            title="Preferences"
                            values={preferenceLines(summary.preferences)}
                        />
                        <SummarySection
                            title="Chat refinements"
                            values={summary.chatRefinements ?? []}
                        />
                    </div>
                )}
            </div>
            <Link
                href={editProfileHref}
                className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
                Edit profile
            </Link>
        </div>
    );
}

const contentClassName = "w-72 max-w-[min(18rem,calc(100vw-2rem))] p-4";

/** Read-only Constraint profile peek control (HoverCard desktop / Popover tap). */
export function ConstraintProfilePeek({
    user,
    editProfileHref = CONSTRAINT_PROFILE_EDIT_HREF,
    className,
}: IConstraintProfilePeekProps) {
    const { data, isLoading, isError } = useUserConstraints(user);
    const tapPrimary = useMediaQuery("(hover: none)");

    const isEmpty = isConstraintProfileEmpty(data);
    const summary = toConstraintProfileSummary(data);

    const body = (
        <PeekBody
            isLoading={isLoading}
            isError={isError}
            isEmpty={isEmpty}
            summary={summary}
            editProfileHref={editProfileHref}
        />
    );

    const trigger = (
        <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("gap-1.5 text-muted-foreground", className)}
            aria-label="Constraint profile"
        >
            <Brain className="size-4" aria-hidden="true" />
            <span className="text-xs font-medium">Memory</span>
        </Button>
    );

    if (tapPrimary) {
        return (
            <Popover>
                <PopoverTrigger asChild>{trigger}</PopoverTrigger>
                <PopoverContent className={contentClassName} align="end" sideOffset={4}>
                    {body}
                </PopoverContent>
            </Popover>
        );
    }

    return (
        <HoverCard openDelay={0} closeDelay={0}>
            <HoverCardTrigger asChild>{trigger}</HoverCardTrigger>
            <HoverCardContent className={contentClassName} align="end" sideOffset={4}>
                {body}
            </HoverCardContent>
        </HoverCard>
    );
}
