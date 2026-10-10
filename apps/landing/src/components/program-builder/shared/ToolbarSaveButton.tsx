/**
 * @module ToolbarSaveButton
 * Toolbar persist slot. **Save** writes the Program prescription; **Sync**
 * writes Hevy (ADR 0013 / 04, ADR 0016). Anonymous users get **Sign in to
 * save** in this same slot — never a second persist button.
 * Depends on: Button, next/link. Used by: ToolbarPortalButtons.
 */
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Save, Loader2, RefreshCw, ArrowRight } from "lucide-react";

const TOOLBAR_PERSIST_PILL =
    "rounded-full px-4 gap-2 text-white bg-lightSecondary hover:bg-lightSecondary/90 shadow-sm";

interface IToolbarSaveButtonProps {
    onClick: () => void;
    disabled: boolean;
    isSaving: boolean;
    persistMode?: "save" | "sync";
    /** Login href when anonymous; this slot is Sign in to save, not Save. */
    signInHref?: string | null;
    /** Auth still resolving; keep one slot, no Save flash. */
    isAuthLoading?: boolean;
}

/** Presentational persist button; one toolbar slot (ADR 0007, ADR 0016). */
export const ToolbarSaveButton: React.FC<IToolbarSaveButtonProps> = ({
    onClick,
    disabled,
    isSaving,
    persistMode = "save",
    signInHref = null,
    isAuthLoading = false,
}) => {
    if (isAuthLoading) {
        return (
            <Button
                variant="default"
                className={TOOLBAR_PERSIST_PILL}
                disabled
                aria-label="Loading"
            >
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Loading...</span>
            </Button>
        );
    }

    if (signInHref != null) {
        return (
            <Button variant="default" className={TOOLBAR_PERSIST_PILL} asChild>
                <Link href={signInHref} aria-label="Sign in to save">
                    <span className="hidden sm:inline">Sign in to save</span>
                    <span className="sm:hidden">Sign in</span>
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </Button>
        );
    }

    const isSync = persistMode === "sync";
    const label = isSync ? (isSaving ? "Syncing..." : "Sync") : (isSaving ? "Saving..." : "Save");
    const ariaLabel = isSync ? "Sync" : "Save program";

    return (
        <Button
            variant="default"
            className={TOOLBAR_PERSIST_PILL}
            onClick={onClick}
            disabled={disabled || isSaving}
            aria-label={ariaLabel}
        >
            {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : isSync ? (
                <RefreshCw className="h-4 w-4" />
            ) : (
                <Save className="h-4 w-4" />
            )}
            <span>{label}</span>
        </Button>
    );
};
