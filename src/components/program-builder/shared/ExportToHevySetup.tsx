"use client";

import { useState, useEffect } from "react";
import { useUserContext } from "@/contexts/UserContext";
import { useHevySecret } from "@/api/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { postHevyApikey, updateHevyApiKey, deleteHevyApiKey } from "../api/hevy";
import { toast } from "sonner";
import { validate } from "uuid";
import { Check, Key, Upload } from "lucide-react";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { deFlattenHevyRoutine } from "../utils";

const TOTAL_STEPS = 2;

export const ExportToHevySetup: React.FC = () => {
    const { user } = useUserContext();
    const { data: hevyApiKey } = useHevySecret(user);
    const queryClient = useQueryClient();

    const [expandedStep, setExpandedStep] = useState<string>("step1");
    const [inputValue, setInputValue] = useState("");
    const [exportToOneFolder, setExportToOneFolder] = useState(true);
    const [isEditingApiKey, setIsEditingApiKey] = useState(false);

    const step1Completed = hevyApiKey && hevyApiKey.length > 0;

    useEffect(() => {
        if (hevyApiKey) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setInputValue(hevyApiKey);
        }
    }, [hevyApiKey]);

    const handleConnectHevy = async () => {
        if (!user) return;
        const isValidUuid = validate(inputValue);
        if (!isValidUuid) {
            toast.error("Invalid Hevy API Key");
            return;
        }
        if (hevyApiKey && hevyApiKey.length > 0) {
            const updated = await updateHevyApiKey(user, inputValue);
            if (updated) {
                toast.success("Hevy API Key saved successfully");
                queryClient.invalidateQueries({ queryKey: ["hevy_api_key"] });
                setIsEditingApiKey(false);
            }
        } else {
            const result = await postHevyApikey(user, inputValue);
            if (result?.success) {
                toast.success("Hevy API Key saved successfully");
                queryClient.invalidateQueries({ queryKey: ["hevy_api_key"] });
                setIsEditingApiKey(false);
            } else {
                toast.error(
                    `Error saving Hevy API Key: ${result?.data ? JSON.stringify(result.data) : "Unknown error"}`
                );
            }
        }
    };

    const handleRemoveHevy = async () => {
        if (!user) return;
        const removed = await deleteHevyApiKey(user);
        if (removed) {
            queryClient.invalidateQueries({ queryKey: ["hevy_api_key"] });
            toast.success("Hevy API Key removed");
            setInputValue("");
            setIsEditingApiKey(false);
        } else {
            toast.error("Failed to remove Hevy API Key");
        }
    };

    const hasProgramInProgress = (): boolean => {
        if (typeof window === "undefined") return false;
        const raw = localStorage.getItem("hevy-program-in-progress");
        if (!raw) return false;
        try {
            const parsed = JSON.parse(raw) as THevyRoutine[];
            const deflat = deFlattenHevyRoutine(parsed);
            return deflat.length > 0 && deflat.some((week) => week.length > 0);
        } catch {
            return false;
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleUploadProgram = (_exportToOneFolder: boolean) => {
        // TODO: implement export to Hevy
    };

    const completedCount = step1Completed ? 1 : 0;
    const completionLabel = `${completedCount}/${TOTAL_STEPS}`;

    return (
        <div className="w-full bg-muted border border-border rounded-lg p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Export to Hevy</h3>
                <span className="text-sm text-muted-foreground">
                    {completionLabel}
                </span>
            </div>
            <Accordion
                type="single"
                value={expandedStep}
                onValueChange={setExpandedStep}
                collapsible
                className="w-full"
            >
                <AccordionItem value="step1" className="border-b border-border">
                    <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2 text-left">
                            {step1Completed ? (
                                <Check
                                    className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400"
                                    aria-hidden
                                />
                            ) : (
                                <span
                                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-white text-xs font-medium text-muted-foreground"
                                aria-hidden
                            >
                                1
                            </span>
                            )}
                            <span>Connect your Hevy account</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        {step1Completed && !isEditingApiKey ? (
                            <div className="flex flex-row items-center justify-between gap-4 rounded-lg border border-border bg-muted/50 px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <Key className="h-5 w-5 shrink-0 text-muted-foreground" />
                                    <span className="text-sm font-medium">
                                        API Key Configured
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="link"
                                        size="sm"
                                        className="text-lightSecondary h-auto p-0"
                                        onClick={() => setIsEditingApiKey(true)}
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        variant="link"
                                        size="sm"
                                        className="text-destructive h-auto p-0"
                                        onClick={handleRemoveHevy}
                                    >
                                        Remove
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <p className="text-sm text-muted-foreground mb-3 px-8">
                                    Sync workout programs to Hevy. Paste your{" "}
                                    <a
                                        href="https://hevy.com/settings?developer"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-lightSecondary underline"
                                    >
                                        API key
                                    </a>{" "}
                                    from your Hevy account on Desktop.
                                </p>
                                <div className="grid gap-2 px-8">
                                    <Label htmlFor="hevy-export-api-key">
                                        Paste Hevy API Key
                                    </Label>
                                    <Input
                                        id="hevy-export-api-key"
                                        type="text"
                                        placeholder="5xxxxxxx-exxx-6xxx-sxxx-6xxxxxxxxxxx"
                                        value={inputValue}
                                        onChange={(e) =>
                                            setInputValue(e.currentTarget.value)}
                                    />
                                    <div className="flex items-center gap-2">
                                        <Button
                                            className={cn(
                                                "bg-lightSecondary text-white w-fit",
                                                !user && "opacity-50"
                                            )}
                                            onClick={handleConnectHevy}
                                            disabled={!user}
                                        >
                                            {step1Completed
                                                ? "Update"
                                                : "Connect"}
                                        </Button>
                                        {step1Completed && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    setIsEditingApiKey(false)}
                                            >
                                                Cancel
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="step2" className="border-b border-border">
                    <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2 text-left">
                            <span
                                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-white text-xs font-medium text-muted-foreground"
                                aria-hidden
                            >
                                2
                            </span>
                            <span>Upload your Program to Hevy</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        {!hasProgramInProgress() ? (
                            <p className="text-sm text-muted-foreground py-2">
                                No program in progress. Build a program first to
                                export to Hevy.
                            </p>
                        ) : (
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="export-to-one-folder"
                                        checked={exportToOneFolder}
                                        onCheckedChange={(checked) =>
                                            setExportToOneFolder(
                                                checked === true
                                            )}
                                        className="data-[state=checked]:bg-lightSecondary data-[state=checked]:text-white"
                                    />
                                    <Label
                                        htmlFor="export-to-one-folder"
                                        className="text-sm font-normal cursor-pointer"
                                    >
                                        Export program to one folder
                                    </Label>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {exportToOneFolder
                                        ? "All weeks will be added to a single folder in Hevy."
                                        : "Each week will be in a separate folder in Hevy."}
                                </p>
                                <Button
                                    className="bg-lightSecondary text-white w-fit gap-2"
                                    onClick={() =>
                                        handleUploadProgram(exportToOneFolder)}
                                >
                                    Upload
                                    <Upload className="h-4 w-4 shrink-0" />
                                </Button>
                            </div>
                        )}
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );
};
