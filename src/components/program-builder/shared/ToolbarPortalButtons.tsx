"use client";

import { memo, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
// import { ToolbarSaveButton } from "@/components/program-builder/shared/ToolbarSaveButton";

interface IToolbarPortalButtonsProps {
    canUndo: boolean;
    onUndo: () => void;
    onSave: () => void;
    saveDisabled: boolean;
    isSaving: boolean;
}

/**
 * Renders Undo and Save buttons into toolbar portal targets (#toolbar-undo-portal,
 * #toolbar-save-portal). Single state + one effect for one re-render after mount.
 */
function ToolbarPortalButtonsInner({
    canUndo,
    onUndo,
    // onSave,
    // saveDisabled,
    // isSaving,
}: IToolbarPortalButtonsProps) {
    const [targets, setTargets] = useState<{ undo: HTMLElement; save: HTMLElement } | null>(null);

    useLayoutEffect(() => {
        const undoEl = document.getElementById("toolbar-undo-portal");
        const saveEl = document.getElementById("toolbar-save-portal");
        if (undoEl && saveEl) {
            queueMicrotask(() => setTargets({ undo: undoEl, save: saveEl }));
        }
    }, []);

    if (targets === null) return null;

    const undoPortal = createPortal(
        canUndo ? (
            <Button
                size="sm"
                onClick={onUndo}
                className="gap-2 bg-lightGold hover:bg-lightGold/80 text-black h-9"
            >
                <Undo2 className="h-4 w-4" />
                Undo
            </Button>
        ) : null,
        targets.undo
    );

    // const savePortal = createPortal(
    //     <ToolbarSaveButton
    //         onClick={onSave}
    //         disabled={saveDisabled}
    //         isSaving={isSaving}
    //     />,
    //     targets.save
    // );

    return (
        <>
            {undoPortal}
            { /* temporarily disabled save button */ }
            {/* {savePortal} */}
        </>
    );
}

export const ToolbarPortalButtons = memo(ToolbarPortalButtonsInner);
