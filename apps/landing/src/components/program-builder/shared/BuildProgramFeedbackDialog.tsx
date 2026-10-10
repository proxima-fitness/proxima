// SPDX-License-Identifier: AGPL-3.0-only

"use client";

/**
 * Toolbar control: opens ConfirmDialog to submit product feedback to Supabase `feedback` table.
 */
import { useState } from "react";
import { MessageSquareText } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";

export function BuildProgramFeedbackDialog() {
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const trimmedMessage = message.trim();

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen && !isLoading) {
            setMessage("");
        }
        setOpen(nextOpen);
    };

    const handleSubmit = async () => {
        if (!trimmedMessage || isLoading) return;

        setIsLoading(true);

        try {
            const supabase = createClient();
            const { error } = await supabase.from("feedback").insert([
                {
                    id: uuidv4(),
                    feedback: trimmedMessage,
                },
            ]);

            if (error) {
                toast.error(error.message || "Failed to send feedback. Please try again.");
                return;
            }

            toast.success("Thanks for the feedback");
            setMessage("");
            setOpen(false);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to send feedback. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 shrink-0 gap-1.5 rounded-full px-3.5 font-secondary font-semibold"
                aria-label="Send feedback"
                onClick={() => setOpen(true)}
            >
                <MessageSquareText className="h-4 w-4" aria-hidden />
                <span className="hidden lg:inline">Feedback</span>
            </Button>
            <ConfirmDialog
                open={open}
                onOpenChange={handleOpenChange}
                title="Send feedback"
                description="Tell us what we could improve, fix or add to the site"
                confirmLabel="Send"
                confirmLoadingLabel="Sending…"
                confirmVariant="default"
                confirmClassName="bg-lightSecondary text-white hover:bg-lightSecondary/90"
                isConfirmLoading={isLoading}
                closeOnConfirm={false}
                confirmDisabled={!trimmedMessage}
                inputMultiline
                inputPlaceholder="Enter feedback here"
                inputValue={message}
                onInputChange={setMessage}
                onConfirm={() => void handleSubmit()}
            />
        </>
    );
}
