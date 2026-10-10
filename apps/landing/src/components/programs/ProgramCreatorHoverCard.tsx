"use client";

/**
 * @module ProgramCreatorHoverCard
 * Creator name: HoverCard on hover-capable devices; Popover on tap-primary (hover: none) to avoid Radix HoverCard passive touch + preventDefault warnings and to support mobile.
 * @dependsOn HoverCard, Popover UI, lucide-react CalendarIcon, useMediaQuery.
 * @usedBy ProgramsSlugLayout
 */

import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMediaQuery } from "@/hooks/use-media-query";
import { CalendarIcon } from "lucide-react";

interface IProgramCreatorHoverCardProps {
    fullName: string;
    bio: string | null | undefined;
    joinedReadable: string;
}

const triggerClassName =
    "font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-secondary dark:hover:text-lightSecondary cursor-pointer text-left";

function CreatorCardBody({
    fullName,
    bio,
    joinedReadable,
}: IProgramCreatorHoverCardProps) {
    return (
        <div className="flex justify-around space-x-4">
            <div className="space-y-1">
                <h4 className="text-sm font-semibold">{fullName}</h4>
                <p className="text-sm text-muted-foreground">{bio}</p>
                <div className="flex items-center pt-2">
                    <CalendarIcon className="mr-2 h-4 w-4 opacity-70" aria-hidden="true" />
                    <span className="text-xs text-muted-foreground">{joinedReadable}</span>
                </div>
            </div>
        </div>
    );
}

const contentClassName = "w-72 h-auto rounded-xl border-border/60 shadow-lg p-4";

export function ProgramCreatorHoverCard(props: IProgramCreatorHoverCardProps) {
    const tapPrimary = useMediaQuery("(hover: none)");

    if (tapPrimary) {
        return (
            <Popover>
                <PopoverTrigger asChild>
                    <button type="button" className={triggerClassName}>
                        {props.fullName}
                    </button>
                </PopoverTrigger>
                <PopoverContent className={contentClassName} align="center" sideOffset={4}>
                    <CreatorCardBody {...props} />
                </PopoverContent>
            </Popover>
        );
    }

    return (
        <HoverCard>
            <HoverCardTrigger type="button" className={triggerClassName}>
                {props.fullName}
            </HoverCardTrigger>
            <HoverCardContent className={contentClassName}>
                <CreatorCardBody {...props} />
            </HoverCardContent>
        </HoverCard>
    );
}
