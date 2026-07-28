/**
 * @module ExportToHevySetup
 * Two-step flow: (1) connect Hevy API key, (2) upload program from localStorage to Hevy with progress and rate-limit handling.
 * Depends on: hevy API, useHevySecret, useMyFeatureLimits, Accordion, Progress. Used by: ExportDialog.
 */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { resolveExportPersistChatId } from "@/app/(app)/(with-toolbar)/build-program/resolve-chat-entry";
import { useHevySuccessConfetti } from "./useHevySuccessConfetti";
import { connectChatToSavedProgram } from "@/api/chat-history";
import { useBuildProgramActions } from "@/contexts/BuildProgramActionsContext";
import { useUserContext } from "@/contexts/UserContext";
import { useHevySecret, useMyFeatureLimits } from "@/api/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { tryConsumeMonthlyExport } from "@/api/feature-limits";
import { withRenewsOn } from "@/lib/format-usage-reset-date";
import {
    deleteHevyApiKey,
    getSaveProgramToSupabaseFailureDetail,
    isSaveProgramToSupabaseSuccess,
    postProgramToHevy,
    postProgramToHevyOneFolder,
    saveProgramToSupabase,
} from "../api/hevy";
import { connectHevyKey, HEVY_API_KEY_SAVED_MESSAGE } from "../api/connect-hevy-key";
import { triggerWorkoutHistorySync } from "@/api/workout-history-sync";
import { MAIN_DISCOUNT_PERCENT, MAIN_DISCOUNT_CODE, RATE_LIMIT_EXHAUSTED_MESSAGE } from "@/assets/constants/ui-constants";
import { postNewProgramSubscriber } from "@/api/programs";
import { toast } from "sonner";
import { Check, Crown, ExternalLink, Key, Upload } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { deFlattenHevyRoutine } from "../utils";
import posthog from "posthog-js";

const TOTAL_STEPS = 2;

const HEVY_EXPORT_LOG_PREFIX = "[Hevy export]";

/** Matches resolver / Hevy API errors from custom template sync (for targeted console logging). */
function isHevyCustomExerciseExportFailureMessage(msg: string): boolean {
    const m = msg.toLowerCase();
    return (
        m.includes("not found in the library") ||
        m.includes("multiple hevy exercises named") ||
        (m.includes("already created") && m.includes("custom exercise")) ||
        m.includes("invalid exercise type for hevy export") ||
        m.includes("invalid equipment for hevy export") ||
        m.includes("invalid primary muscle group for hevy export") ||
        m.includes("custom exercise template has no title") ||
        m.includes("user is required to load hevy custom exercises") ||
        m.includes("internal error: missing id mapping") ||
        m.includes("exceeds-custom-exercise-limit")
    );
}

/** Props for the Hevy export setup panel. */
interface IExportToHevySetupProps {
    /** Notifies parent when upload is in progress (e.g. to block dialog close). */
    onUploadStateChange?: (uploading: boolean) => void;
    /** When provided, used instead of reading from localStorage. Allows callers (e.g. program slug page) to pass routines directly without touching the build-program localStorage key. */
    hevyRoutines?: THevyRoutine[];
    /** When true, skips try_consume / export-cap UX (used for free pre-made program exports). */
    skipUsageTracking?: boolean;
    /** Called after a successful Hevy upload (e.g. to increment program saves). */
    onExportSuccess?: () => void;
}

/** Step 1: API key connect/edit. Step 2: upload program from localStorage with one-folder vs per-week option. */
export const ExportToHevySetup: React.FC<IExportToHevySetupProps> = ({ onUploadStateChange, hevyRoutines: hevyRoutinesProp, skipUsageTracking = false, onExportSuccess }) => {
    const { user } = useUserContext();
    const { getPersistChatIdRef } = useBuildProgramActions();
    const searchParams = useSearchParams();
    const urlChatId = searchParams.get("chat") ?? "";
    const queryClient = useQueryClient();
    const { data: hevyApiKey } = useHevySecret(user);
    const { data: featureLimits } = useMyFeatureLimits(user);

    const isFree = featureLimits?.has_active_subscription !== true;
    const atExportLimit = skipUsageTracking
        ? false
        : featureLimits != null && (featureLimits.remaining_exports ?? 0) === 0;

    const [expandedStep, setExpandedStep] = useState<string>(hevyApiKey ? "step2" : "step1");
    const [inputValue, setInputValue] = useState("");
    const [exportToOneFolder, setExportToOneFolder] = useState(true);
    const [exportFirstWeekOnly, setExportFirstWeekOnly] = useState(true);
    const [isEditingApiKey, setIsEditingApiKey] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [showExportSuccess, setShowExportSuccess] = useState(false);
    const { confettiOverlay, fireConfetti, resetConfetti } = useHevySuccessConfetti();
    const [uploadProgress, setUploadProgress] = useState<{
        uploaded: number;
        total: number;
        status: "uploading" | "rate_limited";
        rateLimitSecondsLeft?: number;
    } | null>(null);

    const step1Completed = hevyApiKey && hevyApiKey.length > 0;

    useEffect(() => {
        if (hevyApiKey) {

            setInputValue(hevyApiKey);
        }
    }, [hevyApiKey]);

    useEffect(() => {
        onUploadStateChange?.(isUploading);
    }, [isUploading, onUploadStateChange]);

    useEffect(() => {
        if (!isUploading) return;
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [isUploading]);

    const handleConnectHevy = async () => {
        if (!user) return;

        const result = await connectHevyKey({
            user,
            apiKey: inputValue,
            existingApiKey: hevyApiKey,
            queryClient,
        });

        if (result.status !== "saved") {
            toast.error(result.message);
            return;
        }

        toast.success(HEVY_API_KEY_SAVED_MESSAGE);
        triggerWorkoutHistorySync();
        setIsEditingApiKey(false);
    };

    const handleRemoveHevy = async () => {
        if (!user) return;
        const removed = await deleteHevyApiKey(user);
        if (removed) {
            queryClient.invalidateQueries({ queryKey: ["hevy_api_key"] });
            queryClient.invalidateQueries({ queryKey: ["exercise-stalls-analysis", user?.id] });
            toast.success("Hevy API Key removed");
            setInputValue("");
            setIsEditingApiKey(false);
        } else {
            toast.error("Failed to remove Hevy API Key");
        }
    };

    const hasProgramInProgress = (): boolean => {
        if (hevyRoutinesProp && hevyRoutinesProp.length > 0) return true;
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

    const tryConnectChatAfterProgramSave = async (savedProgramId: number) => {
        const persistChatId = resolveExportPersistChatId(getPersistChatIdRef.current, urlChatId);

        console.info(`${HEVY_EXPORT_LOG_PREFIX} chat_program_connect_attempt`, {
            programId: savedProgramId,
            chatId: persistChatId || null,
            urlChatId: urlChatId || null,
            hasRegisteredGetter: Boolean(getPersistChatIdRef.current),
        });

        if (!persistChatId) {
            console.info(`${HEVY_EXPORT_LOG_PREFIX} chat_program_connect_skipped`, {
                programId: savedProgramId,
                reason: "no_persist_chat_id",
            });
            return;
        }

        const connectResult = await connectChatToSavedProgram({
            user,
            persistChatId,
            programId: String(savedProgramId),
            queryClient,
        });
        if (connectResult === "linked") {
            console.info(`${HEVY_EXPORT_LOG_PREFIX} chat_program_connect_linked`, {
                programId: savedProgramId,
                chatId: persistChatId,
            });
        } else if (connectResult === "failed") {
            toast.warning("Program saved, but chat connection failed.");
            console.error(`${HEVY_EXPORT_LOG_PREFIX} chat_program_connect_failed`, {
                programId: savedProgramId,
                chatId: persistChatId,
            });
        }
    };

    const handleUploadProgram = async (exportToOneFolderMode: boolean) => {

        if (typeof window === "undefined") return;

        let hevyRoutines: THevyRoutine[];
        let request: TTextToJsonRequest | undefined;
        let prompt = "";

        if (hevyRoutinesProp && hevyRoutinesProp.length > 0) {
            hevyRoutines = hevyRoutinesProp;
        } else {
            const rawProgram = localStorage.getItem("hevy-program-in-progress");
            if (!rawProgram) {
                toast.error("Missing program. Build a program first.");
                console.error(`${HEVY_EXPORT_LOG_PREFIX} Missing program. Build a program first.`);
                return;
            }
            try {
                hevyRoutines = JSON.parse(rawProgram) as THevyRoutine[];
            } catch (error) {
                toast.error("Invalid program data.");
                console.error(`${HEVY_EXPORT_LOG_PREFIX} Invalid program data.`, error);
                return;
            }

            const promptRaw = localStorage.getItem("prompt");
            prompt = promptRaw
                ? (() => {
                    try {
                        return JSON.parse(promptRaw) as string;
                    } catch {
                        return promptRaw;
                    }
                })()
                : "";
            try {
                const requestRaw = localStorage.getItem("hevy-request");
                request = requestRaw ? (JSON.parse(requestRaw) as TTextToJsonRequest) : undefined;
            } catch {
                request = undefined;
            }
        }

        if (!user) {
            const errorMessage = "You must be signed in to upload.";
            toast.error(errorMessage);
            console.error(`${HEVY_EXPORT_LOG_PREFIX} export_failed`, errorMessage);
            posthog?.capture?.("export_failed", { user: "user_id_unknown", destination: "hevy", error: errorMessage });
            return;
        }
        if (!hevyApiKey || hevyApiKey.length === 0) {
            const errorMessage = "Connect your Hevy API key first.";
            toast.error(errorMessage);
            console.error(`${HEVY_EXPORT_LOG_PREFIX} export_failed`, errorMessage);
            posthog?.capture?.("export_failed", { user: user?.id ?? "user_id_unknown", destination: "hevy", error: errorMessage });
            return;
        }

        // Spend one export unit before any Hevy write. Denied → paywall, no upload.
        if (!skipUsageTracking) {
            const consume = await tryConsumeMonthlyExport(user);
            void queryClient.invalidateQueries({ queryKey: ["feature-limits", user.id] });
            if (!consume.allowed) {
                const message = withRenewsOn(
                    isFree
                        ? "You're out of monthly exports."
                        : "You've run out of monthly exports.",
                    featureLimits?.resets_on,
                );
                toast.error(message);
                console.error(`${HEVY_EXPORT_LOG_PREFIX} export_failed`, message, consume.error);
                posthog?.capture?.("export_failed", {
                    user: user.id,
                    destination: "hevy",
                    error: "usage_cap",
                });
                return;
            }
        }

        setShowExportSuccess(false);
        resetConfetti();

        setIsUploading(true);

        try {
            let programId: number | undefined;
            let supabaseSaveFailed = false;

            const supabaseResult = await saveProgramToSupabase(hevyRoutines, prompt, request, user.id);
            if (isSaveProgramToSupabaseSuccess(supabaseResult)) {
                programId = supabaseResult.id;
                if (supabaseResult.skippedExercises?.length) {
                    for (const skipped of supabaseResult.skippedExercises) {
                        toast.warning(`${skipped.exerciseName}: ${skipped.reason}`);
                    }
                }
                await tryConnectChatAfterProgramSave(programId);
            } else {
                supabaseSaveFailed = true;
                const detail = getSaveProgramToSupabaseFailureDetail(supabaseResult);
                toast.warning(`Could not save to My Programs yet: ${detail}`);
                console.error(`${HEVY_EXPORT_LOG_PREFIX} supabase_program_save_failed`, detail, supabaseResult);
                posthog?.capture?.("supabase_program_save_failed", {
                    user: user.id,
                    destination: "hevy",
                    error: detail,
                    phase: "pre_upload",
                });
            }

            const programTitle =
                request?.programTitle != null && request.programTitle.length > 0
                    ? [{ id: programId !== undefined ? String(programId) : "pending", title: request.programTitle }]
                    : undefined;

            const folderIds = hevyRoutines
                .map((r) => r.folder_id)
                .filter((id): id is number => typeof id === "number");
            const firstWeekId = folderIds.length ? Math.min(...folderIds) : 0;
            const routinesToUpload = exportFirstWeekOnly
                ? hevyRoutines.filter((r) => r.folder_id === firstWeekId)
                : hevyRoutines;

            setUploadProgress({ uploaded: 0, total: routinesToUpload.length, status: "uploading" });
            const onProgress = (
                uploaded: number,
                total: number,
                status: "uploading" | "rate_limited",
                rateLimitSecondsLeft?: number,
            ) => {
                setUploadProgress({ uploaded, total, status, rateLimitSecondsLeft });
            };

            const hevyResult = exportToOneFolderMode
                ? await postProgramToHevyOneFolder(
                      routinesToUpload,
                      1,
                      hevyApiKey,
                      programTitle,
                      user,
                      onProgress,
                  )
                : await postProgramToHevy(routinesToUpload, hevyApiKey, user, onProgress);
            if (hevyResult?.success !== true) {
                const message =
                    hevyResult?.data instanceof Error &&
                    hevyResult.data.message.includes("Rate limited after 3 retries")
                        ? RATE_LIMIT_EXHAUSTED_MESSAGE
                        : hevyResult?.data instanceof Error
                          ? hevyResult.data.message
                          : "Failed to upload program to Hevy.";
                toast.error(message);
                const err = hevyResult?.data instanceof Error ? hevyResult.data : undefined;
                console.error(`${HEVY_EXPORT_LOG_PREFIX} export_failed Upload to Hevy failed.`, {
                    message,
                    hevyResult,
                    cause: err,
                });
                if (
                    (err && isHevyCustomExerciseExportFailureMessage(err.message)) ||
                    isHevyCustomExerciseExportFailureMessage(message)
                ) {
                    console.error(
                        `${HEVY_EXPORT_LOG_PREFIX} export_failed Custom exercise sync to Hevy failed (resolve or POST template).`,
                        err?.message ?? message,
                        err ?? hevyResult?.data,
                    );
                }
                posthog?.capture?.("export_failed", { user: user?.id ?? "user_id_unknown", destination: "hevy", error: message });
                return;
            }
            if (
                hevyResult.success &&
                (hevyResult.createdNewHevyCustomTemplates ?? 0) > 0
            ) {
                queryClient.invalidateQueries({ queryKey: ["hevy-custom-exercises"] });
            }

            if (supabaseSaveFailed) {
                const retryResult = await saveProgramToSupabase(hevyRoutines, prompt, request, user.id);
                if (isSaveProgramToSupabaseSuccess(retryResult)) {
                    programId = retryResult.id;
                    supabaseSaveFailed = false;
                    if (retryResult.skippedExercises?.length) {
                        for (const skipped of retryResult.skippedExercises) {
                            toast.warning(`${skipped.exerciseName}: ${skipped.reason}`);
                        }
                    }
                    await tryConnectChatAfterProgramSave(programId);
                } else {
                    const detail = getSaveProgramToSupabaseFailureDetail(retryResult);
                    console.error(`${HEVY_EXPORT_LOG_PREFIX} supabase_program_save_failed`, detail, retryResult);
                    posthog?.capture?.("supabase_program_save_failed", {
                        user: user.id,
                        destination: "hevy",
                        error: detail,
                        phase: "post_upload",
                    });
                }
            }

            if (programId === undefined) {
                toast.warning(
                    "Program uploaded to Hevy but could not be saved to your profile. Please contact support.",
                );
                posthog?.capture?.("supabase_program_save_failed", {
                    user: user.id,
                    destination: "hevy",
                    error: "no_program_id_after_retries",
                    phase: "final",
                });
                setShowExportSuccess(true);
                fireConfetti();
                onExportSuccess?.();
                return;
            }

            const subscriberError = await postNewProgramSubscriber(user, String(programId));
            if (subscriberError) {
                const errorMessage = "Program saved but failed to add to My Programs.";
                toast.error(errorMessage);
                console.error(`${HEVY_EXPORT_LOG_PREFIX} export_failed`, errorMessage, subscriberError);
                posthog?.capture?.("export_failed", {
                    user: user?.id ?? "user_id_unknown",
                    destination: "hevy",
                    error: errorMessage,
                });
            } else {
                queryClient.invalidateQueries({ queryKey: ["subscribed-programs", user.id] });
                toast.success("Program uploaded to Hevy and saved to your Profile");
                posthog?.capture?.("exported_program", { user: user?.id ?? "user_id_unknown", destination: "hevy" });
                setShowExportSuccess(true);
                fireConfetti();
                onExportSuccess?.();
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Upload failed.";
            console.error(`${HEVY_EXPORT_LOG_PREFIX} export_failed Upload threw.`, err);
            toast.error(errorMessage);
            posthog?.capture?.("export_failed", { user: user?.id ?? "user_id_unknown", destination: "hevy", error: errorMessage });
        } finally {
            setUploadProgress(null);
            setIsUploading(false);
        }
    };

    const completedCount = step1Completed ? 1 : 0;
    const completionLabel = `${completedCount}/${TOTAL_STEPS}`;

    return (
        <div className="relative w-full min-w-0 overflow-x-hidden bg-muted border border-border rounded-lg p-6 sm:p-8">
            {confettiOverlay}
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold tracking-tight">Export to Hevy</h3>
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
                <AccordionItem value="step1" className="border-b border-border last:border-b-0 bg-background rounded-t-lg p-4">
                    <AccordionTrigger className="hover:no-underline py-5">
                        <div className="flex items-center gap-3 text-left">
                            {step1Completed ? (
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-green-600 dark:text-green-400" aria-hidden>
                                    <Check className="h-5 w-5" aria-hidden />
                                </span>
                            ) : (
                                <span
                                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-muted/30 text-xs font-medium text-muted-foreground"
                                    aria-hidden
                                >
                                    1
                                </span>
                            )}
                            <span>Connect your Hevy account</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-6 pt-2 min-w-0">
                        {step1Completed && !isEditingApiKey ? (
                            <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                                <div className="flex items-center gap-4">
                                    <Key className="h-5 w-5 shrink-0 text-muted-foreground" />
                                    <span className="text-sm font-medium">
                                        API Key Configured
                                    </span>
                                </div>
                                <div className="flex items-center gap-4">
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
                            <div className="flex flex-col gap-4">
                                <p className="text-sm text-muted-foreground">
                                    Sync workout programs to Hevy. Paste your API key from your Hevy account on Desktop.
                                </p>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-fit gap-2 rounded-full bg-lightGold px-4 text-black hover:bg-lightGold/90"
                                    onClick={() =>
                                        window.open("https://hevy.com/settings?developer", "_blank", "noopener,noreferrer")
                                    }
                                >
                                    Get your API key
                                    <ExternalLink className="h-4 w-4 shrink-0" />
                                </Button>
                                <div className="flex flex-col gap-2">
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
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="default"
                                        className={cn(
                                            "w-fit rounded-full bg-lightSecondary px-5 text-white hover:bg-lightSecondary/90",
                                            !user && "opacity-50"
                                        )}
                                        onClick={handleConnectHevy}
                                        disabled={!user || !inputValue.trim()}
                                    >
                                        {step1Completed
                                            ? "Update"
                                            : "Connect"}
                                    </Button>
                                    {step1Completed && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="rounded-full border-border/80"
                                            onClick={() =>
                                                setIsEditingApiKey(false)}
                                        >
                                            Cancel
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="step2" className="border-b border-border last:border-b-0 bg-background rounded-b-lg p-4">
                    <AccordionTrigger className="hover:no-underline py-5">
                        <div className="flex items-center gap-3 text-left">
                            <span
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-muted/30 text-xs font-medium text-muted-foreground"
                                aria-hidden
                            >
                                2
                            </span>
                            <span>Upload your Program to Hevy</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-6 pt-2">
                        {!hasProgramInProgress() ? (
                            <p className="text-sm text-muted-foreground py-2">
                                No program in progress. Build a program first to
                                export to Hevy.
                            </p>
                        ) : (
                            <div className="flex flex-col gap-4 pl-8">
                                <div className="flex items-center gap-3">
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
                                <div className="flex items-center gap-3">
                                    <Checkbox
                                        id="export-first-week-only"
                                        checked={exportFirstWeekOnly}
                                        onCheckedChange={(checked) =>
                                            setExportFirstWeekOnly(checked === true)
                                        }
                                        className="data-[state=checked]:bg-lightSecondary data-[state=checked]:text-white"
                                    />
                                    <Label
                                        htmlFor="export-first-week-only"
                                        className="text-sm font-normal cursor-pointer"
                                    >
                                        Export first week only
                                    </Label>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Your full program is saved to your proxima account.
                                </p>
                                {isUploading && uploadProgress && (
                                    <div className="flex flex-col gap-3 w-full">
                                        <p className="text-sm font-medium text-amber-600 dark:text-amber-500">
                                            Do not leave this page.
                                        </p>
                                        <div className="flex items-center gap-3 w-full">
                                            <Progress
                                                className="flex-1"
                                                value={
                                                    uploadProgress.total > 0
                                                        ? (uploadProgress.uploaded / uploadProgress.total) * 100
                                                        : 0
                                                }
                                            />
                                            <span className="text-sm text-muted-foreground shrink-0">
                                                {uploadProgress.uploaded}/{uploadProgress.total} routines uploaded
                                            </span>
                                        </div>
                                        {uploadProgress.status === "rate_limited" && (
                                            <p className="text-xs text-muted-foreground">
                                                Rate limited: trying again in {" "}
                                                This is normal when uploading a large program to Hevy.
                                                {typeof uploadProgress.rateLimitSecondsLeft === "number"
                                                    ? `${uploadProgress.rateLimitSecondsLeft}`
                                                    : "60"}{" "}
                                                seconds…
                                            </p>
                                        )}
                                    </div>
                                )}
                                {atExportLimit && (
                                    <p className="text-sm text-muted-foreground">
                                        {withRenewsOn(
                                            isFree
                                                ? "You're out of monthly exports."
                                                : "You've run out of monthly exports.",
                                            featureLimits?.resets_on,
                                        )}
                                    </p>
                                )}
                                <div className="flex flex-wrap items-center gap-3">
                                    <Button
                                        variant="default"
                                        className="w-fit gap-2 rounded-full bg-lightSecondary px-5 text-white hover:bg-lightSecondary/90"
                                        onClick={() =>
                                            handleUploadProgram(exportToOneFolder)}
                                        disabled={isUploading || atExportLimit}
                                    >
                                        {isUploading ? "Uploading…" : "Upload"}
                                        {!isUploading && <Upload className="h-4 w-4 shrink-0" />}
                                    </Button>
                                    {atExportLimit && isFree && (
                                        <Button variant="default" className="w-fit gap-2 rounded-full bg-lightGold px-4 text-black hover:bg-lightGold/90" asChild>
                                            <Link href="/pricing">
                                                <Crown className="h-4 w-4 shrink-0" />
                                                Upgrade
                                            </Link>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
            {showExportSuccess && (
                <div className="mt-6 rounded-lg  bg-white dark:bg-extraDarkGray px-5 py-4 flex flex-col gap-3">
                    <p className="text-sm text-foreground">
                        Next Steps : Fill in your{" "}
                        <Link
                            href="/profile"
                            className="font-medium text-lightSecondary underline-offset-4 hover:underline"
                        >
                            Profile
                        </Link>
                        , and explore your Blind Spot Analysis !
                    </p>
                    {isFree && (
                        <p className="text-sm text-foreground">
                            Thanks for exporting! Upgrade for more exports and blind spot analysis. Use code{" "}
                            <strong>{MAIN_DISCOUNT_CODE}</strong> for {MAIN_DISCOUNT_PERCENT}% off your first year on Pro+.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};
