"use client";

import { memo, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolbarSaveButton } from "@/components/program-builder/shared/ToolbarSaveButton";

interface IToolbarPortalButtonsProps {
    canUndo: boolean;
    undoDisabled?: boolean;
    onUndo: () => void;
    onSave: () => void;
    saveDisabled: boolean;
    isSaving: boolean;
}

/**
 * Renders Undo and Save buttons into toolbar portal targets (#toolbar-undo-portal,
 * #toolbar-save-portal, optional #toolbar-save-portal-mobile). Single state + one
 * effect for one re-render after mount.
 */
function ToolbarPortalButtonsInner({
    canUndo,
    undoDisabled = false,
    onUndo,
    onSave,
    saveDisabled,
    isSaving,
}: IToolbarPortalButtonsProps) {
    const [targets, setTargets] = useState<{
        undo: HTMLElement;
        save: HTMLElement[];
    } | null>(null);

    useLayoutEffect(() => {
        const undoEl = document.getElementById("toolbar-undo-portal");
        const saveDesktop = document.getElementById("toolbar-save-portal");
        const saveMobile = document.getElementById("toolbar-save-portal-mobile");
        const save = [saveDesktop, saveMobile].filter((el): el is HTMLElement => el != null);
        if (undoEl && save.length > 0) {
            queueMicrotask(() => setTargets({ undo: undoEl, save }));
        }
    }, []);

    if (targets === null) return null;

    const undoPortal = createPortal(
        canUndo ? (
            <Button
                size="sm"
                onClick={onUndo}
                disabled={undoDisabled}
                className="gap-2 rounded-full bg-lightGold hover:bg-lightGold/80 text-black h-9 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Undo2 className="h-4 w-4" />
                Undo
            </Button>
        ) : null,
        targets.undo
    );

    const savePortals = targets.save.map((el) =>
        createPortal(
            <ToolbarSaveButton onClick={onSave} disabled={saveDisabled} isSaving={isSaving} />,
            el,
        ),
    );

    return (
        <>
            {undoPortal}
            {savePortals}
        </>
    );
}

export const ToolbarPortalButtons = memo(ToolbarPortalButtonsInner);
