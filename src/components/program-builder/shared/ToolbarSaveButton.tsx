/**
 * @module ToolbarSaveButton
 * Save button for the build-program toolbar. Saves program to Proxima and chat history.
 * Depends on: Button. Used by: BuildProgramClient (via portal).
 */
"use client";

import { Button } from "@/components/ui/button";
import { Save, Loader2 } from "lucide-react";

interface IToolbarSaveButtonProps {
    onClick: () => void;
    disabled: boolean;
    isSaving: boolean;
}

/** Presentational Save button for the toolbar; matches Export button styling. */
export const ToolbarSaveButton: React.FC<IToolbarSaveButtonProps> = ({
    onClick,
    disabled,
    isSaving,
}) => {
    return (
        <Button
            variant="default"
            className="text-white bg-lightSecondary hover:bg-lightSecondary/80 gap-2"
            onClick={onClick}
            disabled={disabled || isSaving}
            aria-label="Save program and chat"
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
