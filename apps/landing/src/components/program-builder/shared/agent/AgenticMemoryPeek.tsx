// SPDX-License-Identifier: AGPL-3.0-only

"use client";

/**
 * @module program-builder/shared/agent/AgenticMemoryPeek
 *
 * Read-only Agentic memory peek for build-program chat shell near the prompt.
 * Accordion: Constraint profile + Training profile + latest body measurement.
 * Props-driven - AgenticMemoryPeekHost wires React Query.
 *
 * Depends on: constraint-profile-view, agentic-memory-peek-view, Accordion/HoverCard/Popover
 * Used by: AgenticMemoryPeekHost (Chat footer)
 */

import Link from "next/link";
import { Brain, ChevronRight } from "lucide-react";

import type { TBodyMeasurementRow } from "@/api/body-measurements-read";
import type { TConstraintProfile } from "@/app/api/chat/constraints";
import {
    formatConstraintPreferenceDisplayValue,
    type TConstraintPreferenceKey,
} from "@/components/account/constraint-profile-options";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
    defaultOpenPeekSection,
    isAgenticMemoryPeekEmpty,
    isTrainingProfileEmptyForPeek,
    toLatestBodyMeasurementOneLiner,
    toTrainingProfileSummary,
    type TAgenticMemoryPeekSectionId,
} from "@/lib/agentic-memory-peek-view";
import {
    isConstraintProfileEmpty,
    toConstraintProfileSummary,
    type TConstraintProfileSummary,
} from "@/lib/constraint-profile-view";
import { cn } from "@/lib/utils";

/** Default Edit profile route for peek CTA. */
export const AGENTIC_MEMORY_EDIT_HREF = "/profile/edit";

export interface IAgenticMemoryPeekProps {
    /** Constraint profile row (or null when none). */
    constraintProfile?: TConstraintProfile | null;
    /** Training profile row (or null when none). */
    trainingProfile?: TTrainingProfile | null;
    /** Latest backed-up body measurement (or null). */
    latestBodyMeasurement?: TBodyMeasurementRow | null;
    /** Parent query loading (any of the three). */
    isLoading?: boolean;
    /** Parent query error. */
    isError?: boolean;
    /** Weight/height unit preference (lbs/in vs kg/cm). */
    isInLbs?: boolean;
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

function SummaryList({ title, values }: { title: string; values: string[] }) {
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

function ConstraintSectionBody({
    summary,
    isEmpty,
}: {
    summary: TConstraintProfileSummary;
    isEmpty: boolean;
}) {
    if (isEmpty) {
        return (
            <p className="text-[13px] leading-[1.45] tracking-[-0.01em] text-muted-foreground">
                No constraints saved yet.
            </p>
        );
    }

    return (
        <div className="space-y-4">
            <SummaryList title="Injuries & health issues" values={summary.injuries ?? []} />
            <SummaryList
                title="Excluded equipment"
                values={summary.excludedEquipment ?? []}
            />
            <SummaryList title="Excluded areas" values={summary.excludedAreas ?? []} />
            <PreferenceRows preferences={summary.preferences} />
        </div>
    );
}

function TrainingSectionBody({
    rows,
    isEmpty,
}: {
    rows: Array<{ label: string; value: string }>;
    isEmpty: boolean;
}) {
    if (isEmpty) {
        return (
            <p className="text-[13px] leading-[1.45] tracking-[-0.01em] text-muted-foreground">
                No training profile saved yet.
            </p>
        );
    }

    return (
        <dl className="space-y-2.5">
            {rows.map((row) => (
                <div
                    key={row.label}
                    className="flex items-baseline justify-between gap-4"
                >
                    <dt className="text-[13px] leading-[1.4] text-muted-foreground">
                        {row.label}
                    </dt>
                    <dd className="max-w-[55%] text-right text-[13px] leading-[1.4] tracking-[-0.01em] text-foreground">
                        {row.value}
                    </dd>
                </div>
            ))}
        </dl>
    );
}

function EditProfileLink({ href }: { href: string }) {
    return (
        <div className="border-t border-border/60 pt-3">
            <Link
                href={href}
                className="group inline-flex items-center gap-0.5 text-[13px] font-medium tracking-[-0.01em] text-foreground/80 transition-colors hover:text-foreground"
            >
                Edit profile
                <ChevronRight
                    className="size-3.5 opacity-50 transition-transform group-hover:translate-x-0.5 group-hover:opacity-80"
                    aria-hidden="true"
                />
            </Link>
        </div>
    );
}

function PeekBody({
    isLoading,
    isError,
    constraintEmpty,
    trainingEmpty,
    constraintSummary,
    trainingRows,
    bodyOneLiner,
    defaultOpen,
    editProfileHref,
}: {
    isLoading: boolean;
    isError: boolean;
    constraintEmpty: boolean;
    trainingEmpty: boolean;
    constraintSummary: TConstraintProfileSummary;
    trainingRows: Array<{ label: string; value: string }>;
    bodyOneLiner: string | null;
    defaultOpen: TAgenticMemoryPeekSectionId;
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
                Could not load Agentic memory.
            </p>
        );
    }

    const allEmpty = isAgenticMemoryPeekEmpty({
        constraintEmpty,
        trainingEmpty,
        bodyOneLiner,
    });

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto">
                <header className="border-b border-border/60 pb-3">
                    <h4 className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.02em] text-foreground">
                        <Brain
                            className="size-4 shrink-0"
                            strokeWidth={1.5}
                            aria-hidden="true"
                        />
                        Agentic memory
                    </h4>
                </header>

                {allEmpty ? (
                    <p className="pt-3 pb-4 text-[13px] leading-[1.45] tracking-[-0.01em] text-muted-foreground">
                        No agentic memory saved yet.
                    </p>
                ) : (
                    <Accordion
                        type="single"
                        collapsible
                        defaultValue={defaultOpen}
                        className="pt-1 pb-2"
                    >
                        <AccordionItem
                            value="constraint"
                            className="border-border/60"
                        >
                            <AccordionTrigger className="py-3 text-[13px] font-medium tracking-[-0.01em]">
                                Constraint profile
                            </AccordionTrigger>
                            <AccordionContent>
                                <ConstraintSectionBody
                                    summary={constraintSummary}
                                    isEmpty={constraintEmpty}
                                />
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="training" className="border-border/60">
                            <AccordionTrigger className="py-3 text-[13px] font-medium tracking-[-0.01em]">
                                Training profile
                            </AccordionTrigger>
                            <AccordionContent>
                                <TrainingSectionBody
                                    rows={trainingRows}
                                    isEmpty={trainingEmpty}
                                />
                            </AccordionContent>
                        </AccordionItem>

                        {bodyOneLiner ? (
                            <AccordionItem value="body" className="border-border/60">
                                <AccordionTrigger className="py-3 text-[13px] font-medium tracking-[-0.01em]">
                                    Body measurements
                                </AccordionTrigger>
                                <AccordionContent>
                                    <p className="text-[13px] leading-[1.4] tracking-[-0.01em] text-foreground">
                                        {bodyOneLiner}
                                    </p>
                                </AccordionContent>
                            </AccordionItem>
                        ) : null}
                    </Accordion>
                )}
            </div>

            <div className="shrink-0">
                <EditProfileLink href={editProfileHref} />
            </div>
        </div>
    );
}

/** Viewport-capped peek panel: scrolls tall Constraint content; CTA stays pinned. */
export const AGENTIC_MEMORY_PEEK_CONTENT_CLASSNAME =
    "flex max-h-[min(28rem,calc(100dvh-2rem))] w-80 max-w-[min(20rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border-border/50 p-5 shadow-lg";

const contentClassName = AGENTIC_MEMORY_PEEK_CONTENT_CLASSNAME;

/**
 * Read-only Agentic memory peek control (HoverCard desktop / Popover tap).
 */
export function AgenticMemoryPeek({
    constraintProfile = null,
    trainingProfile = null,
    latestBodyMeasurement = null,
    isLoading = false,
    isError = false,
    isInLbs = true,
    editProfileHref = AGENTIC_MEMORY_EDIT_HREF,
    className,
}: IAgenticMemoryPeekProps) {
    const tapPrimary = useMediaQuery("(hover: none)");

    const constraintEmpty = isConstraintProfileEmpty(constraintProfile);
    const trainingEmpty = isTrainingProfileEmptyForPeek(trainingProfile);
    const constraintSummary = toConstraintProfileSummary(constraintProfile);
    const trainingRows = toTrainingProfileSummary(trainingProfile, isInLbs).rows;
    const bodyOneLiner = toLatestBodyMeasurementOneLiner(
        latestBodyMeasurement,
        isInLbs,
    );
    const defaultOpen = defaultOpenPeekSection({
        constraintHasContent: !constraintEmpty,
        trainingHasContent: !trainingEmpty,
        bodyHasContent: bodyOneLiner != null,
    });

    const body = (
        <PeekBody
            isLoading={isLoading}
            isError={isError}
            constraintEmpty={constraintEmpty}
            trainingEmpty={trainingEmpty}
            constraintSummary={constraintSummary}
            trainingRows={trainingRows}
            bodyOneLiner={bodyOneLiner}
            defaultOpen={defaultOpen}
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
            aria-label="Agentic memory"
        >
            <Brain className="size-4" strokeWidth={1.5} aria-hidden="true" />
        </button>
    );

    if (tapPrimary) {
        return (
            <Popover>
                <PopoverTrigger asChild>{trigger}</PopoverTrigger>
                <PopoverContent
                    className={contentClassName}
                    align="end"
                    side="top"
                    sideOffset={4}
                    collisionPadding={16}
                >
                    {body}
                </PopoverContent>
            </Popover>
        );
    }

    return (
        <HoverCard openDelay={0} closeDelay={0}>
            <HoverCardTrigger asChild>{trigger}</HoverCardTrigger>
            <HoverCardContent
                className={contentClassName}
                align="end"
                side="top"
                sideOffset={4}
                collisionPadding={16}
            >
                {body}
            </HoverCardContent>
        </HoverCard>
    );
}
