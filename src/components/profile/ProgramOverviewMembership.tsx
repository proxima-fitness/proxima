/**
 * @module ProgramOverviewMembership
 *
 * **Leave** / **Delete** confirms and icon/menu triggers for Program overview.
 * Depends on: UserContext, React Query, program subscriber/delete APIs, ConfirmDialog
 * Used by: ProgramOverviewCtas, CreatedProgramsList
 */

"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BookmarkCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
    deleteOwnedProximaProgram,
    deleteProgramSubscriber,
} from "@/api/programs";
import { OWNED_PROGRAMS_QUERY_KEY } from "@/api/hooks";
import { useUserContext } from "@/contexts/UserContext";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export const LEAVE_PROGRAM_TITLE = "Leave this program?";
export const LEAVE_PROGRAM_DESCRIPTION =
    "It will no longer show on Program overview.";
export const DELETE_PROGRAM_TITLE = "Delete this program?";
export const DELETE_PROGRAM_DESCRIPTION =
    "This cannot be undone. Any lifter training this program will lose access.";

/**
 * Shared Leave / Delete dialogs and openers for one **Proxima program**.
 *
 * @param programId - Programs primary key
 */
export function useProgramMembership(programId: number) {
    const { user } = useUserContext();
    const queryClient = useQueryClient();
    const [leaveOpen, setLeaveOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const invalidateMembership = () => {
        if (!user) {
            return;
        }
        void queryClient.invalidateQueries({
            queryKey: ["subscribed-programs", user.id],
        });
        void queryClient.invalidateQueries({
            queryKey: [...OWNED_PROGRAMS_QUERY_KEY, user.id],
        });
        void queryClient.invalidateQueries({ queryKey: ["programs"] });
    };

    const confirmLeave = async () => {
        if (!user || isLeaving) {
            return;
        }
        setIsLeaving(true);
        try {
            const error = await deleteProgramSubscriber(user.id, programId);
            if (error) {
                toast.error("Could not leave program.");
                console.error("Leave error:", error);
                return;
            }
            toast.success("Removed from Program overview.");
            setLeaveOpen(false);
            invalidateMembership();
        } finally {
            setIsLeaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!user || isDeleting) {
            return;
        }
        setIsDeleting(true);
        try {
            const result = await deleteOwnedProximaProgram(user, programId);
            if (!result.success) {
                toast.error("Could not delete program.");
                console.error("Delete error:", result.error);
                return;
            }
            toast.success("Program deleted.");
            setDeleteOpen(false);
            invalidateMembership();
        } finally {
            setIsDeleting(false);
        }
    };

    return {
        leaveOpen,
        setLeaveOpen,
        deleteOpen,
        setDeleteOpen,
        isLeaving,
        isDeleting,
        confirmLeave,
        confirmDelete,
    };
}

type TMembershipDialogsProps = {
    leaveOpen?: boolean;
    onLeaveOpenChange?: (open: boolean) => void;
    onConfirmLeave?: () => void;
    isLeaving?: boolean;
    canLeave?: boolean;
    deleteOpen?: boolean;
    onDeleteOpenChange?: (open: boolean) => void;
    onConfirmDelete?: () => void;
    isDeleting?: boolean;
    canDelete?: boolean;
};

/**
 * Confirm dialogs for **Leave** and optional owner **Delete**.
 */
export function ProgramMembershipDialogs({
    leaveOpen = false,
    onLeaveOpenChange,
    onConfirmLeave,
    isLeaving = false,
    canLeave = true,
    deleteOpen = false,
    onDeleteOpenChange,
    onConfirmDelete,
    isDeleting = false,
    canDelete = false,
}: TMembershipDialogsProps) {
    return (
        <>
            {canLeave && onLeaveOpenChange && onConfirmLeave ? (
                <ConfirmDialog
                    open={leaveOpen}
                    onOpenChange={(open) => {
                        if (!open && isLeaving) {
                            return;
                        }
                        onLeaveOpenChange(open);
                    }}
                    title={LEAVE_PROGRAM_TITLE}
                    description={LEAVE_PROGRAM_DESCRIPTION}
                    confirmLabel="Leave"
                    confirmLoadingLabel="Leaving…"
                    isConfirmLoading={isLeaving}
                    closeOnConfirm={false}
                    onConfirm={() => {
                        void onConfirmLeave();
                    }}
                />
            ) : null}
            {canDelete && onDeleteOpenChange && onConfirmDelete ? (
                <ConfirmDialog
                    open={deleteOpen}
                    onOpenChange={(open) => {
                        if (!open && isDeleting) {
                            return;
                        }
                        onDeleteOpenChange(open);
                    }}
                    title={DELETE_PROGRAM_TITLE}
                    description={DELETE_PROGRAM_DESCRIPTION}
                    confirmLabel="Delete"
                    confirmLoadingLabel="Deleting…"
                    isConfirmLoading={isDeleting}
                    closeOnConfirm={false}
                    onConfirm={() => {
                        void onConfirmDelete();
                    }}
                />
            ) : null}
        </>
    );
}

const ICON_BUTTON_CLASS =
    "size-8 shrink-0 text-muted-foreground hover:text-foreground";

type TTitleRowMembershipProps = {
    canDelete: boolean;
    onLeave: () => void;
    onDelete: () => void;
};

/**
 * Desktop title-row icon buttons: filled bookmark **Leave**, trash **Delete**.
 */
export function ProgramMembershipTitleButtons({
    canDelete,
    onLeave,
    onDelete,
}: TTitleRowMembershipProps) {
    return (
        <>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className={ICON_BUTTON_CLASS}
                aria-label="Leave program"
                onClick={onLeave}
            >
                <BookmarkCheck className="size-3.5 fill-current" aria-hidden />
            </Button>
            {canDelete ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={ICON_BUTTON_CLASS}
                    aria-label="Delete program"
                    onClick={onDelete}
                >
                    <Trash2 className="size-3.5" aria-hidden />
                </Button>
            ) : null}
        </>
    );
}

type TMenuMembershipProps = {
    canDelete: boolean;
    onLeave: () => void;
    onDelete: () => void;
};

/**
 * Mobile overflow items for **Leave** / **Delete**.
 */
export function ProgramMembershipMenuItems({
    canDelete,
    onLeave,
    onDelete,
}: TMenuMembershipProps) {
    return (
        <>
            <DropdownMenuItem onSelect={onLeave}>
                <BookmarkCheck className="size-3.5 fill-current" aria-hidden />
                Leave
            </DropdownMenuItem>
            {canDelete ? (
                <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={onDelete}
                >
                    <Trash2 className="size-3.5" aria-hidden />
                    Delete
                </DropdownMenuItem>
            ) : null}
        </>
    );
}
