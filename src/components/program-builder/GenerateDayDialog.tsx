"use client";

import {
    Dialog,
    DialogContent,
    DialogTitle,
  } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import  { Button } from "@/components/ui/button";
import { SearchIcon, SparklesIcon } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
  } from "@/components/ui/form";

interface IProps {
    handleGenerateDay: (currentWeekIndex: number, currentDayIndex: number, prompt: string) => void;
    generateDayDialog: TDialog;
    handleGenerateDayDialog: (generateDayDialog: TDialog) => void;
}

export const GenerateDayDialog: React.FC<IProps> = (props) => {

    const {
        handleGenerateDay,
        generateDayDialog,
        handleGenerateDayDialog,
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
        handleGenerateDay(generateDayDialog.currentWeek, generateDayDialog.currentDay - 1, values.prompt);
        handleGenerateDayDialog({currentWeek: undefined, currentDay: undefined, isOpen: false});
    };

    return (
        <Dialog open={ generateDayDialog.isOpen } onOpenChange={ () => handleGenerateDayDialog({currentWeek: undefined, currentDay: undefined, isOpen: false}) } >

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
                                                    placeholder={ `Describe your desired Week ${generateDayDialog.currentWeek + 1} Day ${generateDayDialog.currentDay}` }
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
