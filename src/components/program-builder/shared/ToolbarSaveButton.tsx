/**
 * @module ToolbarSaveButton
 * Save button for the build-program toolbar. Persists Program prescription to Supabase.
 * Depends on: Button. Used by: ToolbarPortalButtons.
 */
"use client";

import { Button } from "@/components/ui/button";
import { Save, Loader2 } from "lucide-react";

interface IToolbarSaveButtonProps {
    onClick: () => void;
    disabled: boolean;
    isSaving: boolean;
}

/** Presentational Save button; primary persist CTA (ADR 0007). */
export const ToolbarSaveButton: React.FC<IToolbarSaveButtonProps> = ({
    onClick,
    disabled,
    isSaving,
}) => {
    return (
        <Button
            variant="default"
            className="rounded-full px-4 gap-2 text-white bg-lightSecondary hover:bg-lightSecondary/90 shadow-sm"
            onClick={onClick}
            disabled={disabled || isSaving}
            aria-label="Save program"
        >
            {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <Save className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">{isSaving ? "Saving..." : "Save"}</span>
        </Button>
    );
};
