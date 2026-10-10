/**
 * @module ToolbarStartButton
 * Toolbar **Start** control (ADR 0016 / 01). Occupies the persist slot when
 * the prescription is clean after this-session **Save**; opens that program's
 * **Program overview**. Disabled until Save succeeds. Does not **Week Export**.
 * Depends on: Button, next/link. Used by: ToolbarPortalButtons.
 */
"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const START_PILL =
    "rounded-full px-4 gap-2 text-white bg-lightSecondary hover:bg-lightSecondary/90 shadow-sm";

interface IToolbarStartButtonProps {
    /** Overview href. Null while Save is in flight (button stays disabled). */
    href?: string | null;
    disabled?: boolean;
}

/** Presentational **Start** control; same persist slot as **Save** (ADR 0016). */
export const ToolbarStartButton: React.FC<IToolbarStartButtonProps> = ({
    href = null,
    disabled = false,
}) => {
    const startDisabled = disabled || href == null;
    if (startDisabled) {
        return (
            <Button
                variant="default"
                className={START_PILL}
                disabled
                aria-label="Start"
            >
                <span>Start</span>
                <ArrowRight className="h-4 w-4" />
            </Button>
        );
    }

    return (
        <Button
            variant="default"
            className={START_PILL}
            asChild
        >
            <Link href={href} aria-label="Start">
                <span>Start</span>
                <ArrowRight className="h-4 w-4" />
            </Link>
        </Button>
    );
};
