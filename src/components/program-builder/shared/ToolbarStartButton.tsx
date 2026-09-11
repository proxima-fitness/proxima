/**
 * @module ToolbarStartButton
 * Toolbar **Start** control (ADR 0016 / 01). Arrow link beside **Save**; opens
 * that program's **Program overview**. Does not **Week Export**.
 * Depends on: Button, next/link. Used by: ToolbarPortalButtons.
 */
"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface IToolbarStartButtonProps {
    href: string;
}

/** Presentational **Start** link; one toolbar companion slot (ADR 0016). */
export const ToolbarStartButton: React.FC<IToolbarStartButtonProps> = ({
    href,
}) => {
    return (
        <Button
            variant="default"
            className="rounded-full px-4 gap-2 text-white bg-lightSecondary hover:bg-lightSecondary/90 shadow-sm"
            asChild
        >
            <Link href={href} aria-label="Start">
                <span>Start</span>
                <ArrowRight className="h-4 w-4" />
            </Link>
        </Button>
    );
};
