/**
 * @module ToolbarSaveButton
 * Toolbar persist button. **Save** writes the Program prescription; **Sync**
 * writes Hevy (ADR 0013 / 04, ADR 0016).
 * Depends on: Button. Used by: ToolbarPortalButtons.
 */
"use client";

import { Button } from "@/components/ui/button";
import { Save, Loader2, RefreshCw } from "lucide-react";

interface IToolbarSaveButtonProps {
    onClick: () => void;
    disabled: boolean;
    isSaving: boolean;
    persistMode?: "save" | "sync";
}

/** Presentational persist button; one toolbar slot (ADR 0007, ADR 0016). */
export const ToolbarSaveButton: React.FC<IToolbarSaveButtonProps> = ({
    onClick,
    disabled,
    isSaving,
    persistMode = "save",
}) => {
    const isSync = persistMode === "sync";
    const label = isSync ? (isSaving ? "Syncing..." : "Sync") : (isSaving ? "Saving..." : "Save");
    const ariaLabel = isSync ? "Sync" : "Save program";

    return (
        <Button
            variant="default"
            className="rounded-full px-4 gap-2 text-white bg-lightSecondary hover:bg-lightSecondary/90 shadow-sm"
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
            <span className="hidden sm:inline">{label}</span>
        </Button>
    );
};
