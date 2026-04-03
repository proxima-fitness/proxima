"use client";

/**
 * @module HevyExerciseDetailsDialog
 * Modal showing exercise GIF and numbered "How to" instructions from the Hevy template.
 * Depends on: Dialog, HevyExerciseGif.
 * Used by: HevyExerciseVisualizer.
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HevyExerciseGif } from "./HevyExerciseGif";

/** Props for the exercise details dialog. */
interface IProps {
    /** Whether the dialog is visible. */
    isOpen: boolean;
    /** Called when the dialog should close. */
    onClose: () => void;
    /** Exercise template (GIF + instructions); undefined shows empty state. */
    exercise: THevyExerciseTemplate | undefined;
}

/**
 * Full-size exercise GIF and numbered instructions (Hevy-style "How to").
 */
export const HevyExerciseDetailsDialog: React.FC<IProps> = (props) => {
    const { isOpen, onClose, exercise } = props;

    const instructions = exercise?.instructions ?? [];

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) {
                    onClose();
                }
            }}
        >
            <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-left pr-8">
                        {exercise?.title ?? "Exercise details"}
                    </DialogTitle>
                </DialogHeader>
                {exercise ? (
                    <>
                        <div className="w-full">
                            <HevyExerciseGif
                                name={exercise.title}
                                gif_id={exercise.gif_id}
                                thumbnailOrImage="img"
                                resolution="360"
                                file_type="gif"
                            />
                        </div>
                        <div className="mt-4 border-b border-border pb-2">
                            <h3 className="text-sm font-semibold text-lightSecondary/80">How to</h3>
                        </div>
                        {instructions.length > 0 ? (
                            <ol className="mt-2 list-none space-y-0">
                                {instructions.map((step, index) => (
                                    <li
                                        key={index}
                                        className="border-b border-border/80 py-3 text-sm leading-snug text-foreground first:pt-0 last:border-b-0"
                                    >
                                        <span className="mr-2 font-semibold tabular-nums">{index + 1}.</span>
                                        {step}
                                    </li>
                                ))}
                            </ol>
                        ) : (
                            <p className="mt-2 text-sm text-muted-foreground">No instructions available for this exercise.</p>
                        )}
                    </>
                ) : (
                    <p className="text-sm text-muted-foreground">Exercise details could not be loaded.</p>
                )}
            </DialogContent>
        </Dialog>
    );
};
