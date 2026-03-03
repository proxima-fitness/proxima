/* eslint-disable @next/next/no-img-element */
"use client";

/*
 * @module ProgramCard
 * @description Presentational card for a single shared program including thumbnail, metadata, and bookmark controls.
 * @dependsOn User context, program subscription APIs, thumbnail assets, badge and dialog UI primitives, and toast notifications.
 * @usedBy Program lists and grids wherever individual programs need to be previewed with save/remove actions.
 */

/**
 * Props for `ProgramCard`.
 * @property program Program data model used to render title, metadata, and bookmark state.
 */
import { thumbnail } from "public";
import { FullName } from "../generic/FullName";
import { Badge } from "@/components/ui/badge";
import { Users2Icon, Bookmark, BookmarkCheck } from "lucide-react";
import { useUserContext } from "@/contexts/UserContext";
import { postNewProgramSubscriber, deleteProgramSubscriber } from "@/api/programs";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useSubscribedPrograms } from "@/api/hooks";
import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface IProps {
    program: TProgram;
}

/**
 * ProgramCard renders a clickable program preview with thumbnail, author, difficulty chips, and bookmark affordances.
 */
export const ProgramCard: React.FC<IProps> = (props) => {

    const {
        program,
    } = props;

    const { user } = useUserContext();
    const queryClient = useQueryClient();
    const { data: subscribedPrograms } = useSubscribedPrograms(user);
    const [isBookmarking, setIsBookmarking] = useState(false);
    const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);

    const isSubscribed = subscribedPrograms?.some((p) => p.id === program.id) ?? false;

    const handleBookmark = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) return;
        if (isSubscribed) {
            setRemoveDialogOpen(true);
            return;
        }
        if (isBookmarking) return;
        setIsBookmarking(true);
        try {
            const error = await postNewProgramSubscriber(user, String(program.id));
            if (error) {
                const isDuplicate = error.code === "23505";
                if (isDuplicate) {
                    toast.success("Already in My Programs.");
                    queryClient.invalidateQueries({ queryKey: ["subscribed-programs", user.id] });
                } else {
                    toast.error("Could not save program.");
                    console.error("Bookmark error:", error);
                }
            } else {
                queryClient.invalidateQueries({ queryKey: ["subscribed-programs", user.id] });
                toast.success("Program saved to My Programs.");
            }
        } finally {
            setIsBookmarking(false);
        }
    };

    const handleConfirmRemove = async () => {
        if (!user) return;
        setIsRemoving(true);
        try {
            const error = await deleteProgramSubscriber(user.id, program.id);
            if (error) {
                toast.error("Could not remove program.");
                console.error("Remove subscription error:", error);
            } else {
                queryClient.invalidateQueries({ queryKey: ["subscribed-programs", user.id] });
                toast.success("Program removed from My Programs.");
                setRemoveDialogOpen(false);
            }
        } finally {
            setIsRemoving(false);
        }
    };

    return (
        <>
            <div className="w-full max-w-md mx-auto">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.01] hover:-translate-y-0.5 dark:bg-darkGray cursor-pointer">
                    <div className="relative overflow-hidden">
                        <img
                            src={ program.thumbnail instanceof Blob ? URL.createObjectURL(program.thumbnail) : thumbnail.src }
                            alt="Program Thumbnail"
                            className="w-full h-[200px] object-cover transition-transform duration-300 hover:scale-105"
                            style={ { objectFit: "cover" } }
                        />
                        {user && (
                            <div className="absolute top-2 right-2 z-10">
                                <button
                                    type="button"
                                    onClick={handleBookmark}
                                    disabled={isBookmarking}
                                    className="p-2 rounded-full bg-white/90 dark:bg-gray-900/90 hover:bg-white dark:hover:bg-gray-900 shadow-md transition-colors disabled:opacity-70 disabled:cursor-default"
                                    aria-label={isSubscribed ? "Remove from My Programs" : "Save to My Programs"}
                                >
                                    {isSubscribed ? (
                                        <BookmarkCheck className="h-5 w-5 text-lightSecondary fill-current" />
                                    ) : (
                                        <Bookmark className="h-5 w-5 text-gray-700 dark:text-offWhite" />
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="p-4 space-y-goldenSm">
                        <div className={ "flex flex-row justify-start items-center font-bold text-xs text-blue-400" }>
                            <Users2Icon className=" h-3 w-3 mr-1" /> {program?.saves} Lifters Joined
                        </div>

                        <div className=" dark:text-offWhite uppercase text-sm overflow-hidden text-ellipsis line-clamp-1">
                            Program By <FullName id={ program.id } id_type={ "program" } />
                        </div>
                        <h3 className="text-xl font-main overflow-hidden text-ellipsis line-clamp-1">{ program.title }</h3>
                        <div className="scrollbar-thin w-full min-h-10 overflow-x-auto overflow-y-hidden flex items-center gap-2">
                            <Badge className="text-[10px] text-white p-1 bg-lightSecondary dark:bg-gray-300 dark:text-black whitespace-nowrap shrink-0">{ program?.difficulty?.map((level: string ) => level).join(' - ') || "Not specified"  }</Badge>
                            <Badge className="text-[10px] text-white p-1 bg-lightSecondary dark:bg-gray-300 dark:text-black whitespace-nowrap shrink-0">{ program?.equipment || "Not specified" }</Badge>
                            <Badge className="text-[10px] text-white p-1 bg-lightSecondary dark:bg-gray-300 dark:text-black whitespace-nowrap shrink-0">{ program?.workout_duration || "Not specified" } Mins</Badge>
                        </div>
                    </div>
                </div>
            </div>
            <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
                <DialogContent
                    hideClose={isRemoving}
                    onCloseAutoFocus={(e) => e.preventDefault()}
                >
                    <DialogHeader>
                        <DialogTitle>Remove program?</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to remove this program from My Programs?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setRemoveDialogOpen(false);
                            }}
                            disabled={isRemoving}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleConfirmRemove();
                            }}
                            disabled={isRemoving}
                        >
                            {isRemoving ? "Removing…" : "Remove"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

