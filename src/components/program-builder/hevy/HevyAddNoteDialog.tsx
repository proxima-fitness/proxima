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
    handleAddRoutineNote: (currentWeekIndex: number, currentDayIndex: number, prompt: string) => void;
    addNoteDialog: THevyDialog;
    handleOpenAddNoteDialog: (addNoteDialog: THevyDialog) => void;
}

export const HevyAddNoteDialog: React.FC<IProps> = (props) => {

    const {
        handleAddRoutineNote,
        addNoteDialog,
        handleOpenAddNoteDialog,
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
        handleAddRoutineNote(addNoteDialog.folder_id, addNoteDialog.dayOrder, values.prompt);
        handleOpenAddNoteDialog({folder_id: 0, dayOrder: 0, isOpen: false});
    };

    return (
        <Dialog open={ addNoteDialog.isOpen } modal={ addNoteDialog.isOpen } onOpenChange={ () => handleOpenAddNoteDialog({folder_id: 0, dayOrder: 0, isOpen: false}) } >

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
                                                    placeholder={ `Enter routines notes for Week ${addNoteDialog.folder_id + 1} Day ${addNoteDialog.dayOrder}` }
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
