"use client";

/**
 * @module HevyGenerateDayDialog
 * Dialog to (re-)generate a day from a text prompt. Single input (max 300 chars) and Generate button.
 * Depends on: Dialog, Form, Input, Button, zod.
 * Used by: HevyRoutine (currently commented out in JSX).
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

/** Props for the generate-day dialog. */
interface IProps {
    /** Called with week index, day index, and user prompt to generate the day. */
    handleGenerateDay: (currentWeekIndex: number, currentDayIndex: number, prompt: string) => void;
    /** Current dialog state (open, folder_id, dayOrder). */
    generateDayDialog: THevyDialog;
    /** Called to open/close the dialog. */
    handleOpenGenerateDayDialog: (generateDayDialog: THevyDialog) => void;
}

/**
 * Dialog to describe and generate a day. Submits prompt via handleGenerateDay and closes.
 */
export const HevyGenerateDayDialog: React.FC<IProps> = (props) => {

    const {
        handleGenerateDay,
        generateDayDialog,
        handleOpenGenerateDayDialog,
    } = props;

    const formSchema = z.object({
        prompt: z.string().min(0, {
            message: "Please provide a prompt to Re-generate the selected day",
        }).max(300, {
            message: "Prompts cannot exceed 300 characters",
        }),
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
          prompt: "",
        },
    });

    const onSubmit = (values: z.infer<typeof formSchema>) => {
        handleGenerateDay(generateDayDialog.folder_id, generateDayDialog.dayOrder, values.prompt);
        handleOpenGenerateDayDialog({folder_id: 0, dayOrder: 0, isOpen: false});
    };

    return (
        <Dialog open={ generateDayDialog.isOpen } onOpenChange={ () => handleOpenGenerateDayDialog({folder_id: 0, dayOrder: 0, isOpen: false}) } >

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
                                                    placeholder={ `Describe your desired Week ${generateDayDialog.folder_id + 1} Day ${generateDayDialog.dayOrder}` }
                                                    { ...field }
                                                />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        ) }
                                    />
                                <Button
                                        type="submit"
                                        className="w-auto h-10 bg-[#33bbcf] text-white">
                                    <SparklesIcon /> Generate
                                </Button>
                            </form>
                        </Form>
                    </span>
                </DialogTitle>
            </DialogContent>
        </Dialog>
    );
};
