"use client";

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

interface IProps {
    handleAddExerciseNote: (weekOrder: number, dayOrder: number, exerciseIndex: number, prompt: string) => void;
    addExerciseNoteDialog: TDialog;
    handleOpenAddExerciseNoteDialog: (addExerciseNoteDialog: TDialog) => void;
}

export const ExerciseNotesDialog: React.FC<IProps> = (props) => {

    const {
        handleAddExerciseNote,
        addExerciseNoteDialog,
        handleOpenAddExerciseNoteDialog,
    } = props;

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
        handleAddExerciseNote(addExerciseNoteDialog.weekOrder, addExerciseNoteDialog.dayOrder, addExerciseNoteDialog?.exerciseIndex ?? 0, values.prompt);
        handleOpenAddExerciseNoteDialog({weekOrder: 0, dayOrder: 0, isOpen: false});
    };

    return (
        <Dialog open={ addExerciseNoteDialog.isOpen } onOpenChange={ () => handleOpenAddExerciseNoteDialog({weekOrder: 0, dayOrder: 0, isOpen: false}) } >

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
                                                    placeholder={ `Enter exercise notes for Week ${addExerciseNoteDialog.weekOrder + 1} Day ${addExerciseNoteDialog.dayOrder}` }
                                                    { ...field }
                                                />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        ) }
                                    />
                                <Button
                                        type="submit"
                                        className="w-[auto] h-10 bg-[#33bbcf] text-white">
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
