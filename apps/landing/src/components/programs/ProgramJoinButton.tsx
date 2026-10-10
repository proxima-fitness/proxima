// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module ProgramJoinButton
 * Subscribe / unsubscribe a user to a public **Proxima program**.
 * Depends on: UserContext, useSubscribedPrograms, program subscriber APIs, dialog.
 * Used by: ProgramCard, ProgramJoinMeta.
 */
"use client";

import { useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteProgramSubscriber, postNewProgramSubscriber } from "@/api/programs";
import { useSubscribedPrograms } from "@/api/hooks";
import { useUserContext } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface IProps {
    hideForOwner?: boolean;
    ownerUserId?: string | null;
    programId: number;
    /** Stop parent card navigation when the control sits on a clickable card. */
    stopClickPropagation?: boolean;
    variant: "inline" | "overlay";
}

/**
 * Bookmark-icon Join / Leave. Hidden for unsigned users, and for owners when `hideForOwner`.
 *
 * @param props Program id, optional owner, layout variant
 */
export const ProgramJoinButton: React.FC<IProps> = ({
    programId,
    ownerUserId = null,
    hideForOwner = false,
    stopClickPropagation = false,
    variant,
}) => {
    const { user } = useUserContext();
    const queryClient = useQueryClient();
    const { data: subscribedPrograms } = useSubscribedPrograms(user);
    const [isJoining, setIsJoining] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);
    const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

    const isJoined = subscribedPrograms?.some((program) => program.id === programId) ?? false;
    const isOwner = Boolean(user && ownerUserId && user.id === ownerUserId);

    if (!user || (hideForOwner && isOwner)) {
        return null;
    }

    const halt = (event: React.MouseEvent) => {
        if (!stopClickPropagation) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
    };

    const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
        halt(event);
        if (isJoined) {
            setLeaveDialogOpen(true);
            return;
        }
        if (isJoining) {
            return;
        }
        setIsJoining(true);
        try {
            const error = await postNewProgramSubscriber(user, String(programId));
            if (error) {
                if (error.code === "23505") {
                    toast.success("Already joined.");
                    void queryClient.invalidateQueries({ queryKey: ["subscribed-programs", user.id] });
                } else {
                    toast.error("Could not join program.");
                    console.error("Join error:", error);
                }
                return;
            }
            void queryClient.invalidateQueries({ queryKey: ["subscribed-programs", user.id] });
            toast.success("Joined.");
        } finally {
            setIsJoining(false);
        }
    };

    const handleConfirmLeave = async (event: React.MouseEvent<HTMLButtonElement>) => {
        halt(event);
        setIsLeaving(true);
        try {
            const error = await deleteProgramSubscriber(user.id, programId);
            if (error) {
                toast.error("Could not leave program.");
                console.error("Leave error:", error);
                return;
            }
            void queryClient.invalidateQueries({ queryKey: ["subscribed-programs", user.id] });
            toast.success("Removed from Program overview.");
            setLeaveDialogOpen(false);
        } finally {
            setIsLeaving(false);
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={(event) => {
                    void handleClick(event);
                }}
                disabled={isJoining}
                className={cn(
                    "transition-colors disabled:cursor-default disabled:opacity-70",
                    variant === "overlay"
                        ? "rounded-full bg-white/90 p-2 shadow-md hover:bg-white dark:bg-gray-900/90 dark:hover:bg-gray-900"
                        : "rounded-full p-1.5 text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
                aria-label={isJoined ? "Leave program" : "Join program"}
            >
                {isJoined ? (
                    <BookmarkCheck className="h-5 w-5 fill-current text-lightSecondary" />
                ) : (
                    <Bookmark className="h-5 w-5 text-gray-700 dark:text-offWhite" />
                )}
            </button>
            <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
                <DialogContent
                    hideClose={isLeaving}
                    onCloseAutoFocus={(event) => event.preventDefault()}
                    onClick={halt}
                >
                    <DialogHeader>
                        <DialogTitle>Leave this program?</DialogTitle>
                        <DialogDescription>
                            It will no longer show on Program overview.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={(event) => {
                                halt(event);
                                setLeaveDialogOpen(false);
                            }}
                            disabled={isLeaving}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={(event) => {
                                void handleConfirmLeave(event);
                            }}
                            disabled={isLeaving}
                        >
                            {isLeaving ? "Leaving…" : "Leave"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
