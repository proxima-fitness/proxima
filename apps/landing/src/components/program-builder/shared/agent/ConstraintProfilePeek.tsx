// SPDX-License-Identifier: AGPL-3.0-only

"use client";

/**
 * @module program-builder/shared/agent/ConstraintProfilePeek
 *
 * Read-only Constraint profile peek for build-program chat shell near the prompt.
 * Condensed summary via toConstraintProfileSummary; link to Edit profile; no edit controls.
 *
 * Depends on: useUserConstraints, constraint-profile-view, HoverCard/Popover UI
 * Used by: Chat footer
 */

import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { Brain, ChevronRight } from "lucide-react";

import { useUserConstraints } from "@/api/hooks";
import {
    formatConstraintPreferenceDisplayValue,
    type TConstraintPreferenceKey,
} from "@/components/account/constraint-profile-options";
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
export const CONSTRAINT_PROFILE_EDIT_HREF = "/profile/edit";

export interface IConstraintProfilePeekProps {
    user: User;
    /** Override Edit profile href (defaults to `/profile/edit`). */
    editProfileHref?: string;
    className?: string;
}

function SectionLabel({ children }: { children: string }) {
    return (
        <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/80">
            {children}
        </p>
    );
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
        <section className="space-y-2">
            <SectionLabel>{title}</SectionLabel>
            <ul className="space-y-1.5">
                {values.map((value) => (
                    <li
                        key={`${title}-${value}`}
                        className="text-[13px] leading-[1.4] tracking-[-0.01em] text-foreground"
                    >
                        {value}
                    </li>
                ))}
            </ul>
        </section>
    );
}

function PreferenceRows({
    preferences,
}: {
    preferences: TConstraintProfileSummary["preferences"];
}) {
    if (!preferences) return null;

    const rows = (
        Object.entries(preferences) as Array<[TConstraintPreferenceKey, string]>
    ).filter(([, value]) => value.trim() !== "");

    if (rows.length === 0) return null;

    return (
        <section className="space-y-2">
            <SectionLabel>Preferences</SectionLabel>
            <dl className="space-y-2.5">
                {rows.map(([key, value]) => (
                    <div
                        key={key}
                        className="flex items-baseline justify-between gap-4"
                    >
                        <dt className="text-[13px] leading-[1.4] text-muted-foreground">
                            {key}
                        </dt>
                        <dd className="max-w-[55%] text-right text-[13px] leading-[1.4] tracking-[-0.01em] text-foreground">
                            {formatConstraintPreferenceDisplayValue(key, value)}
                        </dd>
                    </div>
                ))}
            </dl>
        </section>
    );
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
            <div className="flex min-h-20 items-center justify-center">
                <Spinner size="small" />
            </div>
        );
    }

    if (isError) {
        return (
            <p className="text-[13px] leading-relaxed text-destructive">
                Could not load Constraint Profile.
            </p>
        );
    }

    return (
        <div className="flex flex-col">
            <header className="border-b border-border/60 pb-3">
                <h4 className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">
                    Constraint Profile
                </h4>
            </header>

            {isEmpty ? (
                <p className="pt-3 text-[13px] leading-[1.45] tracking-[-0.01em] text-muted-foreground">
                    No constraints saved yet.
                </p>
            ) : (
                <>
                    <div className="space-y-4 pt-3 pb-4">
                        <SummarySection title="Injuries" values={summary.injuries ?? []} />
                        <SummarySection
                            title="Excluded equipment"
                            values={summary.excludedEquipment ?? []}
                        />
                        <SummarySection
                            title="Excluded areas"
                            values={summary.excludedAreas ?? []}
                        />
                        <PreferenceRows preferences={summary.preferences} />
                    </div>

                    <div className="border-t border-border/60 pt-3">
                        <Link
                            href={editProfileHref}
                            className="group inline-flex items-center gap-0.5 text-[13px] font-medium tracking-[-0.01em] text-foreground/80 transition-colors hover:text-foreground"
                        >
                            Edit profile
                            <ChevronRight
                                className="size-3.5 opacity-50 transition-transform group-hover:translate-x-0.5 group-hover:opacity-80"
                                aria-hidden="true"
                            />
                        </Link>
                    </div>
                </>
            )}
        </div>
    );
}

const contentClassName =
    "w-80 max-w-[min(20rem,calc(100vw-2rem))] rounded-xl border-border/50 p-5 shadow-lg";

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
        <button
            type="button"
            className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-black dark:bg-black dark:text-white hover:bg-white/90",
                className,
            )}
            aria-label="Constraint Profile"
        >
            <Brain className="size-4" strokeWidth={1.5} aria-hidden="true" />
        </button>
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
