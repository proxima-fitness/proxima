// SPDX-License-Identifier: AGPL-3.0-only

"use client";

/**
 * @module HevyExerciseNotesDialog
 * Dialog for adding a note to a specific exercise in a Hevy day. Single text input (max 300 chars) and submit.
 * Depends on: Dialog, Form, Input, Button, zod.
 * Used by: HevyRoutine (when user adds a note to an exercise).
 */

import {
    Dialog,
    DialogContent,
    DialogTitle,
  } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import  { Button } from "@/components/ui/button";
import { SearchIcon, SparklesIcon } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
  } from "@/components/ui/form";
import { useProgramMutation } from "@/contexts/ProgramMutationContext";

/** Props for the add exercise note dialog. */
interface IProps {
    /** Called with week, day, exercise index, and note text when user submits. */
    handleAddExerciseNote: (folder_id: number, dayOrder: number, exerciseIndex: number, prompt: string) => void;
    /** Current dialog state (open, folder_id, dayOrder, exerciseIndex). */
    addExerciseNoteDialog: THevyDialog;
    /** Called to open/close the dialog. */
    handleOpenAddExerciseNoteDialog: (addExerciseNoteDialog: THevyDialog) => void;
}

/**
 * Dialog to add a note to a specific exercise. Submits via handleAddExerciseNote and closes.
 */
export const HevyExerciseNotesDialog: React.FC<IProps> = (props) => {

    const {
        handleAddExerciseNote,
        addExerciseNoteDialog,
        handleOpenAddExerciseNoteDialog,
    } = props;

    const { isAgentStreaming } = useProgramMutation();
    const mutationsLocked = isAgentStreaming;

    const formSchema = z.object({
        prompt: z.string().min(0, {
            message: "Please add your note here",
        }).max(300, {
            message: "Notes cannot exceed 300 characters",
        }),
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
          prompt: "",
        },
    });

    const onSubmit = (values: z.infer<typeof formSchema>) => {
        if (mutationsLocked) return;
        handleAddExerciseNote(addExerciseNoteDialog.folder_id, addExerciseNoteDialog.dayOrder, addExerciseNoteDialog?.exerciseIndex ?? 0, values.prompt);
        handleOpenAddExerciseNoteDialog({folder_id: 0, dayOrder: 0, isOpen: false});
    };

    return (
        <Dialog open={ addExerciseNoteDialog.isOpen } modal={ addExerciseNoteDialog.isOpen } onOpenChange={ () => handleOpenAddExerciseNoteDialog({folder_id: 0, dayOrder: 0, isOpen: false}) } >

            <DialogContent hideClose className="max-w-5xl w-full">
                <DialogTitle>
                    <span>
                        <Form { ...form }>
                            <form onSubmit={ form.handleSubmit(onSubmit) } className="flex flex-row justify-between items-center gap-4 w-full">
                                <FormField
                                        control={ form.control }
                                        name="prompt"
                                        render={ ({ field }) => (
                                            <FormItem className="w-full">
                                                <FormControl>
                                                    <Input
                                                    startIcon={ SearchIcon }
                                                    placeholder={ `Enter exercise notes for Week ${addExerciseNoteDialog.folder_id + 1} Day ${addExerciseNoteDialog.dayOrder}` }
                                                    { ...field }
                                                />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        ) }
                                    />
                                <Button
                                    type="submit"
                                    disabled={mutationsLocked}
                                    className="h-10 w-auto rounded-full bg-lightSecondary px-5 text-white hover:bg-lightSecondary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <SparklesIcon /> Add Note
                                </Button>
                            </form>
                        </Form>
                    </span>
                </DialogTitle>
            </DialogContent>
        </Dialog>
    );
};
