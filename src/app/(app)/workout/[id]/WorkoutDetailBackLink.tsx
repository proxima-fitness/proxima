"use client";

/**
 * @module (app)/workout/[id]/WorkoutDetailBackLink
 * Context-aware back link for workout detail — program builder or profile.
 */

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { resolveWorkoutDetailBackLink } from "@/lib/build-program-url";

interface IProps {
    returnFrom?: string | null;
    returnQs?: string | null;
    /** Legacy links that only passed chat without returnQs. */
    returnChatId?: string | null;
    className?: string;
    showArrow?: boolean;
}

/** Back link resolved from optional return context props. */
export function WorkoutDetailBackLink({
    returnFrom,
    returnQs,
    returnChatId,
    className,
    showArrow = true,
}: IProps) {
    const { href, label } = resolveWorkoutDetailBackLink({
        from: returnFrom,
        returnQs,
        chat: returnChatId,
    });

    const defaultClassName = showArrow
        ? "inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        : "inline-block text-sm font-medium text-lightSecondary hover:underline";

    return (
        <Link href={href} className={className ?? defaultClassName}>
            {showArrow && <ArrowLeft className="h-4 w-4" aria-hidden />}
            {label}
        </Link>
    );
}

function WorkoutNotFoundBackLinkInner() {
    const searchParams = useSearchParams();
    return (
        <WorkoutDetailBackLink
            returnFrom={searchParams.get("from")}
            returnQs={searchParams.get("returnQs")}
            returnChatId={searchParams.get("chat")}
            showArrow={false}
            className="mt-6 inline-block text-sm font-medium text-lightSecondary hover:underline"
        />
    );
}

/** Back link for not-found — reads return context from URL query. */
export function WorkoutNotFoundBackLink() {
    return (
        <Suspense
            fallback={
                <span className="mt-6 inline-block text-sm font-medium text-lightSecondary">
                    Back to profile
                </span>
            }
        >
            <WorkoutNotFoundBackLinkInner />
        </Suspense>
    );
}
